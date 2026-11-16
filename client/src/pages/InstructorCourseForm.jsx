
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
      [name]: value,
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
        <p className="text-lg font-medium text-slate-600">
          Loading course...
        </p>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100';

  const labelClass = 'mb-2 block text-base font-bold text-slate-700';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">

        {/* Back Navigation */}
        <Link
          to="/instructor/courses"
          className="inline-flex items-center gap-2 text-base font-semibold text-indigo-600 transition hover:text-indigo-800"
        >
          ← Back to My Courses
        </Link>

        {/* Header */}
        <section className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 px-6 py-7 shadow-lg sm:px-8">
          <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full border-[30px] border-white/10" />

          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p
                className="text-base font-bold uppercase tracking-[0.16em]"
                style={{ color: '#E0E7FF' }}
              >
                Instructor Workspace
              </p>

              <h1
                className="mt-3 text-3xl font-bold sm:text-4xl"
                style={{ color: '#FFFFFF' }}
              >
                {isEditing ? 'Edit Your Course' : 'Create New Course'}
              </h1>

              <p
                className="mt-3 max-w-2xl text-lg leading-7"
                style={{ color: '#EEF2FF' }}
              >
                {isEditing
                  ? 'Update your course information and keep your learning content fresh.'
                  : 'Share your knowledge with students by creating a new learning experience.'}
              </p>
            </div>

            <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-5xl sm:flex">
              📚
            </div>
          </div>
        </section>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">

          {/* Basic Information */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Course Information
              </h2>
              <p className="mt-1 text-base text-slate-500">
                Add the essential details students will see about your course.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="title" className={labelClass}>
                  Course Title <span className="text-red-500">*</span>
                </label>

                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  maxLength={150}
                  placeholder="e.g. Complete MERN Stack Development"
                  className={inputClass}
                />

                <p className="mt-2 text-sm text-slate-500">
                  Choose a clear and descriptive course title.
                </p>
              </div>

              <div>
                <label htmlFor="description" className={labelClass}>
                  Course Description <span className="text-red-500">*</span>
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder="Describe what students will learn in this course..."
                  className={`${inputClass} resize-y leading-7`}
                />

                <p className="mt-2 text-sm text-slate-500">
                  Explain the course content and what students can expect to learn.
                </p>
              </div>
            </div>
          </section>

          {/* Course Settings */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Course Settings
              </h2>
              <p className="mt-1 text-base text-slate-500">
                Organize your course and choose its pricing.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="category" className={labelClass}>
                  Category <span className="text-red-500">*</span>
                </label>

                <input
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Programming"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="level" className={labelClass}>
                  Difficulty Level
                </label>

                <select
                  id="level"
                  name="level"
                  value={form.level}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="price" className={labelClass}>
                  Course Price (INR)
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-500">
                    ₹
                  </span>

                  <input
                    id="price"
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    min="0"
                    step="1"
                    required
                    className={`${inputClass} pl-10`}
                  />
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Enter 0 if you want to offer this course for free.
                </p>
              </div>
            </div>
          </section>

          {/* Thumbnail */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Course Thumbnail
              </h2>
              <p className="mt-1 text-base text-slate-500">
                Add an image that represents your course.
              </p>
            </div>

            <label htmlFor="thumbnail" className={labelClass}>
              Thumbnail Image URL
            </label>

            <input
              id="thumbnail"
              type="url"
              name="thumbnail"
              value={form.thumbnail}
              onChange={handleChange}
              placeholder="https://example.com/course-image.jpg"
              className={inputClass}
            />

            <p className="mt-2 text-sm text-slate-500">
              Paste a publicly accessible image URL.
            </p>

            {form.thumbnail && (
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <p className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">
                  Thumbnail Preview
                </p>

                <img
                  src={form.thumbnail}
                  alt="Course thumbnail preview"
                  className="max-h-64 w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                  onLoad={(event) => {
                    event.currentTarget.style.display = 'block';
                  }}
                />
              </div>
            )}
          </section>

          {/* Actions */}
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <p className="text-base font-bold text-slate-800">
                {isEditing ? 'Ready to update?' : 'Ready to create?'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                You can manage your curriculum after saving.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/instructor/courses"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ color: '#FFFFFF' }}
              >
                {saving
                  ? 'Saving...'
                  : isEditing
                    ? 'Update Course'
                    : 'Create Course'}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
