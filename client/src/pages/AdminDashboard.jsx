
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

const StatCard = ({ title, value, description, accent }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <p className="text-base font-semibold text-slate-600">{title}</p>
      <span className={`h-2.5 w-2.5 rounded-full ${accent || 'bg-indigo-500'}`} />
    </div>

    <p
      className="mt-3 break-words font-bold tracking-tight text-slate-900"
      style={{ fontSize: '44px', lineHeight: 1.15 }}
    >
      {value}
    </p>

    <p className="mt-2 text-sm text-slate-500">{description}</p>
  </div>
);

const SectionTitle = ({ title, description }) => (
  <div className="mb-5">
    <h2 className="text-xl font-bold text-slate-900">{title}</h2>
    <p className="mt-1 text-base text-slate-500">{description}</p>
  </div>
);

const Pagination = ({
  pagination,
  page,
  setPage,
}) => (
  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
    <p className="text-base text-slate-500">
      {pagination.total || 0} records found
    </p>

    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setPage((current) => Math.max(1, current - 1))}
        disabled={page <= 1}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>

      <span className="px-2 text-sm font-semibold text-slate-600">
        {pagination.page || 1} / {pagination.pages || 1}
      </span>

      <button
        type="button"
        onClick={() =>
          setPage((current) =>
            Math.min(pagination.pages || 1, current + 1)
          )
        }
        disabled={page >= (pagination.pages || 1)}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
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
  }, [fetchSummary, fetchCourses, fetchUsers, fetchEarnings]);

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

      await Promise.all([fetchEarnings(), fetchSummary()]);
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
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <p className="text-base font-semibold text-slate-600">
          Loading admin dashboard...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <section className="mb-7 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-6 shadow-lg sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color: '#E0E7FF' }}
              >
                Administration
              </p>

              <h1
                className="mt-2 text-3xl font-bold"
                style={{ color: '#FFFFFF' }}
              >
                Admin Dashboard
              </h1>

              <p
                className="mt-2 text-base"
                style={{ color: '#E0E7FF' }}
              >
                Manage users, courses, platform revenue, and instructor payouts.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-xl bg-white px-5 py-3 font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-60"
              style={{ color: '#4338CA' }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh Dashboard'}
            </button>
          </div>
        </section>

        {/* Platform statistics */}
        <section className="mb-9">
          <SectionTitle
            title="Platform Overview"
            description="Current platform statistics and financial summary."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Users"
              value={summary?.users?.total ?? 0}
              description={`${summary?.users?.students ?? 0} students · ${summary?.users?.instructors ?? 0} instructors · ${summary?.users?.admins ?? 0} admins`}
              accent="bg-indigo-500"
            />

            <StatCard
              title="Total Courses"
              value={summary?.courses?.total ?? 0}
              description={`${summary?.courses?.published ?? 0} published · ${summary?.courses?.pending ?? 0} pending`}
              accent="bg-blue-500"
            />

            <StatCard
              title="Total Sales"
              value={formatPrice(summary?.totalSales)}
              description={`${summary?.totalTransactions ?? 0} transactions`}
              accent="bg-emerald-500"
            />

            <StatCard
              title="Platform Fees"
              value={formatPrice(summary?.totalPlatformFees)}
              description="Total platform revenue"
              accent="bg-violet-500"
            />
          </div>
        </section>

        {/* Course approvals */}
        <section className="mb-9">
          <SectionTitle
            title="Course Approvals"
            description={`${courses.length} courses are waiting for review.`}
          />

          {courses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-lg font-bold text-slate-700">
                No pending courses
              </p>
              <p className="mt-1 text-base text-slate-500">
                All submitted courses have been reviewed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {courses.map((course) => (
                <article
                  key={course._id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="h-48 w-full bg-slate-100 object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-slate-100 text-base font-medium text-slate-500">
                      No Course Thumbnail
                    </div>
                  )}

                  <div className="p-5">
                    <div className="mb-3 flex flex-wrap justify-between gap-2">
                      <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
                        {course.category}
                      </span>
                      <span className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
                        Pending Review
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900">
                      {course.title}
                    </h3>

                    <p className="mt-2 line-clamp-3 text-base leading-relaxed text-slate-600">
                      {course.description}
                    </p>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="text-base font-semibold text-slate-800">
                        {course.instructor?.name || 'Unknown instructor'}
                      </p>
                      <p className="mt-1 break-all text-sm text-slate-500">
                        {course.instructor?.email || ''}
                      </p>
                      <p className="mt-2 text-base font-bold text-slate-800">
                        Course price: {formatPrice(course.price)}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() =>
                          handleCourseAction(course._id, 'published')
                        }
                        disabled={processingId === course._id}
                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-bold transition hover:bg-emerald-700 disabled:opacity-50"
                        style={{ color: '#FFFFFF' }}
                      >
                        Approve Course
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleCourseAction(course._id, 'draft')
                        }
                        disabled={processingId === course._id}
                        className="flex-1 rounded-xl border border-red-300 px-4 py-3 font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject Course
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* User management */}
        <section className="mb-9">
          <SectionTitle
            title="User Management"
            description="Search users, filter by role, and manage account access."
          />

          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <form onSubmit={handleUserSearch} className="flex flex-1 gap-2">
              <input
                type="text"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search by name or email..."
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-5 py-3 font-bold transition hover:bg-indigo-700"
                style={{ color: '#FFFFFF' }}
              >
                Search
              </button>
            </form>

            <select
              value={roleFilter}
              onChange={handleRoleChange}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="">All Roles</option>
              <option value="student">Students</option>
              <option value="instructor">Instructors</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-base">
              <thead className="bg-slate-50">
                <tr>
                  {['User', 'Role', 'Joined', 'Status', 'Action'].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-5 py-4 text-left text-sm font-bold text-slate-600"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user._id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">{user.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                    </td>

                    <td className="px-5 py-4 capitalize text-slate-600">
                      {user.role}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatDate(user.createdAt)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold ${
                          user.isBlocked
                            ? 'bg-red-50 text-red-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {user.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {user.role === 'admin' ? (
                        <span className="text-sm text-slate-400">
                          Admin account
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBlockToggle(user)}
                          disabled={processingId === user._id}
                          className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${
                            user.isBlocked
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
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
                    <td colSpan="5" className="px-5 py-10 text-center text-base text-slate-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            pagination={userPagination}
            page={userPage}
            setPage={setUserPage}
          />
        </section>

        {/* Instructor payouts */}
        <section className="mb-8">
          <SectionTitle
            title="Instructor Payouts"
            description="Review instructor earnings and record completed payouts."
          />

          <div className="mb-4">
            <select
              value={payoutFilter}
              onChange={handlePayoutFilterChange}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="">All Payouts</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-base">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    'Instructor',
                    'Course',
                    'Gross',
                    'Platform Fee',
                    'Instructor Net',
                    'Date',
                    'Status',
                    'Action',
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-5 py-4 text-left text-sm font-bold text-slate-600"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {earnings.map((earning) => (
                  <tr key={earning._id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">
                        {earning.instructor?.name || 'Unknown'}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {earning.instructor?.email || ''}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {earning.course?.title || 'Unknown course'}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                      {formatPrice(earning.gross)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                      {formatPrice(earning.platformFee)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-800">
                      {formatPrice(earning.net)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatDate(earning.createdAt)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold ${
                          earning.payoutStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {earning.payoutStatus}
                      </span>

                      {earning.paidAt && (
                        <p className="mt-1 text-sm text-slate-400">
                          {formatDate(earning.paidAt)}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {earning.payoutStatus === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => handlePayout(earning)}
                          disabled={processingId === earning._id}
                          className="whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold transition hover:bg-indigo-700 disabled:opacity-50"
                          style={{ color: '#FFFFFF' }}
                        >
                          {processingId === earning._id
                            ? 'Processing...'
                            : 'Mark as Paid'}
                        </button>
                      ) : (
                        <span className="whitespace-nowrap text-sm font-bold text-emerald-700">
                          Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {earnings.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-5 py-10 text-center text-base text-slate-500">
                      No earnings found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            pagination={earningPagination}
            page={earningPage}
            setPage={setEarningPage}
          />
        </section>
      </div>
    </main>
  );
}
