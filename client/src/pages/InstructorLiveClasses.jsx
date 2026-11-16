
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios.js';

import {
  createLiveClass,
  getUpcomingLiveClasses,
  startLiveClass,
  endLiveClass,
  getLiveClassHistory,
} from '../api/liveClassApi.js';

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

const getStatusStyle = (status) => {
  if (status === 'live') {
    return 'bg-green-100 text-green-700';
  }

  if (status === 'ended') {
    return 'bg-slate-100 text-slate-700';
  }

  return 'bg-amber-100 text-amber-700';
};

function StatCard({ title, value, description, icon, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold text-slate-600">
          {title}
        </p>

        <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${accent}`}>
          {icon}
        </div>
      </div>

      <p
        className="mt-3 font-bold tracking-tight text-slate-900"
        style={{ fontSize: '44px', lineHeight: 1.15 }}
      >
        {value}
      </p>

      <p className="mt-2 text-base text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function InstructorLiveClasses() {
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionClassId, setActionClassId] = useState(null);

  const navigate = useNavigate();

  const [form, setForm] = useState({
    courseId: '',
    title: '',
    scheduledAt: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [coursesResponse, classesResponse] = await Promise.all([
        api.get('/courses/mine'),
        getUpcomingLiveClasses(),
      ]);

      setCourses(coursesResponse.data.items || []);
      setClasses(classesResponse.items || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to load live classes.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => ({
    total: classes.length,
    live: classes.filter((item) => item.status === 'live').length,
    scheduled: classes.filter((item) => item.status === 'scheduled').length,
    ended: classes.filter((item) => item.status === 'ended').length,
  }), [classes]);

  const handleChange = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSchedule = async (event) => {
    event.preventDefault();

    if (!form.courseId || !form.title.trim() || !form.scheduledAt) {
      toast.error('Please complete all fields.');
      return;
    }

    const selectedDate = new Date(form.scheduledAt);

    if (Number.isNaN(selectedDate.getTime())) {
      toast.error('Please enter a valid date and time.');
      return;
    }

    if (selectedDate <= new Date()) {
      toast.error('Please select a future date and time.');
      return;
    }

    try {
      setSubmitting(true);

      await createLiveClass({
        courseId: form.courseId,
        title: form.title.trim(),
        scheduledAt: selectedDate.toISOString(),
      });

      toast.success('Live class scheduled successfully!');

      setForm({
        courseId: '',
        title: '',
        scheduledAt: '',
      });

      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to schedule live class.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStart = async (classId) => {
    try {
      setActionClassId(classId);

      await startLiveClass(classId);
      toast.success('Live class started!');

      navigate(`/instructor/live-classes/${classId}`);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to start live class.'
      );
    } finally {
      setActionClassId(null);
    }
  };

  const handleJoin = (classId) => {
    navigate(`/instructor/live-classes/${classId}`);
  };

  const handleEnd = async (classId) => {
    const confirmed = window.confirm(
      'Are you sure you want to end this live class?'
    );

    if (!confirmed) return;

    try {
      setActionClassId(classId);

      await endLiveClass(classId);
      toast.success('Live class ended.');
      setHistory(null);

      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to end live class.'
      );
    } finally {
      setActionClassId(null);
    }
  };

  const handleViewHistory = async (classId) => {
    try {
      setHistoryLoading(true);
      setHistory(null);

      const response = await getLiveClassHistory(classId);
      setHistory(response.liveClass);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to load chat history.'
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="mt-4 text-base font-medium text-slate-600">
            Loading live classes...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* WELCOME HEADER */}

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-6 shadow-lg sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-28 right-1/3 h-64 w-64 rounded-full bg-white/10" />

          <div className="relative z-10">
            <p
              className="text-sm font-bold uppercase tracking-[0.18em]"
              style={{ color: '#E0E7FF' }}
            >
              Instructor Workspace
            </p>

            <h1
              className="mt-3 text-3xl font-bold sm:text-4xl"
              style={{ color: '#FFFFFF' }}
            >
              Live Classes
            </h1>

            <p
              className="mt-3 max-w-2xl text-base leading-relaxed sm:text-lg"
              style={{ color: '#E0E7FF' }}
            >
              Schedule interactive sessions, connect with your students,
              and manage your online classes from one place.
            </p>

            <div
              className="mt-5 flex flex-wrap items-center gap-3 text-base font-medium"
              style={{ color: '#FFFFFF' }}
            >
              <span className="rounded-full bg-white/15 px-4 py-2">
                {courses.length} Courses
              </span>

              <span className="rounded-full bg-white/15 px-4 py-2">
                {classes.length} Live Classes
              </span>
            </div>
          </div>
        </section>

        {/* STATISTICS */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Classes"
            value={stats.total}
            description="All your live sessions"
            icon="📅"
            accent="bg-indigo-50"
          />

          <StatCard
            title="Live Now"
            value={stats.live}
            description="Currently active sessions"
            icon="🔴"
            accent="bg-green-50"
          />

          <StatCard
            title="Scheduled"
            value={stats.scheduled}
            description="Upcoming sessions"
            icon="⏰"
            accent="bg-amber-50"
          />

          <StatCard
            title="Completed"
            value={stats.ended}
            description="Successfully ended sessions"
            icon="✓"
            accent="bg-slate-100"
          />
        </section>

        {/* SCHEDULE FORM */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-xl">
                📹
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Schedule a Live Class
                </h2>

                <p className="mt-1 text-base text-slate-500">
                  Create a new online session for your students.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {courses.length === 0 ? (
              <div className="rounded-xl bg-amber-50 p-5">
                <p className="text-base font-medium text-amber-800">
                  You need to create a course before scheduling a live class.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSchedule} className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-base font-semibold text-slate-700">
                      Select Course
                    </label>

                    <select
                      name="courseId"
                      value={form.courseId}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">Choose a course</option>

                      {courses.map((course) => (
                        <option key={course._id} value={course._id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-base font-semibold text-slate-700">
                      Class Title
                    </label>

                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="Example: MERN Live Session"
                      required
                      maxLength={150}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="max-w-xl">
                  <label className="mb-2 block text-base font-semibold text-slate-700">
                    Scheduled Date and Time
                  </label>

                  <input
                    type="datetime-local"
                    name="scheduledAt"
                    value={form.scheduledAt}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />

                  <p className="mt-2 text-sm text-slate-500">
                    Choose a future date and time for your session.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ color: '#FFFFFF' }}
                >
                  {submitting ? 'Scheduling...' : '+ Schedule Live Class'}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* LIVE CLASSES */}

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Your Live Classes
              </h2>

              <p className="mt-1 text-base text-slate-500">
                Manage scheduled, active, and completed sessions.
              </p>
            </div>

            <span className="rounded-full bg-indigo-50 px-4 py-2 text-base font-semibold text-indigo-700">
              {classes.length} Sessions
            </span>
          </div>

          {classes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <div className="text-5xl">🎥</div>

              <h3 className="mt-4 text-xl font-bold text-slate-900">
                No Live Classes Yet
              </h3>

              <p className="mt-2 text-base text-slate-500">
                Schedule your first live class using the form above.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {classes.map((liveClass) => (
                <article
                  key={liveClass._id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div
                    className={`h-1.5 ${
                      liveClass.status === 'live'
                        ? 'bg-green-500'
                        : liveClass.status === 'ended'
                          ? 'bg-slate-400'
                          : 'bg-indigo-500'
                    }`}
                  />

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-2xl">
                          🎥
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-slate-900">
                            {liveClass.title}
                          </h3>

                          <p className="mt-1 text-base text-slate-600">
                            {liveClass.course?.title || 'Unknown Course'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-sm font-bold capitalize ${getStatusStyle(liveClass.status)}`}
                      >
                        {liveClass.status}
                      </span>
                    </div>

                    <div className="mt-5 rounded-xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Scheduled Date & Time
                      </p>

                      <p className="mt-2 text-base font-semibold text-slate-800">
                        {formatDate(liveClass.scheduledAt)}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {liveClass.status === 'scheduled' && (
                        <button
                          type="button"
                          disabled={actionClassId === liveClass._id}
                          onClick={() => handleStart(liveClass._id)}
                          className="rounded-xl bg-green-600 px-5 py-2.5 font-semibold transition hover:bg-green-700 disabled:opacity-50"
                          style={{ color: '#FFFFFF' }}
                        >
                          {actionClassId === liveClass._id
                            ? 'Starting...'
                            : '▶ Start Class'}
                        </button>
                      )}

                      {liveClass.status === 'live' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleJoin(liveClass._id)}
                            className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold transition hover:bg-indigo-700"
                            style={{ color: '#FFFFFF' }}
                          >
                            Join Class
                          </button>

                          <button
                            type="button"
                            disabled={actionClassId === liveClass._id}
                            onClick={() => handleEnd(liveClass._id)}
                            className="rounded-xl bg-red-600 px-5 py-2.5 font-semibold transition hover:bg-red-700 disabled:opacity-50"
                            style={{ color: '#FFFFFF' }}
                          >
                            {actionClassId === liveClass._id
                              ? 'Ending...'
                              : 'End Class'}
                          </button>
                        </>
                      )}

                      {liveClass.status === 'ended' && (
                        <button
                          type="button"
                          onClick={() => handleViewHistory(liveClass._id)}
                          className="rounded-xl bg-slate-800 px-5 py-2.5 font-semibold transition hover:bg-slate-900"
                          style={{ color: '#FFFFFF' }}
                        >
                          View Chat History
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* CHAT HISTORY */}

        {historyLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
            <p className="mt-3 text-base text-slate-600">
              Loading chat history...
            </p>
          </div>
        )}

        {history && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
                  Completed Session
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Chat History
                </h2>

                <p className="mt-1 text-base text-slate-500">
                  {history.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHistory(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {history.messages?.length ? (
              <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                {history.messages.map((message) => (
                  <div
                    key={message._id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-base font-bold text-slate-900">
                        {message.name}
                      </p>

                      <p className="text-sm text-slate-500">
                        {formatDate(message.at)}
                      </p>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-slate-700">
                      {message.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-6 text-center">
                <p className="text-base text-slate-600">
                  No messages were saved for this class.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
