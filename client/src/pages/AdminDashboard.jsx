
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import {
  getAdminSummary,
  getAdminUsers,
  updateUserBlockStatus,
  getPendingCourses,
  updateCourseStatus,
  getAdminEarnings,
  markEarningAsPaid,
} from '../api/adminApi.js';

const formatPrice = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format((amount || 0) / 100);

const formatDate = (date) => {
  if (!date) return '—';

  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const StatCard = ({ title, value, description }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-sm font-medium text-slate-500">{title}</p>
    <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{description}</p>
  </div>
);

const SectionTitle = ({ title, description }) => (
  <div className="mb-5">
    <h2 className="text-xl font-bold text-slate-900">{title}</h2>
    <p className="mt-1 text-sm text-slate-500">{description}</p>
  </div>
);

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [userPagination, setUserPagination] = useState({});
  const [earnings, setEarnings] = useState([]);
  const [earningPagination, setEarningPagination] = useState({});

  const [roleFilter, setRoleFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [payoutFilter, setPayoutFilter] = useState('');

  const [userPage, setUserPage] = useState(1);
  const [earningPage, setEarningPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = useCallback(async () => {
    const data = await getAdminSummary();
    setSummary(data);
  }, []);

  const fetchCourses = useCallback(async () => {
    const data = await getPendingCourses();
    setCourses(data);
  }, []);

  const fetchUsers = useCallback(async () => {
    const data = await getAdminUsers({
      page: userPage,
      limit: 10,
      role: roleFilter,
      search: userSearch,
    });

    setUsers(data.items || []);
    setUserPagination(data.pagination || {});
  }, [userPage, roleFilter, userSearch]);

  const fetchEarnings = useCallback(async () => {
    const data = await getAdminEarnings({
      page: earningPage,
      limit: 10,
      payoutStatus: payoutFilter,
    });

    setEarnings(data.items || []);
    setEarningPagination(data.pagination || {});
  }, [earningPage, payoutFilter]);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);

      await Promise.all([
        fetchSummary(),
        fetchCourses(),
        fetchUsers(),
        fetchEarnings(),
      ]);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to load admin dashboard'
      );
    } finally {
      setLoading(false);
    }
  }, [
    fetchSummary,
    fetchCourses,
    fetchUsers,
    fetchEarnings,
  ]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      await Promise.all([
        fetchSummary(),
        fetchCourses(),
        fetchUsers(),
        fetchEarnings(),
      ]);

      toast.success('Dashboard refreshed');
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to refresh dashboard'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleCourseAction = async (courseId, status) => {
    const action = status === 'published' ? 'approve' : 'reject';

    if (!window.confirm(`Are you sure you want to ${action} this course?`)) {
      return;
    }

    try {
      setProcessingId(courseId);

      const response = await updateCourseStatus(courseId, status);

      setCourses((previous) =>
        previous.filter((course) => course._id !== courseId)
      );

      await fetchSummary();

      toast.success(
        response.message || `Course ${action}d successfully`
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          `Failed to ${action} course`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleBlockToggle = async (user) => {
    const nextStatus = !user.isBlocked;
    const action = nextStatus ? 'block' : 'unblock';

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${user.name}?`
      )
    ) {
      return;
    }

    try {
      setProcessingId(user._id);

      const response = await updateUserBlockStatus(
        user._id,
        nextStatus
      );

      setUsers((previous) =>
        previous.map((item) =>
          item._id === user._id
            ? { ...item, isBlocked: response.user.isBlocked }
            : item
        )
      );

      toast.success(response.message);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          `Failed to ${action} user`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handlePayout = async (earning) => {
    const instructorName =
      earning.instructor?.name || 'this instructor';

    if (
      !window.confirm(
        `Confirm that you have transferred ${formatPrice(earning.net)} to ${instructorName}?`
      )
    ) {
      return;
    }

    try {
      setProcessingId(earning._id);

      const response = await markEarningAsPaid(earning._id);

      toast.success(response.message || 'Payout marked as paid');

      await Promise.all([
        fetchEarnings(),
        fetchSummary(),
      ]);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to update payout'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleUserSearch = (event) => {
    event.preventDefault();
    setUserPage(1);
    fetchUsers();
  };

  const handleRoleChange = (event) => {
    setRoleFilter(event.target.value);
    setUserPage(1);
  };

  const handlePayoutFilterChange = (event) => {
    setPayoutFilter(event.target.value);
    setEarningPage(1);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-medium text-slate-600">
          Loading admin dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              Administration
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-slate-600">
              Manage users, courses, platform revenue, and instructor payouts.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh Dashboard'}
          </button>
        </div>

        {/* Dashboard statistics */}
        <section className="mb-10">
          <SectionTitle
            title="Platform Overview"
            description="Current platform statistics and financial summary."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Users"
              value={summary?.users?.total ?? 0}
              description={`${summary?.users?.students ?? 0} students · ${summary?.users?.instructors ?? 0} instructors · ${summary?.users?.admins ?? 0} admins`}
            />

            <StatCard
              title="Total Courses"
              value={summary?.courses?.total ?? 0}
              description={`${summary?.courses?.published ?? 0} published · ${summary?.courses?.pending ?? 0} pending`}
            />

            <StatCard
              title="Total Sales"
              value={formatPrice(summary?.totalSales)}
              description={`${summary?.totalTransactions ?? 0} transactions`}
            />

            <StatCard
              title="Platform Fees"
              value={formatPrice(summary?.totalPlatformFees)}
              description="Total platform revenue"
            />
          </div>
        </section>

        {/* Course approvals */}
        <section className="mb-12">
          <SectionTitle
            title="Course Approvals"
            description={`${courses.length} courses are waiting for review.`}
          />

          {courses.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="font-semibold text-slate-700">
                No pending courses
              </p>
              <p className="mt-1 text-sm text-slate-500">
                All submitted courses have been reviewed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {courses.map((course) => (
                <div
                  key={course._id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="h-48 w-full bg-slate-100 object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-slate-100 text-slate-500">
                      No Course Thumbnail
                    </div>
                  )}

                  <div className="p-5">
                    <div className="mb-3 flex flex-wrap justify-between gap-2">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {course.category}
                      </span>
                      <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                        Pending Review
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">
                      {course.title}
                    </h3>

                    <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                      {course.description}
                    </p>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="text-sm font-medium text-slate-800">
                        {course.instructor?.name || 'Unknown instructor'}
                      </p>
                      <p className="break-all text-xs text-slate-500">
                        {course.instructor?.email || ''}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        Course price: {formatPrice(course.price)}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() =>
                          handleCourseAction(course._id, 'published')
                        }
                        disabled={processingId === course._id}
                        className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve Course
                      </button>

                      <button
                        onClick={() =>
                          handleCourseAction(course._id, 'draft')
                        }
                        disabled={processingId === course._id}
                        className="flex-1 rounded-lg border border-red-300 px-4 py-3 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject Course
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* User management */}
        <section className="mb-12">
          <SectionTitle
            title="User Management"
            description="Search users, filter by role, and manage account access."
          />

          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <form
              onSubmit={handleUserSearch}
              className="flex flex-1 gap-2"
            >
              <input
                type="text"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search by name or email..."
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-indigo-500"
              />

              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700"
              >
                Search
              </button>
            </form>

            <select
              value={roleFilter}
              onChange={handleRoleChange}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none"
            >
              <option value="">All Roles</option>
              <option value="student">Students</option>
              <option value="instructor">Instructors</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">User</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Role</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Joined</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {user.email}
                      </p>
                    </td>

                    <td className="px-5 py-4 capitalize text-slate-600">
                      {user.role}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(user.createdAt)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          user.isBlocked
                            ? 'bg-red-50 text-red-700'
                            : 'bg-green-50 text-green-700'
                        }`}
                      >
                        {user.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {user.role === 'admin' ? (
                        <span className="text-xs text-slate-400">
                          Admin account
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBlockToggle(user)}
                          disabled={processingId === user._id}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                            user.isBlocked
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                        >
                          {processingId === user._id
                            ? 'Processing...'
                            : user.isBlocked
                              ? 'Unblock'
                              : 'Block'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-5 py-10 text-center text-slate-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {userPagination.total || 0} users found
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setUserPage((page) => Math.max(1, page - 1))}
                disabled={userPage <= 1}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 py-2 text-sm text-slate-600">
                {userPagination.page || 1} / {userPagination.pages || 1}
              </span>
              <button
                onClick={() =>
                  setUserPage((page) =>
                    Math.min(userPagination.pages || 1, page + 1)
                  )
                }
                disabled={userPage >= (userPagination.pages || 1)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {/* Instructor payouts */}
        <section className="mb-12">
          <SectionTitle
            title="Instructor Payouts"
            description="Review instructor earnings and record completed payouts."
          />

          <div className="mb-4">
            <select
              value={payoutFilter}
              onChange={handlePayoutFilterChange}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none"
            >
              <option value="">All Payouts</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Instructor</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Course</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Gross</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Platform Fee</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Instructor Net</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {earnings.map((earning) => (
                  <tr key={earning._id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {earning.instructor?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {earning.instructor?.email || ''}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {earning.course?.title || 'Unknown course'}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {formatPrice(earning.gross)}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {formatPrice(earning.platformFee)}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {formatPrice(earning.net)}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(earning.createdAt)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          earning.payoutStatus === 'paid'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        {earning.payoutStatus}
                      </span>

                      {earning.paidAt && (
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(earning.paidAt)}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {earning.payoutStatus === 'pending' ? (
                        <button
                          onClick={() => handlePayout(earning)}
                          disabled={processingId === earning._id}
                          className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {processingId === earning._id
                            ? 'Processing...'
                            : 'Mark as Paid'}
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-green-700">
                          Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {earnings.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-5 py-10 text-center text-slate-500">
                      No earnings found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {earningPagination.total || 0} earnings found
            </p>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setEarningPage((page) => Math.max(1, page - 1))
                }
                disabled={earningPage <= 1}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 py-2 text-sm text-slate-600">
                {earningPagination.page || 1} / {earningPagination.pages || 1}
              </span>
              <button
                onClick={() =>
                  setEarningPage((page) =>
                    Math.min(earningPagination.pages || 1, page + 1)
                  )
                }
                disabled={earningPage >= (earningPagination.pages || 1)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
