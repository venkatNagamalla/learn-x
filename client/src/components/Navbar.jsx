
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

import { logout } from '../features/authSlice.js';
import api from '../api/axios.js';

export default function Navbar() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      dispatch(logout());
      toast.success('Logged out successfully');
      navigate('/login');
    }
  };

  return (
    <nav className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 px-6 py-4 text-white">
      <Link to="/" className="text-xl font-bold">
        LMS Platform
      </Link>

      <div className="flex flex-wrap items-center gap-5">
        {user ? (
          <>
            <Link to="/">Home</Link>

            {user.role === 'student' && (
              <>
                <Link to="/student">My Learning</Link>
                <Link to="/student/live-classes">Live Classes</Link>
                <Link to="/certificates">Certificates</Link>
              </>
            )}

            {user.role === 'instructor' && (
              <>
                <Link to="/instructor">Instructor Dashboard</Link>
                <Link to="/instructor/live-classes">Live Classes</Link>
              </>
            )}

            {user.role === 'admin' && (
              <Link to="/admin">Admin Dashboard</Link>
            )}

            <span className="text-sm text-slate-300">
              {user.name} ({user.role})
            </span>

            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-4 py-2 hover:bg-red-700"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>

            <Link
              to="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 hover:bg-indigo-700"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
