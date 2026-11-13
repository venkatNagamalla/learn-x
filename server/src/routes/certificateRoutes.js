
import express from 'express';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

import {
  getMyCertificates,
  downloadCertificate,
  verifyCertificate,
} from '../controllers/certificateController.js';

const router = express.Router();

// Public verification route — no login required.
router.get('/verify/:certificateId', verifyCertificate);

// Protected student routes.
router.use(protect, requireRole('student'));

// Get the logged-in student's certificates.
router.get('/mine', getMyCertificates);

// Download a certificate owned by the logged-in student.
router.get('/:id/download', downloadCertificate);

export default router;
