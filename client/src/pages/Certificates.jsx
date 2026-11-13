
import { useEffect, useState } from 'react';
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-slate-600">Loading your certificates...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            My Certificates
          </h1>
          <p className="mt-2 text-slate-600">
            View and download certificates for your completed courses.
          </p>
        </div>

        {certificates.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mb-4 text-5xl">🎓</div>
            <h2 className="text-xl font-semibold text-slate-800">
              No certificates yet
            </h2>
            <p className="mt-2 text-slate-600">
              Complete a course and pass its required quizzes to earn
              your certificate.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {certificates.map((certificate) => (
              <div
                key={certificate._id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-green-700">
                      Certificate of Completion
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">
                      {certificate.course?.title || 'Completed Course'}
                    </h2>
                  </div>

                  <span className="text-3xl">🏆</span>
                </div>

                <p className="mt-4 text-sm text-slate-600">
                  Issued on:{' '}
                  {certificate.issuedAt
                    ? new Date(certificate.issuedAt).toLocaleDateString()
                    : 'Date unavailable'}
                </p>

                <p className="mt-2 break-all text-xs text-slate-500">
                  Certificate ID: {certificate.certificateId}
                </p>

                <button
                  type="button"
                  onClick={() => handleDownload(certificate)}
                  disabled={downloadingId === certificate._id}
                  className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {downloadingId === certificate._id
                    ? 'Preparing Download...'
                    : 'Download Certificate'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
