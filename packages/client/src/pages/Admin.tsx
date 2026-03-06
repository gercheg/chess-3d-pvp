import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AdminStats, type User } from "../api";
import { useAuth } from "../store";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";

function StatCard({ label, value, variant }: { label: string; value: number | string; variant?: "success" | "info" | "warning" }) {
  return (
    <Card>
      <p className="text-chess-muted text-sm">{label}</p>
      <p className={`text-3xl font-heading mt-1 ${
        variant === "success" ? "text-green-400" : variant === "warning" ? "text-yellow-400" : "text-chess-secondary"
      }`}>
        {value}
      </p>
    </Card>
  );
}

export default function Admin() {
  const { auth } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [s, u] = await Promise.all([api.adminStats(), api.adminUsers()]);
      setStats(s);
      setUsers(u);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth.user || auth.user.role !== "ADMIN") {
      nav("/");
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [auth.user, nav, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="text-center max-w-md">
          <p className="text-red-400 mb-3">{error}</p>
          <button onClick={fetchData} className="text-chess-secondary hover:text-white cursor-pointer transition-colors text-sm">
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-heading neon-text">Admin Dashboard</h1>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Users" value={stats.totalUsers} variant="info" />
          <StatCard label="Total Games" value={stats.totalGames} variant="info" />
          <StatCard label="Active Games" value={stats.activeGames} variant="success" />
          <StatCard label="Queue Size" value={stats.queueSize} variant="warning" />
          <StatCard label="Active Rooms" value={stats.activeRooms} variant="success" />
        </div>
      )}

      <Card>
        <h2 className="text-lg font-heading text-chess-text mb-4">Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-chess-border text-chess-muted">
                <th className="text-left py-3 px-3 font-medium">Username</th>
                <th className="text-left py-3 px-3 font-medium">Email</th>
                <th className="text-right py-3 px-3 font-medium">ELO</th>
                <th className="text-right py-3 px-3 font-medium">Games</th>
                <th className="text-right py-3 px-3 font-medium">W/L/D</th>
                <th className="text-left py-3 px-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-chess-border/50 hover:bg-chess-surface-hover transition-colors"
                >
                  <td className="py-3 px-3 text-chess-text font-medium">{u.username}</td>
                  <td className="py-3 px-3 text-chess-muted">{u.email}</td>
                  <td className="py-3 px-3 text-right font-mono text-chess-secondary">{u.eloRating}</td>
                  <td className="py-3 px-3 text-right text-chess-muted">{u.gamesPlayed ?? 0}</td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-green-400">{u.wins ?? 0}</span>
                    <span className="text-chess-muted">/</span>
                    <span className="text-red-400">{u.losses ?? 0}</span>
                    <span className="text-chess-muted">/</span>
                    <span className="text-yellow-400">{u.draws ?? 0}</span>
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={u.role === "ADMIN" ? "warning" : "default"}>
                      {u.role || "USER"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-chess-muted">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
