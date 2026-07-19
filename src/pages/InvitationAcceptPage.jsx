// src/pages/InvitationAcceptPage.jsx

import { useEffect, useState } from "react";

const INVITATION_TOKEN_KEY = "agromind_invitation_token";
const INVITATION_MODE_KEY = "agromind_invitation_mode";

const RAW_API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://agromind-backend-slem.onrender.com";

const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

function getAuthToken() {
  try {
    return String(
      localStorage.getItem("agromind_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("agromind_auth_token") ||
        ""
    ).trim();
  } catch {
    return "";
  }
}

function saveInvitationForAuth(token) {
  sessionStorage.setItem(INVITATION_TOKEN_KEY, token);
  sessionStorage.setItem(INVITATION_MODE_KEY, "signup");
}

function clearInvitationSession() {
  try {
    sessionStorage.removeItem(INVITATION_TOKEN_KEY);
    sessionStorage.removeItem(INVITATION_MODE_KEY);
  } catch {
    // La invitación ya fue aceptada; limpiar storage no debe bloquear el flujo.
  }
}

export default function InvitationAcceptPage() {
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState(
    "Estamos verificando tu invitación como consultor."
  );

  useEffect(() => {
    let cancelled = false;
    let redirectTimeout = null;

    async function processInvitation() {
      const params = new URLSearchParams(window.location.search);
      const invitationToken = String(params.get("token") || "").trim();

      if (!invitationToken) {
        setStatus("error");
        setMessage("La invitación no contiene un token válido.");
        return;
      }

      const authToken = getAuthToken();

      if (!authToken) {
        try {
          saveInvitationForAuth(invitationToken);
          setStatus("success");
          setMessage("Invitación recibida. Redirigiendo para crear o iniciar tu cuenta...");

          redirectTimeout = window.setTimeout(() => {
            window.location.replace("/");
          }, 900);
        } catch {
          setStatus("error");
          setMessage(
            "No se pudo guardar la invitación en este navegador. Inténtalo nuevamente."
          );
        }
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/farms/invitations/accept`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ invitationToken }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.error || "No se pudo aceptar la invitación.");
        }

        if (cancelled) return;

        clearInvitationSession();
        setStatus("success");
        setMessage("Invitación aceptada. La finca ya fue agregada a tu cuenta.");

        redirectTimeout = window.setTimeout(() => {
          window.location.replace("/select-farm");
        }, 1200);
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(error?.message || "No se pudo aceptar la invitación.");
      }
    }

    processInvitation();

    return () => {
      cancelled = true;
      if (redirectTimeout) window.clearTimeout(redirectTimeout);
    };
  }, []);

  const handleReturnHome = () => {
    window.location.replace("/");
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "1rem",
        background:
          "radial-gradient(circle at top right, rgba(20,184,166,.16), transparent 34%), linear-gradient(180deg, #0f172a, #020617)",
        color: "#e2e8f0",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <section
        style={{
          width: "min(100%, 520px)",
          padding: "clamp(1.5rem, 5vw, 2.4rem)",
          border: "1px solid rgba(45,212,191,.24)",
          borderRadius: "1.3rem",
          background: "rgba(15,23,42,.94)",
          boxShadow: "0 30px 80px rgba(0,0,0,.42)",
          textAlign: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 58,
            height: 58,
            display: "grid",
            placeItems: "center",
            margin: "0 auto 1rem",
            borderRadius: "999px",
            background:
              status === "error"
                ? "rgba(239,68,68,.14)"
                : "rgba(20,184,166,.14)",
            color: status === "error" ? "#fca5a5" : "#5eead4",
            fontSize: "1.45rem",
            fontWeight: 900,
          }}
        >
          {status === "processing" ? "·" : status === "error" ? "×" : "✓"}
        </div>

        <p
          style={{
            margin: "0 0 .45rem",
            color: "#5eead4",
            fontSize: ".74rem",
            fontWeight: 800,
            letterSpacing: ".12em",
            textTransform: "uppercase",
          }}
        >
          AgroMind CR
        </p>

        <h1 style={{ margin: 0, color: "#f8fafc", fontSize: "clamp(1.55rem, 5vw, 2.15rem)" }}>
          {status === "error" ? "Invitación no disponible" : "Acceso de consultor"}
        </h1>

        <p style={{ margin: "1rem auto 0", maxWidth: "42ch", color: "#94a3b8", lineHeight: 1.7 }}>
          {message}
        </p>

        {status === "processing" && (
          <div
            aria-label="Procesando invitación"
            style={{
              width: 34,
              height: 34,
              margin: "1.4rem auto 0",
              border: "3px solid rgba(148,163,184,.22)",
              borderTopColor: "#2dd4bf",
              borderRadius: "999px",
              animation: "agromindInvitationSpin .8s linear infinite",
            }}
          />
        )}

        {status === "error" && (
          <button
            type="button"
            onClick={handleReturnHome}
            style={{
              marginTop: "1.4rem",
              minHeight: 46,
              padding: ".75rem 1.2rem",
              border: "1px solid #2dd4bf",
              borderRadius: "999px",
              background: "linear-gradient(135deg, #2dd4bf, #14b8a6)",
              color: "#042f2e",
              font: "inherit",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Volver a AgroMind
          </button>
        )}
      </section>

      <style>{`@keyframes agromindInvitationSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
