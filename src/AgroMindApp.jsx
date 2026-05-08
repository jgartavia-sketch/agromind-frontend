// src/AgroMindApp.jsx
import { useEffect, useMemo, useState } from "react";
import FarmShell from "./components/FarmShell";
import LoginScreen from "./components/LoginScreen";

const RAW_API_BASE =
  import.meta.env.VITE_API_URL || "https://agromind-backend-slem.onrender.com";

const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

const TOKEN_KEYS = ["agromind_token", "token", "auth_token", "jwt"];
const USER_KEYS = ["agromind_user", "user", "auth_user"];

function getStoredToken() {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function getStoredUser() {
  for (const k of USER_KEYS) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.email || parsed?.id || parsed?.name) return parsed;
    } catch {
      continue;
    }
  }

  return null;
}

function setStoredSession({ token, user }) {
  if (token) localStorage.setItem("agromind_token", token);
  if (user) localStorage.setItem("agromind_user", JSON.stringify(user));
}

function clearStoredSession() {
  [...TOKEN_KEYS, ...USER_KEYS].forEach((k) => localStorage.removeItem(k));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export default function AgroMindApp() {
  const initialSession = useMemo(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();

    return {
      token,
      user: token && storedUser ? storedUser : null,
    };
  }, []);

  const [user, setUser] = useState(initialSession.user);
  const [booting, setBooting] = useState(!initialSession.user && !!initialSession.token);

  useEffect(() => {
    const token = initialSession.token;

    if (!token) {
      setBooting(false);
      return;
    }

    let alive = true;

    const validateSession = async () => {
      try {
        const resp = await fetchWithTimeout(`${API_BASE}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!alive) return;

        if (!resp.ok) {
          clearStoredSession();
          setUser(null);
          return;
        }

        const data = await resp.json().catch(() => ({}));

        if (data?.user) {
          setStoredSession({ token, user: data.user });
          setUser(data.user);
        } else {
          clearStoredSession();
          setUser(null);
        }
      } catch {
        if (!alive) return;

        if (!initialSession.user) {
          clearStoredSession();
          setUser(null);
        }
      } finally {
        if (alive) setBooting(false);
      }
    };

    validateSession();

    return () => {
      alive = false;
    };
  }, [initialSession.token, initialSession.user]);

  const handleLogin = (payload) => {
    const token = payload?.token || null;

    const u =
      payload?.user ||
      (payload?.email
        ? { name: payload?.name || "Productor", email: payload.email }
        : null);

    if (token && u) {
      setStoredSession({ token, user: u });
    }

    setUser(u);
  };

  const handleLogout = () => {
    clearStoredSession();
    setUser(null);
  };

  if (booting) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f4f8f1",
          color: "#173b1a",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>AgroMind CR</h2>
          <p style={{ margin: 0 }}>Preparando tu finca...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <FarmShell user={user} onLogout={handleLogout} />;
}