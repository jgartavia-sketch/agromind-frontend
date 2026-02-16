// src/AgroMindApp.jsx
import { useEffect, useState } from "react";
import FarmShell from "./components/FarmShell";
import LoginScreen from "./components/LoginScreen";

// ✅ Base URL del backend (producción)
// Recomendado: poner VITE_API_URL en Vercel (y en tu .env local del front)
const API_BASE =
  import.meta.env.VITE_API_URL || "https://agromind-backend-slem.onrender.com";

// Keys de sesión (dejamos varios por compatibilidad, así no te rompe nada)
const TOKEN_KEYS = ["agromind_token", "token", "auth_token", "jwt"];
const USER_KEYS = ["agromind_user", "user", "auth_user"];

function getStoredToken() {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v && v.trim()) return v.trim();
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

export default function AgroMindApp() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  // ✅ Al cargar: si hay token, validar en backend
  useEffect(() => {
    const boot = async () => {
      try {
        const token = getStoredToken();
        if (!token) {
          setBooting(false);
          return;
        }

        const resp = await fetch(`${API_BASE}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!resp.ok) {
          clearStoredSession();
          setUser(null);
          setBooting(false);
          return;
        }

        const data = await resp.json();
        if (data?.user) {
          setStoredSession({ token, user: data.user });
          setUser(data.user);
        } else {
          clearStoredSession();
          setUser(null);
        }
      } catch (err) {
        // Si el backend está dormido o hay red lenta, no reventamos la app:
        // solo mostramos login y listo.
        setUser(null);
      } finally {
        setBooting(false);
      }
    };

    boot();
  }, []);

  // ✅ Login exitoso desde LoginScreen
  // Acepta 2 formatos:
  // 1) onLogin({ token, user })
  // 2) onLogin({ name, email }) (por compatibilidad)
  const handleLogin = (payload) => {
    const token = payload?.token || null;
    const u =
      payload?.user ||
      (payload?.email
        ? { name: payload?.name || "Productor", email: payload.email }
        : null);

    if (token && u) setStoredSession({ token, user: u });
    setUser(u);
  };

  // ✅ Logout limpio (estado + storage)
  const handleLogout = () => {
    clearStoredSession();
    setUser(null);
  };

  // Pantalla de arranque (para que no parpadee login/shell)
  if (booting) return null;

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <FarmShell user={user} onLogout={handleLogout} />;
}
