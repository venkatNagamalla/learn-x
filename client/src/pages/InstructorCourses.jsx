
import { useCallback, useEffect, useState } from 'react';
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

export default function InstructorCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      await api.patch(`/courses/${courseId}/submit`);
      toast.success('Course submitted for approval!');
      await loadCourses();
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Course submission failed.'
      );
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-600">
        Loading your courses...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              Instructor workspace
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              My Courses
            </h1>

            <p className="mt-2 text-slate-600">
              Manage your courses and track their approval status.
            </p>
          </div>

          <Link
            to="/instructor/courses/new"
            className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            + Create Course
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
            <button
              onClick={loadCourses}
              className="ml-3 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {!error && courses.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <h2 className="text-xl font-bold text-slate-800">
              You haven't created any courses yet.
            </h2>

            <p className="mt-2 text-slate-500">
              Start sharing your knowledge by creating your first course.
            </p>

            <Link
              to="/instructor/courses/new"
              className="mt-6 inline-block rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Create Your First Course
            </Link>
          </div>
        )}

        {courses.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {courses.map((course) => (
                <div
                  key={course._id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-900">
                      {course.title}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {course.category} · {formatPrice(course.price)}
                    </p>

                    <span
                      className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        course.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : course.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {course.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to={`/instructor/courses/${course._id}/edit`}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Manage Course
                    </Link>

                    <Link
                      to={`/instructor/courses/${course._id}/curriculum`}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Manage Curriculum
                    </Link>

                    <Link
                      to={`/instructor/courses/${course._id}/quizzes`}
                      className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                    >
                      Manage Quizzes
                    </Link>

                    {course.status === 'draft' && (
                      <button
                        onClick={() => submitForApproval(course._id)}
                        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                      >
                        Submit for Approval
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
