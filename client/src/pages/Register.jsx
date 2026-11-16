
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../features/authSlice.js';
import toast from 'react-hot-toast';

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status } = useSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await dispatch(register(formData)).unwrap();
      toast.success('Registration successful!');
      navigate('/');
    } catch (err) {
      toast.error(err || 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-90px)] items-center justify-center bg-slate-50 px-4 py-6 sm:px-6">
      <div className="grid w-full max-w-[1335px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl lg:grid-cols-2">

        {/* LEFT PURPLE BRANDING PANEL */}
        <section className="relative hidden min-h-[680px] overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-700 px-12 py-10 lg:flex lg:flex-col lg:justify-between xl:px-16">

          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-violet-400/30" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-indigo-400/30" />

          <Link
            to="/"
            className="relative z-10 inline-flex w-fit items-center gap-1 text-4xl font-extrabold tracking-tight"
          >
            <span style={{ color: '#FFFFFF' }}>Learn</span>
            <span
              className="rounded-xl border border-white/30 bg-white/15 px-2.5 py-0.5"
              style={{ color: '#FFFFFF' }}
            >
              X
            </span>
          </Link>

          <div className="relative z-10 max-w-xl">
            <span
              className="inline-flex rounded-full border border-white/30 bg-white/10 px-5 py-3 text-base font-bold"
              style={{ color: '#FFFFFF' }}
            >
              START YOUR LEARNING JOURNEY
            </span>

            <h1
              className="mt-9 text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl"
              style={{ color: '#FFFFFF' }}
            >
              Your learning journey starts here.
            </h1>

            <p
              className="mt-7 text-lg leading-8"
              style={{ color: '#E0E7FF' }}
            >
              Create your Learn-X account and take the next step toward
              building new skills, exploring knowledge, and achieving
              your goals.
            </p>

            <div className="mt-11 space-y-6">
              <div className="flex items-center gap-4">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg"
                  style={{ color: '#FFFFFF' }}
                >
                  ✓
                </span>
                <span
                  className="text-lg font-semibold"
                  style={{ color: '#FFFFFF' }}
                >
                  Learn at your own pace
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg"
                  style={{ color: '#FFFFFF' }}
                >
                  ✓
                </span>
                <span
                  className="text-lg font-semibold"
                  style={{ color: '#FFFFFF' }}
                >
                  Join interactive live classes
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg"
                  style={{ color: '#FFFFFF' }}
                >
                  ✓
                </span>
                <span
                  className="text-lg font-semibold"
                  style={{ color: '#FFFFFF' }}
                >
                  Track your progress and achievements
                </span>
              </div>
            </div>
          </div>

          <p
            className="relative z-10 text-base"
            style={{ color: '#E0E7FF' }}
          >
            Learn something new. Grow every day.
          </p>
        </section>

        {/* RIGHT REGISTRATION FORM */}
        <section className="flex items-center justify-center px-6 py-9 sm:px-12 lg:px-12 lg:py-8 xl:px-16">
          <div className="w-full max-w-[520px]">

            {/* MOBILE BRAND */}
            <Link
              to="/"
              className="mb-7 inline-flex items-center gap-1 text-3xl font-extrabold tracking-tight lg:hidden"
            >
              <span className="text-indigo-600">Learn</span>
              <span className="text-slate-900">X</span>
            </Link>

            <div className="mb-6">
              <p className="text-base font-bold tracking-widest text-indigo-600">
                JOIN LEARN-X
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Create your account
              </h2>

              <p className="mt-3 text-lg leading-7 text-slate-600">
                Enter your details below to start your learning journey.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* NAME */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-base font-semibold text-slate-900"
                >
                  Full Name
                </label>

                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              {/* EMAIL */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-base font-semibold text-slate-900"
                >
                  Email Address
                </label>

                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-base font-semibold text-slate-900"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3.5 pr-20 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-base font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Minimum 8 characters.
                </p>
              </div>

              {/* ROLE */}
              <div>
                <label
                  htmlFor="role"
                  className="mb-2 block text-base font-semibold text-slate-900"
                >
                  Register As
                </label>

                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-base text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                </select>
              </div>

              {/* REGISTER BUTTON */}
              <button
                type="submit"
                disabled={status === 'loading'}
                style={{ color: '#FFFFFF' }}
                className="w-full rounded-2xl bg-indigo-600 py-4 text-lg font-bold shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === 'loading' ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <p className="text-center text-base text-slate-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Sign In
                </Link>
              </p>
            </div>

            <p className="mt-6 text-center text-sm text-slate-400">
              © {new Date().getFullYear()} Learn-X. All rights reserved.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
