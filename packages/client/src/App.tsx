import { useState, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthContext, loadAuth, saveAuth, clearAuth, type AuthState } from "./store";
import type { User } from "./api";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Leaderboard from "./pages/Leaderboard";
import Game from "./pages/Game";
import Admin from "./pages/Admin";

export default function App() {
  const [auth, setAuth] = useState<AuthState>(loadAuth);

  const login = useCallback((token: string, user: User) => {
    saveAuth(token, user);
    setAuth({ token, user });
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuth({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/game" element={<Game />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </AuthContext.Provider>
  );
}
