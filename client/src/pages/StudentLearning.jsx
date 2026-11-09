
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import api from '../api/axios';
import VideoPlayer from '../components/VideoPlayer.jsx';

export default function StudentLearning() {
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [resumeAt, setResumeAt] = useState(0);

  const [courseLoading, setCourseLoading] = useState(true);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [error, setError] = useState('');

  const [playbackProgress, setPlaybackProgress] = useState({
    currentTime: 0,
    duration: 0,
  });

  // Fetch course details, curriculum, and enrollment status.
  useEffect(() => {
    let cancelled = false;

    const loadCourse = async () => {
      try {
        setCourseLoading(true);
        setError('');

        const { data } = await api.get(`/courses/${courseId}`);

        if (cancelled) return;

        setCourse(data.course);
        setSections(data.sections);
        setIsEnrolled(Boolean(data.isEnrolled));
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              'Unable to load this course.'
          );
        }
      } finally {
        if (!cancelled) {
          setCourseLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  // Request playback access and retrieve saved progress.
  const handleSelectLesson = async (lesson) => {
    try {
      setSelectedLesson(lesson);
      setPlaybackUrl('');
      setResumeAt(0);
      setError('');

      setPlaybackProgress({
        currentTime: 0,
        duration: 0,
      });

      setPlaybackLoading(true);

      const [playbackResponse, progressResponse] =
        await Promise.all([
          api.get(`/student/lessons/${lesson._id}/playback`),
          api.get(`/progress/lessons/${lesson._id}`),
        ]);

      setPlaybackUrl(playbackResponse.data.playback.masterUrl);

      const savedSeconds =
        progressResponse.data.watchedSeconds || 0;

      setResumeAt(savedSeconds);

      setPlaybackProgress({
        currentTime: savedSeconds,
        duration: 0,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load this lesson.'
      );
    } finally {
      setPlaybackLoading(false);
    }
  };

  // Receive playback progress and save it to the backend.
  const handleProgress = useCallback(
    async (progress) => {
      setPlaybackProgress(progress);

      if (
        !selectedLesson ||
        progress.currentTime <= 0 ||
        progress.duration <= 0
      ) {
        return;
      }

      try {
        await api.put(
          `/progress/lessons/${selectedLesson._id}`,
          {
            watchedSeconds: progress.currentTime,
            duration: progress.duration,
          }
        );
      } catch (err) {
        console.error(
          'Unable to save lesson progress:',
          err.response?.data?.message || err.message
        );
      }
    },
    [selectedLesson]
  );

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '0:00';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  if (courseLoading) {
    return (
      <div className="p-8 text-center text-slate-600">
        Loading course...
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <p className="text-red-600">{error}</p>

        <Link
          to="/courses"
          className="mt-4 inline-block text-indigo-600 hover:underline"
        >
          Back to courses
        </Link>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to={`/courses/${courseId}`}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to course details
        </Link>

        <div className="mt-5">
          <h1 className="text-2xl font-bold text-slate-900">
            {course.title}
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Select a lesson from the curriculum to start learning.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Video player */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {selectedLesson ? (
                <>
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">
                    {selectedLesson.title}
                  </h2>

                  {playbackLoading ? (
                    <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-900 text-white">
                      Preparing video...
                    </div>
                  ) : playbackUrl ? (
                    <>
                      <VideoPlayer
                        masterUrl={playbackUrl}
                        startAt={resumeAt}
                        onProgress={handleProgress}
                      />

                      <p className="mt-3 text-sm text-slate-500">
                        Playback progress:{' '}
                        {formatTime(playbackProgress.currentTime)}
                        {' / '}
                        {formatTime(playbackProgress.duration)}
                      </p>
                    </>
                  ) : (
                    <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-900 p-6 text-center text-slate-300">
                      {error || 'Video is not available.'}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-900 p-6 text-center text-white">
                  Select a lesson to start watching.
                </div>
              )}

              {error && selectedLesson && playbackUrl && (
                <p className="mt-3 text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* Course curriculum */}
          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Course curriculum
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {sections.length} sections
            </p>

            <div className="mt-5 space-y-5">
              {sections.map((section, index) => (
                <div key={section._id}>
                  <h3 className="mb-3 font-semibold text-slate-800">
                    {index + 1}. {section.title}
                  </h3>

                  <div className="space-y-2">
                    {section.lessons.map((lesson) => {
                      const isLocked =
                        course.price > 0 &&
                        !lesson.isPreview &&
                        !isEnrolled;

                      const isSelected =
                        selectedLesson?._id === lesson._id;

                      return (
                        <button
                          key={lesson._id}
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleSelectLesson(lesson)}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-slate-200 hover:bg-slate-50'
                          } ${
                            isLocked
                              ? 'cursor-not-allowed opacity-50'
                              : ''
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-800">
                              {lesson.title}
                            </span>

                            <span className="mt-1 block text-xs text-slate-500">
                              {lesson.duration || 0} minutes
                            </span>
                          </span>

                          <span className="shrink-0 text-xs font-medium">
                            {isLocked ? (
                              <span className="text-slate-500">
                                Locked
                              </span>
                            ) : lesson.isPreview ? (
                              <span className="text-green-600">
                                Preview
                              </span>
                            ) : (
                              <span className="text-indigo-600">
                                Play
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {sections.length === 0 && (
                <p className="text-sm text-slate-500">
                  No lessons have been added to this course yet.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
