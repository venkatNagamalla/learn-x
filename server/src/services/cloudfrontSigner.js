
import fs from 'fs';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY
  ? process.env.CLOUDFRONT_PRIVATE_KEY.replace(/\\n/g, '\n')
  : fs.readFileSync(
      process.env.CLOUDFRONT_PRIVATE_KEY_PATH,
      'utf8'
    );

export function signLesson(lessonId, minutes = 120) {
  const base = `https://${process.env.CLOUDFRONT_DOMAIN}/lessons/${lessonId}`;

  const policy = JSON.stringify({
    Statement: [
      {
        Resource: `${base}/*`,
        Condition: {
          DateLessThan: {
            'AWS:EpochTime':
              Math.floor(Date.now() / 1000) + minutes * 60,
          },
        },
      },
    ],
  });

  const masterUrl = getSignedUrl({
    url: `${base}/master.m3u8`,
    keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
    privateKey,
    policy,
  });

  return {
    masterUrl,
    query: masterUrl.split('?')[1],
  };
}
