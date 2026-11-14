
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { getUpcomingLiveClasses } from '../api/liveClassApi.js';

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

export default function StudentLiveClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const loadClasses = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const data = await getUpcomingLiveClasses();
      setClasses(data.items || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to load upcoming live classes.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses(true);

    const intervalId = setInterval(() => {
      loadClasses(false);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [loadClasses]);

  const handleJoin = (liveClass) => {
    if (liveClass.status !== 'live') {
      toast.error('This class has not started yet.');
      return;
    }

    navigate(`/student/live-classes/${liveClass._id}`);
  };

  const liveCount = classes.filter(
    (liveClass) => liveClass.status === 'live'
  ).length;

  const scheduledCount = classes.filter(
    (liveClass) => liveClass.status !== 'live'
  ).length;

  if (loading) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="mt-5 text-base font-medium text-slate-600">
            Loading your live classes...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">

        {/* Welcome Banner */}
        <section className="relative mb-9 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-700 to-violet-800 px-6 py-9 shadow-xl shadow-indigo-200/50 sm:px-9 sm:py-11">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-violet-300/20 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color: '#FFFFFF' }}
              >
                Student Workspace
              </p>

              <h1
                className="mt-3 font-[Manrope] text-3xl font-extrabold leading-tight sm:text-4xl"
                style={{ color: '#FFFFFF' }}
              >
                Live Classes
              </h1>

              <p
                className="mt-3 max-w-xl text-base leading-7"
                style={{ color: '#FFFFFF' }}
              >
                Learn directly from your instructors through interactive
                live sessions. Join your class when it starts!
              </p>

              <Link
                to="/student"
                className="mt-6 inline-flex items-center rounded-xl bg-white px-6 py-3 font-bold shadow-md transition hover:-translate-y-0.5 hover:bg-indigo-50"
                style={{ color: '#4338CA' }}
              >
                ← Back to Dashboard
              </Link>
            </div>

            <div className="flex h-24 w-24 shrink-0 items-center justify-center self-start rounded-3xl border border-white/20 bg-white/10 text-5xl backdrop-blur-sm sm:h-28 sm:w-28 sm:self-center">
              🎥
            </div>
          </div>
        </section>

        {/* Class Statistics */}
        <section className="mb-9 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Classes
            </p>
            <p
              className="mt-2 font-[Manrope] font-extrabold leading-none text-slate-900"
              style={{ fontSize: '40px' }}
            >
              {classes.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Live Now
            </p>
            <div className="mt-2 flex items-center gap-3">
              <p
                className="font-[Manrope] font-extrabold leading-none text-red-600"
                style={{ fontSize: '40px' }}
              >
                {liveCount}
              </p>
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Scheduled Classes
            </p>
            <p
              className="mt-2 font-[Manrope] font-extrabold leading-none text-slate-900"
              style={{ fontSize: '40px' }}
            >
              {scheduledCount}
            </p>
          </div>
        </section>

        {/* Classes Section */}
        <section className="pb-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
                Your Learning Sessions
              </p>

              <h2 className="mt-2 font-[Manrope] text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Available Classes
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Join your instructor for interactive learning sessions.
              </p>
            </div>

            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
              Auto-refresh: 30 seconds
            </span>
          </div>

          {classes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-4xl">
                🎥
              </div>

              <h3 className="mt-5 font-[Manrope] text-xl font-bold text-slate-900">
                No Upcoming Live Classes
              </h3>

              <p className="mx-auto mt-2 max-w-md text-base leading-7 text-slate-500">
                Live classes from your enrolled courses will appear here.
                Check back later for new sessions.
              </p>

              <Link
                to="/courses"
                className="mt-6 inline-flex rounded-xl bg-indigo-600 px-6 py-3 font-bold transition hover:bg-indigo-700"
                style={{ color: '#FFFFFF' }}
              >
                Explore Courses
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
              {classes.map((liveClass) => {
                const isLive = liveClass.status === 'live';

                return (
                  <article
                    key={liveClass._id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/60"
                  >
                    <div
                      className={`h-2 w-full ${
                        isLive
                          ? 'bg-gradient-to-r from-red-500 to-rose-600'
                          : 'bg-gradient-to-r from-indigo-500 to-violet-600'
                      }`}
                    />

                    <div className="p-5 sm:p-6">
                      {/* Class Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-4">
                          <div
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                              isLive ? 'bg-red-50' : 'bg-indigo-50'
                            }`}
                          >
                            🎥
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-[Manrope] text-lg font-bold leading-snug text-slate-900">
                              {liveClass.title}
                            </h3>

                            <p className="mt-2 text-sm font-medium text-indigo-600">
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
                          <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold capitalize text-amber-700">
                            {liveClass.status || 'Scheduled'}
                          </span>
                        )}
                      </div>

                      {/* Class Information */}
                      <div className="mt-6 space-y-4 rounded-xl bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-lg shadow-sm">
                            👨‍🏫
                          </span>

                          <div>
                            <p className="text-xs font-medium text-slate-500">
                              Instructor
                            </p>
                            <p className="text-sm font-semibold text-slate-800">
                              {liveClass.instructor?.name || 'Instructor'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-lg shadow-sm">
                            🗓️
                          </span>

                          <div>
                            <p className="text-xs font-medium text-slate-500">
                              Scheduled Date & Time
                            </p>
                            <p className="text-sm font-semibold text-slate-800">
                              {formatDate(liveClass.scheduledAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Join Button */}
                      <button
                        type="button"
                        onClick={() => handleJoin(liveClass)}
                        disabled={!isLive}
                        className={`mt-5 w-full rounded-xl px-5 py-3.5 font-bold transition ${
                          isLive
                            ? 'bg-red-600 text-white shadow-md shadow-red-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg'
                            : 'cursor-not-allowed bg-slate-100 text-slate-500'
                        }`}
                        style={isLive ? { color: '#FFFFFF' } : undefined}
                      >
                        {isLive
                          ? 'Join Live Class →'
                          : 'Waiting for Instructor'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
