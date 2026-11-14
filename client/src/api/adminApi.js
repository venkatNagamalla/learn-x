
import api from './axios.js';

// Fetch admin dashboard summary.
export const getAdminSummary = async () => {
  const { data } = await api.get('/admin/summary');
  return data.summary;
};

// Fetch users with optional role, search, and pagination filters.
export const getAdminUsers = async ({
  page = 1,
  limit = 10,
  role,
  search,
} = {}) => {
  const params = { page, limit };

  if (role) params.role = role;
  if (search?.trim()) params.search = search.trim();

  const { data } = await api.get('/admin/users', { params });
  return data;
};

// Block or unblock a user.
export const updateUserBlockStatus = async (userId, isBlocked) => {
  const { data } = await api.patch(
    `/admin/users/${userId}/block`,
    { isBlocked }
  );

  return data;
};

// Fetch courses awaiting admin approval.
export const getPendingCourses = async () => {
  const { data } = await api.get('/admin/courses/pending');
  return data.items || [];
};

// Approve or reject a course.
export const updateCourseStatus = async (courseId, status) => {
  const { data } = await api.patch(
    `/admin/courses/${courseId}/status`,
    { status }
  );

  return data;
};

// Fetch all instructor earnings with optional payout status filter.
export const getAdminEarnings = async ({
  page = 1,
  limit = 10,
  payoutStatus,
} = {}) => {
  const params = { page, limit };

  if (payoutStatus) {
    params.payoutStatus = payoutStatus;
  }

  const { data } = await api.get('/admin/earnings', { params });
  return data;
};

// Mark an instructor earning as paid.
export const markEarningAsPaid = async (earningId) => {
  const { data } = await api.patch(
    `/admin/earnings/${earningId}/payout`
  );

  return data;
};
