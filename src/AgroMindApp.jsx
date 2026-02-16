// src/AgroMindApp.jsx
import { useEffect, useMemo, useState } from "react";
import FarmShell from "./components/FarmShell";
import LoginScreen from "./components/LoginScreen";

export default function AgroMindApp() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const API_BASE = useMemo(() => {
    const raw = import.meta.env.VITE_API_URL || "";
    return raw.replace(/\/+$/, "");
  }, []);

  const clearAuth = () => {
    try {
      localStorage.removeItem("agromind_token");
      localStorage.removeItem("agromind_user");
    } catch {
      // ignore
    }
  };

  const handleLogin = (payload) => {
    // payload esperado: { id, email, name, token }
    setUser(payload || null);
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
  };

  // ✅ Boot: si hay token, validar con /auth/me y entrar directo
  useEffect(() => {
    const boot = async () => {
      try {
        const token = localStorage.getItem("agromind_token");
        const rawUser = localStorage.getItem("agromind_user");

        if (!token || !API_BASE) {
          setBooting(false);
          return;
        }

        // Intentamos usar el user guardado (para UI rápida)
        let cachedUser = null;
        if (rawUser) {
          try {
            cachedUser = JSON.parse(rawUser);
          } catch {
            cachedUser = null;
          }
        }

        // Validar token con backend (fuente de verdad)
        const resp = await fetch(`${API_BASE}/auth/me`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok || !data?.user) {
          clearAuth();
          setUser(null);
          setBooting(false);
          return;
        }

        const me = data.user;
        setUser({
          id: me.id,
          email: me.email,
          name: me.name || cachedUser?.name || "Productor",
          token,
        });

        // Refrescar cache por si cambió algo
        try {
          localStorage.setItem("agromind_user", JSON.stringify(me));
        } catch {
          // ignore
        }

        setBooting(false);
      } catch {
        // Si el backend no responde, no inventamos: volvemos al login
        clearAuth();
        setUser(null);
        setBooting(false);
      }
    };

    boot();
  }, [API_BASE]);

  // Pantalla de arranque (evita flicker del login)
  if (booting) {
    return (
      <div className="agromind-auth-shell">
        <div className="agromind-auth-card" style={{ textAlign: "center" }}>
          <div className="agromind-auth-logo" style={{ justifyContent: "center" }}>
            <div className="auth-logo-mark">AG</div>
            <div className="auth-logo-text">
              <span className="auth-brand-name">AgroMind CR</span>
              <span className="auth-brand-tagline">Cargando…</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay usuario -> login
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Si hay usuario -> app
  return <FarmShell user={user} onLogout={handleLogout} />;
}
