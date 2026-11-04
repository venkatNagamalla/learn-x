
import { useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import { restoreSession } from './features/authSlice.js';

import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Courses from './pages/Courses.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import InstructorCourses from './pages/InstructorCourses.jsx';
import InstructorCourseForm from './pages/InstructorCourseForm.jsx';
import CurriculumEditor from './pages/CurriculumEditor.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

function Home() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">
          Welcome to LMS Platform
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Discover new skills, learn from expert instructors,
          and take your career to the next level.
        </p>

        <Link
          to="/courses"
          className="mt-8 inline-block rounded-lg bg-indigo-600 px-8 py-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          Explore Courses
        </Link>
      </div>
    </div>
  );
}

function StudentDashboard() {
  return (
    <h1 className="p-8 text-2xl font-bold">
      Student Dashboard
    </h1>
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

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Student Routes */}
        <Route element={<ProtectedRoute roles={['student']} />}>
          <Route
            path="/student/*"
            element={<StudentDashboard />}
          />
        </Route>

        {/* Instructor Routes */}
        <Route element={<ProtectedRoute roles={['instructor']} />}>
          <Route
            path="/instructor"
            element={<InstructorCourses />}
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
