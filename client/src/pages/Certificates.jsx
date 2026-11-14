
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  getMyCertificates,
  getCertificateDownloadUrl,
} from '../api/certificateApi.js';

export default function Certificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const loadCertificates = async () => {
      try {
        const data = await getMyCertificates();
        setCertificates(data || []);
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            'Failed to load certificates'
        );
      } finally {
        setLoading(false);
      }
    };

    loadCertificates();
  }, []);

  const handleDownload = async (certificate) => {
    try {
      setDownloadingId(certificate._id);

      const downloadUrl = await getCertificateDownloadUrl(
        certificate._id
      );

      window.location.assign(downloadUrl);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to download certificate'
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Date unavailable';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Date unavailable';
    }

    return parsedDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="mt-4 font-medium text-slate-600">
            Loading your certificates...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-7 shadow-lg sm:p-9">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: '#FFFFFF' }}
              >
                YOUR ACHIEVEMENTS
              </p>

              <h1
                className="mt-3 text-3xl font-bold sm:text-4xl"
                style={{ color: '#FFFFFF' }}
              >
                My Certificates
              </h1>

              <p
                className="mt-3 max-w-xl text-sm leading-7 sm:text-base"
                style={{ color: '#E0E7FF' }}
              >
                Every completed course is a new achievement. View and
                download your certificates whenever you need them.
              </p>

              <div
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold"
                style={{ color: '#FFFFFF' }}
              >
                <span>🏆</span>
                {certificates.length}{' '}
                {certificates.length === 1
                  ? 'Certificate Earned'
                  : 'Certificates Earned'}
              </div>
            </div>

            <div className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-6xl sm:flex">
              🎓
            </div>
          </div>
        </div>

        {/* Certificate list */}
        <div className="mt-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Your Achievements
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Certificates earned from your completed courses.
              </p>
            </div>

            <Link
              to="/courses"
              className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
            >
              Explore Courses →
            </Link>
          </div>

          {certificates.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-4xl">
                🎓
              </div>

              <h2 className="mt-6 text-xl font-bold text-slate-900">
                No certificates yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
                Your achievements will appear here after you complete
                a course and pass its required quizzes.
              </p>

              <Link
                to="/courses"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold shadow-sm transition hover:bg-indigo-700"
                style={{ color: '#FFFFFF' }}
              >
                Explore Courses
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {certificates.map((certificate) => {
                const isDownloading =
                  downloadingId === certificate._id;

                return (
                  <div
                    key={certificate._id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    {/* Certificate decorative header */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6">
                      <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-indigo-100/60" />
                      <div className="absolute -bottom-12 right-20 h-28 w-28 rounded-full bg-violet-100/60" />

                      <div className="relative flex items-start justify-between gap-3">
                        <div>
                          <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            COMPLETED
                          </span>

                          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                            Certificate of Completion
                          </p>

                          <h3 className="mt-2 text-xl font-bold leading-snug text-slate-900">
                            {certificate.course?.title ||
                              'Completed Course'}
                          </h3>
                        </div>

                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-white text-3xl shadow-sm">
                          🏆
                        </div>
                      </div>

                      <div className="relative mt-6 flex items-center gap-2">
                        <div className="h-px flex-1 bg-indigo-200" />
                        <span className="text-xs font-semibold text-indigo-400">
                          ★
                        </span>
                        <div className="h-px flex-1 bg-indigo-200" />
                      </div>
                    </div>

                    {/* Certificate details */}
                    <div className="p-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Issued On
                          </p>

                          <p className="mt-1.5 text-sm font-semibold text-slate-800">
                            {formatDate(certificate.issuedAt)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Status
                          </p>

                          <p className="mt-1.5 text-sm font-semibold text-green-700">
                            Successfully Earned
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Certificate ID
                        </p>

                        <p className="mt-1.5 break-all font-mono text-xs text-slate-600">
                          {certificate.certificateId || 'Unavailable'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownload(certificate)}
                        disabled={isDownloading}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ color: '#FFFFFF' }}
                      >
                        {isDownloading ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Preparing Download...
                          </>
                        ) : (
                          <>
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="h-5 w-5"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <path d="m7 10 5 5 5-5" />
                              <path d="M12 15V3" />
                            </svg>

                            Download Certificate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
