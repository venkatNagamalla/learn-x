
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

import { logout } from '../features/authSlice.js';
import api from '../api/axios.js';

export default function Navbar() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  // Get the first character of each word in the user's name.
  const getInitials = (name = '') =>
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0].toUpperCase())
      .join('');

  const openLogoutConfirm = () => {
    closeMenu();
    setShowLogoutConfirm(true);
  };

  const cancelLogout = () => {
    if (!loggingOut) {
      setShowLogoutConfirm(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      dispatch(logout());
      setShowLogoutConfirm(false);
      setLoggingOut(false);
      toast.success('Logged out successfully');
      navigate('/login');
    }
  };

  const linkClass = ({ isActive }) =>
    `rounded-xl px-4 py-2.5 text-base font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-indigo-50 text-indigo-700'
        : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-700'
    }`;

  const navLink = (to, label, end = false) => (
    <NavLink
      to={to}
      end={end}
      className={linkClass}
      onClick={closeMenu}
    >
      {label}
    </NavLink>
  );

  const UserAvatar = () => (
    <div
      title={user?.name || 'User'}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-[Manrope] text-base font-extrabold text-indigo-700 ring-2 ring-indigo-50"
    >
      {getInitials(user?.name)}
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white shadow-sm">
        <nav className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

          {/* Brand */}
          <Link
            to="/"
            onClick={closeMenu}
            className="flex shrink-0 items-center gap-2.5"
          >
            

            <span className="inline-flex items-center text-2xl font-extrabold tracking-tight">
  <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
    Learn-
  </span>
  <span className="text-black">
    X
  </span>
</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <>
                {navLink('/', 'Home', true)}

                {user.role === 'student' && (
                  <>
                    {navLink('/student', 'My Learning', true)}
                    {navLink('/student/live-classes', 'Live Classes')}
                    {navLink('/certificates', 'Certificates')}
                    {navLink('/courses', 'Explore Courses')}
                  </>
                )}

                {user.role === 'instructor' && (
                  <>
                    {navLink('/instructor', 'Dashboard', true)}
                    {navLink('/instructor/courses', 'My Courses')}
                    {navLink('/instructor/live-classes', 'Live Classes')}
                    {navLink('/courses', 'Explore Courses')}
                  </>
                )}

                {user.role === 'admin' && (
                  <>
                    {navLink('/admin', 'Admin Dashboard')}
                    {navLink('/courses', 'Explore Courses')}
                  </>
                )}
              </>
            ) : (
              <>
                {navLink('/', 'Home', true)}
                {navLink('/courses', 'Courses')}
              </>
            )}
          </div>

          {/* Desktop User Actions */}
          <div className="hidden items-center gap-4 lg:flex">
            {user ? (
              <>
                <UserAvatar />

                <button
                  type="button"
                  onClick={openLogoutConfirm}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-base font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-5 py-2.5 text-base font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-indigo-700"
                >
                  Login
                </Link>

               
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-xl text-slate-700 transition hover:bg-slate-50 lg:hidden"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </nav>

        {/* Mobile Navigation - Top Dropdown */}
        {menuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-5 shadow-lg lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2">
              {user ? (
                <>
                  {navLink('/', 'Home', true)}

                  {user.role === 'student' && (
                    <>
                      {navLink('/student', 'My Learning', true)}
                      {navLink('/student/live-classes', 'Live Classes')}
                      {navLink('/certificates', 'Certificates')}
                      {navLink('/courses', 'Explore Courses')}
                    </>
                  )}

                  {user.role === 'instructor' && (
                    <>
                      {navLink('/instructor', 'Dashboard', true)}
                      {navLink('/instructor/courses', 'My Courses')}
                      {navLink('/instructor/live-classes', 'Live Classes')}
                      {navLink('/courses', 'Explore Courses')}
                    </>
                  )}

                  {user.role === 'admin' && (
                    <>
                      {navLink('/admin', 'Admin Dashboard')}
                      {navLink('/courses', 'Explore Courses')}
                    </>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-5">
                    <div className="flex items-center gap-3">
                      <UserAvatar />
                    </div>

                    <button
                      type="button"
                      onClick={openLogoutConfirm}
                      className="rounded-xl border border-red-200 px-5 py-2.5 text-base font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {navLink('/', 'Home', true)}
                  {navLink('/courses', 'Courses')}

                  <div className="mt-3 flex gap-3 border-t border-slate-200 pt-5">
                    <Link
                      to="/login"
                      onClick={closeMenu}
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-center text-base font-semibold text-slate-700"
                    >
                      Login
                    </Link>

                    <Link
                      to="/register"
                      onClick={closeMenu}
                      className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-center text-base font-semibold text-white"
                    >
                      Get Started
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
          onClick={cancelLogout}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-description"
            className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-7 shadow-2xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">
              🚪
            </div>

            <div className="mt-5 text-center">
              <h2
                id="logout-title"
                className="font-[Manrope] text-2xl font-extrabold text-slate-900"
              >
                Are you sure?
              </h2>

              <p
                id="logout-description"
                className="mt-3 text-base leading-7 text-slate-600"
              >
                Do you really want to log out of your account? You will need to
                log in again to access your dashboard.
              </p>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={cancelLogout}
                disabled={loggingOut}
                className="flex-1 rounded-xl border border-slate-200 px-5 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                No, Cancel
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 rounded-xl bg-red-600 px-5 py-3 text-base font-bold text-white shadow-md shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? 'Logging out...' : 'Yes, Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
