
import api from './axios.js';

// Fetch instructor revenue and dashboard summary.
export const getEarningsSummary = async () => {
  const { data } = await api.get('/earnings/summary');
  return data.summary;
};

// Fetch monthly earnings for the chart.
export const getMonthlyEarnings = async () => {
  const { data } = await api.get('/earnings/monthly');
  return data.items || [];
};

// Fetch instructor course performance.
export const getInstructorCourseStats = async () => {
  const { data } = await api.get('/earnings/courses');
  return data.items || [];
};

// Fetch paginated instructor transactions.
export const getEarningsTransactions = async ({
  page = 1,
  limit = 10,
  payoutStatus,
} = {}) => {
  const params = { page, limit };

  if (payoutStatus) {
    params.payoutStatus = payoutStatus;
  }

  const { data } = await api.get('/earnings/transactions', {
    params,
  });

  return data;
};
