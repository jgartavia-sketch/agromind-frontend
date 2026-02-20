// src/components/LoginScreen.jsx
import { useMemo, useState } from "react";
import "../styles/farm-auth.css";

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = useMemo(() => {
    const raw =
      import.meta.env.VITE_API_URL || "https://agromind-backend-slem.onrender.com";
    return raw.replace(/\/+$/, ""); // sin slash final
  }, []);

  const canSubmit = useMemo(() => {
    const e = email.trim();
    const p = pass.trim();
    if (!e || !p) return false;
    if (mode === "signup") {
      if (p.length < 8) return false;
      if (p !== pass2.trim()) return false;
    }
    return true;
  }, [mode, email, pass, pass2]);

  const friendlyError = (msg) => {
    if (!msg) return "Ocurrió un error. Intenta de nuevo.";
    return msg;
  };

  const persistAuth = (token, user) => {
    try {
      localStorage.setItem("agromind_token", token);
      localStorage.setItem("agromind_user", JSON.stringify(user));
    } catch {
      // Si el navegador bloquea storage, igual dejamos continuar
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!API_BASE) {
      setError("Falta configurar la conexión con el servidor.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const password = pass.trim();

    if (!cleanEmail || !password) return;

    if (mode === "signup") {
      const password2 = pass2.trim();
      if (password.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
      if (password !== password2) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }

    setLoading(true);
    try {
      // 1) Si es signup, primero registramos
      if (mode === "signup") {
        const resp = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim() || "Productor",
            email: cleanEmail,
            password,
          }),
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          setError(friendlyError(data?.error));
          setLoading(false);
          return;
        }
      }

      // 2) Login siempre
      const resp2 = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data2 = await resp2.json().catch(() => ({}));
      if (!resp2.ok) {
        setError(friendlyError(data2?.error));
        setLoading(false);
        return;
      }

      const token = data2?.token;
      const user = data2?.user;

      if (!token || !user) {
        setError("Respuesta inválida del servidor.");
        setLoading(false);
        return;
      }

      persistAuth(token, user);

      // ✅ Le pasamos al App la sesión en el formato correcto: { token, user }
      onLogin?.({ token, user });

      // Limpieza visual
      setPass("");
      setPass2("");
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agromind-auth-shell">
      <div className="agromind-auth-card">
        <div className="agromind-auth-logo">
          <div className="auth-logo-mark">AG</div>
          <div className="auth-logo-text">
            <span className="auth-brand-name">AgroMind CR</span>
            <span className="auth-brand-tagline">La finca que piensa</span>
          </div>
        </div>

        <div className="agromind-auth-header">
          <h1>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
          <p>Accede a tu panel de finca inteligente.</p>
        </div>

        <form className="agromind-auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="auth-field">
              <label>Nombre</label>
              <input
                type="text"
                placeholder="Ej: José Artavia"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-field">
            <label>Correo</label>
            <input
              type="email"
              placeholder="tucorreo@finca.cr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div className="auth-field">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder={mode === "signup" ? "Mínimo 8 caracteres" : "Tu contraseña"}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>

          {mode === "signup" && (
            <div className="auth-field">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                placeholder="Repite la contraseña"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className="auth-error" style={{ marginTop: "0.5rem" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-primary-btn"
            disabled={!canSubmit || loading}
          >
            {loading
              ? "Procesando..."
              : mode === "login"
              ? "Entrar"
              : "Crear cuenta y entrar"}
          </button>
        </form>

        <div className="auth-switch-mode">
          {mode === "login" ? (
            <>
              <span>¿Aún no tienes cuenta?</span>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMode("signup");
                }}
              >
                Crear cuenta
              </button>
            </>
          ) : (
            <>
              <span>¿Ya tienes cuenta?</span>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMode("login");
                }}
              >
                Iniciar sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}