
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { getUpcomingLiveClasses } from '../api/liveClassApi.js';

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

    // Refresh class status every 30 seconds.
    const intervalId = setInterval(() => {
      loadClasses(false);
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [loadClasses]);

  const handleJoin = (liveClass) => {
    if (liveClass.status !== 'live') {
      toast.error('This class has not started yet.');
      return;
    }

    navigate(`/student/live-classes/${liveClass._id}`);
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
            Student workspace
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Live Classes
          </h1>

          <p className="mt-2 text-slate-600">
            View your upcoming classes and join sessions when your instructor starts them.
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Class status refreshes automatically every 30 seconds.
          </p>
        </div>

        {classes.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-800">
              No upcoming live classes
            </h2>

            <p className="mt-2 text-slate-500">
              Live classes from your enrolled courses will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {classes.map((liveClass) => (
              <article
                key={liveClass._id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {liveClass.title}
                    </h2>

                    <p className="mt-1 text-sm text-indigo-600">
                      {liveClass.course?.title || 'Course'}
                    </p>
                  </div>

                  {liveClass.status === 'live' ? (
                    <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                      LIVE NOW
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold capitalize text-amber-700">
                      {liveClass.status}
                    </span>
                  )}
                </div>

                <div className="mt-5 space-y-2 text-sm text-slate-600">
                  <p>
                    <strong>Instructor:</strong>{' '}
                    {liveClass.instructor?.name || 'Instructor'}
                  </p>

                  <p>
                    <strong>Scheduled:</strong>{' '}
                    {new Date(liveClass.scheduledAt).toLocaleString(
                      'en-IN',
                      {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }
                    )}
                  </p>
                </div>

                <button
                  onClick={() => handleJoin(liveClass)}
                  disabled={liveClass.status !== 'live'}
                  className="mt-6 w-full rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {liveClass.status === 'live'
                    ? 'Join Live Class'
                    : 'Waiting for Instructor'}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
