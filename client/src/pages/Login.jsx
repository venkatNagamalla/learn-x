
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../features/authSlice.js';
import toast from 'react-hot-toast';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { status, error } = useSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
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
      await dispatch(login(formData)).unwrap();
      toast.success('Login successful!');
      navigate('/');
    } catch (err) {
      toast.error(err || error || 'Login failed');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:min-h-[650px] lg:grid-cols-2">

        {/* Left learning banner */}
        <section
          className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 p-10 lg:flex xl:p-14"
          style={{ color: '#FFFFFF' }}
        >
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-violet-300/10" />

          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-3xl font-extrabold tracking-tight">
  <span className="text-white">Learn</span>
  <span className="rounded-lg border border-white/30 bg-white/15 px-2 py-0.5 text-white shadow-sm">
    X
  </span>
</span>
            </Link>
          </div>

          <div className="relative z-10 max-w-lg">
            <span
              className="inline-block rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold"
              style={{ color: '#FFFFFF' }}
            >
              YOUR LEARNING JOURNEY
            </span>

            <h1
              className="mt-7 text-4xl font-extrabold leading-tight xl:text-5xl"
              style={{ color: '#FFFFFF' }}
            >
              Welcome back to your learning space.
            </h1>

            <p
              className="mt-6 text-lg leading-relaxed"
              style={{ color: '#E0E7FF' }}
            >
              Continue learning, build new skills, and move closer to
              your goals. Your next achievement starts here.
            </p>

            <div className="mt-10 space-y-5">
              {[
                'Continue learning from where you stopped',
                'Join interactive live classes',
                'Track your progress and achievements',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                    ✓
                  </span>
                  <span
                    className="text-base font-medium"
                    style={{ color: '#FFFFFF' }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p
            className="relative z-10 text-sm"
            style={{ color: '#E0E7FF' }}
          >
            Learn today. Grow tomorrow.
          </p>
        </section>

        {/* Login form */}
        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">

            <Link
              to="/"
              className="mb-10 inline-flex items-center gap-2 lg:hidden"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-extrabold">
                <span style={{ color: '#FFFFFF' }}>L</span>
              </span>
              <span className="text-lg font-bold text-slate-900">
                Learn-X
              </span>
            </Link>

            <div>
              <span className="text-sm font-bold uppercase tracking-wider text-indigo-600">
                Welcome back
              </span>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Sign in to your account
              </h2>

              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Enter your details below to continue your learning journey.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-base font-semibold text-slate-800"
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-base font-semibold text-slate-800"
                  >
                    Password
                  </label>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 pr-20 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-4 text-base font-bold shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ color: '#FFFFFF' }}
              >
                {status === 'loading' ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <p className="text-center text-base text-slate-600">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Create an account
                </Link>
              </p>
            </div>

            <p className="mt-8 text-center text-sm text-slate-400">
              © {new Date().getFullYear()} Learn-X. All rights reserved.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
