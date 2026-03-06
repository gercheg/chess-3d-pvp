const BASE = import.meta.env.VITE_API_URL || "https://chess-server-801657053917.europe-west1.run.app";

function getToken(): string | null {
  return localStorage.getItem("chess_token");
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...((opts.headers as Record<string, string>) || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || res.statusText);
  }
  return res.json();
}

export type User = { id: string; email: string; username: string; eloRating: number; role?: string; gamesPlayed?: number; wins?: number; losses?: number; draws?: number; createdAt?: string };
export type AuthResponse = { token: string; user: User };
export type LeaderboardUser = { id: string; username: string; eloRating: number; gamesPlayed: number; wins: number; losses: number; draws: number };
export type GameSummary = { id: string; status: string; timeControl: string; result?: string; createdAt: string; whitePlayer: { id: string; username: string; eloRating: number }; blackPlayer: { id: string; username: string; eloRating: number } };
export type AdminStats = { totalUsers: number; totalGames: number; activeGames: number; queueSize: number; activeRooms: number };

export const api = {
  register: (email: string, username: string, password: string) => request<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, username, password }) }),
  login: (email: string, password: string) => request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<{ user: User }>("/api/auth/me"),
  leaderboard: (limit = 50, offset = 0) => request<{ users: LeaderboardUser[]; total: number }>(`/api/leaderboard?limit=${limit}&offset=${offset}`),
  games: (limit = 20, offset = 0) => request<{ games: GameSummary[]; total: number }>(`/api/games?limit=${limit}&offset=${offset}`),
  game: (id: string) => request<any>(`/api/games/${id}`),
  adminStats: () => request<AdminStats>("/api/admin/stats"),
  adminUsers: () => request<User[]>("/api/admin/users"),
};
