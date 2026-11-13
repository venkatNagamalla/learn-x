
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import api from '../api/axios';
import VideoPlayer from '../components/VideoPlayer.jsx';
import QuizTaker from '../components/QuizTaker.jsx';

export default function StudentLearning() {
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [courseQuizzes, setCourseQuizzes] = useState([]);
  const [isEnrolled, setIsEnrolled] = useState(false);

  const [lessonProgress, setLessonProgress] = useState(0);
  const [quizProgress, setQuizProgress] = useState(0);
  const [completedLessonIds, setCompletedLessonIds] = useState([]);

  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const [playbackUrl, setPlaybackUrl] = useState('');
  const [resumeAt, setResumeAt] = useState(0);

  const [courseLoading, setCourseLoading] = useState(true);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [error, setError] = useState('');

  const [playbackProgress, setPlaybackProgress] = useState({
    currentTime: 0,
    duration: 0,
  });

  const loadCourse = useCallback(async () => {
    try {
      setCourseLoading(true);
      setError('');

      const { data } = await api.get(`/courses/${courseId}`);

      setCourse(data.course);
      setSections(data.sections || []);
      setCourseQuizzes(data.courseQuizzes || []);
      setIsEnrolled(Boolean(data.isEnrolled));

      setLessonProgress(data.lessonProgress || 0);
      setQuizProgress(data.quizProgress || 0);
      setCompletedLessonIds(data.completedLessonIds || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load this course.'
      );
    } finally {
      setCourseLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const handleSelectLesson = async (lesson) => {
    try {
      setSelectedLesson(lesson);
      setSelectedQuiz(null);

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
        const { data } = await api.put(
          `/progress/lessons/${selectedLesson._id}`,
          {
            watchedSeconds: progress.currentTime,
            duration: progress.duration,
          }
        );

        if (data.progress?.completed) {
          setCompletedLessonIds((previous) =>
            previous.includes(selectedLesson._id)
              ? previous
              : [...previous, selectedLesson._id]
          );
        }

        if (data.progress?.completed) {
          setLessonProgress((previous) =>
            Math.max(previous, 0)
          );
        }
      } catch (err) {
        console.error(
          'Unable to save lesson progress:',
          err.response?.data?.message || err.message
        );
      }
    },
    [selectedLesson]
  );

  const handleSelectQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setSelectedLesson(null);

    setPlaybackUrl('');
    setResumeAt(0);
    setError('');

    setPlaybackProgress({
      currentTime: 0,
      duration: 0,
    });
  };

  const handleBackFromQuiz = () => {
    setSelectedQuiz(null);
    setSelectedLesson(null);
    setPlaybackUrl('');
    setError('');
  };

  const handleQuizPassed = async () => {
    await loadCourse();
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '0:00';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const renderProgressBar = (label, value) => (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium text-slate-700">
          {label}
        </span>

        <span className="font-semibold text-slate-900">
          {value}%
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
          }}
        />
      </div>
    </div>
  );

  const renderQuizButton = (quiz) => {
    const isSelected = selectedQuiz?._id === quiz._id;

    return (
      <button
        key={quiz._id}
        type="button"
        onClick={() => handleSelectQuiz(quiz)}
        className={`w-full rounded-lg border p-3 text-left transition ${
          isSelected
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-slate-200 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-slate-800">
            {quiz.title}
          </span>

          {quiz.passed ? (
            <span className="shrink-0 text-xs font-semibold text-green-600">
              Passed ✓
            </span>
          ) : (
            <span className="shrink-0 text-xs text-slate-500">
              Quiz
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>Pass: {quiz.passPercent}%</span>
          <span>
            Attempts: {quiz.attemptsUsed}/{quiz.maxAttempts}
          </span>
          <span>Left: {quiz.attemptsLeft}</span>
        </div>
      </button>
    );
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

  const isCourseCompleted =
    lessonProgress >= 100 && quizProgress >= 100;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to={`/courses/${courseId}`}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to course details
        </Link>

        {/* Course heading */}
        <div className="mt-5">
          <h1 className="text-2xl font-bold text-slate-900">
            {course.title}
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Continue your learning journey.
          </p>
        </div>

        {/* Course completion banner */}
        {isCourseCompleted && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-green-800">
                  🎉 Course Completed!
                </h2>

                <p className="mt-1 text-sm text-green-700">
                  Congratulations! You have completed all lessons
                  and passed all required quizzes.
                </p>
              </div>

              <Link
                to="/certificates"
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800"
              >
                View Certificates
              </Link>
            </div>
          </div>
        )}

        {/* Separate progress bars */}
        <div className="mt-6 grid gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
          {renderProgressBar('Lesson Progress', lessonProgress)}
          {renderProgressBar('Quiz Progress', quizProgress)}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Main content area */}
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
              ) : selectedQuiz ? (
                <QuizTaker
                  key={selectedQuiz._id}
                  quizId={selectedQuiz._id}
                  onBack={handleBackFromQuiz}
                  onPassed={handleQuizPassed}
                />
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-900 p-6 text-center text-white">
                  Select a lesson or quiz from the curriculum to start.
                </div>
              )}

              {error && (
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

            <div className="mt-5 space-y-6">
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

                      const isCompleted =
                        completedLessonIds.includes(lesson._id) ||
                        lesson.completed;

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
                            ) : isCompleted ? (
                              <span className="text-green-600">
                                ✓ Completed
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

                  {section.quizzes?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold text-slate-700">
                        Section Quizzes
                      </h4>

                      <div className="space-y-2">
                        {section.quizzes.map(renderQuizButton)}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {courseQuizzes.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="mb-3 font-semibold text-slate-800">
                    Course Quizzes
                  </h3>

                  <div className="space-y-2">
                    {courseQuizzes.map(renderQuizButton)}
                  </div>
                </div>
              )}

              {sections.length === 0 && courseQuizzes.length === 0 && (
                <p className="text-sm text-slate-500">
                  No lessons or quizzes have been added to this course yet.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
