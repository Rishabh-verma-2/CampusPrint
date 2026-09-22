import axios from 'axios';

const apiBaseURL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://campusprint-3agy.onrender.com/api' : '/api');

const apiClient = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor: handle token expiry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on login/refresh endpoints or if already retried
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const refreshEndpoint = apiBaseURL.endsWith('/api')
          ? `${apiBaseURL}/auth/refresh`
          : `${apiBaseURL}/api/auth/refresh`;
        await axios.post(refreshEndpoint, {}, { withCredentials: true });
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — reject cleanly without hijacking public routes
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
