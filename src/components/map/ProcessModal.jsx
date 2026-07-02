import React from "react";

function nowIso() {
  return new Date().toISOString();
}

function formatProcessDate(date) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("es-CR");
  } catch {
    return "—";
  }
}

function addDaysToYYYYMMDD(startDate, durationDays) {
  if (!startDate) return "";
  const days = Number(durationDays);
  if (!Number.isFinite(days) || days < 0) return "";

  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDurationDays(startDate, dueDate) {
  if (!startDate || !dueDate) return "—";

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${dueDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";

  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return diff >= 0 ? String(diff) : "—";
}

function getEmptyStepDraft() {
  return {
    name: "",
    startDate: "",
    durationDays: "",
    notes: "",
  };
}

function getProgressFromSteps(steps = []) {
  const total = Array.isArray(steps) ? steps.length : 0;
  if (total === 0) return 0;
  const completed = steps.filter((s) => s?.status === "Completada").length;
  return Math.round((completed / total) * 100);
}

function getPriorityPillStyle(priority) {
  const v = String(priority || "Media").toLowerCase();

  if (v === "alta") {
    return {
      border: "1px solid rgba(248,113,113,0.28)",
      background: "rgba(248,113,113,0.10)",
      color: "#fecaca",
    };
  }

  if (v === "baja") {
    return {
      border: "1px solid rgba(96,165,250,0.28)",
      background: "rgba(96,165,250,0.10)",
      color: "#bfdbfe",
    };
  }

  return {
    border: "1px solid rgba(250,204,21,0.28)",
    background: "rgba(250,204,21,0.10)",
    color: "#fde68a",
  };
}

function getStatusPillStyle(status) {
  const v = String(status || "").toLowerCase();

  if (v === "completado" || v === "completada") {
    return {
      border: "1px solid rgba(34,197,94,0.28)",
      background: "rgba(34,197,94,0.10)",
      color: "#bbf7d0",
    };
  }

  if (v === "bloqueado" || v === "bloqueada") {
    return {
      border: "1px solid rgba(248,113,113,0.28)",
      background: "rgba(248,113,113,0.10)",
      color: "#fecaca",
    };
  }

  if (v === "en progreso" || v === "activo") {
    return {
      border: "1px solid rgba(56,189,248,0.28)",
      background: "rgba(56,189,248,0.10)",
      color: "#bae6fd",
    };
  }

  if (v === "pausado") {
    return {
      border: "1px solid rgba(148,163,184,0.28)",
      background: "rgba(148,163,184,0.10)",
      color: "#cbd5e1",
    };
  }

  return {
    border: "1px solid rgba(250,204,21,0.28)",
    background: "rgba(250,204,21,0.10)",
    color: "#fde68a",
  };
}

const PROCESS_PRIORITIES = ["Baja", "Media", "Alta"];

export default function ProcessModal({
  modalZone,
  modalZoneProcesses = [],
  processesLoading = false,
  processesError = "",
  processActionLoading = false,

  showCreateProcessForm = false,
  setShowCreateProcessForm,

  newProcessName = "",
  setNewProcessName,
  newProcessDescription = "",
  setNewProcessDescription,
  newProcessOwner = "",
  setNewProcessOwner,
  newProcessPriority = "Media",
  setNewProcessPriority,
  setNewProcessStartDate,
  setNewProcessTargetDate,

  newStepByProcess = {},
  openStepFormByProcess = {},
  setOpenStepFormByProcess,

  setProcessesError,
  updateStepDraftField,

  createProcessForZone,
  createStepForProcess,
  toggleStepCompletion,
  updateProcessStatus,
  deleteProcess,
  closeComponentsModal,
}) {
  if (!modalZone) return null;

  return (
    <div
      id="zone-processes-section"
      style={{
        marginBottom: "16px",
        padding: "14px",
        borderRadius: "16px",
        border: "1px solid rgba(56,189,248,0.18)",
        background:
          "linear-gradient(160deg, rgba(9,18,39,0.9), rgba(2,6,23,0.98))",
        boxShadow: "0 12px 26px rgba(0,0,0,0.22)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "10px",
        }}
      >
        <div>
          <h4 style={{ margin: 0, color: "#e5e7eb", fontSize: "1rem" }}>
            AgroMind Process Studio
          </h4>
          <p
            style={{
              margin: "4px 0 0",
              color: "rgba(226,232,240,0.72)",
              fontSize: "0.84rem",
            }}
          >
            Zona: {modalZone.name}
          </p>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            setShowCreateProcessForm((prev) => !prev);
            setProcessesError("");
          }}
          disabled={processActionLoading}
        >
          {showCreateProcessForm ? "Cancelar" : "Nuevo proceso"}
        </button>
      </div>

      {showCreateProcessForm && (
        <div
          style={{
            marginBottom: "12px",
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid rgba(148,163,184,0.16)",
            background: "rgba(2,6,23,0.42)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "10px",
          }}
        >
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: "6px", color: "#cbd5e1", fontSize: "0.82rem" }}>
              Nombre del proceso
            </label>
            <input
              className="farm-feature-input"
              value={newProcessName}
              onChange={(e) => setNewProcessName(e.target.value)}
              placeholder="Ej: Producción de tierra abonada"
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: "6px", color: "#cbd5e1", fontSize: "0.82rem" }}>
              Descripción breve
            </label>
            <textarea
              className="farm-feature-textarea"
              value={newProcessDescription}
              onChange={(e) => setNewProcessDescription(e.target.value)}
              placeholder="Qué se busca lograr en esta zona"
              rows={3}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", color: "#cbd5e1", fontSize: "0.82rem" }}>
              Responsable
            </label>
            <input
              className="farm-feature-input"
              value={newProcessOwner}
              onChange={(e) => setNewProcessOwner(e.target.value)}
              placeholder="Ej: José"
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", color: "#cbd5e1", fontSize: "0.82rem" }}>
              Prioridad
            </label>
            <select
              className="component-type-select"
              value={newProcessPriority}
              onChange={(e) => setNewProcessPriority(e.target.value)}
            >
              {PROCESS_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              marginTop: "4px",
            }}
          >
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setShowCreateProcessForm(false);
                setNewProcessName("");
                setNewProcessDescription("");
                setNewProcessOwner("");
                setNewProcessPriority("Media");
                setNewProcessStartDate("");
                setNewProcessTargetDate("");
                setProcessesError("");
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={createProcessForZone}
              disabled={processActionLoading}
            >
              {processActionLoading ? "Guardando..." : "Guardar proceso"}
            </button>
          </div>
        </div>
      )}

      {processesError ? (
        <div style={{ marginBottom: "10px", color: "#fca5a5", fontSize: "0.88rem" }}>
          {processesError}
        </div>
      ) : null}

      {processesLoading ? (
        <div
          style={{
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid rgba(148,163,184,0.16)",
            background: "rgba(2,6,23,0.45)",
            color: "#cbd5e1",
            fontSize: "0.9rem",
          }}
        >
          Cargando procesos...
        </div>
      ) : modalZoneProcesses.length === 0 ? (
        <div
          style={{
            padding: "12px",
            borderRadius: "12px",
            border: "1px dashed rgba(148,163,184,0.22)",
            background: "rgba(2,6,23,0.35)",
            color: "rgba(226,232,240,0.72)",
            fontSize: "0.9rem",
          }}
        >
          Esta zona aún no tiene procesos. Crea el primero y aquí comenzará el motor operativo de AgroMind.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {modalZoneProcesses.map((process) => {
            const steps = Array.isArray(process.steps) ? process.steps : [];
            const progress = getProgressFromSteps(steps);
            const draft = {
              ...getEmptyStepDraft(),
              ...(newStepByProcess[process.id] || {}),
            };
            const nextStepNumber = steps.length + 1;
            const draftDueDate = addDaysToYYYYMMDD(
              draft.startDate,
              draft.durationDays
            );
            const isStepFormOpen = openStepFormByProcess[process.id] === true;

            return (
              <div
                key={process.id}
                style={{
                  borderRadius: "14px",
                  border: "1px solid rgba(148,163,184,0.16)",
                  background:
                    "linear-gradient(180deg, rgba(15,23,42,0.82), rgba(5,10,22,0.95))",
                  padding: "12px",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <strong style={{ color: "#e5e7eb", fontSize: "0.98rem" }}>
                      {process.name}
                    </strong>

                    <span style={{ display: "inline-flex", alignItems: "center", padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", ...getStatusPillStyle(process.status || "Borrador") }}>
                      {process.status || "Borrador"}
                    </span>

                    <span style={{ display: "inline-flex", alignItems: "center", padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", ...getPriorityPillStyle(process.priority || "Media") }}>
                      Prioridad {process.priority || "Media"}
                    </span>

                    <span style={{ display: "inline-flex", alignItems: "center", padding: "0.18rem 0.55rem", borderRadius: "999px", border: "1px solid rgba(148,163,184,0.18)", background: "rgba(15,23,42,0.6)", color: "#cbd5e1", fontSize: "0.72rem" }}>
                      {steps.length} etapa{steps.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {process.description ? (
                    <p style={{ margin: "0 0 8px", color: "rgba(226,232,240,0.78)", fontSize: "0.85rem" }}>
                      {process.description}
                    </p>
                  ) : null}

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", color: "rgba(148,163,184,0.9)", fontSize: "0.76rem", marginBottom: "10px" }}>
                    <span>Tipo: {process.type || "General"}</span>
                    <span>Responsable: {process.owner || "—"}</span>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.76rem", color: "#cbd5e1" }}>
                      <span>Avance · {steps.filter((s) => s?.status === "Completada").length}/{steps.length} etapas</span>
                      <span>{progress}%</span>
                    </div>
                    <div style={{ width: "100%", height: "8px", borderRadius: "999px", background: "rgba(148,163,184,0.18)", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${progress}%`,
                          height: "100%",
                          background:
                            "linear-gradient(90deg, rgba(34,197,94,0.9), rgba(56,189,248,0.9))",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "10px" }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={processActionLoading || process.status === "Activo"}
                      onClick={() => updateProcessStatus(process, "Activo")}
                    >
                      Activar
                    </button>

                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={processActionLoading || process.status === "Completado"}
                      onClick={() => updateProcessStatus(process, "Completado")}
                    >
                      Completar
                    </button>

                    <button
                      type="button"
                      className="danger-link"
                      onClick={() => deleteProcess(process)}
                      disabled={processActionLoading}
                    >
                      Borrar proceso
                    </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => {
                        setOpenStepFormByProcess((prev) => ({
                          ...prev,
                          [process.id]: !prev[process.id],
                        }));
                        setProcessesError("");
                      }}
                      disabled={processActionLoading}
                    >
                      {isStepFormOpen ? "Cerrar etapa" : "Nueva etapa"}
                    </button>
                  </div>

                  {isStepFormOpen && (
                    <div
                      style={{
                        padding: "12px",
                        borderRadius: "12px",
                        border: "1px solid rgba(148,163,184,0.16)",
                        background: "rgba(2,6,23,0.34)",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "10px",
                        marginBottom: steps.length > 0 ? "12px" : "10px",
                      }}
                    >
                      <div>
                        <label style={{ display: "block", marginBottom: "6px", color: "#cbd5e1", fontSize: "0.82rem" }}>
                          Etapa
                        </label>
                        <input
                          className="farm-feature-input"
                          value={draft.name || `Etapa ${nextStepNumber}`}
                          onChange={(e) =>
                            updateStepDraftField(process.id, "name", e.target.value)
                          }
                          placeholder={`Etapa ${nextStepNumber}`}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: "6px", color: "#cbd5e1", fontSize: "0.82rem" }}>
                          Fecha de inicio
                        </label>
                        <input
                          className="farm-feature-input"
                          type="date"
                          value={draft.startDate}
                          onChange={(e) =>
                            updateStepDraftField(process.id, "startDate", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: "6px", color: "#cbd5e1", fontSize: "0.82rem" }}>
                          Duración en días
                        </label>
                        <input
                          className="farm-feature-input"
                          type="number"
                          min="0"
                          step="1"
                          value={draft.durationDays}
                          onChange={(e) =>
                            updateStepDraftField(process.id, "durationDays", e.target.value)
                          }
                          placeholder="Ej: 7"
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: "6px", color: "#cbd5e1", fontSize: "0.82rem" }}>
                          Fecha final
                        </label>
                        <input
                          className="farm-feature-input"
                          value={draftDueDate || ""}
                          readOnly
                          placeholder="Se calcula automáticamente"
                        />
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ display: "block", marginBottom: "6px", color: "#cbd5e1", fontSize: "0.82rem" }}>
                          Notas
                        </label>
                        <textarea
                          className="farm-feature-textarea"
                          value={draft.notes}
                          onChange={(e) =>
                            updateStepDraftField(process.id, "notes", e.target.value)
                          }
                          placeholder="Notas de la etapa, observaciones o instrucciones"
                          rows={3}
                        />
                      </div>

                      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={() => createStepForProcess(process)}
                          disabled={processActionLoading}
                        >
                          {processActionLoading
                            ? "Agregando..."
                            : `Agregar etapa ${nextStepNumber}`}
                        </button>
                      </div>
                    </div>
                  )}

                  {steps.length > 0 && (
                    <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {steps.map((step) => {
                        const isCompleted = step.status === "Completada";

                        return (
                          <div
                            key={step.id}
                            style={{
                              padding: "10px",
                              borderRadius: "10px",
                              background: "rgba(2,6,23,0.4)",
                              border: "1px solid rgba(148,163,184,0.12)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", minWidth: 0, flex: 1 }}>
                                <button
                                  type="button"
                                  onClick={() => toggleStepCompletion(step)}
                                  disabled={processActionLoading}
                                  title={isCompleted ? "Reabrir etapa" : "Marcar como completada"}
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    minWidth: "28px",
                                    borderRadius: "999px",
                                    border: isCompleted
                                      ? "1px solid rgba(34,197,94,0.38)"
                                      : "1px solid rgba(148,163,184,0.28)",
                                    background: isCompleted
                                      ? "rgba(34,197,94,0.16)"
                                      : "rgba(15,23,42,0.9)",
                                    color: isCompleted ? "#bbf7d0" : "#94a3b8",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: processActionLoading ? "not-allowed" : "pointer",
                                    fontSize: "0.95rem",
                                    fontWeight: 700,
                                    lineHeight: 1,
                                    marginTop: "2px",
                                  }}
                                >
                                  {isCompleted ? "✓" : ""}
                                </button>

                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                    <span style={{ minWidth: "24px", height: "24px", borderRadius: "999px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(34,197,94,0.14)", color: "#bbf7d0", fontSize: "0.72rem", fontWeight: 700 }}>
                                      {step.stepOrder}
                                    </span>

                                    <div style={{ color: isCompleted ? "rgba(226,232,240,0.72)" : "#e5e7eb", fontSize: "0.84rem", fontWeight: 600, textDecoration: isCompleted ? "line-through" : "none" }}>
                                      {step.name}
                                    </div>

                                    <span style={{ display: "inline-flex", alignItems: "center", padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", ...getStatusPillStyle(step.status || "Pendiente") }}>
                                      {step.status || "Pendiente"}
                                    </span>

                                    <span style={{ display: "inline-flex", alignItems: "center", padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", ...getPriorityPillStyle(step.priority || "Media") }}>
                                      {step.priority || "Media"}
                                    </span>
                                  </div>

                                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", color: "rgba(148,163,184,0.88)", fontSize: "0.74rem", marginBottom: step.notes ? "6px" : "0" }}>
                                    <span>Responsable: {step.owner || "—"}</span>
                                    <span>Inicio: {formatProcessDate(step.startDate)}</span>
                                    <span>Días: {getDurationDays(step.startDate, step.dueDate)}</span>
                                    <span>Final: {formatProcessDate(step.dueDate)}</span>
                                    <span>Completada: {formatProcessDate(step.completedAt)}</span>
                                  </div>

                                  {step.notes ? (
                                    <div style={{ marginTop: "6px", color: "rgba(226,232,240,0.78)", fontSize: "0.78rem", whiteSpace: "pre-wrap" }}>
                                      {step.notes}
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                                <button
                                  type="button"
                                  className="secondary-btn"
                                  onClick={() => toggleStepCompletion(step)}
                                  disabled={processActionLoading}
                                >
                                  {isCompleted ? "Reabrir" : "Completar"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}