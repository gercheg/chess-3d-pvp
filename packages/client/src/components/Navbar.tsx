import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store";
import Button from "./ui/Button";

export default function Navbar() {
  const { auth, logout } = useAuth();
  const nav = useNavigate();

  return (
    <nav className="border-b border-chess-border bg-chess-bg/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-lg font-heading text-gradient-primary hover:opacity-80 transition-opacity cursor-pointer"
          >
            Chess 3D
          </Link>
          <Link
            to="/leaderboard"
            className="text-sm text-chess-muted hover:text-chess-text transition-colors cursor-pointer"
          >
            Leaderboard
          </Link>
          <Link
            to="/game"
            className="text-sm text-chess-muted hover:text-chess-text transition-colors cursor-pointer"
          >
            Play
          </Link>
          {auth.user?.role === "ADMIN" && (
            <Link
              to="/admin"
              className="text-sm text-yellow-500/80 hover:text-yellow-400 transition-colors cursor-pointer"
            >
              Admin
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          {auth.user ? (
            <>
              <span className="text-sm text-chess-muted">
                {auth.user.username}{" "}
                <span className="text-chess-secondary font-mono">({auth.user.eloRating})</span>
              </span>
              <button
                onClick={() => { logout(); nav("/"); }}
                className="text-sm text-chess-muted hover:text-chess-text transition-colors cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-chess-muted hover:text-chess-text transition-colors cursor-pointer"
              >
                Login
              </Link>
              <Link to="/register">
                <Button size="sm" variant="primary">Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
