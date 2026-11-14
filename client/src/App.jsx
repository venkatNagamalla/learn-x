
import { useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { restoreSession } from './features/authSlice.js';

import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Courses from './pages/Courses.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import StudentLearning from './pages/StudentLearning.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import Certificates from './pages/Certificates.jsx';
import CertificateVerification from './pages/CertificateVerification.jsx';
import PaymentResult from './pages/PaymentResult.jsx';

import InstructorDashboard from './pages/InstructorDashboard.jsx';
import InstructorCourses from './pages/InstructorCourses.jsx';
import InstructorCourseForm from './pages/InstructorCourseForm.jsx';
import CurriculumEditor from './pages/CurriculumEditor.jsx';
import QuizBuilder from './pages/QuizBuilder.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

import InstructorLiveClasses from './pages/InstructorLiveClasses.jsx';
import StudentLiveClasses from './pages/StudentLiveClasses.jsx';
import LiveClassRoom from './pages/LiveClassRoom.jsx';

function Home() {
  const user = useSelector((state) => state.auth.user);

  const getStartedPath = {
    student: '/student',
    instructor: '/instructor',
    admin: '/admin',
  }[user?.role] || (user ? '/courses' : '/register');

  const features = [
    {
      number: '01',
      title: 'Learn at Your Own Pace',
      description:
        'Access structured courses and learn whenever and wherever it works for you.',
    },
    {
      number: '02',
      title: 'Learn from Experts',
      description:
        'Explore practical courses created by instructors with real-world experience.',
    },
    {
      number: '03',
      title: 'Track Your Progress',
      description:
        'Monitor your learning journey, complete quizzes, and earn certificates.',
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-blue-100/50 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              Your journey to knowledge starts here
            </div>

            <h1 className="max-w-2xl font-[Manrope] text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Learn New Skills.
              <span className="mt-2 block text-indigo-600">
                Build Your Future.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              Discover quality courses, learn from experienced instructors,
              and develop the skills you need to achieve your goals.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/courses"
                className="rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700"
                style={{ color: '#FFFFFF' }}
              >
                Explore Courses
                <span className="ml-2">→</span>
              </Link>

              <Link
                to={getStartedPath}
                className="rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                {user ? 'Go to Dashboard' : 'Get Started'}
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <span className="font-bold text-indigo-600">✓</span>
                Learn at your pace
              </span>
              <span className="flex items-center gap-2">
                <span className="font-bold text-indigo-600">✓</span>
                Track your progress
              </span>
            </div>
          </div>

          {/* Hero Learning Card */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/70 sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Your learning space
                  </p>
                  <h2 className="mt-1 font-[Manrope] text-xl font-bold text-slate-800">
                    Keep Growing
                  </h2>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
                  🎓
                </div>
              </div>

              {/* Purple Learning Card */}
              <div className="relative mt-7 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 p-6 shadow-lg shadow-indigo-500/20 sm:p-7">
                <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

                <div className="relative">
                  <p
                    className="text-sm font-semibold tracking-wide"
                    style={{ color: '#E0E7FF' }}
                  >
                    LEARNING IS AN INVESTMENT
                  </p>

                  <h3
                    className="mt-4 font-[Manrope] text-2xl font-bold leading-snug sm:text-3xl"
                    style={{ color: '#FFFFFF' }}
                  >
                    Every skill you learn opens a new opportunity.
                  </h3>

                  <Link
                    to="/courses"
                    className="mt-6 inline-flex items-center rounded-xl bg-white px-5 py-3 text-sm font-bold shadow-md transition hover:-translate-y-0.5 hover:bg-indigo-50"
                    style={{ color: '#4F46E5' }}
                  >
                    Start Learning Today
                    <span className="ml-2">→</span>
                  </Link>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-2xl">📚</div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    Structured Courses
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Learn step by step
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-2xl">🏆</div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    Certificates
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Celebrate achievements
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-lg">
                  ✨
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Your next chapter starts here
                  </p>
                  <p className="text-xs text-slate-500">
                    Learn something new today
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -right-3 -top-5 -z-10 h-full w-full rounded-3xl bg-indigo-100/70" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
            Why Choose Us
          </p>

          <h2 className="mt-3 font-[Manrope] text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Everything You Need to Learn Better
          </h2>

          <p className="mt-4 leading-7 text-slate-500">
            A learning experience designed to help you build knowledge,
            develop skills, and move forward with confidence.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.number}
              className="rounded-2xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/50"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 font-[Manrope] text-sm font-bold text-indigo-700">
                {feature.number}
              </span>

              <h3 className="mt-6 font-[Manrope] text-xl font-bold text-slate-800">
                {feature.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Bottom Call to Action */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 px-6 py-16 text-center shadow-xl shadow-indigo-200/50 sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-purple-300/20 blur-3xl" />

          <div className="relative mx-auto max-w-3xl">
            <p
              className="mb-4 text-sm font-bold uppercase tracking-[0.2em]"
              style={{ color: '#E0E7FF' }}
            >
              Your Future Starts Today
            </p>

            <h2
              className="font-[Manrope] text-3xl font-extrabold sm:text-4xl lg:text-5xl"
              style={{ color: '#FFFFFF' }}
            >
              Ready to Start Learning?
            </h2>

            <p
              className="mx-auto mt-5 max-w-2xl text-base leading-8 sm:text-lg"
              style={{ color: '#E0E7FF' }}
            >
              Take the next step in your learning journey. Discover courses
              and start building skills that matter.
            </p>

            <Link
              to="/courses"
              className="mt-9 inline-flex items-center rounded-xl bg-white px-8 py-4 text-sm font-bold shadow-lg transition hover:-translate-y-1 hover:bg-indigo-50"
              style={{ color: '#4F46E5' }}
            >
              Browse Courses
              <span className="ml-2">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-7 text-center sm:flex-row sm:px-6 lg:px-8">
          <p className="font-[Manrope] text-sm font-bold text-slate-800">
            LMS Platform
          </p>

          <p className="text-xs text-slate-500">
            Learn. Grow. Achieve.
          </p>

          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} LMS Platform
          </p>
        </div>
      </footer>
    </main>
  );
}

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  return (
    <>
      <Navbar />

      <Routes>
        {/* Home */}
        <Route path="/" element={<Home />} />

        {/* Public Courses */}
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:id" element={<CourseDetail />} />

        {/* Public Certificate Verification */}
        <Route
          path="/verify/:certificateId"
          element={<CertificateVerification />}
        />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Student Routes */}
        <Route element={<ProtectedRoute roles={['student']} />}>
          <Route path="/learn/:courseId" element={<StudentLearning />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route
            path="/student/courses/:courseId/learn"
            element={<StudentLearning />}
          />
          <Route
            path="/student/live-classes"
            element={<StudentLiveClasses />}
          />
          <Route
            path="/student/live-classes/:id"
            element={<LiveClassRoom />}
          />
          <Route path="/certificates" element={<Certificates />} />
          <Route path="/payment/result" element={<PaymentResult />} />
        </Route>

        {/* Instructor Routes */}
        <Route element={<ProtectedRoute roles={['instructor']} />}>
          <Route
            path="/instructor"
            element={<InstructorDashboard />}
          />
          <Route
            path="/instructor/courses"
            element={<InstructorCourses />}
          />
          <Route
            path="/instructor/live-classes"
            element={<InstructorLiveClasses />}
          />
          <Route
            path="/instructor/live-classes/:id"
            element={<LiveClassRoom />}
          />
          <Route
            path="/instructor/courses/new"
            element={<InstructorCourseForm />}
          />
          <Route
            path="/instructor/courses/:id/edit"
            element={<InstructorCourseForm />}
          />
          <Route
            path="/instructor/courses/:id/curriculum"
            element={<CurriculumEditor />}
          />
          <Route
            path="/instructor/courses/:id/quizzes"
            element={<QuizBuilder />}
          />
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route
            path="/admin/*"
            element={<AdminDashboard />}
          />
        </Route>
      </Routes>
    </>
  );
}
