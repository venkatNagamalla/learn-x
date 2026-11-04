import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import { restoreSession } from './features/authSlice.js';

import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Welcome to LMS Platform</h1>
      <p className="mt-3 text-slate-600">
        Learn new skills and explore courses.
      </p>
    </div>
  );
}

function StudentDashboard() {
  return <h1 className="p-8 text-2xl font-bold">Student Dashboard</h1>;
}

function InstructorDashboard() {
  return <h1 className="p-8 text-2xl font-bold">Instructor Dashboard</h1>;
}

function AdminDashboard() {
  return <h1 className="p-8 text-2xl font-bold">Admin Dashboard</h1>;
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
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute roles={['student']} />}>
          <Route path="/student/*" element={<StudentDashboard />} />
        </Route>

        <Route element={<ProtectedRoute roles={['instructor']} />}>
          <Route path="/instructor/*" element={<InstructorDashboard />} />
        </Route>

        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </>
  );
}