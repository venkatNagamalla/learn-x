
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
    const verify = async () => {
      try {
        const data = await verifyCertificate(certificateId);
        setCertificate(data.certificate);
      } catch (err) {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(
            err.response?.data?.message ||
            'Unable to verify this certificate. Please try again.'
          );
        }
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [certificateId]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <p className="text-slate-600">Verifying certificate...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {certificate ? (
          <div className="rounded-2xl border border-green-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl text-green-700">
              ✓
            </div>

            <h1 className="mt-5 text-3xl font-bold text-green-700">
              Certificate Verified
            </h1>

            <p className="mt-3 text-slate-600">
              This certificate is valid and has been officially issued
              by our LMS platform.
            </p>

            <div className="mt-8 space-y-4 rounded-xl bg-slate-50 p-6 text-left">
              <div>
                <p className="text-sm text-slate-500">Student Name</p>
                <p className="font-semibold text-slate-900">
                  {certificate.studentName}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Course</p>
                <p className="font-semibold text-slate-900">
                  {certificate.courseTitle}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Instructor</p>
                <p className="font-semibold text-slate-900">
                  {certificate.instructorName}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Issue Date</p>
                <p className="font-semibold text-slate-900">
                  {new Date(certificate.issuedAt).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Certificate ID</p>
                <p className="break-all font-mono text-sm text-slate-900">
                  {certificate.certificateId}
                </p>
              </div>
            </div>
          </div>
        ) : notFound ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-4xl text-red-700">
              ✕
            </div>

            <h1 className="mt-5 text-3xl font-bold text-red-700">
              Certificate Not Found
            </h1>

            <p className="mt-3 text-slate-600">
              We could not find a valid certificate with this ID.
              Please check the certificate ID and try again.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-amber-700">
              Verification Unavailable
            </h1>
            <p className="mt-3 text-slate-600">{error}</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/courses"
            className="font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Explore Courses
          </Link>
        </div>
      </div>
    </div>
  );
}
