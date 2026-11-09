
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export default function VideoPlayer({ src }) {
  const videoRef = useRef(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !src) return;

    let hls;

    setError('');
    setIsLoading(true);

    if (!Hls.isSupported()) {
      setError(
        'HLS playback is not supported in this browser. Please use a modern browser with Media Source Extensions support.'
      );
      setIsLoading(false);
      return;
    }

    // Extract CloudFront authorization parameters.
    const signedUrl = new URL(src);
    const authParams = new URLSearchParams();

    ['Policy', 'Signature', 'Key-Pair-Id'].forEach((key) => {
      const value = signedUrl.searchParams.get(key);

      if (value) {
        authParams.set(key, value);
      }
    });

    // Add authorization parameters to every HLS request:
    // master playlist, child playlists, and video segments.
    class SignedHlsLoader extends Hls.DefaultConfig.loader {
      load(context, config, callbacks) {
        const requestUrl = new URL(context.url);

        if (requestUrl.origin === signedUrl.origin) {
          authParams.forEach((value, key) => {
            requestUrl.searchParams.set(key, value);
          });

          context.url = requestUrl.toString();
        }

        super.load(context, config, callbacks);
      }
    }

    hls = new Hls({
      loader: SignedHlsLoader,
    });

    hls.loadSource(src);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setIsLoading(false);
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (!data.fatal) return;

      setIsLoading(false);

      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        setError(
          'Unable to load the video. Please check your connection or try again.'
        );
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        setError('A video playback error occurred.');
      } else {
        setError('Video playback failed. Please try again.');
      }

      hls.destroy();
    });

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  return (
    <div className="overflow-hidden rounded-xl bg-black">
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          controls
          playsInline
          className="h-full w-full"
        />

        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <p className="text-sm text-white">
              Loading video...
            </p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
            <p className="text-center text-sm text-red-300">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
