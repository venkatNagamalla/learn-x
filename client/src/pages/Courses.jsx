
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

// Demo images for different course categories
const demoCourseImages = {
  Development:
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
  Programming:
    'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800',
  Business:
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
  Design:
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
  'IT & Software':
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
};

const defaultCourseImage =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800';

const getCourseImage = (course) => {
  return (
    course.thumbnail ||
    demoCourseImages[course.category] ||
    defaultCourseImage
  );
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

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setLevel('');
    setSort('new');
    setPage(1);
  };

  const retryLoading = () => {
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
  };

  const hasFilters = search || category || level || sort !== 'new';

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
              Discover. Learn. Grow.
            </span>

            <h1 className="mt-5 font-[Manrope] text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Explore Courses
              <span className="block text-indigo-600">
                Build Your Future.
              </span>
            </h1>

            <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
              Discover quality courses, learn from experienced instructors,
              and develop practical skills at your own pace.
            </p>

            <div className="mt-7 flex flex-wrap gap-6 text-sm font-medium text-slate-600">
              <span className="flex items-center gap-2">
                <span className="font-bold text-indigo-600">✓</span>
                Learn at your own pace
              </span>

              <span className="flex items-center gap-2">
                <span className="font-bold text-indigo-600">✓</span>
                Practical learning
              </span>

              <span className="flex items-center gap-2">
                <span className="font-bold text-indigo-600">✓</span>
                Track your progress
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Course Catalog */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">

        {/* Search and Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-[Manrope] text-xl font-bold text-slate-900">
                Find Your Course
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Search and filter courses to find what you need.
              </p>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
              >
                Clear filters ✕
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="course-search"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Search
              </label>

              <input
                id="course-search"
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search courses..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label
                htmlFor="course-category"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Category
              </label>

              <select
                id="course-category"
                value={category}
                onChange={handleFilterChange(setCategory)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">All Categories</option>
                <option value="Development">Development</option>
                <option value="Programming">Programming</option>
                <option value="Business">Business</option>
                <option value="Design">Design</option>
                <option value="IT & Software">IT & Software</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="course-level"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Difficulty Level
              </label>

              <select
                id="course-level"
                value={level}
                onChange={handleFilterChange(setLevel)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="course-sort"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Sort By
              </label>

              <select
                id="course-sort"
                value={sort}
                onChange={handleFilterChange(setSort)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="new">Newest First</option>
                <option value="price">Price</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="mb-6 mt-10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-[Manrope] text-2xl font-bold text-slate-900">
              Available Courses
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {total} {total === 1 ? 'course' : 'courses'} available
            </p>
          </div>

          <div className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
            Page {page} of {pages || 1}
          </div>
        </div>

        {/* Loading */}
        {catalogStatus === 'loading' && (
          <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />

            <p className="mt-5 text-base font-medium text-slate-600">
              Loading courses...
            </p>
          </div>
        )}

        {/* Error */}
        {catalogStatus === 'failed' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <h2 className="font-[Manrope] text-xl font-bold text-red-800">
              Unable to load courses
            </h2>

            <p className="mt-2 text-base text-red-700">
              {error || 'Something went wrong. Please try again.'}
            </p>

            <button
              type="button"
              onClick={retryLoading}
              className="mt-5 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {catalogStatus === 'succeeded' && items.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
              📚
            </div>

            <h2 className="mt-5 font-[Manrope] text-2xl font-bold text-slate-900">
              No courses found
            </h2>

            <p className="mx-auto mt-3 max-w-md text-base leading-7 text-slate-500">
              We couldn't find any courses matching your search. Try changing
              your search term or filters.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Course Cards */}
        {catalogStatus === 'succeeded' && items.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((course) => (
              <article
                key={course._id}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/50"
              >
                {/* Thumbnail */}
                <div className="relative overflow-hidden bg-slate-100">
                  <img
                    src={getCourseImage(course)}
                    alt={course.title}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = defaultCourseImage;
                    }}
                    className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
                  />

                  <div className="absolute left-3 top-3">
                    <span className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm">
                      {course.category}
                    </span>
                  </div>

                  <div className="absolute bottom-3 right-3">
                    <span className="rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs font-semibold capitalize text-white">
                      {course.level}
                    </span>
                  </div>
                </div>

                {/* Course Details */}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="line-clamp-2 min-h-[3.5rem] font-[Manrope] text-lg font-bold leading-7 text-slate-900 transition group-hover:text-indigo-700">
                    {course.title}
                  </h3>

                  <p className="mt-3 text-sm text-slate-500">
                    By {course.instructor?.name || 'LMS Instructor'}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Course Price
                      </p>

                      <p className="mt-1 text-lg font-extrabold text-slate-900">
                        {formatPrice(course.price)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-400">
                        Rating
                      </p>

                      <p className="mt-1 text-base font-bold text-amber-600">
                        ★ {Number(course.ratingAvg || 0).toFixed(1)}
                        <span className="ml-1 text-xs font-medium text-slate-400">
                          ({course.ratingCount || 0})
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* View Course Button */}
                  <Link
                    to={`/courses/${course._id}`}
                    className="mt-5 block rounded-xl bg-indigo-600 px-4 py-3.5 text-center text-base font-bold !text-white shadow-sm transition hover:bg-indigo-700 hover:!text-white hover:shadow-md"
                  >
                    View Course →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {catalogStatus === 'succeeded' && pages > 1 && (
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setPage((current) => current - 1)}
              disabled={page <= 1}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous
            </button>

            <span className="rounded-xl bg-indigo-50 px-5 py-3 text-base font-bold text-indigo-700">
              {page} / {pages}
            </span>

            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= pages}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
