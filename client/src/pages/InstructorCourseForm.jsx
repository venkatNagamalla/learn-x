
import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios.js';

const initialForm = {
  title: '',
  description: '',
  category: '',
  level: 'beginner',
  price: 0,
  thumbnail: '',
};

export default function InstructorCourseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) return;

    const loadCourse = async () => {
      try {
        const { data } = await api.get('/courses/mine');
        const course = data.items.find((item) => item._id === id);

        if (!course) {
          toast.error('Course not found.');
          navigate('/instructor');
          return;
        }

        setForm({
          title: course.title || '',
          description: course.description || '',
          category: course.category || '',
          level: course.level || 'beginner',
          price: course.price ?? 0,
          thumbnail: course.thumbnail || '',
        });
      } catch (error) {
        toast.error(
          error.response?.data?.message || 'Failed to load course.'
        );
        navigate('/instructor');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [id, isEditing, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: name === 'price' ? value : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (Number(form.price) < 0 || !Number.isFinite(Number(form.price))) {
      toast.error('Please enter a valid course price.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        price: Number(form.price),
      };

      if (isEditing) {
        await api.put(`/courses/${id}`, payload);
        toast.success('Course updated successfully!');
      } else {
        await api.post('/courses', payload);
        toast.success('Course created successfully!');
      }

      navigate('/instructor');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Unable to save course.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-600">
        Loading course...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/instructor"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to My Courses
        </Link>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? 'Edit Course' : 'Create New Course'}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Enter the basic information about your course.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Course Title
              </label>

              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="Enter course title"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={5}
                placeholder="Describe what students will learn..."
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Category
                </label>

                <input
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Programming"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Difficulty Level
                </label>

                <select
                  name="level"
                  value={form.level}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Price (INR)
              </label>

              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                min="0"
                step="1"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />

              <p className="mt-1 text-xs text-slate-500">
                Enter 0 if the course is free.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Thumbnail Image URL
              </label>

              <input
                type="url"
                name="thumbnail"
                value={form.thumbnail}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : isEditing
                    ? 'Update Course'
                    : 'Create Course'}
              </button>

              <Link
                to="/instructor"
                className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
