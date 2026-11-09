
import {
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';

import { s3 } from '../config/s3.js';
import { videoQueue, enqueueVideo } from '../queues/videoQueue.js';

import { assertOwner } from '../utils/assertOwner.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

const MAX_FILE_SIZE = 200 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
};

// Verify that the logged-in instructor owns the lesson's course
const getOwnedLesson = async (lessonId, user) => {
  const lesson = await Lesson.findById(lessonId);

  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }

  const course = await Course.findById(lesson.course);

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  assertOwner(course, user);

  return lesson;
};

// POST /api/lessons/:id/upload-url
export const createLessonUploadUrl = asyncHandler(
  async (req, res) => {
    const { contentType, fileSize } = req.body;

    const extension = ALLOWED_VIDEO_TYPES[contentType];

    if (!extension) {
      throw new ApiError(
        400,
        'Only MP4, MOV and WEBM videos are allowed'
      );
    }

    if (
      !Number.isSafeInteger(fileSize) ||
      fileSize <= 0 ||
      fileSize > MAX_FILE_SIZE
    ) {
      throw new ApiError(
        400,
        'Video size must be greater than 0 and no more than 200 MB'
      );
    }

    const lesson = await getOwnedLesson(
      req.params.id,
      req.user
    );

    const key = `raw/${lesson._id}/${Date.now()}${extension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_RAW_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(
      s3,
      command,
      { expiresIn: 600 }
    );

    lesson.rawKey = key;
    await lesson.save();

    res.json({
      message: 'Upload URL generated successfully',
      uploadUrl,
      key,
      expiresIn: 600,
    });
  }
);

// POST /api/lessons/:id/upload-complete
export const completeLessonUpload = asyncHandler(
  async (req, res) => {
    const lesson = await getOwnedLesson(
      req.params.id,
      req.user
    );

    if (!lesson.rawKey) {
      throw new ApiError(
        400,
        'No video upload has been initiated for this lesson'
      );
    }

    // Verify that the object actually exists in S3
    let video;

    try {
      video = await s3.send(
        new HeadObjectCommand({
          Bucket: process.env.AWS_S3_RAW_BUCKET,
          Key: lesson.rawKey,
        })
      );
    } catch (error) {
      if (
        error.name === 'NotFound' ||
        error.name === 'NoSuchKey' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        throw new ApiError(
          400,
          'Video not found in S3. Please upload it first.'
        );
      }

      throw error;
    }

    // Verify actual uploaded file size
    if (
      !video.ContentLength ||
      video.ContentLength <= 0 ||
      video.ContentLength > MAX_FILE_SIZE
    ) {
      throw new ApiError(
        400,
        'Uploaded video must be no more than 200 MB'
      );
    }

    // Verify actual uploaded content type
    if (!ALLOWED_VIDEO_TYPES[video.ContentType]) {
      throw new ApiError(
        400,
        'Uploaded video has an unsupported content type'
      );
    }

    lesson.processingStatus = 'uploaded';
    await lesson.save();

    try {
      await videoQueue.add(
        'transcode-video',
        {
          lessonId: String(lesson._id),
          rawKey: lesson.rawKey,
          bucket: process.env.AWS_S3_RAW_BUCKET,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        }
      );
    } catch (error) {
      lesson.processingStatus = 'failed';
      await lesson.save();

      throw error;
    }

    res.status(202).json({
      message: 'Video uploaded successfully. Processing has been queued.',
      processingStatus: lesson.processingStatus,
    });
  }
);

// GET /api/lessons/:id/status
export const getLessonProcessingStatus = asyncHandler(
  async (req, res) => {
    const lesson = await getOwnedLesson(
      req.params.id,
      req.user
    );

    res.json({
      lessonId: String(lesson._id),
      processingStatus: lesson.processingStatus,
      duration: lesson.duration,
      hlsPath: lesson.hlsPath,
    });
  }
);

// POST /api/lessons/:id/retry
export const retryLessonProcessing = asyncHandler(
  async (req, res) => {
    const lesson = await getOwnedLesson(
      req.params.id,
      req.user
    );

    if (lesson.processingStatus !== 'failed') {
      throw new ApiError(
        400,
        'Only failed video processing jobs can be retried'
      );
    }

    if (!lesson.rawKey) {
      throw new ApiError(
        400,
        'Original video not found. Please upload the video again.'
      );
    }

    // Confirm that the original video still exists in S3
    try {
      await s3.send(
        new HeadObjectCommand({
          Bucket: process.env.AWS_S3_RAW_BUCKET,
          Key: lesson.rawKey,
        })
      );
    } catch (error) {
      if (
        error.name === 'NotFound' ||
        error.name === 'NoSuchKey' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        throw new ApiError(
          400,
          'Original video is missing from S3. Please upload it again.'
        );
      }

      throw error;
    }

    // Reset status before adding a fresh processing job
    lesson.processingStatus = 'uploaded';
    await lesson.save();

    try {
      await enqueueVideo(
        String(lesson._id),
        lesson.rawKey
      );
    } catch (error) {
      lesson.processingStatus = 'failed';
      await lesson.save();

      throw error;
    }

    res.status(202).json({
      message: 'Video processing retry has been queued',
      processingStatus: lesson.processingStatus,
    });
  }
);
