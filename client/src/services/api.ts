import axios from 'axios';

const TOKEN_KEY = 'mordisquitos-token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Adjunta el token en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers['x-app-token'] = token;
  }
  return config;
});

// En 401 limpia el token y redirige a /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.replace('/login');
    }
    return Promise.reject(error);
  },
);

export default api;
