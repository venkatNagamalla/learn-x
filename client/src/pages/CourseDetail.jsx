
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  clearSelectedCourse,
  fetchCourseById,
} from '../features/coursesSlice.js';

import { createPaymentOrder } from '../api/paymentApi.js';

const formatPrice = (price) => {
  if (price === 0) return 'Free';

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

  if (hours > 0) return `${hours}h ${remainingMinutes}m`;

  return `${minutes} min`;
};

export default function CourseDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    selectedCourse,
    sections,
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
    setPaymentError('');

    if (!isFreeCourse && !/^\d{10,15}$/.test(phone.trim())) {
      setPaymentError(
        'Please enter a valid phone number containing 10 to 15 digits.'
      );
      return;
    }

    try {
      setPaymentLoading(true);

      const response = await createPaymentOrder(
        selectedCourse._id,
        isFreeCourse ? undefined : phone.trim()
      );

      if (response.free) {
        navigate(`/student/courses/${selectedCourse._id}/learn`);
        return;
      }

      if (!response.checkoutUrl || !response.checkoutFields) {
        throw new Error('Invalid payment checkout response.');
      }

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
      <div className="py-20 text-center text-slate-600">
        Loading course details...
      </div>
    );
  }

  if (detailStatus === 'failed') {
    return (
      <div className="px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-800">
          Unable to load course
        </h2>

        <p className="mt-3 text-red-600">
          {error || 'Course not found.'}
        </p>

        <Link
          to="/courses"
          className="mt-6 inline-block text-indigo-600 hover:underline"
        >
          Back to courses
        </Link>
      </div>
    );
  }

  if (!selectedCourse) return null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/courses"
          className="mb-6 inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to courses
        </Link>

        <div className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-5 lg:p-8">
          <div className="lg:col-span-3">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700">
                {selectedCourse.category}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm capitalize text-slate-600">
                {selectedCourse.level}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              {selectedCourse.title}
            </h1>

            <p className="mt-5 leading-7 text-slate-600">
              {selectedCourse.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-6 text-sm text-slate-600">
              <span>
                Instructor:{' '}
                <strong className="text-slate-900">
                  {selectedCourse.instructor?.name || 'LMS Instructor'}
                </strong>
              </span>

              <span className="text-amber-600">
                ★ {Number(selectedCourse.ratingAvg || 0).toFixed(1)}
                <span className="text-slate-500">
                  {' '}({selectedCourse.ratingCount || 0} ratings)
                </span>
              </span>
            </div>
          </div>

          <div className="lg:col-span-2">
            <img
              src={
                selectedCourse.thumbnail ||
                'https://placehold.co/640x360?text=Course'
              }
              alt={selectedCourse.title}
              className="h-52 w-full rounded-xl object-cover"
            />

            <div className="mt-5">
              <p className="text-3xl font-bold text-slate-900">
                {formatPrice(selectedCourse.price)}
              </p>

              {isStudent && (
                <>
                  {isFreeCourse ? (
                    <button
                      type="button"
                      onClick={handleCoursePurchase}
                      disabled={paymentLoading}
                      className="mt-5 w-full rounded-lg bg-indigo-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {paymentLoading
                        ? 'Enrolling...'
                        : 'Enroll & Start Learning'}
                    </button>
                  ) : (
                    <>
                      <Link
                        to={`/student/courses/${selectedCourse._id}/learn`}
                        className="mt-5 block w-full rounded-lg bg-slate-100 px-6 py-3 text-center font-semibold text-indigo-700 transition hover:bg-slate-200"
                      >
                        Watch Preview Lessons
                      </Link>

                      <div className="mt-5">
                        <label
                          htmlFor="payment-phone"
                          className="mb-2 block text-sm font-medium text-slate-700"
                        >
                          Phone Number
                        </label>

                        <input
                          id="payment-phone"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          value={phone}
                          onChange={(event) =>
                            setPhone(event.target.value)
                          }
                          placeholder="Enter your phone number"
                          maxLength={15}
                          className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleCoursePurchase}
                        disabled={paymentLoading}
                        className="mt-3 w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {paymentLoading
                          ? 'Redirecting to PayU...'
                          : `Buy Course - ${formatPrice(selectedCourse.price)}`}
                      </button>
                    </>
                  )}
                </>
              )}

              {!isLoggedIn && (
                <Link
                  to="/login"
                  className="mt-5 block w-full rounded-lg bg-indigo-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-indigo-700"
                >
                  Log in to access this course
                </Link>
              )}

              {isLoggedIn && !isStudent && (
                <p className="mt-5 rounded-lg bg-slate-100 px-4 py-3 text-center text-sm text-slate-600">
                  Student access is required to enroll in courses.
                </p>
              )}

              {paymentError && (
                <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {paymentError}
                </p>
              )}

              <p className="mt-3 text-center text-xs text-slate-500">
                Payments are securely processed through PayU Hosted Checkout.
              </p>
            </div>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">
            Course Curriculum
          </h2>

          {sections.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
              No curriculum has been added yet.
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section, index) => (
                <div
                  key={section._id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <h3 className="font-semibold text-slate-900">
                      Section {index + 1}: {section.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {section.lessons?.length || 0} lessons
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {section.lessons?.map((lesson) => (
                      <div
                        key={lesson._id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                      >
                        <div>
                          <p className="font-medium text-slate-800">
                            {lesson.title}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {formatDuration(lesson.duration)}
                          </p>
                        </div>

                        {lesson.isPreview && (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            Preview
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
