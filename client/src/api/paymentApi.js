
import api from './axios.js';

// Create a payment attempt or enroll a student in a free course.
export const createPaymentOrder = async (courseId, phone) => {
  const { data } = await api.post('/payments/create-order', {
    courseId,
    phone,
  });

  return data;
};

// Fetch the verified payment status for the logged-in student.
export const getPaymentStatus = async (txnid) => {
  const { data } = await api.get(
    `/payments/${encodeURIComponent(txnid)}/status`
  );

  return data;
};
