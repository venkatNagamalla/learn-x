
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import api from '../api/axios.js';
import { getUpcomingLiveClasses } from '../api/liveClassApi.js';

export default function StudentDashboard() {
  const [courses, setCourses] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const loadDashboard = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const [courseResponse, liveResponse] = await Promise.all([
        api.get('/enrollments/mine'),
        getUpcomingLiveClasses(),
      ]);

      setCourses(courseResponse.data.items || []);
      setLiveClasses(liveResponse.items || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to load your learning dashboard'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(true);

    const interval = setInterval(() => {
      loadDashboard();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadDashboard]);

  const handleJoinClass = (classId) => {
    navigate(`/student/live-classes/${classId}`);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getProgress = (value) => {
    const progress = Number(value) || 0;

    return Math.min(100, Math.max(0, progress));
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-slate-600">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Dashboard Heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            My Learning
          </h1>

          <p className="mt-2 text-slate-600">
            Continue your courses and join upcoming live classes.
          </p>
        </div>

        {/* Enrolled Courses */}
        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              My Courses
            </h2>

            <Link
              to="/courses"
              className="font-medium text-indigo-600 hover:text-indigo-800"
            >
              Explore Courses
            </Link>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-600">
                You haven't enrolled in any courses yet.
              </p>

              <Link
                to="/courses"
                className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-white hover:bg-indigo-700"
              >
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((enrollment) => {
                const course = enrollment.course;

                if (!course) return null;

                const lessonProgress = getProgress(
                  enrollment.lessonProgress
                );

                const quizProgress = getProgress(
                  enrollment.quizProgress
                );

                const completed = Boolean(enrollment.completedAt);

                return (
                  <div
                    key={enrollment.enrollmentId}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    <img
                      src={
                        course.thumbnail ||
                        'https://placehold.co/640x360?text=Course'
                      }
                      alt={course.title}
                      className="h-44 w-full object-cover"
                    />

                    <div className="p-5">
                      <h3 className="text-lg font-bold text-slate-900">
                        {course.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                        {course.description}
                      </p>

                      <p className="mt-3 text-sm text-slate-500">
                        Instructor: {course.instructor?.name || 'Instructor'}
                      </p>

                      <div className="mt-5 space-y-4">

                        {/* Lesson Progress */}
                        <div>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-slate-600">
                              Lesson Progress
                            </span>

                            <span className="font-semibold">
                              {lessonProgress}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-indigo-600"
                              style={{
                                width: `${lessonProgress}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Quiz Progress */}
                        <div>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-slate-600">
                              Quiz Progress
                            </span>

                            <span className="font-semibold">
                              {quizProgress}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-emerald-600"
                              style={{
                                width: `${quizProgress}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {completed && (
                        <p className="mt-4 text-sm font-semibold text-emerald-700">
                          Course Completed
                        </p>
                      )}

                      <Link
                        to={`/student/courses/${course._id}/learn`}
                        className="mt-5 block rounded-lg bg-indigo-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-indigo-700"
                      >
                        {completed ? 'Review Course' : 'Continue Learning'}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Upcoming Live Classes */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              Upcoming Live Classes
            </h2>

            <Link
              to="/student/live-classes"
              className="font-medium text-indigo-600 hover:text-indigo-800"
            >
              View All
            </Link>
          </div>

          {liveClasses.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-600">
                No upcoming live classes at the moment.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {liveClasses.map((liveClass) => {
                const isLive = liveClass.status === 'live';

                return (
                  <div
                    key={liveClass._id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-bold text-slate-900">
                        {liveClass.title}
                      </h3>

                      {isLive ? (
                        <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                          LIVE NOW
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          SCHEDULED
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm text-slate-600">
                      Course: {liveClass.course?.title || 'Course'}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Instructor: {liveClass.instructor?.name || 'Instructor'}
                    </p>

                    <p className="mt-3 text-sm text-slate-500">
                      {formatDate(liveClass.scheduledAt)}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleJoinClass(liveClass._id)}
                      disabled={!isLive}
                      className={`mt-5 w-full rounded-lg px-4 py-2.5 font-semibold text-white ${
                        isLive
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'cursor-not-allowed bg-slate-400'
                      }`}
                    >
                      {isLive ? 'Join Live Class' : 'Waiting for Instructor'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Live class information refreshes automatically every 30 seconds.
          </p>
        </section>

      </div>
    </div>
  );
}
