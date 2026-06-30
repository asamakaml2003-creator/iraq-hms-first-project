export interface AuthUser {
  id: string;
  email: string;
  role: string;
  staffId?: string;
  staff?: {
    id: string;
    firstName: string;
    lastName: string;
    specialty?: string;
    department?: { id: string; name: string };
    hospital?: { id: string; name: string };
  };
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem('hms_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setUser(user: AuthUser) {
  localStorage.setItem('hms_user', JSON.stringify(user));
}

export function getToken(): string | null {
  return localStorage.getItem('hms_token');
}

export function setToken(token: string) {
  localStorage.setItem('hms_token', token);
}

export function logout() {
  localStorage.removeItem('hms_token');
  localStorage.removeItem('hms_user');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
