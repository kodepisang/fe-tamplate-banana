import axios from 'axios';
import { syncServerTime } from './server-time';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true, // For cookies
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    const serverTime = response.headers?.['x-server-time'] || response.headers?.['X-Server-Time'];
    if (serverTime) {
      const serverEpoch = new Date(serverTime).getTime();
      if (!isNaN(serverEpoch)) {
        syncServerTime(serverEpoch);
      }
    }
    return response;
  },
  (error) => {
    const serverTime = error.response?.headers?.['x-server-time'] || error.response?.headers?.['X-Server-Time'];
    if (serverTime) {
      const serverEpoch = new Date(serverTime).getTime();
      if (!isNaN(serverEpoch)) {
        syncServerTime(serverEpoch);
      }
    }
    if (error.response?.status === 401) {
      // Handle unauthorized (e.g., redirect to login or refresh token)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Prevent infinite redirect loop if already on login page
      if (window.location.pathname !== '/sign-in') {
        window.location.href = '/sign-in';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
