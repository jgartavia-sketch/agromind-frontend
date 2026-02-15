// src/components/LoginScreen.jsx
import { useState } from "react";
import "../styles/farm-auth.css";

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !pass.trim()) return;

    const payload = {
      name: name.trim() || "Productor",
      email: email.trim(),
    };

    onLogin?.(payload);
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
          <p>
            Accede a tu panel de finca inteligente. Esta versión funciona
            100% en tu navegador, sin servidor.
          </p>
        </div>

        <form className="agromind-auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="auth-field">
              <label>Nombre</label>
              <input
                type="text"
                placeholder="Ej: Memo Artavia"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
            />
          </div>

          <div className="auth-field">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="Solo para esta demo local"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            <span className="auth-hint">
              En esta fase no se valida en un servidor, solo se usa para la experiencia.
            </span>
          </div>

          <button type="submit" className="auth-primary-btn">
            {mode === "login" ? "Entrar" : "Crear y entrar"}
          </button>
        </form>

        <div className="auth-switch-mode">
          {mode === "login" ? (
            <>
              <span>¿Aún no tienes cuenta?</span>
              <button type="button" onClick={() => setMode("signup")}>
                Crear cuenta
              </button>
            </>
          ) : (
            <>
              <span>¿Ya tienes cuenta?</span>
              <button type="button" onClick={() => setMode("login")}>
                Iniciar sesión
              </button>
            </>
          )}
        </div>

        <p className="auth-footnote">
          Demo local · Próximamente: autenticación real con backend y múltiples fincas por cuenta.
        </p>
      </div>
    </div>
  );
}
