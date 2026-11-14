
import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const allLessons = useMemo(
    () =>
      sections.flatMap((section) =>
        (section.lessons || []).map((lesson) => ({
          ...lesson,
          sectionTitle: section.title,
        }))
      ),
    [sections]
  );

  const selectedLessonIndex = allLessons.findIndex(
    (lesson) => lesson._id === selectedLesson?._id
  );

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

  const handleNextLesson = () => {
    if (
      selectedLessonIndex >= 0 &&
      selectedLessonIndex < allLessons.length - 1
    ) {
      handleSelectLesson(allLessons[selectedLessonIndex + 1]);
    }
  };

  const handlePreviousLesson = () => {
    if (selectedLessonIndex > 0) {
      handleSelectLesson(allLessons[selectedLessonIndex - 1]);
    }
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '0:00';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const isCourseCompleted =
    lessonProgress >= 100 && quizProgress >= 100;

  const renderProgressBar = (label, value, description) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-700">
            {label}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>

        <span className="text-2xl font-bold text-slate-900">
          {value}%
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-500"
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
        className={`w-full rounded-xl border p-4 text-left transition ${
          isSelected
            ? 'border-indigo-400 bg-indigo-50 shadow-sm'
            : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </span>

            <span className="text-base font-semibold text-slate-800">
              {quiz.title}
            </span>
          </div>

          {quiz.passed ? (
            <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-sm font-semibold text-green-700">
              Passed ✓
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-1 text-sm font-semibold text-violet-700">
              Quiz
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 pl-12 text-sm text-slate-500">
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
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="mt-4 text-base font-medium text-slate-600">
            Loading your learning space...
          </p>
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-medium text-red-600">
            {error}
          </p>

          <Link
            to="/courses"
            className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-base font-semibold text-white hover:bg-indigo-700"
            style={{ color: '#FFFFFF' }}
          >
            Back to courses
          </Link>
        </div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <Link
          to={`/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-base font-semibold text-indigo-600 transition hover:text-indigo-800"
        >
          <span>←</span>
          Back to course details
        </Link>

        <div className="mt-5 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-6 shadow-lg sm:p-8">
          <div className="relative z-10">
            <p
              className="text-base font-semibold"
              style={{ color: '#E0E7FF' }}
            >
              YOUR LEARNING SPACE
            </p>

            <h1
              className="mt-3 max-w-4xl text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl"
              style={{ color: '#FFFFFF' }}
            >
              {course.title}
            </h1>

            <p
              className="mt-3 max-w-2xl text-base leading-7 sm:text-lg"
              style={{ color: '#E0E7FF' }}
            >
              Keep learning, complete your lessons, and build your skills one step at a time.
            </p>

            <div
              className="mt-5 flex flex-wrap items-center gap-3 text-base"
              style={{ color: '#FFFFFF' }}
            >
              <span className="rounded-full bg-white/15 px-4 py-2 font-medium">
                {allLessons.length} Lessons
              </span>
              <span className="rounded-full bg-white/15 px-4 py-2 font-medium">
                {sections.length} Sections
              </span>
              <span className="rounded-full bg-white/15 px-4 py-2 font-medium">
                {courseQuizzes.length +
                  sections.reduce(
                    (total, section) =>
                      total + (section.quizzes?.length || 0),
                    0
                  )} Quizzes
              </span>
            </div>
          </div>
        </div>

        {isCourseCompleted && (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-green-200 bg-green-50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-bold text-green-800">
                🎉 Course Completed!
              </p>
              <p className="mt-1 text-base leading-6 text-green-700">
                Congratulations! You have completed all lessons and passed all required quizzes.
              </p>
            </div>

            <Link
              to="/certificates"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-base font-semibold text-white transition hover:bg-green-800"
              style={{ color: '#FFFFFF' }}
            >
              View Certificates
            </Link>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {renderProgressBar(
            'Lesson Progress',
            lessonProgress,
            'Based on completed lessons'
          )}

          {renderProgressBar(
            'Quiz Progress',
            quizProgress,
            'Based on passed quizzes'
          )}
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-3">
          <main className="min-w-0 lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                    NOW LEARNING
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">
                    {selectedLesson
                      ? selectedLesson.title
                      : selectedQuiz
                        ? selectedQuiz.title
                        : 'Course content'}
                  </h2>
                </div>

                {selectedLesson && (
                  <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
                    Lesson {selectedLessonIndex + 1} of {allLessons.length}
                  </span>
                )}
              </div>

              <div className="p-4 sm:p-5">
                {selectedLesson ? (
                  <>
                    {playbackLoading ? (
                      <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-900 text-white">
                        <div className="text-center">
                          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                          <p className="mt-4 text-base font-medium text-slate-200">
                            Preparing your video...
                          </p>
                        </div>
                      </div>
                    ) : playbackUrl ? (
                      <>
                        <VideoPlayer
                          masterUrl={playbackUrl}
                          startAt={resumeAt}
                          onProgress={handleProgress}
                        />

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3">
                          <span className="text-base font-medium text-slate-600">
                            Playback progress
                          </span>
                          <span className="text-base font-bold tabular-nums text-slate-800">
                            {formatTime(playbackProgress.currentTime)}
                            {' / '}
                            {formatTime(playbackProgress.duration)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-900 p-6 text-center text-base text-slate-200">
                        {error || 'Video is not available.'}
                      </div>
                    )}

                    <div className="mt-5 flex flex-col justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                      <button
                        type="button"
                        onClick={handlePreviousLesson}
                        disabled={selectedLessonIndex <= 0}
                        className="rounded-xl border border-slate-200 px-5 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ← Previous Lesson
                      </button>

                      <button
                        type="button"
                        onClick={handleNextLesson}
                        disabled={
                          selectedLessonIndex < 0 ||
                          selectedLessonIndex >= allLessons.length - 1
                        }
                        className="rounded-xl bg-indigo-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ color: '#FFFFFF' }}
                      >
                        Next Lesson →
                      </button>
                    </div>
                  </>
                ) : selectedQuiz ? (
                  <QuizTaker
                    key={selectedQuiz._id}
                    quizId={selectedQuiz._id}
                    onBack={handleBackFromQuiz}
                    onPassed={handleQuizPassed}
                  />
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center rounded-xl bg-slate-900 p-6 text-center text-white">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl">
                      ▶
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-white">
                      Ready to start learning?
                    </h3>
                    <p className="mt-2 max-w-md text-base leading-6 text-slate-300">
                      Choose a lesson or quiz from the curriculum to begin.
                    </p>
                  </div>
                )}

                {error && (
                  <p className="mt-4 rounded-lg bg-red-50 p-3 text-base text-red-600">
                    {error}
                  </p>
                )}
              </div>
            </div>

            {selectedLesson && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  CURRENT SECTION
                </p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  {selectedLesson.sectionTitle ||
                    sections.find((section) =>
                      section.lessons?.some(
                        (lesson) => lesson._id === selectedLesson._id
                      )
                    )?.title ||
                    'Course lesson'}
                </h3>
                <p className="mt-2 text-base text-slate-500">
                  {selectedLesson.duration || 0} minutes
                  {selectedLesson.isPreview ? ' · Preview lesson' : ''}
                </p>
              </div>
            )}
          </main>

          <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Course Curriculum
                </h2>
                <p className="mt-1 text-base text-slate-500">
                  {sections.length} sections · {allLessons.length} lessons
                </p>
              </div>

              <span className="rounded-xl bg-indigo-50 px-3 py-2 text-base font-bold text-indigo-700">
                {lessonProgress}%
              </span>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, lessonProgress))}%`,
                }}
              />
            </div>

            <div className="mt-6 space-y-6">
              {sections.map((section, index) => (
                <div key={section._id}>
                  <div className="mb-3">
                    <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                      SECTION {index + 1}
                    </p>
                    <h3 className="mt-1 font-bold text-slate-800">
                      {section.title}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {(section.lessons || []).map((lesson, lessonIndex) => {
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
                          className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                            isSelected
                              ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                              : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                          } ${
                            isLocked
                              ? 'cursor-not-allowed opacity-50'
                              : ''
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-bold ${
                              isCompleted
                                ? 'bg-green-100 text-green-700'
                                : isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isCompleted ? '✓' : lessonIndex + 1}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block text-base font-semibold leading-6 text-slate-800">
                              {lesson.title}
                            </span>
                            <span className="mt-1 block text-sm text-slate-500">
                              {lesson.duration || 0} min
                            </span>
                          </span>

                          <span className="shrink-0 text-sm font-semibold">
                            {isLocked ? (
                              <span className="text-slate-500">🔒</span>
                            ) : isCompleted ? (
                              <span className="text-green-600">Done</span>
                            ) : lesson.isPreview ? (
                              <span className="text-green-600">Preview</span>
                            ) : (
                              <span className="text-indigo-600">Play</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {section.quizzes?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
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
                <div className="border-t border-slate-200 pt-5">
                  <h3 className="mb-3 text-base font-bold text-slate-800">
                    Course Quizzes
                  </h3>
                  <div className="space-y-2">
                    {courseQuizzes.map(renderQuizButton)}
                  </div>
                </div>
              )}

              {sections.length === 0 && courseQuizzes.length === 0 && (
                <p className="rounded-xl bg-slate-50 p-4 text-base text-slate-500">
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
