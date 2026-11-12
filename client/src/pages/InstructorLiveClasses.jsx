
import { useCallback, useEffect, useState } from 'react';
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

export default function InstructorLiveClasses() {
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

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
      await startLiveClass(classId);
      toast.success('Live class started!');

      // Open the room immediately after starting.
      navigate(`/instructor/live-classes/${classId}`);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to start live class.'
      );
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
      await endLiveClass(classId);
      toast.success('Live class ended.');
      setHistory(null);
      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to end live class.'
      );
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
      <div className="py-20 text-center text-slate-600">
        Loading live classes...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Instructor workspace
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Live Classes
          </h1>

          <p className="mt-2 text-slate-600">
            Schedule and manage your online classes.
          </p>
        </div>

        {/* Schedule Form */}
        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-slate-900">
            Schedule a Live Class
          </h2>

          {courses.length === 0 ? (
            <p className="text-slate-600">
              You need to create a course before scheduling a live class.
            </p>
          ) : (
            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Select Course
                </label>

                <select
                  name="courseId"
                  value={form.courseId}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
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
                <label className="mb-2 block text-sm font-medium text-slate-700">
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
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Scheduled Date and Time
                </label>

                <input
                  type="datetime-local"
                  name="scheduledAt"
                  value={form.scheduledAt}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Scheduling...' : 'Schedule Live Class'}
              </button>
            </form>
          )}
        </section>

        {/* Classes List */}
        <section>
          <h2 className="mb-5 text-xl font-bold text-slate-900">
            All Your Live Classes
          </h2>

          {classes.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-slate-600">
                No live classes found.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {classes.map((liveClass) => (
                <div
                  key={liveClass._id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {liveClass.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      Course: {liveClass.course?.title || 'Unknown'}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(liveClass.scheduledAt).toLocaleString(
                        'en-IN',
                        {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }
                      )}
                    </p>

                    <span
                      className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        liveClass.status === 'live'
                          ? 'bg-green-100 text-green-700'
                          : liveClass.status === 'ended'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {liveClass.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {liveClass.status === 'scheduled' && (
                      <button
                        onClick={() => handleStart(liveClass._id)}
                        className="rounded-lg bg-green-600 px-5 py-2 font-semibold text-white hover:bg-green-700"
                      >
                        Start Class
                      </button>
                    )}

                    {liveClass.status === 'live' && (
                      <>
                        <button
                          onClick={() => handleJoin(liveClass._id)}
                          className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700"
                        >
                          Join Class
                        </button>

                        <button
                          onClick={() => handleEnd(liveClass._id)}
                          className="rounded-lg bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700"
                        >
                          End Class
                        </button>
                      </>
                    )}

                    {liveClass.status === 'ended' && (
                      <button
                        onClick={() => handleViewHistory(liveClass._id)}
                        className="rounded-lg bg-slate-700 px-5 py-2 font-semibold text-white hover:bg-slate-800"
                      >
                        View Chat History
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Ended Class Chat History */}
        {historyLoading && (
          <div className="mt-8 rounded-xl bg-white p-6 text-center text-slate-600 shadow-sm">
            Loading chat history...
          </div>
        )}

        {history && (
          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Chat History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {history.title}
                </p>
              </div>

              <button
                onClick={() => setHistory(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {history.messages?.length ? (
              <div className="max-h-96 space-y-4 overflow-y-auto">
                {history.messages.map((message) => (
                  <div
                    key={message._id}
                    className="rounded-xl bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">
                        {message.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        {new Date(message.at).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap text-slate-700">
                      {message.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600">
                No messages were saved for this class.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
