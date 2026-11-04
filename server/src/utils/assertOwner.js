import { ApiError } from './ApiError.js';

export const assertOwner = (course, user) => {
  const instructorId = course.instructor?._id ?? course.instructor;

  if (String(instructorId) !== String(user._id)) {
    throw new ApiError(403, 'You are not authorized to manage this course');
  }
};