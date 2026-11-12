
import api from './axios.js';

export const createLiveClass = async (classData) => {
  const { data } = await api.post('/live', classData);
  return data;
};

export const getUpcomingLiveClasses = async () => {
  const { data } = await api.get('/live/upcoming');
  return data;
};

export const startLiveClass = async (classId) => {
  const { data } = await api.patch(`/live/${classId}/start`);
  return data;
};

export const endLiveClass = async (classId) => {
  const { data } = await api.patch(`/live/${classId}/end`);
  return data;
};

export const getLiveClassToken = async (classId) => {
  const { data } = await api.post(`/live/${classId}/token`);
  return data;
};

export const saveLiveClassMessage = async (
  classId,
  text,
  senderId
) => {
  const { data } = await api.post(
    `/live/${classId}/messages`,
    {
      text,
      senderId,
    }
  );

  return data;
};

// Get saved chat history of an ended class.
export const getLiveClassHistory = async (classId) => {
  const { data } = await api.get(
    `/live/${classId}/history`
  );

  return data;
};
