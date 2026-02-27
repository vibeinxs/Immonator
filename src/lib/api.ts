import { getToken, getUserId, logout } from './auth';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

type ApiResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const token = getToken();
  const userId = getUserId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (userId) headers['X-User-ID'] = userId;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    return { data: null, error: 'Network error. Please try again.' };
  }

  if (response.status === 401) {
    logout();
    return { data: null, error: 'Session expired. Please log in again.' };
  }

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.message) errorMessage = body.message;
      else if (body?.error) errorMessage = body.error;
    } catch {
      // ignore parse errors
    }
    return { data: null, error: errorMessage };
  }

  try {
    const data: T = await response.json();
    return { data, error: null };
  } catch {
    return { data: null, error: 'Failed to parse server response.' };
  }
}

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
