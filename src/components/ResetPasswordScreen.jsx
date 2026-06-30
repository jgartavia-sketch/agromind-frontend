import { useMemo, useState } from "react";
import "../styles/farm-auth.css";

export default function ResetPasswordScreen({ apiBase }) {
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = useMemo(() => {
    return new URLSearchParams(window.location.search).get("token") || "";
  }, []);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (!token) return false;
    if (pass.trim().length < 8) return false;
    if (pass.trim() !== pass2.trim()) return false;
    return true;
  }, [token, pass, pass2, loading]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("El enlace de recuperación no es válido.");
      return;
    }

    const password = pass.trim();
    const password2 = pass2.trim();

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetchWithTimeout(`${apiBase}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || "No se pudo actualizar la contraseña.");
        setLoading(false);
        return;
      }

      setPass("");
      setPass2("");
      setSuccess("Contraseña actualizada correctamente. Ya puedes iniciar sesión.");
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

  const goToLogin = () => {
    window.location.href = "/";
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
          <h1>Nueva contraseña</h1>
          <p>Define una nueva contraseña para recuperar el acceso.</p>
        </div>

        <form className="agromind-auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Nueva contraseña</label>
            <input
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="new-password"
              disabled={loading || success}
            />
          </div>

          <div className="auth-field">
            <label>Confirmar contraseña</label>
            <input
              type="password"
              placeholder="Repite la contraseña"
              value={pass2}
              onChange={(e) => setPass2(e.target.value)}
              autoComplete="new-password"
              disabled={loading || success}
            />
          </div>

          {!token && (
            <div className="auth-error" style={{ marginTop: "0.5rem" }}>
              El enlace de recuperación no es válido.
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

          {!success ? (
            <button
              type="submit"
              className="auth-primary-btn"
              disabled={!canSubmit}
            >
              {loading ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          ) : (
            <button
              type="button"
              className="auth-primary-btn"
              onClick={goToLogin}
            >
              Ir al login
            </button>
          )}
        </form>

        <div className="auth-switch-mode">
          <span>¿Recordaste tu contraseña?</span>
          <button type="button" disabled={loading} onClick={goToLogin}>
            Volver al login
          </button>
        </div>
      </div>
    </div>
  );
}