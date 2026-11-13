
import {
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import Certificate from '../models/Certificate.js';
import { s3 } from '../config/s3.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// GET /api/certificates/mine
export const getMyCertificates = asyncHandler(
  async (req, res) => {
    const certificates = await Certificate.find({
      user: req.user._id,
    })
      .populate('course', 'title thumbnail')
      .sort({ issuedAt: -1 });

    res.json({ certificates });
  }
);

// GET /api/certificates/:id/download
export const downloadCertificate = asyncHandler(
  async (req, res) => {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      throw new ApiError(404, 'Certificate not found');
    }

    const isOwner =
      String(certificate.user) === String(req.user._id);

    if (!isOwner) {
      throw new ApiError(
        403,
        'You are not authorized to download this certificate'
      );
    }

    if (!process.env.AWS_S3_RAW_BUCKET) {
      throw new ApiError(
        500,
        'Certificate storage is not configured'
      );
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_RAW_BUCKET,
      Key: certificate.pdfKey,
      ResponseContentType: 'application/pdf',
      ResponseContentDisposition:
        'attachment; filename="certificate.pdf"',
    });

    const downloadUrl = await getSignedUrl(s3, command, {
      expiresIn: 300,
    });

    res.json({
      message: 'Certificate download link generated successfully',
      downloadUrl,
      expiresIn: 300,
    });
  }
);

// GET /api/certificates/verify/:certificateId
// Public endpoint: no authentication required.
export const verifyCertificate = asyncHandler(
  async (req, res) => {
    const certificate = await Certificate.findOne({
      certificateId: req.params.certificateId,
    })
      .populate('user', 'name')
      .populate({
        path: 'course',
        select: 'title instructor',
        populate: {
          path: 'instructor',
          select: 'name',
        },
      });

    if (
      !certificate ||
      !certificate.user ||
      !certificate.course
    ) {
      throw new ApiError(404, 'Certificate not found');
    }

    res.json({
      verified: true,
      certificate: {
        certificateId: certificate.certificateId,
        studentName: certificate.user.name,
        courseTitle: certificate.course.title,
        instructorName:
          certificate.course.instructor?.name || 'LMS Instructor',
        issuedAt: certificate.issuedAt,
      },
    });
  }
);
