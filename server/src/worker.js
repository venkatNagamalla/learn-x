
import 'dotenv/config';

import mongoose from 'mongoose';
import { Worker } from 'bullmq';

import { redis } from './config/redis.js';
import Lesson from './models/Lesson.js';
import { processVideo } from './queues/processVideo.js';

await mongoose.connect(process.env.MONGO_URI);

console.log('Worker MongoDB connected');

const worker = new Worker('video', processVideo, {
  connection: redis,
  concurrency: 1,
});

worker.on('completed', (job) => {
  console.log('Done:', job.data.lessonId);
});

worker.on('failed', async (job, err) => {
  console.error('Video processing failed:', err.message);

  if (job && job.attemptsMade >= job.opts.attempts) {
    await Lesson.findByIdAndUpdate(job.data.lessonId, {
      processingStatus: 'failed',
    });
  }
});

worker.on('error', (err) => {
  console.error('Worker error:', err.message);
});

console.log('Video worker running');

async function shutdown() {
  console.log('Shutting down video worker...');

  await worker.close();
  await redis.quit();
  await mongoose.disconnect();

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
