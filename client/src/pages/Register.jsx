import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../features/authSlice.js';
import toast from 'react-hot-toast';

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { status } = useSelector((state) => state.auth);

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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-lg"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Create Account
          </h1>
          <p className="mt-2 text-slate-500">
            Join our learning community
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Full Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your name"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a password"
            required
            minLength={8}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Register as</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          >
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {status === 'loading' ? 'Creating account...' : 'Register'}
        </button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}