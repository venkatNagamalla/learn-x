
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { getPaymentStatus } from '../api/paymentApi.js';

const formatAmount = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount / 100);
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
        const data = await getPaymentStatus(txnid);

        if (active) {
          setPayment(data.payment);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
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

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-lg font-medium">Checking payment status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <h1 className="mb-3 text-2xl font-bold">
          Payment Status Unavailable
        </h1>

        <p className="mb-6 text-gray-600">{error}</p>

        <Link
          to="/student"
          className="rounded bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const isPaid = payment.status === 'paid';
  const isFailed = payment.status === 'failed';

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
        <div
          className={`mb-4 text-5xl ${
            isPaid
              ? 'text-green-600'
              : isFailed
                ? 'text-red-600'
                : 'text-yellow-600'
          }`}
        >
          {isPaid ? '✓' : isFailed ? '✕' : '…'}
        </div>

        <h1 className="mb-3 text-2xl font-bold">
          {isPaid
            ? 'Payment Successful!'
            : isFailed
              ? 'Payment Failed'
              : 'Payment Pending'}
        </h1>

        <p className="mb-6 text-gray-600">
          {isPaid
            ? 'Your course enrollment is confirmed. You can start learning now.'
            : isFailed
              ? 'Your payment was not successful. Please try again.'
              : 'We have not received final confirmation yet. Please check again shortly.'}
        </p>

        <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4 text-left">
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Course</span>
            <span className="text-right font-medium">
              {payment.course?.title || 'Course'}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Amount</span>
            <span className="font-medium">
              {formatAmount(payment.amount, payment.currency)}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Status</span>
            <span className="font-medium capitalize">
              {payment.status}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Transaction ID</span>
            <span className="break-all text-right text-sm">
              {payment.txnid}
            </span>
          </div>
        </div>

        {isPaid ? (
          <Link
            to="/student"
            className="inline-block rounded bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
          >
            Go to My Courses
          </Link>
        ) : (
          <Link
            to="/courses"
            className="inline-block rounded bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
          >
            Browse Courses
          </Link>
        )}
      </div>
    </div>
  );
}
