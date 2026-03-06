import { createContext, useContext } from "react";
import type { User } from "./api";

export type AuthState = { user: User | null; token: string | null };

export type AuthContextType = {
  auth: AuthState;
  login: (token: string, user: User) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType>({
  auth: { user: null, token: null },
  login: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function loadAuth(): AuthState {
  const token = localStorage.getItem("chess_token");
  const userStr = localStorage.getItem("chess_user");
  if (token && userStr) {
    try { return { token, user: JSON.parse(userStr) }; } catch { /* ignore */ }
  }
  return { token: null, user: null };
}

export function saveAuth(token: string, user: User) {
  localStorage.setItem("chess_token", token);
  localStorage.setItem("chess_user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("chess_token");
  localStorage.removeItem("chess_user");
}
