import axios from "axios";

const API = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token if present
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response handling: detect 401 and redirect to login for re-auth
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log network errors for easier debugging
    if (!error.response) {
      console.error('API network error or server not reachable:', error.message);
    }

    if (error?.response?.status === 401) {
      // clear auth state and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('name');
      localStorage.removeItem('userId');
      // Navigate to login — using location to avoid needing router here
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
