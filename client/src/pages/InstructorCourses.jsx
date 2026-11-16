
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios.js';

const formatPrice = (price) => {
  if (price === 0) return 'Free';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'published':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'rejected':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getCourseImage = (course) => {
  if (course.thumbnail) return course.thumbnail;

  const category = (course.category || '').toLowerCase();

  if (category.includes('design')) {
    return 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&q=75&auto=format&fit=crop';
  }

  if (category.includes('business')) {
    return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=75&auto=format&fit=crop';
  }

  if (category.includes('programming') || category.includes('development')) {
    return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=75&auto=format&fit=crop';
  }

  if (category.includes('data')) {
    return 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=75&auto=format&fit=crop';
  }

  return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=75&auto=format&fit=crop';
};

export default function InstructorCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingId, setSubmittingId] = useState(null);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data } = await api.get('/courses/mine');
      setCourses(data.items || []);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to load your courses.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const submitForApproval = async (courseId) => {
    try {
      setSubmittingId(courseId);

      await api.patch(`/courses/${courseId}/submit`);

      toast.success('Course submitted for approval!');
      await loadCourses();
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Course submission failed.'
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const stats = useMemo(
    () => ({
      total: courses.length,
      published: courses.filter((course) => course.status === 'published').length,
      pending: courses.filter((course) => course.status === 'pending').length,
      drafts: courses.filter((course) => course.status === 'draft').length,
    }),
    [courses]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
        <p className="text-lg font-medium text-slate-600">
          Loading your courses...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Welcome Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 px-6 py-7 shadow-lg sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border-[35px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 right-1/4 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl">
              <p
                className="text-base font-bold uppercase tracking-[0.18em]"
                style={{ color: '#E0E7FF' }}
              >
                Instructor Workspace
              </p>

              <h1
                className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
                style={{ color: '#FFFFFF' }}
              >
                My Courses
              </h1>

              <p
                className="mt-3 text-lg leading-7"
                style={{ color: '#EEF2FF' }}
              >
                Manage your learning content, organize your curriculum, and
                track course approval status.
              </p>

              <Link
                to="/instructor/courses/new"
                className="mt-5 inline-flex items-center rounded-xl bg-white px-5 py-3 text-base font-bold shadow-sm transition hover:bg-indigo-50"
                style={{ color: '#4338CA' }}
              >
                + Create New Course
              </Link>
            </div>

            <div className="hidden h-28 w-28 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-6xl shadow-inner sm:flex">
              📚
            </div>
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-base font-medium text-red-700">{error}</p>

            <button
              onClick={loadCourses}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-base font-semibold text-white hover:bg-red-700"
              style={{ color: '#FFFFFF' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Course Statistics */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: 'Total Courses',
              value: stats.total,
              icon: '📚',
              style: 'bg-indigo-50 text-indigo-700',
            },
            {
              title: 'Published',
              value: stats.published,
              icon: '✓',
              style: 'bg-emerald-50 text-emerald-700',
            },
            {
              title: 'Pending Approval',
              value: stats.pending,
              icon: '⏳',
              style: 'bg-amber-50 text-amber-700',
            },
            {
              title: 'Draft Courses',
              value: stats.drafts,
              icon: '📝',
              style: 'bg-blue-50 text-blue-700',
            },
          ].map((stat) => (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-[17px] font-medium text-slate-500">
                  {stat.title}
                </p>

                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${stat.style}`}
                >
                  {stat.icon}
                </span>
              </div>

              <p
                className="mt-3 font-bold tracking-tight text-slate-900"
                style={{ fontSize: '44px', lineHeight: 1.15 }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        {/* Course List Heading */}
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Your Learning Content
              </h2>
              <p className="mt-1 text-[17px] text-slate-500">
                All courses created by you.
              </p>
            </div>

            <span className="rounded-full bg-indigo-50 px-4 py-2 text-base font-semibold text-indigo-700">
              {courses.length} {courses.length === 1 ? 'Course' : 'Courses'}
            </span>
          </div>

          {/* Empty State */}
          {!error && courses.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-4xl">
                📚
              </div>

              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                You haven't created any courses yet.
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-lg leading-7 text-slate-500">
                Start sharing your knowledge with students by creating your
                first course.
              </p>

              <Link
                to="/instructor/courses/new"
                className="mt-6 inline-flex rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white shadow-sm transition hover:bg-indigo-700"
                style={{ color: '#FFFFFF' }}
              >
                Create Your First Course
              </Link>
            </div>
          )}

          {/* Course Cards */}
          {courses.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-2">
              {courses.map((course) => (
                <article
                  key={course._id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Course Image */}
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    <img
                      src={getCourseImage(course)}
                      alt={course.title}
                      className="h-full w-full object-cover transition duration-500 hover:scale-105"
                      loading="lazy"
                    />

                    <span
                      className={`absolute right-4 top-4 rounded-full border px-4 py-2 text-sm font-bold capitalize shadow-sm ${getStatusStyle(course.status)}`}
                    >
                      {course.status}
                    </span>
                  </div>

                  {/* Course Details */}
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-bold leading-snug text-slate-900">
                          {course.title}
                        </h3>

                        <p className="mt-2 text-base text-slate-500">
                          {course.category || 'General'} 
                        </p>
                      </div>

                      <span className="shrink-0 rounded-xl bg-indigo-50 px-4 py-2 text-base font-bold text-indigo-700">
                        {formatPrice(course.price)}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                      <span className="text-lg">📖</span>
                      <span className="text-base font-medium text-slate-600">
                        Course management
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Link
                        to={`/instructor/courses/${course._id}/edit`}
                        className="flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        Manage Course
                      </Link>

                      <Link
                        to={`/instructor/courses/${course._id}/curriculum`}
                        className="flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-indigo-700"
                        style={{ color: '#FFFFFF' }}
                      >
                        Manage Curriculum
                      </Link>

                      <Link
                        to={`/instructor/courses/${course._id}/quizzes`}
                        className="flex items-center justify-center rounded-xl bg-violet-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-violet-700"
                        style={{ color: '#FFFFFF' }}
                      >
                        Manage Quizzes
                      </Link>

                      {course.status === 'draft' && (
                        <button
                          onClick={() => submitForApproval(course._id)}
                          disabled={submittingId === course._id}
                          className="flex items-center justify-center rounded-xl bg-slate-800 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                          style={{ color: '#FFFFFF' }}
                        >
                          {submittingId === course._id
                            ? 'Submitting...'
                            : 'Submit for Approval'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}