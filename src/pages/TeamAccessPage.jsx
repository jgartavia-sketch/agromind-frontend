// src/pages/TeamAccessPage.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
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

function formatDate(value) {
  if (!value) return "Fecha no disponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getInvitedByName(invitation) {
  return (
    invitation?.invitedBy?.name ||
    invitation?.invitedBy?.email ||
    "Usuario AgroMind"
  );
}

export default function TeamAccessPage({ token, farmId }) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [members, setMembers] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [acceptedInvitations, setAcceptedInvitations] = useState([]);
  const [actionId, setActionId] = useState("");

  const canInvite = useMemo(() => {
    const cleanEmail = normalizeEmail(email);
    return Boolean(token && farmId && isValidEmail(cleanEmail) && !submitting);
  }, [email, farmId, submitting, token]);

  const loadTeam = useCallback(async () => {
    if (!token || !farmId) {
      setMembers([]);
      setPendingInvitations([]);
      setAcceptedInvitations([]);
      setTeamError("");
      return;
    }

    setTeamLoading(true);
    setTeamError("");

    try {
      const response = await fetch(`${API_BASE}/api/farms/${farmId}/team`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "No se pudo cargar el equipo.");
      }

      setMembers(Array.isArray(data?.members) ? data.members : []);
      setPendingInvitations(
        Array.isArray(data?.pendingInvitations)
          ? data.pendingInvitations
          : []
      );
      setAcceptedInvitations(
        Array.isArray(data?.acceptedInvitations)
          ? data.acceptedInvitations
          : []
      );
    } catch (error) {
      setTeamError(error?.message || "No se pudo cargar el equipo.");
    } finally {
      setTeamLoading(false);
    }
  }, [farmId, token]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const handleCancelInvitation = async (invitationId) => {
    if (!invitationId || actionId) return;

    setActionId(invitationId);
    setTeamError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/farms/${farmId}/invitations/${invitationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error || "No se pudo cancelar la invitación."
        );
      }

      await loadTeam();
    } catch (error) {
      setTeamError(
        error?.message || "No se pudo cancelar la invitación."
      );
    } finally {
      setActionId("");
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!memberId || actionId) return;

    setActionId(memberId);
    setTeamError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/farms/${farmId}/members/${memberId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "No se pudo eliminar el acceso.");
      }

      await loadTeam();
    } catch (error) {
      setTeamError(error?.message || "No se pudo eliminar el acceso.");
    } finally {
      setActionId("");
    }
  };

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
      await loadTeam();
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

      {teamError && (
        <div className="team-access-alert team-access-alert-error">
          {teamError}
        </div>
      )}

      <section className="team-access-grid">
        <article className="team-access-card">
          <div className="team-access-card-header">
            <div>
              <p className="team-access-card-label">Miembros</p>
              <h2>Personas con acceso</h2>
            </div>

            <span className="team-access-status-pill">
              {members.length}
            </span>
          </div>

          {teamLoading ? (
            <div className="team-access-empty-state">
              <h3>Cargando equipo...</h3>
            </div>
          ) : members.length === 0 ? (
            <div className="team-access-empty-state">
              <div className="team-access-empty-icon" aria-hidden="true">
                👥
              </div>
              <h3>No hay miembros activos</h3>
            </div>
          ) : (
            <div className="team-access-member-list">
              {members.map((member) => (
                <div key={member.id} className="team-access-member-row">
                  <div>
                    <strong>{member.name || member.email}</strong>
                    <p>{member.email}</p>
                    <p>Acceso desde {formatDate(member.joinedAt)}</p>
                  </div>

                  <div className="team-access-member-actions">
                    <span className="team-access-status-pill">
                      {member.role === "ADMIN" ? "Administrador" : "Consultor"}
                    </span>

                    {member.role !== "ADMIN" && (
                      <button
                        type="button"
                        className="team-access-secondary-btn"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={actionId === member.id}
                      >
                        {actionId === member.id
                          ? "Eliminando..."
                          : "Eliminar acceso"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="team-access-card">
          <div className="team-access-card-header">
            <div>
              <p className="team-access-card-label">Invitaciones</p>
              <h2>Solicitudes pendientes</h2>
            </div>

            <span className="team-access-status-pill">
              {pendingInvitations.length}
            </span>
          </div>

          {teamLoading ? (
            <div className="team-access-empty-state">
              <h3>Cargando invitaciones...</h3>
            </div>
          ) : pendingInvitations.length === 0 ? (
            <div className="team-access-empty-state">
              <div className="team-access-empty-icon" aria-hidden="true">
                ✉️
              </div>
              <h3>No hay invitaciones pendientes</h3>
            </div>
          ) : (
            <div className="team-access-member-list">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="team-access-member-row"
                >
                  <div>
                    <strong>{invitation.email}</strong>
                    <p>Consultor · Pendiente</p>
                    <p>Invitado por {getInvitedByName(invitation)}</p>
                    <p>Enviada el {formatDate(invitation.createdAt)}</p>
                  </div>

                  <button
                    type="button"
                    className="team-access-secondary-btn"
                    onClick={() =>
                      handleCancelInvitation(invitation.id)
                    }
                    disabled={actionId === invitation.id}
                  >
                    {actionId === invitation.id
                      ? "Cancelando..."
                      : "Cancelar invitación"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {acceptedInvitations.length > 0 && (
        <section className="team-access-card">
          <div className="team-access-card-header">
            <div>
              <p className="team-access-card-label">Actividad</p>
              <h2>Invitaciones aceptadas</h2>
            </div>

            <span className="team-access-status-pill">
              {acceptedInvitations.length}
            </span>
          </div>

          <div className="team-access-member-list">
            {acceptedInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="team-access-member-row"
              >
                <div>
                  <strong>{invitation.email}</strong>
                  <p>Consultor</p>
                  <p>Invitado por {getInvitedByName(invitation)}</p>
                  <p>Aceptada el {formatDate(invitation.acceptedAt)}</p>
                </div>

                <span className="team-access-status-pill">
                  Aceptada
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

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
