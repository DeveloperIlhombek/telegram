import { User } from "./types";
import { api } from "./api";

const USER_KEY = "auth_user";

// SSR-safe guard
function isClient(): boolean {
  return typeof window !== "undefined";
}

export function saveUser(user: User): void {
  if (!isClient()) return;
  try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
}

export function getStoredUser(): User | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  api.clearToken();
  if (!isClient()) return;
  try { localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
}

export function isAuthenticated(): boolean {
  if (!isClient()) return false;
  return !!api.getToken() && !!getStoredUser();
}

export function getRoleRedirect(role: User["role"]): string {
  switch (role) {
    case "superadmin":
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "student":
      return "/student";
    default:
      return "/login";
  }
}
