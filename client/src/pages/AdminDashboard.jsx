
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';

export default function AdminDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');

  const fetchPendingCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/admin/courses/pending');

      setCourses(response.data.items || []);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to load pending courses';

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingCourses();
  }, [fetchPendingCourses]);

  const handleCourseAction = async (courseId, status) => {
    const action = status === 'published' ? 'approve' : 'reject';

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this course?`
    );

    if (!confirmed) return;

    try {
      setProcessingId(courseId);

      const response = await api.patch(
        `/admin/courses/${courseId}/status`,
        { status }
      );

      setCourses((previousCourses) =>
        previousCourses.filter(
          (course) => course._id !== courseId
        )
      );

      toast.success(
        response.data.message ||
          `Course ${action}d successfully`
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          `Failed to ${action} course`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-lg font-medium text-slate-600">
          Loading pending courses...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              Administration
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-slate-600">
              Review instructor submissions and manage course approvals.
            </p>
          </div>

          <button
            onClick={fetchPendingCourses}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Refresh Courses
          </button>
        </div>

        {/* Statistics */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Pending Approvals
            </p>

            <h2 className="mt-2 text-3xl font-bold text-indigo-600">
              {courses.length}
            </h2>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Dashboard Status
            </p>

            <h2 className="mt-2 text-xl font-bold text-green-600">
              Active
            </h2>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Pending Courses */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">
            Courses Awaiting Approval
          </h2>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mb-4 text-5xl">🎉</div>

            <h3 className="text-xl font-bold text-slate-800">
              No Pending Courses
            </h3>

            <p className="mt-2 text-slate-500">
              All submitted courses have been reviewed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {courses.map((course) => (
              <div
                key={course._id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Thumbnail */}
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-48 w-full bg-slate-100 object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-slate-200">
                    <span className="text-slate-500">
                      No Course Thumbnail
                    </span>
                  </div>
                )}

                <div className="p-6">

                  {/* Course Information */}
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                      {course.category}
                    </span>

                    <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                      Pending Review
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900">
                    {course.title}
                  </h3>

                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                    {course.description}
                  </p>

                  {/* Metadata */}
                  <div className="mt-5 grid grid-cols-2 gap-4 border-y border-slate-100 py-4">

                    <div>
                      <p className="text-xs text-slate-500">
                        Instructor
                      </p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {course.instructor?.name || 'Unknown'}
                      </p>

                      <p className="break-all text-xs text-slate-500">
                        {course.instructor?.email || ''}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Course Price
                      </p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {formatPrice(course.price)}
                      </p>

                      <p className="mt-1 text-xs capitalize text-slate-500">
                        {course.level || 'Not specified'}
                      </p>
                    </div>

                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">

                    <button
                      onClick={() =>
                        handleCourseAction(course._id, 'published')
                      }
                      disabled={processingId === course._id}
                      className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processingId === course._id
                        ? 'Processing...'
                        : 'Approve Course'}
                    </button>

                    <button
                      onClick={() =>
                        handleCourseAction(course._id, 'draft')
                      }
                      disabled={processingId === course._id}
                      className="flex-1 rounded-lg border border-red-300 bg-white px-4 py-3 font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reject Course
                    </button>

                  </div>
                </div>
              </div>
            ))}

          </div>
        )}
      </div>
    </div>
  );
}
