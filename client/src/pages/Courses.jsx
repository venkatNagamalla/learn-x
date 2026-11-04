
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchCourses } from '../features/coursesSlice.js';

const formatPrice = (price) => {
  if (price === 0) return 'Free';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
};

export default function Courses() {
  const dispatch = useDispatch();

  const {
    items,
    total,
    pages,
    catalogStatus,
    error,
  } = useSelector((state) => state.courses);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [sort, setSort] = useState('new');
  const [page, setPage] = useState(1);

  // Fetch courses after the search input has been idle for 400ms.
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(
        fetchCourses({
          q: search.trim() || undefined,
          category: category || undefined,
          level: level || undefined,
          sort,
          page,
          limit: 12,
        })
      );
    }, 400);

    return () => clearTimeout(timer);
  }, [dispatch, search, category, level, sort, page]);

  const handleFilterChange = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Page heading */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Expand your knowledge
          </p>

          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Explore Courses
          </h1>

          <p className="mt-3 text-slate-600">
            Discover courses and learn new skills at your own pace.
          </p>
        </div>

        {/* Search and filters */}
        <div className="mb-8 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search courses..."
            className="rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />

          <select
            value={category}
            onChange={handleFilterChange(setCategory)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            <option value="Development">Development</option>
            <option value="Programming">Programming</option>
            <option value="Business">Business</option>
            <option value="Design">Design</option>
            <option value="IT & Software">IT & Software</option>
          </select>

          <select
            value={level}
            onChange={handleFilterChange(setLevel)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500"
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <select
            value={sort}
            onChange={handleFilterChange(setSort)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500"
          >
            <option value="new">Newest First</option>
            <option value="price">Price</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>

        {/* Results count */}
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {total} courses available
          </p>
        </div>

        {/* Loading */}
        {catalogStatus === 'loading' && (
          <div className="py-16 text-center text-slate-600">
            Loading courses...
          </div>
        )}

        {/* Error */}
        {catalogStatus === 'failed' && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center text-red-700">
            {error || 'Unable to load courses. Please try again.'}
          </div>
        )}

        {/* Empty state */}
        {catalogStatus === 'succeeded' && items.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
            <h2 className="text-xl font-semibold text-slate-800">
              No courses found
            </h2>
            <p className="mt-2 text-slate-500">
              Try changing your search or filters.
            </p>
          </div>
        )}

        {/* Course cards */}
        {catalogStatus === 'succeeded' && items.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((course) => (
              <article
                key={course._id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <img
                  src={
                    course.thumbnail ||
                    'https://placehold.co/640x360?text=Course'
                  }
                  alt={course.title}
                  className="h-44 w-full object-cover"
                />

                <div className="p-5">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                      {course.category}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600">
                      {course.level}
                    </span>
                  </div>

                  <h2 className="line-clamp-2 min-h-12 text-lg font-bold text-slate-900">
                    {course.title}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    By {course.instructor?.name || 'LMS Instructor'}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {formatPrice(course.price)}
                    </span>

                    <span className="text-sm text-amber-600">
                      ★ {Number(course.ratingAvg || 0).toFixed(1)}
                      <span className="text-slate-400">
                        {' '}({course.ratingCount || 0})
                      </span>
                    </span>
                  </div>

                  <Link
                    to={`/courses/${course._id}`}
                    className="mt-5 block rounded-lg bg-indigo-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-indigo-700"
                  >
                    View Course
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {catalogStatus === 'succeeded' && pages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((current) => current - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm font-medium text-slate-600">
              Page {page} of {pages}
            </span>

            <button
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= pages}
              className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
