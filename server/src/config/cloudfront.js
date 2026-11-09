
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the private key relative to the server directory.
const privateKeyPath = path.resolve(
  __dirname,
  '../../',
  process.env.CLOUDFRONT_PRIVATE_KEY_PATH
);

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;

if (!cloudFrontDomain || !keyPairId) {
  throw new Error('CloudFront environment variables are missing');
}

// Existing single-file signing function.
export const createSignedLessonUrl = (
  lessonId,
  fileName = 'master.m3u8'
) => {
  const resource = `https://${cloudFrontDomain}/lessons/${lessonId}/${fileName}`;

  return getSignedUrl({
    url: resource,
    keyPairId,
    privateKey,
    dateLessThan: new Date(
      Date.now() + 60 * 60 * 1000
    ).toISOString(),
  });
};

// Sign the entire lesson folder for HLS playback.
// This allows access to the master playlist, child playlists,
// and video segments belonging to this lesson.
export const createSignedLessonAccess = (lessonId) => {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const lessonFolderUrl =
    `https://${cloudFrontDomain}/lessons/${lessonId}/*`;

  const masterPlaylistUrl =
    `https://${cloudFrontDomain}/lessons/${lessonId}/master.m3u8`;

  const policy = {
    Statement: [
      {
        Resource: lessonFolderUrl,
        Condition: {
          DateLessThan: {
            'AWS:EpochTime': Math.floor(
              expiresAt.getTime() / 1000
            ),
          },
        },
      },
    ],
  };

  const signedWildcardUrl = getSignedUrl({
    url: lessonFolderUrl,
    keyPairId,
    privateKey,
    policy: JSON.stringify(policy),
  });

  // Copy the policy signature parameters to the actual master playlist URL.
  const signedWildcard = new URL(signedWildcardUrl);
  const signedMasterUrl = new URL(masterPlaylistUrl);

  signedWildcard.searchParams.forEach((value, key) => {
    signedMasterUrl.searchParams.set(key, value);
  });

  return {
    masterUrl: signedMasterUrl.toString(),
    expiresAt: expiresAt.toISOString(),
  };
};
