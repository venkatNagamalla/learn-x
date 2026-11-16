
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getPaymentStatus,
} from '../api/paymentApi.js';

const formatAmount = (amount, currency = 'INR') => {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return 'Amount unavailable';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(value / 100);
};

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const txnid = searchParams.get('txnid');

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchStatus = async () => {
      if (!txnid) {
        setError('Transaction reference is missing.');
        setLoading(false);
        return;
      }

      try {
        // Always verify payment status through the backend.
        const data = await getPaymentStatus(txnid);

        if (active) {
          if (!data?.payment) {
            throw new Error('Payment information is unavailable.');
          }

          setPayment(data.payment);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              err.message ||
              'Unable to retrieve payment status.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      active = false;
    };
  }, [txnid]);

  const isPaid = payment?.status === 'paid';
  const isFailed = payment?.status === 'failed';

  const statusConfig = isPaid
    ? {
        icon: 'check',
        title: 'Payment Successful!',
        description:
          'Your payment has been confirmed. Your learning journey starts now!',
        color: '#16A34A',
        light: '#F0FDF4',
        label: 'Payment Confirmed',
      }
    : isFailed
      ? {
          icon: 'x',
          title: 'Payment Failed',
          description:
            'Unfortunately, your payment could not be completed. You can try purchasing the course again.',
          color: '#DC2626',
          light: '#FEF2F2',
          label: 'Payment Unsuccessful',
        }
      : {
          icon: 'clock',
          title: 'Payment Pending',
          description:
            'We are waiting for final confirmation from the payment provider. Please check again shortly.',
          color: '#D97706',
          light: '#FFFBEB',
          label: 'Awaiting Confirmation',
        };

  if (loading) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center bg-slate-50 px-5 py-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-lg">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
            <svg
              className="h-8 w-8 animate-spin text-indigo-600"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="3"
                opacity=".2"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900">
            Verifying Payment
          </h1>

          <p className="mt-3 text-base text-slate-500">
            Please wait while we securely check your transaction.
          </p>

          <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-indigo-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center bg-slate-50 px-5 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
            <svg
              className="h-10 w-10 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z"
              />
            </svg>
          </div>

          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-red-600">
            Verification Error
          </p>

          <h1 className="text-3xl font-extrabold text-slate-900">
            Payment Status Unavailable
          </h1>

          <p className="mt-4 text-base leading-7 text-slate-500">
            {error || 'Payment information is unavailable.'}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/student"
              className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-md transition hover:bg-indigo-700"
              style={{ color: '#FFFFFF' }}
            >
              Go to Dashboard
            </Link>

            <Link
              to="/courses"
              className="rounded-xl border border-slate-200 px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Browse Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] bg-slate-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">

        {/* Brand */}
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-3xl font-extrabold tracking-tight"
          >
            <span style={{ color: '#5B4BDB' }}>Learn</span>
            <span className="text-slate-900">X</span>
          </Link>

          <p className="mt-2 text-sm font-medium text-slate-500">
            Your learning journey, one step ahead.
          </p>
        </div>

        {/* Main Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">

          {/* Status Banner */}
          <div
            className="px-6 py-10 text-center sm:px-10 sm:py-12"
            style={{
              background: isPaid
                ? 'linear-gradient(135deg, #166534, #16A34A)'
                : isFailed
                  ? 'linear-gradient(135deg, #991B1B, #DC2626)'
                  : 'linear-gradient(135deg, #92400E, #D97706)',
            }}
          >
            <div
              className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border-4"
              style={{
                backgroundColor: 'rgba(255,255,255,0.16)',
                borderColor: 'rgba(255,255,255,0.4)',
              }}
            >
              {isPaid && (
                <svg
                  className="h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="white"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m5 12 4 4L19 6"
                  />
                </svg>
              )}

              {isFailed && (
                <svg
                  className="h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="white"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m6 6 12 12M18 6 6 18"
                  />
                </svg>
              )}

              {!isPaid && !isFailed && (
                <svg
                  className="h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="white"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path
                    strokeLinecap="round"
                    d="M12 7v5l3 2"
                  />
                </svg>
              )}
            </div>

            <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-white/90">
              {statusConfig.label}
            </p>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {statusConfig.title}
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/90">
              {statusConfig.description}
            </p>
          </div>

          {/* Amount */}
          <div className="border-b border-slate-100 px-6 py-8 text-center sm:px-10">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Total Transaction Amount
            </p>

            <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              {formatAmount(payment.amount, payment.currency)}
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold"
              style={{
                backgroundColor: statusConfig.light,
                color: statusConfig.color,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: statusConfig.color }}
              />
              <span className="capitalize">{payment.status}</span>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="px-6 py-8 sm:px-10">
            <h2 className="mb-6 text-xl font-extrabold text-slate-900">
              Transaction Details
            </h2>

            <div className="space-y-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <span className="text-base font-medium text-slate-500">
                  Course Name
                </span>

                <span className="text-base font-bold text-slate-900 sm:max-w-[60%] sm:text-right">
                  {payment.course?.title || 'Course'}
                </span>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex items-center justify-between gap-4">
                <span className="text-base font-medium text-slate-500">
                  Payment Method
                </span>

                <span className="text-base font-bold text-slate-900">
                  PayU
                </span>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="text-base font-medium text-slate-500">
                  Transaction ID
                </span>

                <span className="break-all text-sm font-bold text-slate-800 sm:text-right">
                  {payment.txnid || txnid}
                </span>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex items-center justify-between gap-4">
                <span className="text-base font-medium text-slate-500">
                  Transaction Status
                </span>

                <span
                  className="text-base font-bold capitalize"
                  style={{ color: statusConfig.color }}
                >
                  {payment.status}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-7 sm:px-10">
            <div className="flex flex-col gap-3 sm:flex-row">
              {isPaid ? (
                <Link
                  to="/student"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-indigo-700"
                  style={{ color: '#FFFFFF' }}
                >
                  Start Learning
                  <span>→</span>
                </Link>
              ) : (
                <Link
                  to="/courses"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-indigo-700"
                  style={{ color: '#FFFFFF' }}
                >
                  {isFailed ? 'Try Another Course' : 'Browse Courses'}
                  <span>→</span>
                </Link>
              )}

              <Link
                to="/"
                className="flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Back to Home
              </Link>
            </div>

            <p className="mt-5 text-center text-sm text-slate-500">
              Need help? Please contact our support team.
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
          <svg
            className="h-4 w-4 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3 4 6v5c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-3Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m9 12 2 2 4-4"
            />
          </svg>

          Secure transaction status verified by Learn-X
        </div>
      </div>
    </div>
  );
}