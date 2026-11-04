import axios from 'axios';

let store;

export const injectStore = (s) => {
  store = s;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Attach access token to outgoing requests
api.interceptors.request.use((cfg) => {
  const token = store?.getState().auth.token;

  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }

  return cfg;
});

// Automatically refresh expired access tokens
let refreshing = null;

api.interceptors.response.use(
  (response) => response,
  async (err) => {
    const originalRequest = err.config;

    if (
      err.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      originalRequest._retry = true;

      refreshing ??= axios
        .post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        .finally(() => {
          refreshing = null;
        });

      try {
        const { data } = await refreshing;

        store.dispatch({
          type: 'auth/setToken',
          payload: data.accessToken,
        });

        originalRequest.headers.Authorization =
          `Bearer ${data.accessToken}`;

        return api(originalRequest);
      } catch {
        store.dispatch({ type: 'auth/logout' });
      }
    }

    return Promise.reject(err);
  }
);

export default api;