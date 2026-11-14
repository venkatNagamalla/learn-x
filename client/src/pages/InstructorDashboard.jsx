
import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';

import {
  getEarningsSummary,
  getMonthlyEarnings,
  getInstructorCourseStats,
  getEarningsTransactions,
} from '../api/earningApi.js';

const formatCurrency = (paise = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);

const formatMonth = (year, month) =>
  new Date(year, month - 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function InstructorDashboard() {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [courses, setCourses] = useState([]);

  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const [payoutFilter, setPayoutFilter] = useState('all');
  const [transactionLoading, setTransactionLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTransactions = useCallback(async (page = 1, filter = payoutFilter) => {
    try {
      setTransactionLoading(true);

      const data = await getEarningsTransactions({
        page,
        limit: 10,
        payoutStatus: filter === 'all' ? undefined : filter,
      });

      setTransactions(data.items || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setTransactionLoading(false);
    }
  }, [payoutFilter]);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [summaryData, monthlyData, courseData] =
        await Promise.all([
          getEarningsSummary(),
          getMonthlyEarnings(),
          getInstructorCourseStats(),
        ]);

      setSummary(summaryData);

      setMonthly(
        monthlyData.map((item) => ({
          month: formatMonth(item._id.year, item._id.month),
          gross: item.gross / 100,
          net: item.net / 100,
        }))
      );

      setCourses(courseData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to load instructor dashboard.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadTransactions(1, payoutFilter);
  }, [loadTransactions, payoutFilter]);

  const handlePageChange = (page) => {
    loadTransactions(page, payoutFilter);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-600">
        Loading instructor dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-6xl rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p>{error}</p>
          <button
            onClick={loadDashboard}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const cards = [
    {
      title: 'Total Net Revenue',
      value: formatCurrency(summary?.totalNet),
      description: 'Your earnings after platform fees',
      color: 'text-indigo-700',
    },
    {
      title: 'Total Students',
      value: summary?.totalStudents ?? 0,
      description: 'Students enrolled in your courses',
      color: 'text-blue-700',
    },
    {
      title: 'Total Courses',
      value: summary?.totalCourses ?? 0,
      description: 'Courses created by you',
      color: 'text-purple-700',
    },
    {
      title: 'Pending Payout',
      value: formatCurrency(summary?.pendingPayout),
      description: 'Earnings awaiting payout',
      color: 'text-amber-700',
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Dashboard Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              Instructor Workspace
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Instructor Dashboard
            </h1>

            <p className="mt-2 text-slate-600">
              Monitor your earnings, students, and course performance.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/instructor/courses"
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100"
            >
              My Courses
            </Link>

            <Link
              to="/instructor/courses/new"
              className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              + Create Course
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">
                {card.title}
              </p>

              <p className={`mt-3 text-2xl font-bold ${card.color}`}>
                {card.value}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                {card.description}
              </p>
            </div>
          ))}
        </section>

        {/* Monthly Earnings Chart */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Monthly Earnings
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Gross revenue and your net earnings by month.
            </p>
          </div>

          {monthly.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-slate-500">
              No earnings data available yet.
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthly}
                  margin={{
                    top: 10,
                    right: 15,
                    left: 10,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />

                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />

                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      `₹${value.toLocaleString('en-IN')}`
                    }
                  />

                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(value * 100),
                    ]}
                  />

                  <Bar
                    dataKey="gross"
                    name="Gross Revenue"
                    fill="#818cf8"
                    radius={[5, 5, 0, 0]}
                  />

                  <Bar
                    dataKey="net"
                    name="Net Earnings"
                    fill="#4f46e5"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Course Performance */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Course Performance
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Student enrollment and revenue for each course.
              </p>
            </div>

            <Link
              to="/instructor/courses"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Manage Courses →
            </Link>
          </div>

          {courses.length === 0 ? (
            <p className="py-10 text-center text-slate-500">
              You haven't created any courses yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Course</th>
                    <th className="px-4 py-3 font-semibold">Students</th>
                    <th className="px-4 py-3 font-semibold">Gross Revenue</th>
                    <th className="px-4 py-3 font-semibold">Net Revenue</th>
                    <th className="px-4 py-3 font-semibold">Rating</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {courses.map((course) => (
                    <tr key={course._id}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {course.thumbnail && (
                            <img
                              src={course.thumbnail}
                              alt=""
                              className="h-10 w-14 rounded object-cover"
                            />
                          )}

                          <span className="font-semibold text-slate-800">
                            {course.title}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {course.students}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {formatCurrency(course.grossRevenue)}
                      </td>

                      <td className="px-4 py-4 font-semibold text-green-700">
                        {formatCurrency(course.netRevenue)}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {course.ratingCount > 0
                          ? `${course.ratingAvg.toFixed(1)} (${course.ratingCount})`
                          : 'No ratings'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Payout Summary */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Paid Payout
            </p>

            <p className="mt-3 text-2xl font-bold text-green-700">
              {formatCurrency(summary?.paidPayout)}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Total earnings already paid to you.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Transactions
            </p>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {summary?.totalTransactions ?? 0}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Successful paid course transactions.
            </p>
          </div>
        </section>

        {/* Transactions and Payout History */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Transactions & Payout History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Review your course sales and payout records.
              </p>
            </div>

            <select
              value={payoutFilter}
              onChange={(event) => setPayoutFilter(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="all">All Transactions</option>
              <option value="pending">Pending Payouts</option>
              <option value="paid">Paid Payout History</option>
            </select>
          </div>

          {transactionLoading ? (
            <div className="py-12 text-center text-slate-500">
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              No transactions found for this filter.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-sm">
                  <thead className="border-b bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Course</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Gross</th>
                      <th className="px-4 py-3 font-semibold">Platform Fee</th>
                      <th className="px-4 py-3 font-semibold">Net Earnings</th>
                      <th className="px-4 py-3 font-semibold">Payout Status</th>
                      <th className="px-4 py-3 font-semibold">Paid Date</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((transaction) => (
                      <tr key={transaction._id}>
                        <td className="px-4 py-4 font-semibold text-slate-800">
                          {transaction.course?.title || 'Course unavailable'}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {formatDate(transaction.createdAt)}
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {formatCurrency(transaction.gross)}
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {formatCurrency(transaction.platformFee)}
                        </td>

                        <td className="px-4 py-4 font-semibold text-green-700">
                          {formatCurrency(transaction.net)}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                              transaction.payoutStatus === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {transaction.payoutStatus}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {transaction.paidAt
                            ? formatDate(transaction.paidAt)
                            : 'Not paid'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                <p className="text-sm text-slate-500">
                  Page {pagination.page} of {pagination.pages}
                  {' · '}
                  {pagination.total} transactions
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1 || transactionLoading}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={
                      pagination.page >= pagination.pages ||
                      transactionLoading
                    }
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
