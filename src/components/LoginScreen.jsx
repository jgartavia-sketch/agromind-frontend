// src/components/LoginScreen.jsx
import { useMemo, useState } from "react";
import "../styles/farm-auth.css";

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const API_BASE = useMemo(() => {
    const raw =
      import.meta.env.VITE_API_URL || "https://agromind-backend-slem.onrender.com";
    return raw.replace(/\/+$/, "");
  }, []);

  const canSubmit = useMemo(() => {
    const e = email.trim();
    const p = pass.trim();

    if (loading) return false;

    if (mode === "forgot") {
      return !!e;
    }

    if (!e || !p) return false;

    if (mode === "signup") {
      if (p.length < 8) return false;
      if (p !== pass2.trim()) return false;
    }

    return true;
  }, [mode, email, pass, pass2, loading]);

  const friendlyError = (msg) => {
    if (!msg) return "Ocurrió un error. Intenta de nuevo.";
    return msg;
  };

  const persistAuth = (token, user) => {
    try {
      localStorage.setItem("agromind_token", token);
      localStorage.setItem("agromind_user", JSON.stringify(user));
    } catch {
      // Si el navegador bloquea storage, igual dejamos continuar.
    }
  };

  const fetchWithTimeout = async (url, options = {}, timeoutMs = 45000) => {
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
  };

  const handleForgotPassword = async () => {
    setError("");
    setSuccess("");

    if (!API_BASE) {
      setError("Falta configurar la conexión con el servidor.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Ingresa tu correo para recuperar la contraseña.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetchWithTimeout(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(friendlyError(data?.error));
        setLoading(false);
        return;
      }

      setSuccess(
        "Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña."
      );
      setLoading(false);
    } catch (err) {
      if (err?.name === "AbortError") {
        setError("El servidor tardó demasiado en responder. Intenta de nuevo.");
      } else {
        setError("No se pudo conectar con el servidor.");
      }

      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "forgot") {
      await handleForgotPassword();
      return;
    }

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
      if (mode === "signup") {
        const registerResponse = await fetchWithTimeout(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim() || "Productor",
            email: cleanEmail,
            password,
          }),
        });

        const registerData = await registerResponse.json().catch(() => ({}));

        if (!registerResponse.ok) {
          setError(friendlyError(registerData?.error));
          setLoading(false);
          return;
        }
      }

      const loginResponse = await fetchWithTimeout(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const loginData = await loginResponse.json().catch(() => ({}));

      if (!loginResponse.ok) {
        setError(friendlyError(loginData?.error));
        setLoading(false);
        return;
      }

      const token = loginData?.token;
      const user = loginData?.user;

      if (!token || !user) {
        setError("Respuesta inválida del servidor.");
        setLoading(false);
        return;
      }

      persistAuth(token, user);

      setPass("");
      setPass2("");

      onLogin?.({ token, user });
    } catch (err) {
      if (err?.name === "AbortError") {
        setError("El servidor tardó demasiado en responder. Intenta de nuevo.");
      } else {
        setError("No se pudo conectar con el servidor.");
      }

      setLoading(false);
    }
  };

  const changeMode = (nextMode) => {
    setError("");
    setSuccess("");
    setPass("");
    setPass2("");
    setMode(nextMode);
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
          <h1>
            {mode === "login"
              ? "Iniciar sesión"
              : mode === "signup"
              ? "Crear cuenta"
              : "Recuperar contraseña"}
          </h1>
          <p>
            {loading
              ? "Conectando con tu finca..."
              : mode === "forgot"
              ? "Ingresa tu correo y te enviaremos las instrucciones."
              : "Accede a tu panel de finca inteligente."}
          </p>
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
                disabled={loading}
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
              disabled={loading}
            />
          </div>

          {mode !== "forgot" && (
            <div className="auth-field">
              <label>Contraseña</label>
              <input
                type="password"
                placeholder={
                  mode === "signup" ? "Mínimo 8 caracteres" : "Tu contraseña"
                }
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                disabled={loading}
              />
            </div>
          )}

          {mode === "login" && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "-0.3rem",
                marginBottom: "0.8rem",
              }}
            >
              <button
                type="button"
                disabled={loading}
                onClick={() => changeMode("forgot")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#7ccf7c",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                }}
              >
                ¿Olvidó su contraseña?
              </button>
            </div>
          )}

          {mode === "signup" && (
            <div className="auth-field">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                placeholder="Repite la contraseña"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="auth-error" style={{ marginTop: "0.5rem" }}>
              {error}
            </div>
          )}

          {success && (
            <div
              className="auth-error"
              style={{
                marginTop: "0.5rem",
                borderColor: "rgba(124, 207, 124, 0.35)",
                background: "rgba(124, 207, 124, 0.12)",
                color: "#b8f5b8",
              }}
            >
              {success}
            </div>
          )}

          <button type="submit" className="auth-primary-btn" disabled={!canSubmit}>
            {loading
              ? mode === "login"
                ? "Entrando..."
                : mode === "signup"
                ? "Creando cuenta..."
                : "Enviando..."
              : mode === "login"
              ? "Entrar"
              : mode === "signup"
              ? "Crear cuenta y entrar"
              : "Enviar instrucciones"}
          </button>
        </form>

        <div className="auth-switch-mode">
          {mode === "login" ? (
            <>
              <span>¿Aún no tienes cuenta?</span>
              <button
                type="button"
                disabled={loading}
                onClick={() => changeMode("signup")}
              >
                Crear cuenta
              </button>
            </>
          ) : mode === "signup" ? (
            <>
              <span>¿Ya tienes cuenta?</span>
              <button
                type="button"
                disabled={loading}
                onClick={() => changeMode("login")}
              >
                Iniciar sesión
              </button>
            </>
          ) : (
            <>
              <span>¿Recordaste tu contraseña?</span>
              <button
                type="button"
                disabled={loading}
                onClick={() => changeMode("login")}
              >
                Volver al login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}