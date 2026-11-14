
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';

import api from '../api/axios.js';
import { getUpcomingLiveClasses } from '../api/liveClassApi.js';

const demoCourseImages = {
  Development: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=700&q=70',
  Programming: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=700&q=70',
  Business: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=700&q=70',
  Design: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=700&q=70',
  'IT & Software': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=700&q=70',
};

const defaultCourseImage =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=700&q=70';

const getCourseImage = (course) =>
  course.thumbnail || demoCourseImages[course.category] || defaultCourseImage;

const getProgress = (value) => {
  const progress = Number(value) || 0;
  return Math.min(100, Math.max(0, progress));
};

const getInitials = (name) => {
  if (!name) return 'S';

  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const formatDate = (date) => {
  if (!date) return 'Date not available';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date not available';
  }

  return parsedDate.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

function ProgressBar({ label, value, color }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className="text-sm font-bold tabular-nums text-slate-800">
          {value}%
        </span>
      </div>

      <div
        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const [courses, setCourses] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const loadDashboard = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const [courseResponse, liveResponse] = await Promise.all([
        api.get('/enrollments/mine'),
        getUpcomingLiveClasses(),
      ]);

      setCourses(courseResponse.data.items || []);
      setLiveClasses(liveResponse.items || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to load your learning dashboard'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(true);

    const interval = setInterval(() => {
      loadDashboard();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadDashboard]);

  const handleJoinClass = (classId) => {
    navigate(`/student/live-classes/${classId}`);
  };

  const stats = useMemo(() => {
    const completedCourses = courses.filter(
      (enrollment) => Boolean(enrollment.completedAt)
    ).length;

    const totalLessonProgress = courses.reduce(
      (sum, enrollment) => sum + getProgress(enrollment.lessonProgress),
      0
    );

    return {
      enrolled: courses.length,
      completed: completedCourses,
      averageProgress: courses.length
        ? Math.round(totalLessonProgress / courses.length)
        : 0,
      live: liveClasses.filter(
        (liveClass) => liveClass.status === 'live'
      ).length,
    };
  }, [courses, liveClasses]);

  if (loading) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="mt-5 text-base font-medium text-slate-600">
            Loading your learning dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">

        {/* Welcome Section */}
        <section className="relative mb-9 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-700 to-violet-800 px-6 py-8 shadow-xl shadow-indigo-200/50 sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-violet-300/20 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
            <div>
              <p
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color: '#FFFFFF' }}
              >
                Student Dashboard
              </p>

              <h1
                className="mt-3 font-[Manrope] text-3xl font-extrabold leading-tight sm:text-4xl"
                style={{ color: '#FFFFFF' }}
              >
                Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
              </h1>

              <p
                className="mt-3 max-w-xl text-base leading-7"
                style={{ color: '#FFFFFF' }}
              >
                Keep learning, track your progress, and take the next step
                toward your goals.
              </p>

              <Link
                to="/courses"
                className="mt-6 inline-flex items-center rounded-xl bg-white px-6 py-3 font-bold shadow-md transition hover:-translate-y-0.5 hover:bg-indigo-50"
                style={{ color: '#4338CA' }}
              >
                Explore More Courses <span className="ml-2">→</span>
              </Link>
            </div>

            <div className="flex items-center gap-4 self-start rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:self-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-extrabold text-indigo-700 shadow-sm">
                {getInitials(user?.name)}
              </div>

              <div>
                <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                  Your learning space
                </p>
                <p
                  className="mt-1 font-[Manrope] text-lg font-bold"
                  style={{ color: '#FFFFFF' }}
                >
                  Keep Growing
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Learning Statistics */}
        <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Enrolled Courses', value: stats.enrolled, icon: '📚', bg: 'bg-indigo-50' },
            { label: 'Completed Courses', value: stats.completed, icon: '🏆', bg: 'bg-emerald-50' },
            { label: 'Average Lesson Progress', value: `${stats.averageProgress}%`, icon: '📈', bg: 'bg-blue-50' },
            { label: 'Live Classes Now', value: stats.live, icon: '🎥', bg: 'bg-rose-50' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </p>
                  <p
                    className="mt-2 font-[Manrope] font-extrabold leading-none text-slate-900"
                    style={{ fontSize: '42px' }}
                  >
                    {stat.value}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg} text-2xl`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* My Courses */}
        <section className="mb-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
                Your Learning Journey
              </p>
              <h2 className="mt-2 font-[Manrope] text-2xl font-extrabold text-slate-900 sm:text-3xl">
                My Courses
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Pick up where you left off and keep making progress.
              </p>
            </div>

            <Link
              to="/courses"
              className="font-semibold text-indigo-600 transition hover:text-indigo-800"
            >
              Explore Courses →
            </Link>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <div className="text-5xl">📚</div>
              <h3 className="mt-5 font-[Manrope] text-xl font-bold text-slate-900">
                Start Your Learning Journey
              </h3>
              <p className="mx-auto mt-2 max-w-md text-base leading-7 text-slate-500">
                You haven't enrolled in any courses yet. Explore the course
                catalog and find something new to learn.
              </p>
              <Link
                to="/courses"
                className="mt-6 inline-flex rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white transition hover:bg-indigo-700"
                style={{ color: '#FFFFFF' }}
              >
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((enrollment) => {
                const course = enrollment.course;
                if (!course) return null;

                const lessonProgress = getProgress(enrollment.lessonProgress);
                const quizProgress = getProgress(enrollment.quizProgress);
                const completed = Boolean(enrollment.completedAt);

                return (
                  <article
                    key={enrollment.enrollmentId}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/60"
                  >
                    <div className="relative overflow-hidden bg-slate-100">
                      <img
                        src={getCourseImage(course)}
                        alt={course.title}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = defaultCourseImage;
                        }}
                        className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
                      />

                      <div className="absolute left-4 top-4">
                        <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm">
                          {course.category || 'Course'}
                        </span>
                      </div>

                      {completed && (
                        <div className="absolute right-4 top-4">
                          <span className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
                            ✓ Completed
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 sm:p-6">
                      <h3 className="line-clamp-2 min-h-14 font-[Manrope] text-xl font-bold leading-snug text-slate-900">
                        {course.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-6 text-slate-500">
                        {course.description}
                      </p>

                      <p className="mt-3 text-sm text-slate-500">
                        Instructor:{' '}
                        <span className="font-semibold text-slate-700">
                          {course.instructor?.name || 'Instructor'}
                        </span>
                      </p>

                      <div className="mt-6 space-y-5 rounded-xl bg-slate-50 p-4">
                        <ProgressBar
                          label="Lesson Progress"
                          value={lessonProgress}
                          color="bg-indigo-600"
                        />
                        <ProgressBar
                          label="Quiz Progress"
                          value={quizProgress}
                          color="bg-emerald-500"
                        />
                      </div>

                      <Link
                        to={`/student/courses/${course._id}/learn`}
                        className="mt-5 block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center font-bold transition hover:bg-indigo-700"
                        style={{ color: '#FFFFFF' }}
                      >
                        {completed ? 'Review Course →' : 'Continue Learning →'}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Upcoming Live Classes */}
        <section className="pb-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
                Learn Together
              </p>
              <h2 className="mt-2 font-[Manrope] text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Upcoming Live Classes
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Join your instructor for interactive learning sessions.
              </p>
            </div>

            <Link
              to="/student/live-classes"
              className="font-semibold text-indigo-600 transition hover:text-indigo-800"
            >
              View All Classes →
            </Link>
          </div>

          {liveClasses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              <div className="text-4xl">🎥</div>
              <h3 className="mt-4 font-[Manrope] text-lg font-bold text-slate-800">
                No Upcoming Live Classes
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                There are no upcoming live classes at the moment. Check back
                later for new sessions.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {liveClasses.map((liveClass) => {
                const isLive = liveClass.status === 'live';

                return (
                  <article
                    key={liveClass._id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-lg sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-2xl">
                          🎥
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-[Manrope] text-lg font-bold text-slate-900">
                            {liveClass.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {liveClass.course?.title || 'Course'}
                          </p>
                        </div>
                      </div>

                      {isLive ? (
                        <span className="flex shrink-0 items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
                          LIVE NOW
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                          SCHEDULED
                        </span>
                      )}
                    </div>

                    <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                      <p className="text-sm text-slate-600">
                        <span className="mr-2">👨‍🏫</span>
                        Instructor:{' '}
                        <span className="font-semibold text-slate-800">
                          {liveClass.instructor?.name || 'Instructor'}
                        </span>
                      </p>
                      <p className="text-sm text-slate-600">
                        <span className="mr-2">🗓️</span>
                        {formatDate(liveClass.scheduledAt)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleJoinClass(liveClass._id)}
                      disabled={!isLive}
                      className={`mt-5 w-full rounded-xl px-4 py-3 font-bold transition ${
                        isLive
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'cursor-not-allowed bg-slate-100 text-slate-500'
                      }`}
                      style={isLive ? { color: '#FFFFFF' } : undefined}
                    >
                      {isLive ? 'Join Live Class →' : 'Waiting for Instructor'}
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          <p className="mt-5 text-center text-xs text-slate-400">
            Live class information refreshes automatically every 30 seconds.
          </p>
        </section>
      </div>
    </main>
  );
}
