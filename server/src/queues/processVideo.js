
import { spawn } from 'child_process';
import { createWriteStream, createReadStream } from 'fs';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { pipeline } from 'stream/promises';

import {
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

import { s3 } from '../config/s3.js';
import Lesson from '../models/Lesson.js';

const RENDITIONS = [
  { name: '360p', h: 360, bitrate: '800k', bandwidth: 900000, w: 640 },
  { name: '720p', h: 720, bitrate: '2800k', bandwidth: 3000000, w: 1280 },
];

// Execute FFmpeg or FFprobe as a child process
const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const process = spawn(cmd, args, { windowsHide: true });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data;
    });

    process.stderr.on('data', (data) => {
      stderr += data;
    });

    process.on('error', reject);

    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new Error(
            `${cmd} exited with code ${code}: ${stderr.slice(-3000)}`
          )
        );
      }
    });
  });

// Find all generated files, including files inside rendition folders
const getFiles = async (directory) => {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await getFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
};

// Set the correct Content-Type for HLS files
const getContentType = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.m3u8') {
    return 'application/vnd.apple.mpegurl';
  }

  if (extension === '.ts') {
    return 'video/mp2t';
  }

  return 'application/octet-stream';
};

export const processVideo = async (job) => {
  const { lessonId, rawKey } = job.data;

  const rawBucket = job.data.bucket || process.env.AWS_S3_RAW_BUCKET;
  const processedBucket = process.env.AWS_S3_PROCESSED_BUCKET;

  if (!rawBucket || !processedBucket) {
    throw new Error('S3 bucket configuration is missing');
  }

  const lesson = await Lesson.findById(lessonId);

  if (!lesson) {
    throw new Error(`Lesson not found: ${lessonId}`);
  }

  if (!rawKey) {
    throw new Error('Raw video key is missing');
  }

  let tempDir;

  try {
    // 1. Update lesson status
    lesson.processingStatus = 'processing';
    await lesson.save();

    console.log('Processing video:', lessonId);

    // Create temporary input and output directories
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'lms-video-')
    );

    const input = path.join(tempDir, 'input-video');
    const outDir = path.join(tempDir, 'output');

    await fs.mkdir(outDir, { recursive: true });

    // 2. Download original video from S3
    console.log('Downloading raw video from S3...');

    const response = await s3.send(
      new GetObjectCommand({
        Bucket: rawBucket,
        Key: rawKey,
      })
    );

    if (!response.Body) {
      throw new Error('S3 returned an empty video body');
    }

    await pipeline(
      response.Body,
      createWriteStream(input)
    );

    console.log('Raw video downloaded');

    // 3. Read video duration using FFprobe
    console.log('Reading video duration...');

    const durationOutput = await run('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      input,
    ]);

    const duration = parseFloat(durationOutput.trim());

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('Unable to read valid video duration');
    }

    console.log('Video duration:', duration, 'seconds');

    // 4. Generate HLS files for each rendition
    for (const rendition of RENDITIONS) {
      console.log(`Generating ${rendition.name} HLS...`);

      const dir = path.join(outDir, rendition.name);

      await fs.mkdir(dir, { recursive: true });

      await run('ffmpeg', [
        '-y',
        '-i',
        input,
        '-vf',
        `scale=-2:${rendition.h}`,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-pix_fmt',
        'yuv420p',
        '-b:v',
        rendition.bitrate,
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-force_key_frames',
        'expr:gte(t,n_forced*6)',
        '-hls_time',
        '6',
        '-hls_playlist_type',
        'vod',
        '-hls_segment_filename',
        path.join(dir, 'seg_%03d.ts'),
        path.join(dir, 'index.m3u8'),
      ]);

      console.log(`${rendition.name} HLS generated`);
    }

    // 5. Create master playlist
    const master =
      '#EXTM3U\n' +
      RENDITIONS.map(
        (r) =>
          `#EXT-X-STREAM-INF:BANDWIDTH=${r.bandwidth},RESOLUTION=${r.w}x${r.h}\n${r.name}/index.m3u8`
      ).join('\n') +
      '\n';

    await fs.writeFile(
      path.join(outDir, 'master.m3u8'),
      master
    );

    // Upload every generated file to the processed S3 bucket
    console.log('Uploading HLS files to processed S3 bucket...');

    const files = await getFiles(outDir);

    for (const filePath of files) {
      const relativePath = path
        .relative(outDir, filePath)
        .split(path.sep)
        .join('/');

      const s3Key = `lessons/${lessonId}/${relativePath}`;

      const fileStats = await fs.stat(filePath);

      await s3.send(
        new PutObjectCommand({
          Bucket: processedBucket,
          Key: s3Key,
          Body: createReadStream(filePath),
          ContentLength: fileStats.size,
          ContentType: getContentType(filePath),
        })
      );

      console.log('Uploaded:', s3Key);
    }

    // 6. Update lesson and mark processing complete
    const hlsPath = `lessons/${lessonId}/master.m3u8`;

    lesson.hlsPath = hlsPath;
    lesson.duration = duration;
    lesson.processingStatus = 'ready';

    await lesson.save();

    console.log('Video processing completed:', lessonId);

    return {
      lessonId,
      hlsPath,
      duration,
      processingStatus: 'ready',
    };
  } finally {
    // Delete temporary input and output files
    if (tempDir) {
      await fs.rm(tempDir, {
        recursive: true,
        force: true,
      });

      console.log('Temporary files cleaned up');
    }
  }
};
