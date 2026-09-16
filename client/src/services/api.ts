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
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers['x-app-token'] = token;
    }
    return config;
  },
  (error) => {
    // Request couldn't even be sent (interceptor threw). Beacon it to
    // the server so it shows in the server terminal — used during LAN
    // dev from a phone where DevTools aren't readily available.
    beacon(`request-setup-error: ${error?.message ?? 'unknown'}`);
    return Promise.reject(error);
  },
);

// En 401 limpia el token y redirige a /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    beacon(
      [
        `url=${error.config?.url ?? '-'}`,
        `method=${error.config?.method ?? '-'}`,
        `status=${error.response?.status ?? '-'}`,
        `code=${error.code ?? '-'}`,
        `msg=${error.message ?? '-'}`,
      ].join(' '),
    );
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.replace('/login');
    }
    return Promise.reject(error);
  },
);

// Fire-and-forget beacon to the server's debug endpoint. Used in dev to
// surface client-side errors into the server terminal when the user is
// testing from a phone without DevTools. `sendBeacon` is non-blocking,
// doesn't wait for a response, and survives page unload — perfect for
// a last-ditch "tell me what failed" hook.
function beacon(message: string): void {
  try {
    const payload = JSON.stringify({ message, ts: Date.now() });
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function'
    ) {
      navigator.sendBeacon(
        '/api/_debug/log',
        new Blob([payload], { type: 'application/json' }),
      );
    }
  } catch {
    // ignore beacon errors
  }
}

export default api;
