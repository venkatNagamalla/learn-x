
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
  }).format((Number(paise) || 0) / 100);

const formatMonth = (year, month) =>
  new Date(year, month - 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });

const formatDate = (date) => {
  if (!date) return '—';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return '—';

  return parsedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};


const SummaryCard = ({ title, value, description, icon, accent }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[17px] font-medium text-slate-500">{title}</p>

        <p
          className="mt-3 font-bold tracking-tight text-slate-900"
          style={{ fontSize: '44px', lineHeight: 1.15 }}
        >
          {value}
        </p>
      </div>

      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${accent}`}
      >
        {icon}
      </div>
    </div>

    <p className="mt-3 text-base leading-6 text-slate-500">
      {description}
    </p>
  </div>
);

const SectionHeading = ({ title, description, action }) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
        {title}
      </h2>
      <p className="mt-1 text-[17px] text-slate-500">{description}</p>
    </div>
    {action}
  </div>
);

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

  const loadTransactions = useCallback(
    async (page = 1, filter = payoutFilter) => {
      try {
        setTransactionLoading(true);

        const data = await getEarningsTransactions({
          page,
          limit: 10,
          payoutStatus: filter === 'all' ? undefined : filter,
        });

        setTransactions(data.items || []);
        setPagination(
          data.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0,
          }
        );
      } catch (err) {
        console.error('Failed to load transactions:', err);
      } finally {
        setTransactionLoading(false);
      }
    },
    [payoutFilter]
  );

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [summaryData, monthlyData, courseData] = await Promise.all([
        getEarningsSummary(),
        getMonthlyEarnings(),
        getInstructorCourseStats(),
      ]);

      setSummary(summaryData);

      setMonthly(
        (monthlyData || []).map((item) => ({
          month: formatMonth(item._id.year, item._id.month),
          gross: item.gross / 100,
          net: item.net / 100,
        }))
      );

      setCourses(courseData || []);
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
    if (page < 1 || page > pagination.pages || transactionLoading) return;
    loadTransactions(page, payoutFilter);
  };

  const cards = [
    {
      title: 'Total Net Revenue',
      value: formatCurrency(summary?.totalNet),
      description: 'Your earnings after platform fees',
      icon: '₹',
      accent: 'bg-indigo-50 text-indigo-700',
    },
    {
      title: 'Total Students',
      value: summary?.totalStudents ?? 0,
      description: 'Students enrolled in your courses',
      icon: '👨‍🎓',
      accent: 'bg-blue-50 text-blue-700',
    },
    {
      title: 'Total Courses',
      value: summary?.totalCourses ?? 0,
      description: 'Courses created by you',
      icon: '📚',
      accent: 'bg-violet-50 text-violet-700',
    },
    {
      title: 'Pending Payout',
      value: formatCurrency(summary?.pendingPayout),
      description: 'Earnings awaiting payout',
      icon: '⏳',
      accent: 'bg-amber-50 text-amber-700',
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
        <p className="text-lg font-medium text-slate-600">
          Loading instructor dashboard...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-xl">
              ⚠️
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Unable to load dashboard
              </h2>
              <p className="mt-1 text-base text-red-600">{error}</p>
            </div>
          </div>

          <button
            onClick={loadDashboard}
            className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-red-700"
            style={{ color: '#FFFFFF' }}
          >
            Retry
          </button>
        </div>
      </main>
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
                Welcome to Your Dashboard
              </h1>

              <p
                className="mt-3 max-w-xl text-lg leading-7"
                style={{ color: '#EEF2FF' }}
              >
                Track your course performance, manage your earnings, and
                continue growing your teaching journey.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/instructor/courses"
                  className="rounded-xl bg-white px-5 py-3 text-base font-bold shadow-sm transition hover:bg-indigo-50"
                  style={{ color: '#4338CA' }}
                >
                  Manage My Courses
                </Link>

                <Link
                  to="/instructor/courses/new"
                  className="rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-base font-semibold transition hover:bg-white/20"
                  style={{ color: '#FFFFFF' }}
                >
                  + Create Course
                </Link>
              </div>
            </div>

            <div className="hidden h-28 w-28 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-6xl shadow-inner sm:flex">
              <span role="img" aria-label="Graduation cap">
                🎓
              </span>
            </div>
          </div>
        </section>

        {/* Summary Cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <SummaryCard key={card.title} {...card} />
          ))}
        </section>

        {/* Monthly Earnings */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Monthly Earnings"
            description="Compare your gross revenue with your net earnings."
          />

          {monthly.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50">
              <div className="text-center">
                <span className="text-4xl">📊</span>
                <p className="mt-3 text-lg font-medium text-slate-600">
                  No earnings data available yet.
                </p>
                <p className="mt-1 text-base text-slate-500">
                  Your monthly earnings will appear here.
                </p>
              </div>
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
                  barGap={8}
                >
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="#E2E8F0"
                  />

                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 14, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />

                  <YAxis
                    tick={{ fontSize: 14, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      `₹${value.toLocaleString('en-IN')}`
                    }
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 8px 25px rgba(15,23,42,0.08)',
                      fontSize: '15px',
                    }}
                    formatter={(value) => [formatCurrency(value * 100)]}
                  />

                  <Bar
                    dataKey="gross"
                    name="Gross Revenue"
                    fill="#A5B4FC"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />

                  <Bar
                    dataKey="net"
                    name="Net Earnings"
                    fill="#4F46E5"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-5 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-indigo-300" />
              <span className="text-base font-medium text-slate-600">
                Gross Revenue
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-indigo-600" />
              <span className="text-base font-medium text-slate-600">
                Net Earnings
              </span>
            </div>
          </div>
        </section>

        {/* Course Performance */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Course Performance"
            description="Student enrollment and revenue for each course."
            action={
              <Link
                to="/instructor/courses"
                className="text-base font-bold text-indigo-600 transition hover:text-indigo-800"
              >
                Manage Courses →
              </Link>
            }
          />

          {courses.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-4 py-12 text-center">
              <span className="text-4xl">📚</span>
              <p className="mt-3 text-lg font-semibold text-slate-700">
                You haven't created any courses yet.
              </p>
              <Link
                to="/instructor/courses/new"
                className="mt-4 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-base font-semibold text-white"
                style={{ color: '#FFFFFF' }}
              >
                Create Your First Course
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-base uppercase tracking-wide text-slate-500">
                    <th className="rounded-l-lg px-4 py-4 font-bold">Course</th>
                    <th className="px-4 py-4 font-bold">Students</th>
                    <th className="px-4 py-4 font-bold">Gross Revenue</th>
                    <th className="px-4 py-4 font-bold">Net Revenue</th>
                    <th className="rounded-r-lg px-4 py-4 font-bold">Rating</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {courses.map((course) => (
                    <tr
                      key={course._id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-4">
                        <div className="flex min-w-[220px] items-center gap-3">
                          {course.thumbnail ? (
                            <img
                              src={course.thumbnail}
                              alt=""
                              className="h-12 w-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-indigo-50 text-xl">
                              📘
                            </div>
                          )}

                          <span className="text-base font-semibold text-slate-800">
                            {course.title}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-[17px] text-slate-700">
                        {course.students ?? 0}
                      </td>

                      <td className="px-4 py-4 text-[17px] text-slate-700">
                        {formatCurrency(course.grossRevenue)}
                      </td>

                      <td className="px-4 py-4 text-[17px] font-bold text-emerald-700">
                        {formatCurrency(course.netRevenue)}
                      </td>

                      <td className="px-4 py-4 text-[17px] text-slate-700">
                        {course.ratingCount > 0
                          ? `${(course.ratingAvg ?? 0).toFixed(1)} (${course.ratingCount})`
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
        <section className="grid gap-4 sm:grid-cols-2">
          <SummaryCard
            title="Paid Payout"
            value={formatCurrency(summary?.paidPayout)}
            description="Total earnings already paid to you."
            icon="✓"
            accent="bg-emerald-50 text-emerald-700"
          />

          <SummaryCard
            title="Total Transactions"
            value={summary?.totalTransactions ?? 0}
            description="Successful paid course transactions."
            icon="💳"
            accent="bg-blue-50 text-blue-700"
          />
        </section>

        {/* Transactions and Payout History */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Transactions & Payout History
              </h2>
              <p className="mt-1 text-[17px] text-slate-500">
                Review your course sales and payout records.
              </p>
            </div>

            <select
              value={payoutFilter}
              onChange={(event) => setPayoutFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">All Transactions</option>
              <option value="pending">Pending Payouts</option>
              <option value="paid">Paid Payout History</option>
            </select>
          </div>

          {transactionLoading ? (
            <div className="flex items-center justify-center gap-3 py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600" />
              <p className="text-lg text-slate-500">
                Loading transactions...
              </p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="rounded-xl bg-slate-50 py-12 text-center">
              <span className="text-4xl">🧾</span>
              <p className="mt-3 text-lg font-semibold text-slate-700">
                No transactions found for this filter.
              </p>
              <p className="mt-1 text-base text-slate-500">
                Your transaction records will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-base uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-4 font-bold">Course</th>
                      <th className="px-4 py-4 font-bold">Date</th>
                      <th className="px-4 py-4 font-bold">Gross</th>
                      <th className="px-4 py-4 font-bold">Platform Fee</th>
                      <th className="px-4 py-4 font-bold">Net Earnings</th>
                      <th className="px-4 py-4 font-bold">Payout Status</th>
                      <th className="px-4 py-4 font-bold">Paid Date</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((transaction) => (
                      <tr
                        key={transaction._id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-4 text-base font-semibold text-slate-800">
                          {transaction.course?.title || 'Course unavailable'}
                        </td>

                        <td className="px-4 py-4 text-[17px] text-slate-600">
                          {formatDate(transaction.createdAt)}
                        </td>

                        <td className="px-4 py-4 text-[17px] text-slate-700">
                          {formatCurrency(transaction.gross)}
                        </td>

                        <td className="px-4 py-4 text-[17px] text-slate-700">
                          {formatCurrency(transaction.platformFee)}
                        </td>

                        <td className="px-4 py-4 text-[17px] font-bold text-emerald-700">
                          {formatCurrency(transaction.net)}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-base font-bold capitalize ${
                              transaction.payoutStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {transaction.payoutStatus}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-[17px] text-slate-600">
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
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                <p className="text-base text-slate-500">
                  Page {pagination.page} of {pagination.pages}
                  {' · '}
                  {pagination.total} transactions
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1 || transactionLoading}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-base font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={
                      pagination.page >= pagination.pages ||
                      transactionLoading
                    }
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-base font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
