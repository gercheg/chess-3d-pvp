import { useEffect, useState } from "react";
import { api, type LeaderboardUser } from "../api";
import Card from "../components/ui/Card";
import Spinner from "../components/ui/Spinner";

export default function Leaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .leaderboard(50)
      .then((r) => setUsers(r.users))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-heading neon-text">Leaderboard</h1>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-chess-border text-chess-muted">
                <th className="text-left py-3 px-3 font-medium w-12">#</th>
                <th className="text-left py-3 px-3 font-medium">Player</th>
                <th className="text-right py-3 px-3 font-medium">ELO</th>
                <th className="text-right py-3 px-3 font-medium">Games</th>
                <th className="text-right py-3 px-3 font-medium">W/L/D</th>
                <th className="text-right py-3 px-3 font-medium">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const total = u.wins + u.losses + u.draws;
                const winRate = total > 0 ? ((u.wins / total) * 100).toFixed(1) : "0.0";
                return (
                  <tr
                    key={u.id}
                    className="border-b border-chess-border/50 hover:bg-chess-surface-hover transition-colors"
                  >
                    <td className="py-3 px-3">
                      <span
                        className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                          i === 0
                            ? "bg-yellow-500/20 text-yellow-400"
                            : i === 1
                              ? "bg-zinc-400/20 text-zinc-300"
                              : i === 2
                                ? "bg-orange-500/20 text-orange-400"
                                : "bg-chess-border text-chess-muted"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-chess-text font-medium">{u.username}</td>
                    <td className="py-3 px-3 text-right font-mono text-chess-secondary font-semibold">
                      {u.eloRating}
                    </td>
                    <td className="py-3 px-3 text-right text-chess-muted">{u.gamesPlayed}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-green-400">{u.wins}</span>
                      <span className="text-chess-muted">/</span>
                      <span className="text-red-400">{u.losses}</span>
                      <span className="text-chess-muted">/</span>
                      <span className="text-yellow-400">{u.draws}</span>
                    </td>
                    <td className="py-3 px-3 text-right text-chess-muted">{winRate}%</td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-chess-muted">
                    No players yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
