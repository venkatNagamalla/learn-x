
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { v4 as uuid } from 'uuid';
import { PutObjectCommand } from '@aws-sdk/client-s3';

import Certificate from '../models/Certificate.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import { s3 } from '../config/s3.js';

const CERTIFICATE_DESIGN_VERSION = 2;

async function generateQrCode(certificateId) {
  return QRCode.toBuffer(
    `${process.env.CLIENT_URL}/verify/${certificateId}`,
    {
      margin: 1,
      width: 300,
      color: {
        dark: '#172554',
        light: '#FFFFFF',
      },
    }
  );
}

async function uploadPdf(pdf, pdfKey) {
  if (!process.env.AWS_S3_RAW_BUCKET) {
    throw new Error('AWS_S3_RAW_BUCKET is not configured');
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_RAW_BUCKET,
      Key: pdfKey,
      Body: pdf,
      ContentType: 'application/pdf',
      CacheControl: 'no-cache, no-store, must-revalidate',
    })
  );
}

// Creates a new certificate when one does not already exist.
export async function issueCertificate(userId, courseId) {
  const existingCertificate = await Certificate.findOne({
    user: userId,
    course: courseId,
  });

  if (existingCertificate) {
    return existingCertificate;
  }

  const [user, course] = await Promise.all([
    User.findById(userId),
    Course.findById(courseId).populate('instructor', 'name'),
  ]);

  if (!user) {
    throw new Error('Student not found');
  }

  if (!course) {
    throw new Error('Course not found');
  }

  if (!process.env.AWS_S3_RAW_BUCKET) {
    throw new Error('AWS_S3_RAW_BUCKET is not configured');
  }

  const certificateId = uuid();
  const qr = await generateQrCode(certificateId);

  const issuedAt = new Date();

  const pdf = await buildPdf({
    user,
    course,
    certificateId,
    qr,
    issuedAt,
  });

  const pdfKey = `certificates/${certificateId}.pdf`;

  await uploadPdf(pdf, pdfKey);

  return Certificate.create({
    user: userId,
    course: courseId,
    certificateId,
    pdfKey,
    pdfDesignVersion: CERTIFICATE_DESIGN_VERSION,
    issuedAt,
  });
}

// Regenerates an existing certificate without changing its identity.
export async function regenerateCertificatePdf(certificateId) {
  const certificate = await Certificate.findOne({ certificateId });

  if (!certificate) {
    throw new Error('Certificate not found');
  }

  if (
    certificate.pdfDesignVersion === CERTIFICATE_DESIGN_VERSION
  ) {
    return certificate;
  }

  const [user, course] = await Promise.all([
    User.findById(certificate.user),
    Course.findById(certificate.course).populate('instructor', 'name'),
  ]);

  if (!user) {
    throw new Error('Student not found');
  }

  if (!course) {
    throw new Error('Course not found');
  }

  const qr = await generateQrCode(certificate.certificateId);

  const pdf = await buildPdf({
    user,
    course,
    certificateId: certificate.certificateId,
    qr,
    issuedAt: certificate.issuedAt,
  });

  // Use a new key so the old PDF URL cannot serve a cached copy.
  const newPdfKey =
    `certificates/${certificate.certificateId}-v${CERTIFICATE_DESIGN_VERSION}.pdf`;

  await uploadPdf(pdf, newPdfKey);

  certificate.pdfKey = newPdfKey;
  certificate.pdfDesignVersion = CERTIFICATE_DESIGN_VERSION;

  await certificate.save();

  return certificate;
}

function buildPdf({ user, course, certificateId, qr, issuedAt }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 0,
      autoFirstPage: true,
      info: {
        Title: `Certificate of Completion - ${course.title}`,
        Author: 'Learning Management System',
        Subject: 'Course Completion Certificate',
      },
    });

    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    const navy = '#172554';
    const darkNavy = '#0F1F45';
    const gold = '#C49A45';
    const lightGold = '#E8D5A8';
    const muted = '#64748B';
    const ivory = '#FDFCF9';

    const centerX = pageWidth / 2;

    // Background
    doc.rect(0, 0, pageWidth, pageHeight).fill('#FFFFFF');

    doc
      .rect(0, 0, pageWidth, pageHeight)
      .fillOpacity(0.45)
      .fill(ivory)
      .fillOpacity(1);

    // Elegant double border
    doc
      .rect(25, 25, pageWidth - 50, pageHeight - 50)
      .lineWidth(2.5)
      .stroke(navy);

    doc
      .rect(35, 35, pageWidth - 70, pageHeight - 70)
      .lineWidth(1)
      .stroke(gold);

    // Decorative corners
    const cornerLength = 34;
    const inset = 45;

    const corners = [
      { x: inset, y: inset, dx: 1, dy: 1 },
      { x: pageWidth - inset, y: inset, dx: -1, dy: 1 },
      { x: inset, y: pageHeight - inset, dx: 1, dy: -1 },
      {
        x: pageWidth - inset,
        y: pageHeight - inset,
        dx: -1,
        dy: -1,
      },
    ];

    corners.forEach(({ x, y, dx, dy }) => {
      doc
        .moveTo(x, y)
        .lineTo(x + cornerLength * dx, y)
        .moveTo(x, y)
        .lineTo(x, y + cornerLength * dy)
        .lineWidth(2)
        .stroke(gold);
    });

    // Top decorative divider
    doc
      .moveTo(centerX - 110, 78)
      .lineTo(centerX - 20, 78)
      .moveTo(centerX + 20, 78)
      .lineTo(centerX + 110, 78)
      .lineWidth(1.5)
      .stroke(gold);

    doc.circle(centerX, 78, 4).fill(gold);

    // Main heading
    doc
      .font('Helvetica-Bold')
      .fontSize(38)
      .fillColor(navy)
      .text('CERTIFICATE', 60, 98, {
        width: pageWidth - 120,
        align: 'center',
        characterSpacing: 3,
      });

    doc
      .font('Helvetica')
      .fontSize(17)
      .fillColor(gold)
      .text('OF COMPLETION', 60, 148, {
        width: pageWidth - 120,
        align: 'center',
        characterSpacing: 5,
      });

    // Presentation text
    doc
      .font('Helvetica')
      .fontSize(14)
      .fillColor(muted)
      .text('This certificate is proudly presented to', 70, 195, {
        width: pageWidth - 140,
        align: 'center',
      });

    // Student name
    doc
      .font('Times-Bold')
      .fontSize(34)
      .fillColor(darkNavy)
      .text(user.name || 'Student', 85, 225, {
        width: pageWidth - 170,
        height: 45,
        align: 'center',
        ellipsis: true,
      });

    doc
      .moveTo(centerX - 150, 278)
      .lineTo(centerX + 150, 278)
      .lineWidth(1.5)
      .stroke(gold);

    // Completion statement
    doc
      .font('Helvetica')
      .fontSize(14)
      .fillColor(muted)
      .text('for successfully completing the course', 70, 298, {
        width: pageWidth - 140,
        align: 'center',
      });

    // Course title
    doc
      .font('Helvetica-Bold')
      .fontSize(23)
      .fillColor(navy)
      .text(course.title || 'Completed Course', 95, 327, {
        width: pageWidth - 190,
        height: 58,
        align: 'center',
        valign: 'center',
        ellipsis: true,
      });

    // Supporting achievement text
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(muted)
      .text(
        'Demonstrating dedication, commitment and successful learning achievement.',
        100,
        391,
        {
          width: pageWidth - 200,
          align: 'center',
        }
      );

    // Instructor signature
    const signatureX = 135;
    const signatureY = 473;
    const signatureWidth = 190;

    doc
      .moveTo(signatureX, signatureY)
      .lineTo(signatureX + signatureWidth, signatureY)
      .lineWidth(1)
      .stroke(gold);

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(navy)
      .text(course.instructor?.name || 'LMS Instructor', signatureX, signatureY + 9, {
        width: signatureWidth,
        align: 'center',
        ellipsis: true,
      });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(muted)
      .text('COURSE INSTRUCTOR', signatureX, signatureY + 26, {
        width: signatureWidth,
        align: 'center',
        characterSpacing: 1,
      });

    // Original issue date
    const dateX = 420;
    const dateWidth = 170;

    doc
      .moveTo(dateX, signatureY)
      .lineTo(dateX + dateWidth, signatureY)
      .lineWidth(1)
      .stroke(gold);

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(navy)
      .text(
        new Date(issuedAt || new Date()).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        dateX,
        signatureY + 9,
        {
          width: dateWidth,
          align: 'center',
        }
      );

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(muted)
      .text('DATE OF ISSUE', dateX, signatureY + 26, {
        width: dateWidth,
        align: 'center',
        characterSpacing: 1,
      });

    // QR verification
    const qrSize = 76;
    const qrX = pageWidth - 135;
    const qrY = 425;

    doc
      .rect(qrX - 7, qrY - 7, qrSize + 14, qrSize + 14)
      .lineWidth(1)
      .stroke(lightGold);

    doc.image(qr, qrX, qrY, {
      width: qrSize,
      height: qrSize,
    });

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(navy)
      .text('SCAN TO VERIFY', qrX - 10, qrY + qrSize + 11, {
        width: qrSize + 20,
        align: 'center',
        characterSpacing: 0.8,
      });

    // Certificate ID footer
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(muted)
      .text(`CERTIFICATE ID: ${certificateId}`, 65, pageHeight - 51, {
        width: pageWidth - 230,
        align: 'left',
      });

    doc.end();
  });
}
