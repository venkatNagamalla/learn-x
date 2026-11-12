import Course from '../models/Course.js';
import Section from '../models/Section.js';
import Lesson from '../models/Lesson.js';
import Enrollment from '../models/Enrollment.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import LessonProgress from '../models/LessonProgress.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertOwner } from '../utils/assertOwner.js';

// GET /api/courses
export const getCourses = asyncHandler(async (req, res) => {
  const {
    q,
    category,
    level,
    sort = 'new',
    page = 1,
    limit = 12,
  } = req.query;

  const currentPage = Math.max(1, Number(page) || 1);
  const pageLimit = Math.min(50, Math.max(1, Number(limit) || 12));

  const filter = { status: 'published' };

  if (q?.trim()) filter.$text = { $search: q.trim() };
  if (category) filter.category = category;
  if (level) filter.level = level;

  const sorts = {
    new: { createdAt: -1 },
    price: { price: 1 },
    rating: { ratingAvg: -1 },
  };

  if (!sorts[sort]) {
    throw new ApiError(400, 'Invalid sort option');
  }

  const [items, total] = await Promise.all([
    Course.find(filter)
      .sort(sorts[sort])
      .skip((currentPage - 1) * pageLimit)
      .limit(pageLimit)
      .populate('instructor', 'name'),

    Course.countDocuments(filter),
  ]);

  res.json({
    items,
    total,
    pages: Math.ceil(total / pageLimit),
  });
});

// GET /api/courses/:id
// Public course details - published courses only.
// Enrolled students also receive quiz metadata and their own progress.
export const getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findOne({
    _id: req.params.id,
    status: 'published',
  }).populate('instructor', 'name');

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  const enrollment = req.user
    ? await Enrollment.findOne({
        user: req.user._id,
        course: course._id,
      }).select('lessonProgress quizProgress')
    : null;

  const isEnrolled = Boolean(enrollment);

  const sections = await Section.find({
    course: course._id,
  })
    .sort({ order: 1 })
    .lean();

  const lessons = await Lesson.find({
    course: course._id,
  })
    .select('section title duration isPreview order')
    .sort({ order: 1 })
    .lean();

  // Quiz metadata is provided only to enrolled students.
  // Correct answers and explanations are never selected here.
  let quizzes = [];
  let completedLessonIds = [];
  let lessonProgress = 0;
  let quizProgress = 0;

  if (req.user?.role === 'student' && isEnrolled) {
    quizzes = await Quiz.find({ course: course._id })
      .select('title section passPercent maxAttempts')
      .sort({ createdAt: 1 })
      .lean();

    const quizIds = quizzes.map((quiz) => quiz._id);

    const [completedLessons, attempts] = await Promise.all([
      LessonProgress.find({
        user: req.user._id,
        course: course._id,
        completed: true,
      })
        .select('lesson -_id')
        .lean(),

      quizIds.length
        ? QuizAttempt.find({
            user: req.user._id,
            quiz: { $in: quizIds },
          })
            .select('quiz passed')
            .lean()
        : Promise.resolve([]),
    ]);

    completedLessonIds = completedLessons.map(
      (item) => String(item.lesson)
    );

    const attemptsByQuiz = new Map();

    for (const attempt of attempts) {
      const quizId = String(attempt.quiz);

      const current = attemptsByQuiz.get(quizId) || {
        attemptsUsed: 0,
        passed: false,
      };

      current.attemptsUsed += 1;
      current.passed = current.passed || attempt.passed;

      attemptsByQuiz.set(quizId, current);
    }

    quizzes = quizzes.map((quiz) => {
      const attemptInfo = attemptsByQuiz.get(String(quiz._id)) || {
        attemptsUsed: 0,
        passed: false,
      };

      return {
        ...quiz,
        attemptsUsed: attemptInfo.attemptsUsed,
        attemptsLeft: Math.max(
          0,
          quiz.maxAttempts - attemptInfo.attemptsUsed
        ),
        passed: attemptInfo.passed,
      };
    });

    lessonProgress = enrollment.lessonProgress;
    quizProgress = enrollment.quizProgress;
  }

  const sectionsWithContent = sections.map((section) => ({
    _id: section._id,
    title: section.title,
    order: section.order,

    lessons: lessons
      .filter(
        (lesson) => String(lesson.section) === String(section._id)
      )
      .map((lesson) => ({
        _id: lesson._id,
        title: lesson.title,
        duration: lesson.duration,
        isPreview: lesson.isPreview,
        order: lesson.order,
        completed: completedLessonIds.includes(String(lesson._id)),
      })),

    quizzes: quizzes.filter(
      (quiz) => String(quiz.section) === String(section._id)
    ),
  }));

  res.json({
    course,
    isEnrolled,
    lessonProgress,
    quizProgress,
    completedLessonIds,
    sections: sectionsWithContent,
    courseQuizzes: quizzes.filter((quiz) => !quiz.section),
  });
});

// GET /api/courses/manage/:id
// Instructor-only course details and curriculum
export const getInstructorCourseCurriculum = asyncHandler(
  async (req, res) => {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name');

    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

    assertOwner(course, req.user);

    const sections = await Section.find({
      course: course._id,
    })
      .sort({ order: 1 })
      .lean();

    const lessons = await Lesson.find({
      course: course._id,
    })
      .select(
        'section title description duration isPreview order processingStatus hlsPath'
      )
      .sort({ order: 1 })
      .lean();

    res.json({
      course,
      sections: sections.map((section) => ({
        _id: section._id,
        title: section.title,
        order: section.order,

        lessons: lessons
          .filter(
            (lesson) =>
              String(lesson.section) === String(section._id)
          )
          .map((lesson) => ({
            _id: lesson._id,
            title: lesson.title,
            description: lesson.description,
            duration: lesson.duration,
            isPreview: lesson.isPreview,
            order: lesson.order,
            processingStatus: lesson.processingStatus,
            hlsPath: lesson.hlsPath,
          })),
      })),
    });
  }
);

// POST /api/courses
export const createCourse = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    level,
    price,
    thumbnail,
  } = req.body;

  const course = await Course.create({
    title,
    description,
    category,
    level,
    price,
    thumbnail,
    instructor: req.user._id,
    status: 'draft',
  });

  assertOwner(course, req.user);

  res.status(201).json({
    message: 'Course created successfully',
    course,
  });
});

// PUT /api/courses/:id
export const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  assertOwner(course, req.user);

  const allowedFields = [
    'title',
    'description',
    'category',
    'level',
    'price',
    'thumbnail',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      course[field] = req.body[field];
    }
  });

  await course.save();

  res.json({
    message: 'Course updated successfully',
    course,
  });
});

// DELETE /api/courses/:id
export const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  assertOwner(course, req.user);

  await Lesson.deleteMany({ course: course._id });
  await Section.deleteMany({ course: course._id });
  await course.deleteOne();

  res.json({
    message: 'Course deleted successfully',
  });
});

// GET /api/courses/mine
export const getMyCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({
    instructor: req.user._id,
  }).sort({ createdAt: -1 });

  res.json({
    items: courses,
    total: courses.length,
  });
});


// GET /api/courses/enrolled
export const getEnrolledCourses = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({
    user: req.user._id,
  })
    .populate({
      path: 'course',
      select: 'title description thumbnail category level price instructor status',
      populate: {
        path: 'instructor',
        select: 'name',
      },
    })
    .sort({ enrolledAt: -1 });

  const items = enrollments
    .filter((enrollment) => enrollment.course)
    .map((enrollment) => ({
      enrollmentId: enrollment._id,
      enrolledAt: enrollment.enrolledAt,
      lessonProgress: enrollment.lessonProgress,
      quizProgress: enrollment.quizProgress,
      completedAt: enrollment.completedAt,
      course: enrollment.course,
    }));

  res.json({
    items,
    total: items.length,
  });
});


// PATCH /api/courses/:id/submit
export const submitCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  assertOwner(course, req.user);

  if (course.status !== 'draft') {
    throw new ApiError(400, 'Only draft courses can be submitted');
  }

  course.status = 'pending';
  await course.save();

  res.json({
    message: 'Course submitted for approval',
    course,
  });
});

// POST /api/courses/:courseId/sections
export const createSection = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId);

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  assertOwner(course, req.user);

  const { title, order } = req.body;

  const section = await Section.create({
    course: course._id,
    title,
    order,
  });

  res.status(201).json({
    message: 'Section created successfully',
    section,
  });
});

// PUT /api/courses/sections/:sectionId
export const updateSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.sectionId);

  if (!section) {
    throw new ApiError(404, 'Section not found');
  }

  const course = await Course.findById(section.course);

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  assertOwner(course, req.user);

  if (req.body.title !== undefined) {
    section.title = req.body.title;
  }

  if (req.body.order !== undefined) {
    section.order = req.body.order;
  }

  await section.save();

  res.json({
    message: 'Section updated successfully',
    section,
  });
});

// DELETE /api/courses/sections/:sectionId
export const deleteSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.sectionId);

  if (!section) {
    throw new ApiError(404, 'Section not found');
  }

  const course = await Course.findById(section.course);

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  assertOwner(course, req.user);

  await Lesson.deleteMany({ section: section._id });
  await section.deleteOne();

  res.json({
    message: 'Section deleted successfully',
  });
});

// POST /api/courses/:courseId/sections/:sectionId/lessons
export const createLesson = asyncHandler(async (req, res) => {
  const { courseId, sectionId } = req.params;

  const course = await Course.findById(courseId);

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  assertOwner(course, req.user);

  const section = await Section.findOne({
    _id: sectionId,
    course: courseId,
  });

  if (!section) {
    throw new ApiError(404, 'Section not found in this course');
  }

  const {
    title,
    order,
    description,
    duration,
    isPreview,
  } = req.body;

  const lesson = await Lesson.create({
    course: course._id,
    section: section._id,
    title,
    order,
    description,
    duration,
    isPreview,
  });

  res.status(201).json({
    message: 'Lesson created successfully',
    lesson,
  });
});

// PUT /api/courses/lessons/:lessonId
export const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);

  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }

  const course = await Course.findById(lesson.course);

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  assertOwner(course, req.user);

  const allowedFields = [
    'title',
    'order',
    'description',
    'duration',
    'isPreview',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      lesson[field] = req.body[field];
    }
  });

  await lesson.save();

  res.json({
    message: 'Lesson updated successfully',
    lesson,
  });
});

// DELETE /api/courses/lessons/:lessonId
export const deleteLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);

  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }

  const course = await Course.findById(lesson.course);

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  assertOwner(course, req.user);

  await lesson.deleteOne();

  res.json({
    message: 'Lesson deleted successfully',
  });
});

// GET /api/admin/courses/pending
export const getPendingCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({
    status: 'pending',
  })
    .populate('instructor', 'name email')
    .sort({ createdAt: 1 });

  res.json({
    items: courses,
    total: courses.length,
  });
});

// PATCH /api/admin/courses/:id/status
export const updateCourseStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['published', 'draft'].includes(status)) {
    throw new ApiError(
      400,
      'Status must be published or draft'
    );
  }

  const course = await Course.findById(req.params.id);

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  if (status === 'published' && course.status !== 'pending') {
    throw new ApiError(
      400,
      'Only pending courses can be published'
    );
  }

  course.status = status;

  await course.save();

  res.json({
    message: `Course ${status === 'published' ? 'published' : 'returned to draft'} successfully`,
    course,
  });
});