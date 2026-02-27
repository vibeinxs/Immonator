// PHASE 4: Replace localStorage with Clerk's useAuth() hook.
// Update getToken() to return Clerk's getToken().
// All other code stays identical.

const TOKEN_KEY = 'immo_token';
const USER_ID_KEY = 'immo_user_id';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

export function isLoggedIn(): boolean {
  const token = getToken();
  return token !== null && token.length > 0;
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  window.location.href = '/beta-login';
}
