
import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';

export const videoQueue = new Queue('video', {
  connection: redis,
});

export const enqueueVideo = (lessonId, rawKey) =>
  videoQueue.add(
    'transcode',
    {
      lessonId,
      rawKey,
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );
