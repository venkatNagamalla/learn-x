
import api from './axios.js';

export const getMyCertificates = async () => {
  const { data } = await api.get('/certificates/mine');
  return data.certificates;
};

export const getCertificateDownloadUrl = async (certificateId) => {
  const { data } = await api.get(
    `/certificates/${certificateId}/download`
  );

  return data.downloadUrl;
};

export const verifyCertificate = async (certificateId) => {
  const { data } = await api.get(
    `/certificates/verify/${encodeURIComponent(certificateId)}`
  );

  return data;
};
