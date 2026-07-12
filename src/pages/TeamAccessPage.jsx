// src/pages/TeamAccessPage.jsx

import { useMemo, useState } from "react";
import "../styles/team-access.css";

const RAW_API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://agromind-backend-slem.onrender.com";

const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function TeamAccessPage({ token, farmId }) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const canInvite = useMemo(() => {
    const cleanEmail = normalizeEmail(email);
    return Boolean(token && farmId && isValidEmail(cleanEmail) && !submitting);
  }, [email, farmId, submitting, token]);

  const resetInviteForm = () => {
    setEmail("");
    setFeedback(null);
  };

  const openInvite = () => {
    resetInviteForm();
    setIsInviteOpen(true);
  };

  const closeInvite = () => {
    if (submitting) return;
    setIsInviteOpen(false);
    resetInviteForm();
  };

  const handleInvite = async (event) => {
    event.preventDefault();

    const cleanEmail = normalizeEmail(email);

    if (!farmId) {
      setFeedback({
        type: "error",
        message: "Selecciona una finca antes de invitar a un consultor.",
      });
      return;
    }

    if (!token) {
      setFeedback({
        type: "error",
        message: "Tu sesión no está disponible. Inicia sesión nuevamente.",
      });
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setFeedback({
        type: "error",
        message: "Escribe un correo electrónico válido.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/farms/${farmId}/invitations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: cleanEmail,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error || "No se pudo enviar la invitación."
        );
      }

      setFeedback({
        type: "success",
        message:
          data?.message ||
          "La invitación fue creada correctamente.",
      });

      setEmail("");
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error?.message || "No se pudo enviar la invitación.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="team-access-page">
      <section className="team-access-hero">
        <div>
          <p className="team-access-kicker">Colaboración segura</p>
          <h1>Equipo y acceso</h1>
          <p>
            Invita consultores para colaborar en esta finca sin compartir
            información financiera ni ceder el control administrativo.
          </p>
        </div>

        <button
          type="button"
          className="team-access-primary-btn"
          onClick={openInvite}
          disabled={!farmId}
        >
          Invitar consultor
        </button>
      </section>

      {!farmId && (
        <div className="team-access-alert team-access-alert-warning">
          Selecciona una finca para administrar su equipo.
        </div>
      )}

      <section className="team-access-grid">
        <article className="team-access-card">
          <div className="team-access-card-header">
            <div>
              <p className="team-access-card-label">Miembros</p>
              <h2>Personas con acceso</h2>
            </div>

            <span className="team-access-status-pill">Próximo paso</span>
          </div>

          <div className="team-access-empty-state">
            <div className="team-access-empty-icon" aria-hidden="true">
              👥
            </div>

            <h3>La finca está lista para colaborar</h3>

            <p>
              Aquí aparecerán los administradores y consultores cuando
              conectemos el listado de miembros del backend.
            </p>
          </div>
        </article>

        <article className="team-access-card">
          <div className="team-access-card-header">
            <div>
              <p className="team-access-card-label">Invitaciones</p>
              <h2>Solicitudes pendientes</h2>
            </div>

            <span className="team-access-status-pill">Próximo paso</span>
          </div>

          <div className="team-access-empty-state">
            <div className="team-access-empty-icon" aria-hidden="true">
              ✉️
            </div>

            <h3>Control de invitaciones</h3>

            <p>
              En esta sección podrás revisar y cancelar invitaciones
              pendientes cuando habilitemos sus endpoints de consulta.
            </p>
          </div>
        </article>
      </section>

      <section className="team-access-permissions">
        <div>
          <p className="team-access-card-label">Rol disponible</p>
          <h2>Consultor</h2>
        </div>

        <div className="team-access-permission-list">
          <div>
            <span className="team-access-permission-check">✓</span>
            <p>
              Puede ver el mapa, las zonas, los puntos, las líneas, las tareas
              y el clima.
            </p>
          </div>

          <div>
            <span className="team-access-permission-check">✓</span>
            <p>
              Puede consultar procesos y registrar su actividad cuando
              habilitemos su bitácora personal.
            </p>
          </div>

          <div>
            <span className="team-access-permission-block">×</span>
            <p>
              No puede editar el mapa, administrar procesos, ver finanzas,
              reportes ni configuración.
            </p>
          </div>
        </div>
      </section>

      {isInviteOpen && (
        <div
          className="team-access-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeInvite();
          }}
        >
          <section
            className="team-access-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-access-modal-title"
          >
            <button
              type="button"
              className="team-access-modal-close"
              onClick={closeInvite}
              disabled={submitting}
              aria-label="Cerrar"
            >
              ×
            </button>

            <div className="team-access-modal-heading">
              <p className="team-access-kicker">Nueva colaboración</p>
              <h2 id="team-access-modal-title">Invitar consultor</h2>
              <p>
                Confirma el alcance del acceso antes de enviar la invitación.
              </p>
            </div>

            <form onSubmit={handleInvite} className="team-access-form">
              <div className="team-access-invite-role-card">
                <div className="team-access-invite-role-header">
                  <div>
                    <span className="team-access-invite-role-label">
                      Rol asignado
                    </span>
                    <h3>Consultor</h3>
                  </div>

                  <span className="team-access-invite-role-badge">
                    Solo lectura
                  </span>
                </div>

                <p className="team-access-invite-role-description">
                  Tendrá acceso operativo de consulta, sin permisos para
                  modificar la finca ni visualizar información sensible.
                </p>
              </div>

              <div className="team-access-invite-permissions">
                <div className="team-access-invite-permission-group">
                  <p className="team-access-invite-permission-title">
                    Puede acceder
                  </p>

                  <div className="team-access-invite-permission-items">
                    <div>
                      <span className="team-access-permission-check">✓</span>
                      <p>Mapa, zonas, puntos y líneas.</p>
                    </div>

                    <div>
                      <span className="team-access-permission-check">✓</span>
                      <p>Tareas, procesos y clima.</p>
                    </div>

                    <div>
                      <span className="team-access-permission-check">✓</span>
                      <p>Información asignada a su trabajo.</p>
                    </div>
                  </div>
                </div>

                <div className="team-access-invite-permission-group">
                  <p className="team-access-invite-permission-title">
                    Acceso restringido
                  </p>

                  <div className="team-access-invite-permission-items">
                    <div>
                      <span className="team-access-permission-block">×</span>
                      <p>Edición o eliminación del mapa.</p>
                    </div>

                    <div>
                      <span className="team-access-permission-block">×</span>
                      <p>Finanzas, reportes y dashboard.</p>
                    </div>

                    <div>
                      <span className="team-access-permission-block">×</span>
                      <p>Configuración y administración de accesos.</p>
                    </div>
                  </div>
                </div>
              </div>

              <label htmlFor="consultant-email">
                Correo electrónico
              </label>

              <input
                id="consultant-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (feedback) setFeedback(null);
                }}
                placeholder="consultor@correo.com"
                autoComplete="email"
                autoFocus
                disabled={submitting}
              />

              <p className="team-access-form-helper">
                La persona recibirá una invitación para aceptar el acceso como
                consultor de esta finca.
              </p>

              {feedback && (
                <div
                  className={`team-access-alert ${
                    feedback.type === "success"
                      ? "team-access-alert-success"
                      : "team-access-alert-error"
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              <div className="team-access-modal-actions">
                <button
                  type="button"
                  className="team-access-secondary-btn"
                  onClick={closeInvite}
                  disabled={submitting}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="team-access-primary-btn"
                  disabled={!canInvite}
                >
                  {submitting ? "Enviando..." : "Enviar invitación"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
