// src/components/LoginScreen.jsx
import { useState } from "react";
import "../styles/farm-auth.css";
import { API_BASE_URL, assertApiConfigured } from "../config/api";

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      assertApiConfigured();

      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = pass.trim();
      const cleanName = name.trim();

      if (!cleanEmail || !cleanPass) {
        setError("Correo y contraseña son obligatorios.");
        return;
      }

      if (cleanPass.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }

      setLoading(true);

      // 1) Si está en signup: crear cuenta
      if (mode === "signup") {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanName || "Productor",
            email: cleanEmail,
            password: cleanPass,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "No se pudo crear la cuenta.");

        // Luego de crear cuenta, pasamos a login automático
      }

      // 2) Login (siempre)
      const resLogin = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPass,
        }),
      });

      const loginData = await resLogin.json();
      if (!resLogin.ok)
        throw new Error(loginData?.error || "No se pudo iniciar sesión.");

      // Guardar token
      if (loginData?.token) {
        localStorage.setItem("agromind_token", loginData.token);
      }

      // Entrar al sistema
      if (loginData?.user) {
        onLogin?.(loginData.user);
      } else {
        // fallback mínimo
        onLogin?.({ name: cleanName || "Productor", email: cleanEmail });
      }
    } catch (err) {
      setError(err?.message || "Error inesperado.");
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
            />
          </div>

          <div className="auth-field">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            <span className="auth-hint">
              Tu contraseña se guarda cifrada y se valida en el servidor.
            </span>
          </div>

          {error && (
            <div
              style={{
                marginTop: "0.5rem",
                padding: "0.65rem 0.75rem",
                borderRadius: "10px",
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#fecaca",
                fontSize: "0.95rem",
              }}
            >
              {error}
            </div>
          )}

          <button type="submit" className="auth-primary-btn" disabled={loading}>
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
              <button type="button" onClick={() => setMode("signup")} disabled={loading}>
                Crear cuenta
              </button>
            </>
          ) : (
            <>
              <span>¿Ya tienes cuenta?</span>
              <button type="button" onClick={() => setMode("login")} disabled={loading}>
                Iniciar sesión
              </button>
            </>
          )}
        </div>

        <p className="auth-footnote">
          Seguridad activa · Cifrado de contraseña · Sesión con token
        </p>
      </div>
    </div>
  );
}
