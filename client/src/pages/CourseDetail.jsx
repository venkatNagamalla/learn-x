
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  clearSelectedCourse,
  fetchCourseById,
} from '../features/coursesSlice.js';

import { createPaymentOrder } from '../api/paymentApi.js';

const formatPrice = (price) => {
  if (Number(price) === 0) return 'Free';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
};

const formatDuration = (seconds) => {
  if (!seconds) return 'Duration unavailable';

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${minutes} min`;
};

const demoCourseImages = {
  Development:
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=75',
  Programming:
    'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=75',
  Business:
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=75',
  Design:
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=900&q=75',
  'IT & Software':
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=75',
};

const defaultCourseImage =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=75';

const getCourseImage = (course) =>
  course.thumbnail ||
  demoCourseImages[course.category] ||
  defaultCourseImage;

export default function CourseDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    selectedCourse,
    sections,
    isEnrolled,
    detailStatus,
    error,
  } = useSelector((state) => state.courses);

  const user = useSelector((state) => state.auth.user);

  const [phone, setPhone] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const isStudent = user?.role === 'student';
  const isLoggedIn = Boolean(user);
  const isFreeCourse = Number(selectedCourse?.price || 0) === 0;

  useEffect(() => {
    dispatch(fetchCourseById(id));

    return () => {
      dispatch(clearSelectedCourse());
    };
  }, [dispatch, id]);

  const handleCoursePurchase = async () => {
    if (!selectedCourse?._id || paymentLoading || isEnrolled) {
      return;
    }

    setPaymentError('');

    if (!isFreeCourse && !/^\d{10,15}$/.test(phone)) {
      setPaymentError(
        'Please provide a valid phone number containing 10 to 15 digits.'
      );
      return;
    }

    try {
      setPaymentLoading(true);

      const response = await createPaymentOrder(
        selectedCourse._id,
        phone
      );

      if (response.free) {
        navigate('/student');
        return;
      }

      if (
        !response.checkoutUrl ||
        !response.checkoutFields ||
        typeof response.checkoutFields !== 'object'
      ) {
        throw new Error('Invalid payment checkout response.');
      }

      // Submit server-generated PayU checkout fields.
      const form = document.createElement('form');

      form.method = 'POST';
      form.action = response.checkoutUrl;
      form.acceptCharset = 'UTF-8';
      form.style.display = 'none';

      Object.entries(response.checkoutFields).forEach(
        ([name, value]) => {
          const input = document.createElement('input');

          input.type = 'hidden';
          input.name = name;
          input.value = String(value ?? '');

          form.appendChild(input);
        }
      );

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setPaymentError(
        err.response?.data?.message ||
          err.message ||
          'Unable to process your request. Please try again.'
      );

      setPaymentLoading(false);
    }
  };

  if (detailStatus === 'loading' || detailStatus === 'idle') {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="mt-5 text-base font-medium text-slate-600">
            Loading course details...
          </p>
        </div>
      </main>
    );
  }

  if (detailStatus === 'failed') {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">📚</div>

          <h2 className="mt-5 font-[Manrope] text-2xl font-bold text-slate-900">
            Unable to load course
          </h2>

          <p className="mt-3 text-base text-red-600">
            {error || 'Course not found.'}
          </p>

          <Link
            to="/courses"
            className="mt-6 inline-flex rounded-xl bg-indigo-600 px-6 py-3 font-semibold !text-white transition hover:bg-indigo-700"
          >
            Back to Courses
          </Link>
        </div>
      </main>
    );
  }

  if (!selectedCourse) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Course Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-100/60 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <Link
            to="/courses"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
          >
            ← Back to Courses
          </Link>

          <div className="grid items-center gap-10 lg:grid-cols-5">
            {/* Course Information */}
            <div className="lg:col-span-3">
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
                  {selectedCourse.category}
                </span>

                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold capitalize text-slate-600">
                  {selectedCourse.level}
                </span>
              </div>

              <h1 className="font-[Manrope] text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                {selectedCourse.title}
              </h1>

              <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
                {selectedCourse.description}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                    {(selectedCourse.instructor?.name || 'L')
                      .split(' ')
                      .map((word) => word[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      Course Instructor
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {selectedCourse.instructor?.name || 'LMS Instructor'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Course Rating
                  </p>
                  <p className="mt-1 text-base font-bold text-amber-600">
                    ★ {Number(selectedCourse.ratingAvg || 0).toFixed(1)}
                    <span className="ml-1 text-sm font-medium text-slate-500">
                      ({selectedCourse.ratingCount || 0} ratings)
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Course Preview and Purchase Card */}
            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                <div className="relative overflow-hidden bg-slate-100">
                  <img
                    src={getCourseImage(selectedCourse)}
                    alt={selectedCourse.title}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = defaultCourseImage;
                    }}
                    className="h-56 w-full object-cover sm:h-64"
                  />

                  <div className="absolute bottom-4 left-4">
                    <span className="rounded-lg bg-white/95 px-4 py-2 text-sm font-bold text-indigo-700 shadow">
                      Course Preview
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-7">
                  <p className="text-sm font-medium text-slate-500">
                    Course Price
                  </p>

                  <p className="mt-1 font-[Manrope] text-3xl font-extrabold text-slate-900">
                    {formatPrice(selectedCourse.price)}
                  </p>

                  <div className="my-6 border-t border-slate-100" />

                  {isStudent && (
                    <>
                      {isEnrolled ? (
                        <div>
                          <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-700">
                            ✓ You are enrolled in this course.
                          </p>

                          <Link
                            to={`/student/courses/${selectedCourse._id}/learn`}
                            className="block w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-center font-bold !text-white shadow-sm transition hover:bg-indigo-700 hover:!text-white"
                          >
                            Continue Learning →
                          </Link>
                        </div>
                      ) : (
                        <>
                          <Link
                            to={`/student/courses/${selectedCourse._id}/learn`}
                            className="block w-full rounded-xl bg-slate-100 px-6 py-3.5 text-center font-semibold text-indigo-700 transition hover:bg-indigo-50"
                          >
                            Watch Preview Lessons
                          </Link>

                          {!isFreeCourse && (
                            <div className="mt-5">
                              <label
                                htmlFor="payment-phone"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                              >
                                Phone Number
                              </label>

                              <input
                                id="payment-phone"
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel"
                                value={phone}
                                onChange={(event) => {
                                  setPhone(
                                    event.target.value
                                      .replace(/\D/g, '')
                                      .slice(0, 15)
                                  );
                                  setPaymentError('');
                                }}
                                placeholder="Enter 10 to 15 digits"
                                maxLength={15}
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                              />

                              <p className="mt-2 text-xs text-slate-500">
                                Enter your phone number for PayU checkout.
                              </p>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleCoursePurchase}
                            disabled={paymentLoading}
                            className="mt-5 w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-bold !text-white shadow-sm transition hover:bg-indigo-700 hover:!text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {paymentLoading
                              ? isFreeCourse
                                ? 'Enrolling...'
                                : 'Redirecting to PayU...'
                              : isFreeCourse
                                ? 'Enroll & Start Learning'
                                : `Buy Course - ${formatPrice(selectedCourse.price)}`}
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {!isLoggedIn && (
                    <Link
                      to="/login"
                      className="block w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-center font-bold !text-white transition hover:bg-indigo-700 hover:!text-white"
                    >
                      Log in to Access This Course
                    </Link>
                  )}

                  {isLoggedIn && !isStudent && (
                    <p className="rounded-xl bg-slate-100 px-4 py-4 text-center text-sm font-medium text-slate-600">
                      Student access is required to enroll in courses.
                    </p>
                  )}

                  {paymentError && (
                    <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {paymentError}
                    </p>
                  )}

                  {!isEnrolled && (
                    <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                      Payments are securely processed through PayU Hosted Checkout.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Course Curriculum */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
            What You'll Learn
          </p>

          <h2 className="mt-2 font-[Manrope] text-3xl font-extrabold text-slate-900">
            Course Curriculum
          </h2>

          <p className="mt-3 text-base text-slate-500">
            Explore the sections and lessons included in this course.
          </p>
        </div>

        {sections.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <div className="text-4xl">📖</div>

            <h3 className="mt-4 font-[Manrope] text-xl font-bold text-slate-800">
              Curriculum Coming Soon
            </h3>

            <p className="mt-2 text-base text-slate-500">
              No curriculum has been added to this course yet.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {sections.map((section, index) => (
              <article
                key={section._id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-5 sm:px-7">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 font-[Manrope] font-bold text-indigo-700">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div>
                      <h3 className="font-[Manrope] text-lg font-bold text-slate-900">
                        {section.title}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Section {index + 1}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
                    {section.lessons?.length || 0} Lessons
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {section.lessons?.map((lesson, lessonIndex) => (
                    <div
                      key={lesson._id}
                      className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50 sm:px-7"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                          {lessonIndex + 1}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">
                            {lesson.title}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {formatDuration(lesson.duration)}
                          </p>
                        </div>
                      </div>

                      {lesson.isPreview && (
                        <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                          Free Preview
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
