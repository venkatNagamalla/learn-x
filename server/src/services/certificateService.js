
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { v4 as uuid } from 'uuid';
import { PutObjectCommand } from '@aws-sdk/client-s3';

import Certificate from '../models/Certificate.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import { s3 } from '../config/s3.js';

export async function issueCertificate(userId, courseId) {
  // Prevent duplicate certificates for the same student and course.
  const existingCertificate = await Certificate.findOne({
    user: userId,
    course: courseId,
  });

  if (existingCertificate) {
    return existingCertificate;
  }

  // Fetch student and course details.
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

  // Generate unique certificate ID.
  const certificateId = uuid();

  // Generate QR code for certificate verification.
  const qr = await QRCode.toBuffer(
    `${process.env.CLIENT_URL}/verify/${certificateId}`,
    {
      margin: 1,
      width: 200,
    }
  );

  // Generate certificate PDF.
  const pdf = await buildPdf({
    user,
    course,
    certificateId,
    qr,
  });

  // Store PDF privately in the raw S3 bucket.
  const pdfKey = `certificates/${certificateId}.pdf`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_RAW_BUCKET,
      Key: pdfKey,
      Body: pdf,
      ContentType: 'application/pdf',
    })
  );

  // Save certificate details in MongoDB.
  const certificate = await Certificate.create({
    user: userId,
    course: courseId,
    certificateId,
    pdfKey,
  });

  return certificate;
}

function buildPdf({ user, course, certificateId, qr }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 50,
    });

    const chunks = [];

    doc.on('data', (chunk) => {
      chunks.push(chunk);
    });

    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on('error', reject);

    // Certificate border.
    doc
      .rect(
        30,
        30,
        doc.page.width - 60,
        doc.page.height - 60
      )
      .lineWidth(3)
      .stroke('#2F4BB8');

    // Certificate heading.
    doc
      .fontSize(34)
      .fillColor('#2F4BB8')
      .text('Certificate of Completion', {
        align: 'center',
      });

    doc
      .moveDown(1.5)
      .fontSize(16)
      .fillColor('#444')
      .text('This is to certify that', {
        align: 'center',
      });

    // Student name.
    doc
      .moveDown(0.5)
      .fontSize(30)
      .fillColor('#000')
      .text(user.name, {
        align: 'center',
      });

    doc
      .moveDown(0.5)
      .fontSize(16)
      .fillColor('#444')
      .text('has successfully completed', {
        align: 'center',
      });

    // Course title.
    doc
      .moveDown(0.5)
      .fontSize(24)
      .fillColor('#000')
      .text(course.title, {
        align: 'center',
      });

    // Instructor and issue date.
    doc
      .moveDown(1)
      .fontSize(12)
      .fillColor('#444')
      .text(
        `Instructor: ${course.instructor?.name || 'LMS Instructor'}   |   Issued: ${new Date().toDateString()}`,
        {
          align: 'center',
        }
      );

    // QR code.
    doc.image(
      qr,
      70,
      doc.page.height - 170,
      {
        width: 90,
      }
    );

    // Certificate ID.
    doc
      .fontSize(9)
      .text(
        `Certificate ID: ${certificateId}`,
        170,
        doc.page.height - 100
      );

    doc.end();
  });
}
