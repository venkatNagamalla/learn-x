
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export default function VideoPlayer({
  masterUrl,
  startAt = 0,
  onProgress,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const playerRef = useRef(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [levels, setLevels] = useState([]);
  const [quality, setQuality] = useState('-1');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !masterUrl) return;

    let hls;
    let progressInterval;

    video.muted = false;
    video.volume = 1;

    setError('');
    setIsLoading(true);
    setLevels([]);
    setQuality('-1');

    // Save current playback progress.
    const saveProgress = () => {
      if (
        !onProgress ||
        !Number.isFinite(video.currentTime) ||
        !Number.isFinite(video.duration) ||
        video.currentTime <= 0 ||
        video.duration <= 0
      ) {
        return;
      }

      onProgress({
        currentTime: video.currentTime,
        duration: video.duration,
      });
    };

    if (!Hls.isSupported()) {
      setError('HLS playback is not supported in this browser.');
      setIsLoading(false);
      return;
    }

    // Extract CloudFront authorization parameters.
    const signedUrl = new URL(masterUrl);
    const authParams = new URLSearchParams();

    ['Policy', 'Signature', 'Key-Pair-Id'].forEach((key) => {
      const value = signedUrl.searchParams.get(key);

      if (value) {
        authParams.set(key, value);
      }
    });

    // Add signed parameters to child playlists and video segments.
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

    hlsRef.current = hls;

    hls.loadSource(masterUrl);
    hls.attachMedia(video);

    // Read available quality levels.
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      const availableLevels = hls.levels.map((level, index) => ({
        index,
        height: level.height,
        label: level.height
          ? `${level.height}p`
          : `Level ${index + 1}`,
      }));

      setLevels(availableLevels);

      // Resume from the saved playback position.
      if (Number.isFinite(startAt) && startAt > 0) {
        video.currentTime = startAt;
      }

      setIsLoading(false);
    });

    // Save progress every 10 seconds.
    progressInterval = setInterval(() => {
      if (!video.paused && !video.ended) {
        saveProgress();
      }
    }, 10000);

    // Save progress when the student pauses.
    video.addEventListener('pause', saveProgress);

    // Handle fatal HLS errors.
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
      hlsRef.current = null;
    });

    return () => {
      // Save final progress before leaving the player.
      saveProgress();

      clearInterval(progressInterval);

      video.removeEventListener('pause', saveProgress);

      if (hls) {
        hls.destroy();
      }

      hlsRef.current = null;
    };
  }, [masterUrl, startAt, onProgress]);

  // Change video quality.
  const handleQualityChange = (event) => {
    const value = event.target.value;

    setQuality(value);

    if (hlsRef.current) {
      hlsRef.current.currentLevel = Number(value);
    }
  };

  // Sync fullscreen state with the browser.
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement === playerRef.current
      );
    };

    document.addEventListener(
      'fullscreenchange',
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        'fullscreenchange',
        handleFullscreenChange
      );
    };
  }, []);

  return (
    <div
      ref={playerRef}
      className={`relative overflow-hidden bg-black ${
        isFullscreen
          ? 'flex h-screen w-screen items-center justify-center rounded-none'
          : 'rounded-xl'
      }`}
    >
      <div
        className={`relative w-full ${
          isFullscreen ? 'h-full' : 'aspect-video'
        }`}
      >
        <video
          ref={videoRef}
          controls
          playsInline
          muted={false}
          className="h-full w-full object-contain"
        />

        {/* Quality menu */}
        {!error && levels.length > 0 && (
          <div className="absolute right-3 top-3 z-30 flex items-center gap-2 rounded-lg bg-black/85 px-3 py-2 shadow-lg">
            <label
              htmlFor="video-quality"
              className="text-xs font-medium text-white"
            >
              Quality
            </label>

            <select
              id="video-quality"
              value={quality}
              onChange={handleQualityChange}
              className="cursor-pointer rounded-md border border-slate-500 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-indigo-400"
            >
              <option value="-1">Auto</option>

              {levels.map((level) => (
                <option
                  key={level.index}
                  value={level.index}
                >
                  {level.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {isLoading && !error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
            <p className="text-sm text-white">
              Loading video...
            </p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-6">
            <p className="text-center text-sm text-red-300">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
