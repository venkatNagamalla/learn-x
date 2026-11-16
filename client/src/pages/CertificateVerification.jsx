
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { verifyCertificate } from '../api/certificateApi.js';

export default function CertificateVerification() {
  const { certificateId } = useParams();

  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const verify = async () => {
      setLoading(true);
      setCertificate(null);
      setNotFound(false);
      setError('');

      try {
        const data = await verifyCertificate(certificateId);

        if (active) {
          if (!data?.certificate) {
            setNotFound(true);
          } else {
            setCertificate(data.certificate);
          }
        }
      } catch (err) {
        if (active) {
          if (err.response?.status === 404) {
            setNotFound(true);
          } else {
            setError(
              err.response?.data?.message ||
                'Unable to verify this certificate. Please try again.'
            );
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    verify();

    return () => {
      active = false;
    };
  }, [certificateId]);

  const formatDate = (date) => {
    if (!date) return 'Not available';

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return 'Not available';
    }

    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const DetailRow = ({ label, value, mono = false }) => (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-4 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <span className="text-sm font-semibold text-slate-500">
        {label}
      </span>
      <span
        className={`text-base font-bold text-slate-900 sm:max-w-[65%] sm:text-right ${
          mono ? 'break-all font-mono text-sm' : ''
        }`}
      >
        {value || 'Not available'}
      </span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center bg-slate-50 px-5">
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
            Verifying Certificate
          </h1>

          <p className="mt-3 text-base text-slate-500">
            Please wait while we validate this certificate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] bg-slate-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">

        {/* Branding */}
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-3xl font-extrabold tracking-tight"
          >
            <span style={{ color: '#5B4BDB' }}>Learn</span>
            <span className="text-slate-900">X</span>
          </Link>

          <p className="mt-2 text-sm font-medium text-slate-500">
            Official Certificate Verification Portal
          </p>
        </div>

        {/* Verified Certificate */}
        {certificate && (
          <div className="overflow-hidden rounded-3xl border border-green-200 bg-white shadow-xl">
            <div
              className="px-6 py-10 text-center sm:px-10 sm:py-12"
              style={{
                background: 'linear-gradient(135deg, #14532D, #16A34A)',
              }}
            >
              <div
                className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border-4"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  borderColor: 'rgba(255,255,255,0.4)',
                }}
              >
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
              </div>

              <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-white/90">
                Official Verification
              </p>

              <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
                Certificate Verified
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/90">
                This certificate is authentic and has been officially
                issued by Learn-X.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-5 py-2 text-sm font-bold text-white">
                <span className="h-2 w-2 rounded-full bg-green-300" />
                Verified & Authentic
              </div>
            </div>

            {/* Certificate Details */}
            <div className="p-6 sm:p-10">
              <div className="mb-7">
                <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
                  Certificate Information
                </p>

                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                  Award Details
                </h2>

                <p className="mt-2 text-base text-slate-500">
                  The following details match the certificate registered
                  in our verification system.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 sm:px-7">
                <DetailRow
                  label="Student Name"
                  value={certificate.studentName}
                />

                <DetailRow
                  label="Course"
                  value={certificate.courseTitle}
                />

                <DetailRow
                  label="Instructor"
                  value={certificate.instructorName}
                />

                <DetailRow
                  label="Issue Date"
                  value={formatDate(certificate.issuedAt)}
                />

                <DetailRow
                  label="Certificate ID"
                  value={certificate.certificateId}
                  mono
                />
              </div>

              {/* Authenticity Note */}
              <div className="mt-7 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-5">
                <svg
                  className="mt-0.5 h-6 w-6 shrink-0 text-green-700"
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

                <div>
                  <p className="font-bold text-green-900">
                    Authenticity Confirmed
                  </p>
                  <p className="mt-1 text-sm leading-6 text-green-800">
                    This certificate has been successfully verified
                    against the Learn-X certificate records.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Certificate Not Found */}
        {notFound && (
          <div className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-xl">
            <div
              className="px-6 py-10 text-center sm:px-10 sm:py-12"
              style={{
                background: 'linear-gradient(135deg, #7F1D1D, #DC2626)',
              }}
            >
              <div
                className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border-4"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  borderColor: 'rgba(255,255,255,0.4)',
                }}
              >
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
              </div>

              <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-white/90">
                Verification Failed
              </p>

              <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
                Certificate Not Found
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/90">
                We could not find a valid certificate matching the
                provided identification number.
              </p>
            </div>

            <div className="p-7 text-center sm:p-9">
              <p className="text-base leading-7 text-slate-600">
                Please check the certificate ID and ensure that the
                verification link or QR code is correct.
              </p>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Submitted Certificate ID
                </p>
                <p className="mt-2 break-all font-mono text-sm font-bold text-slate-800">
                  {certificateId}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Verification Error */}
        {!certificate && !notFound && (
          <div className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-xl">
            <div
              className="px-6 py-10 text-center sm:px-10 sm:py-12"
              style={{
                background: 'linear-gradient(135deg, #92400E, #D97706)',
              }}
            >
              <div
                className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-4"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  borderColor: 'rgba(255,255,255,0.4)',
                }}
              >
                <svg
                  className="h-10 w-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="white"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z"
                  />
                </svg>
              </div>

              <h1 className="text-3xl font-extrabold text-white">
                Verification Unavailable
              </h1>

              <p className="mt-4 text-base leading-7 text-white/90">
                We could not complete the verification right now.
              </p>
            </div>

            <div className="p-7 text-center">
              <p className="text-base leading-7 text-slate-600">
                {error || 'Please try again later.'}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            to="/courses"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-indigo-700"
            style={{ color: '#FFFFFF' }}
          >
            Explore Courses
            <span>→</span>
          </Link>

          <p className="mt-5 text-sm font-medium text-slate-500">
            Learn-X · Official Learning & Certification Platform
          </p>
        </div>
      </div>
    </div>
  );
}