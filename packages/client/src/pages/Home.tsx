import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type LeaderboardUser, type GameSummary } from "../api";
import { useAuth } from "../store";
import ChessBoard3D from "../components/ChessBoard3D";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";

export default function Home() {
  const { auth } = useAuth();
  const [top, setTop] = useState<LeaderboardUser[]>([]);
  const [games, setGames] = useState<GameSummary[]>([]);

  useEffect(() => {
    api.leaderboard(5).then((r) => setTop(r.users)).catch(() => {});
    api.games(5).then((r) => setGames(r.games)).catch(() => {});
  }, []);

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Hero */}
      <section className="relative text-center py-16 overflow-hidden rounded-3xl">
        <img
          src="/assets/hero-bg.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-chess-bg/60 via-chess-bg/40 to-chess-bg rounded-3xl" />
        <div className="relative z-10">
          <h1 className="text-5xl md:text-6xl font-heading neon-text mb-4 tracking-tight">
            3D Chess PvP
          </h1>
          <p className="text-chess-muted text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Real-time multiplayer chess with ELO matchmaking, 3D board, and competitive leaderboard
          </p>
          <div className="flex gap-4 justify-center">
            {auth.user ? (
              <Link to="/game">
                <Button variant="cta" size="lg">Play Now</Button>
              </Link>
            ) : (
              <Link to="/register">
                <Button variant="cta" size="lg">Get Started</Button>
              </Link>
            )}
            <Link to="/leaderboard">
              <Button variant="ghost" size="lg">Leaderboard</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 3D Board Preview */}
      <section className="h-[400px] rounded-2xl overflow-hidden neon-border scanline-overlay">
        <ChessBoard3D />
      </section>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-heading text-chess-text mb-4">Top Players</h2>
          {top.length === 0 ? (
            <p className="text-chess-muted text-sm">No players yet</p>
          ) : (
            <div className="space-y-2">
              {top.map((u, i) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-chess-surface/50 hover:bg-chess-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
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
                    <span className="text-chess-text font-medium">{u.username}</span>
                  </div>
                  <span className="text-chess-secondary font-mono font-semibold">
                    {u.eloRating}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-heading text-chess-text mb-4">Recent Games</h2>
          {games.length === 0 ? (
            <p className="text-chess-muted text-sm">No games played yet</p>
          ) : (
            <div className="space-y-2">
              {games.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-chess-surface/50 hover:bg-chess-surface-hover transition-colors"
                >
                  <div className="text-sm">
                    <span className="text-chess-text">{g.whitePlayer.username}</span>
                    <span className="text-chess-muted mx-2">vs</span>
                    <span className="text-chess-text">{g.blackPlayer.username}</span>
                  </div>
                  <Badge
                    variant={
                      g.status === "ACTIVE"
                        ? "success"
                        : g.status === "FINISHED"
                          ? "default"
                          : "warning"
                    }
                  >
                    {g.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
