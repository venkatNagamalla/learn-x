
import express from 'express';

import {
  getCourses,
  getCourseById,
  getInstructorCourseCurriculum,
  createCourse,
  updateCourse,
  deleteCourse,
  getMyCourses,
  submitCourse,
  createSection,
  updateSection,
  deleteSection,
  createLesson,
  updateLesson,
  deleteLesson,
} from '../controllers/courseController.js';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getCourses);
router.get('/mine', protect, requireRole('instructor'), getMyCourses);
router.get('/:id', getCourseById);

// Instructor-only routes
router.use(protect, requireRole('instructor'));

// Get an owned course with its curriculum (including drafts)
router.get('/manage/:id', getInstructorCourseCurriculum);

router.post('/', createCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);
router.patch('/:id/submit', submitCourse);

// Section management
router.post('/:courseId/sections', createSection);
router.put('/sections/:sectionId', updateSection);
router.delete('/sections/:sectionId', deleteSection);

// Lesson management
router.post(
  '/:courseId/sections/:sectionId/lessons',
  createLesson
);
router.put('/lessons/:lessonId', updateLesson);
router.delete('/lessons/:lessonId', deleteLesson);

export default router;
