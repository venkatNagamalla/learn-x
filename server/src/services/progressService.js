
import Lesson from '../models/Lesson.js';
import Quiz from '../models/Quiz.js';
import LessonProgress from '../models/LessonProgress.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Enrollment from '../models/Enrollment.js';

import { issueCertificate } from './certificateService.js';

export async function recalcProgress(userId, courseId) {
  const [lessons, quizzes] = await Promise.all([
    Lesson.find({ course: courseId }).select('_id'),
    Quiz.find({ course: courseId }).select('_id'),
  ]);

  const lessonIds = lessons.map((lesson) => lesson._id);
  const quizIds = quizzes.map((quiz) => quiz._id);

  const [doneLessons, passedQuizzes] = await Promise.all([
    lessonIds.length
      ? LessonProgress.countDocuments({
          user: userId,
          completed: true,
          lesson: { $in: lessonIds },
        })
      : Promise.resolve(0),

    quizIds.length
      ? QuizAttempt.distinct('quiz', {
          user: userId,
          passed: true,
          quiz: { $in: quizIds },
        })
      : Promise.resolve([]),
  ]);

  const lessonProgress = lessons.length
    ? Math.round((doneLessons / lessons.length) * 100)
    : 100;

  const quizProgress = quizzes.length
    ? Math.round((passedQuizzes.length / quizzes.length) * 100)
    : 100;

  const completed =
    lessonProgress === 100 && quizProgress === 100;

  const enrollment = await Enrollment.findOne({
    user: userId,
    course: courseId,
  });

  if (!enrollment) {
    return null;
  }

  const wasCompleted = Boolean(enrollment.completedAt);

  enrollment.lessonProgress = lessonProgress;
  enrollment.quizProgress = quizProgress;

  if (completed && !enrollment.completedAt) {
    enrollment.completedAt = new Date();
  }

  await enrollment.save();

  if (completed && !wasCompleted) {
    await issueCertificate(userId, courseId);
  }

  return {
    lessonProgress,
    quizProgress,
    completed,
  };
}
