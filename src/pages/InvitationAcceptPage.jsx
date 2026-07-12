// src/pages/InvitationAcceptPage.jsx

import { useEffect, useState } from "react";

const INVITATION_TOKEN_KEY = "agromind_invitation_token";
const INVITATION_MODE_KEY = "agromind_invitation_mode";

export default function InvitationAcceptPage() {
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState(
    "Estamos preparando tu acceso como consultor."
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = String(params.get("token") || "").trim();

    if (!token) {
      setStatus("error");
      setMessage("La invitación no contiene un token válido.");
      return;
    }

    try {
      sessionStorage.setItem(INVITATION_TOKEN_KEY, token);
      sessionStorage.setItem(INVITATION_MODE_KEY, "signup");

      setStatus("success");
      setMessage("Invitación validada. Redirigiendo al registro...");

      const redirectTimeout = window.setTimeout(() => {
        window.location.replace("/");
      }, 700);

      return () => {
        window.clearTimeout(redirectTimeout);
      };
    } catch {
      setStatus("error");
      setMessage(
        "No se pudo guardar la invitación en este navegador. Inténtalo nuevamente."
      );
    }
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
          "radial-gradient(circle at top right, rgba(20, 184, 166, 0.16), transparent 34%), linear-gradient(180deg, #0f172a, #020617)",
        color: "#e2e8f0",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <section
        style={{
          width: "min(100%, 520px)",
          padding: "clamp(1.5rem, 5vw, 2.4rem)",
          border: "1px solid rgba(45, 212, 191, 0.24)",
          borderRadius: "1.3rem",
          background: "rgba(15, 23, 42, 0.94)",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.42)",
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
                ? "rgba(239, 68, 68, 0.14)"
                : "rgba(20, 184, 166, 0.14)",
            color: status === "error" ? "#fca5a5" : "#5eead4",
            fontSize: "1.45rem",
            fontWeight: 900,
          }}
        >
          {status === "error" ? "×" : "✓"}
        </div>

        <p
          style={{
            margin: "0 0 0.45rem",
            color: "#5eead4",
            fontSize: "0.74rem",
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          AgroMind CR
        </p>

        <h1
          style={{
            margin: 0,
            color: "#f8fafc",
            fontSize: "clamp(1.55rem, 5vw, 2.15rem)",
            lineHeight: 1.15,
          }}
        >
          {status === "error"
            ? "Invitación no disponible"
            : "Acceso de consultor"}
        </h1>

        <p
          style={{
            margin: "1rem auto 0",
            maxWidth: "40ch",
            color: "#94a3b8",
            lineHeight: 1.7,
          }}
        >
          {message}
        </p>

        {status === "processing" && (
          <div
            aria-label="Procesando invitación"
            style={{
              width: 34,
              height: 34,
              margin: "1.4rem auto 0",
              border: "3px solid rgba(148, 163, 184, 0.22)",
              borderTopColor: "#2dd4bf",
              borderRadius: "999px",
              animation: "agromindInvitationSpin 0.8s linear infinite",
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
              padding: "0.75rem 1.2rem",
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

      <style>
        {`
          @keyframes agromindInvitationSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}
