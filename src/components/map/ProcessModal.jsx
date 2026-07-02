import React, { useEffect, useMemo, useState } from "react";

function nowIso() {
  return new Date().toISOString();
}

function todayYYYYMMDD() {
  return new Date().toISOString().slice(0, 10);
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

function addOneDayYYYYMMDD(dateValue) {
  if (!dateValue) return todayYYYYMMDD();

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return todayYYYYMMDD();

  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getNextStepStartDate(steps = []) {
  if (!Array.isArray(steps) || steps.length === 0) return todayYYYYMMDD();

  const sortedSteps = [...steps].sort((a, b) => {
    const ao = Number(a?.stepOrder || 0);
    const bo = Number(b?.stepOrder || 0);
    return ao - bo;
  });
  const lastStep = sortedSteps[sortedSteps.length - 1];

  return addOneDayYYYYMMDD(lastStep?.dueDate || lastStep?.targetDate || lastStep?.endDate);
}

function getStepDraftForProcess(process) {
  const steps = Array.isArray(process?.steps) ? process.steps : [];
  const nextStepNumber = steps.length + 1;

  return {
    localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `Etapa ${nextStepNumber}`,
    startDate: getNextStepStartDate(steps),
    durationDays: "7",
    notes: "",
  };
}

function getDurationDays(startDate, dueDate) {
  if (!startDate || !dueDate) return "—";

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${dueDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";

  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return diff >= 0 ? String(diff) : "—";
}

function getEmptyStepDraft(order = 1) {
  return {
    localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `Etapa ${order}`,
    startDate: todayYYYYMMDD(),
    durationDays: "7",
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
      border: "1px solid rgba(248,113,113,0.34)",
      background: "rgba(248,113,113,0.12)",
      color: "#fecaca",
    };
  }

  if (v === "baja") {
    return {
      border: "1px solid rgba(96,165,250,0.34)",
      background: "rgba(96,165,250,0.12)",
      color: "#bfdbfe",
    };
  }

  return {
    border: "1px solid rgba(250,204,21,0.34)",
    background: "rgba(250,204,21,0.12)",
    color: "#fde68a",
  };
}

function getStatusPillStyle(status) {
  const v = String(status || "").toLowerCase();

  if (v === "completado" || v === "completada") {
    return {
      border: "1px solid rgba(34,197,94,0.34)",
      background: "rgba(34,197,94,0.12)",
      color: "#bbf7d0",
    };
  }

  if (v === "bloqueado" || v === "bloqueada") {
    return {
      border: "1px solid rgba(248,113,113,0.34)",
      background: "rgba(248,113,113,0.12)",
      color: "#fecaca",
    };
  }

  if (v === "en progreso" || v === "activo") {
    return {
      border: "1px solid rgba(56,189,248,0.34)",
      background: "rgba(56,189,248,0.12)",
      color: "#bae6fd",
    };
  }

  if (v === "pausado") {
    return {
      border: "1px solid rgba(148,163,184,0.34)",
      background: "rgba(148,163,184,0.12)",
      color: "#cbd5e1",
    };
  }

  return {
    border: "1px solid rgba(250,204,21,0.34)",
    background: "rgba(250,204,21,0.12)",
    color: "#fde68a",
  };
}

const PROCESS_PRIORITIES = ["Baja", "Media", "Alta"];

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#cbd5e1",
  fontSize: "0.78rem",
  fontWeight: 700,
};

const tinyPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0.18rem 0.55rem",
  borderRadius: "999px",
  fontSize: "0.72rem",
  fontWeight: 700,
};

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
}) {
  const [draftSteps, setDraftSteps] = useState([getEmptyStepDraft(1)]);
  const [searchText, setSearchText] = useState("");

  const shouldShowBuilder = showCreateProcessForm || modalZoneProcesses.length === 0;

  useEffect(() => {
    if (!modalZone?.id) return;
    if (!newProcessName && modalZoneProcesses.length === 0) {
      setNewProcessName("");
      setNewProcessDescription("");
      setNewProcessOwner("");
      setNewProcessPriority("Media");
      setNewProcessStartDate("");
      setNewProcessTargetDate("");
      setDraftSteps([getEmptyStepDraft(1)]);
    }
  }, [modalZone?.id]);

  const processStats = useMemo(() => {
    const total = modalZoneProcesses.length;
    const active = modalZoneProcesses.filter((p) => p.status === "Activo").length;
    const completed = modalZoneProcesses.filter((p) => p.status === "Completado").length;
    const pending = modalZoneProcesses.filter((p) => !p.status || p.status === "Pendiente").length;
    return { total, active, completed, pending };
  }, [modalZoneProcesses]);

  const filteredProcesses = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return modalZoneProcesses;
    return modalZoneProcesses.filter((process) => {
      return [process.name, process.description, process.owner, process.status, process.priority]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [modalZoneProcesses, searchText]);

  if (!modalZone) return null;

  const resetBuilder = () => {
    setShowCreateProcessForm(false);
    setNewProcessName("");
    setNewProcessDescription("");
    setNewProcessOwner("");
    setNewProcessPriority("Media");
    setNewProcessStartDate("");
    setNewProcessTargetDate("");
    setDraftSteps([getEmptyStepDraft(1)]);
    setProcessesError("");
  };

  const addDraftStep = () => {
    setDraftSteps((prev) => {
      const lastStep = prev[prev.length - 1];
      const lastDueDate = addDaysToYYYYMMDD(lastStep?.startDate, lastStep?.durationDays);
      return [
        ...prev,
        {
          ...getEmptyStepDraft(prev.length + 1),
          startDate: addOneDayYYYYMMDD(lastDueDate),
        },
      ];
    });
  };

  const updateDraftStep = (localId, field, value) => {
    setDraftSteps((prev) => {
      const updated = prev.map((step) =>
        step.localId === localId
          ? {
              ...step,
              [field]: value,
            }
          : step
      );

      if (field !== "startDate" && field !== "durationDays") return updated;

      return updated.map((step, index, allSteps) => {
        if (index === 0) return step;

        const previousStep = allSteps[index - 1];
        const previousDueDate = addDaysToYYYYMMDD(
          previousStep?.startDate,
          previousStep?.durationDays
        );

        return {
          ...step,
          startDate: addOneDayYYYYMMDD(previousDueDate),
        };
      });
    });
  };

  const removeDraftStep = (localId) => {
    setDraftSteps((prev) => {
      const next = prev.filter((step) => step.localId !== localId);
      return next.length > 0 ? next : [getEmptyStepDraft(1)];
    });
  };

  const saveProcessLab = async () => {
    const cleanSteps = draftSteps
      .map((step, index) => {
        const safeName = step.name?.trim() || `Etapa ${index + 1}`;
        const dueDate = addDaysToYYYYMMDD(step.startDate, step.durationDays);
        return {
          name: safeName,
          startDate: step.startDate,
          durationDays: step.durationDays,
          dueDate,
          notes: step.notes || "",
        };
      })
      .filter((step) => step.name || step.startDate || step.durationDays || step.notes);

    await createProcessForZone(
      {
        name: newProcessName,
        description: newProcessDescription,
        owner: newProcessOwner,
        priority: newProcessPriority,
        type: "General",
        status: "Activo",
      },
      cleanSteps
    );

    setDraftSteps([getEmptyStepDraft(1)]);
  };

  return (
    <div
      id="zone-processes-section"
      style={{
        marginBottom: "16px",
        padding: "14px",
        borderRadius: "18px",
        border: "1px solid rgba(34,197,94,0.18)",
        background:
          "radial-gradient(circle at top left, rgba(34,197,94,0.12), transparent 34%), linear-gradient(160deg, rgba(9,18,39,0.94), rgba(2,6,23,0.98))",
        boxShadow: "0 18px 36px rgba(0,0,0,0.28)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        <div>
          <h4 style={{ margin: 0, color: "#e5e7eb", fontSize: "1.02rem" }}>
            Process Lab
          </h4>
          <p
            style={{
              margin: "4px 0 0",
              color: "rgba(226,232,240,0.72)",
              fontSize: "0.82rem",
            }}
          >
            Zona: {modalZone.name} · diseña el proceso y sus etapas desde el primer click
          </p>
        </div>

        {modalZoneProcesses.length > 0 && (
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              setShowCreateProcessForm((prev) => !prev);
              setProcessesError("");
            }}
            disabled={processActionLoading}
          >
            {showCreateProcessForm ? "Cerrar laboratorio" : "Nuevo proceso"}
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        {[
          ["Procesos", processStats.total],
          ["Activos", processStats.active],
          ["Pendientes", processStats.pending],
          ["Completados", processStats.completed],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              padding: "10px 12px",
              borderRadius: "14px",
              border: "1px solid rgba(148,163,184,0.16)",
              background: "rgba(2,6,23,0.42)",
            }}
          >
            <div style={{ color: "rgba(226,232,240,0.62)", fontSize: "0.72rem" }}>
              {label}
            </div>
            <strong style={{ color: "#e5e7eb", fontSize: "1.1rem" }}>{value}</strong>
          </div>
        ))}
      </div>

      {shouldShowBuilder && (
        <div
          style={{
            marginBottom: "14px",
            padding: "14px",
            borderRadius: "16px",
            border: "1px solid rgba(34,197,94,0.20)",
            background: "linear-gradient(180deg, rgba(15,23,42,0.74), rgba(2,6,23,0.48))",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
            <div>
              <strong style={{ color: "#e5e7eb" }}>Crear proceso completo</strong>
              <p style={{ margin: "4px 0 0", color: "rgba(226,232,240,0.68)", fontSize: "0.8rem" }}>
                Primero la visión, luego las etapas. Nada de ventanas zombie.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "10px",
              marginBottom: "14px",
            }}
          >
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Nombre del proceso</label>
              <input
                className="farm-feature-input"
                value={newProcessName}
                onChange={(e) => setNewProcessName(e.target.value)}
                placeholder="Ej: Producción de tierra abonada"
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Objetivo / descripción</label>
              <textarea
                className="farm-feature-textarea"
                value={newProcessDescription}
                onChange={(e) => setNewProcessDescription(e.target.value)}
                placeholder="Qué se busca lograr en esta zona"
                rows={3}
              />
            </div>

            <div>
              <label style={labelStyle}>Responsable</label>
              <input
                className="farm-feature-input"
                value={newProcessOwner}
                onChange={(e) => setNewProcessOwner(e.target.value)}
                placeholder="Ej: José"
              />
            </div>

            <div>
              <label style={labelStyle}>Prioridad</label>
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
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
            <strong style={{ color: "#e5e7eb", fontSize: "0.9rem" }}>Etapas del proceso</strong>
            <button type="button" className="secondary-btn" onClick={addDraftStep} disabled={processActionLoading}>
              + Agregar etapa
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {draftSteps.map((step, index) => {
              const dueDate = addDaysToYYYYMMDD(step.startDate, step.durationDays);

              return (
                <div
                  key={step.localId}
                  style={{
                    padding: "12px",
                    borderRadius: "14px",
                    border: "1px solid rgba(148,163,184,0.14)",
                    background: "rgba(2,6,23,0.42)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
                    <span style={{ ...tinyPillStyle, border: "1px solid rgba(34,197,94,0.24)", background: "rgba(34,197,94,0.12)", color: "#bbf7d0" }}>
                      Etapa {index + 1}
                    </span>
                    <button
                      type="button"
                      className="danger-link"
                      onClick={() => removeDraftStep(step.localId)}
                      disabled={processActionLoading}
                    >
                      Quitar
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Nombre de etapa</label>
                      <input
                        className="farm-feature-input"
                        value={step.name}
                        onChange={(e) => updateDraftStep(step.localId, "name", e.target.value)}
                        placeholder={`Etapa ${index + 1}`}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Inicio</label>
                      <input
                        className="farm-feature-input"
                        type="date"
                        value={step.startDate}
                        onChange={(e) => updateDraftStep(step.localId, "startDate", e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Duración días</label>
                      <input
                        className="farm-feature-input"
                        type="number"
                        min="0"
                        step="1"
                        value={step.durationDays}
                        onChange={(e) => updateDraftStep(step.localId, "durationDays", e.target.value)}
                        placeholder="Ej: 7"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Final estimado</label>
                      <input className="farm-feature-input" value={dueDate || ""} readOnly placeholder="Auto" />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Notas</label>
                      <textarea
                        className="farm-feature-textarea"
                        value={step.notes}
                        onChange={(e) => updateDraftStep(step.localId, "notes", e.target.value)}
                        placeholder="Instrucciones, recursos, observaciones o criterios de éxito"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end", marginTop: "14px" }}>
            {modalZoneProcesses.length > 0 && (
              <button type="button" className="secondary-btn" onClick={resetBuilder} disabled={processActionLoading}>
                Cancelar
              </button>
            )}

            <button type="button" className="primary-btn" onClick={saveProcessLab} disabled={processActionLoading}>
              {processActionLoading ? "Guardando..." : "Guardar proceso con etapas"}
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
      ) : modalZoneProcesses.length > 0 ? (
        <>
          <div style={{ marginBottom: "12px" }}>
            <input
              className="farm-feature-input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar proceso, responsable, estado o prioridad..."
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredProcesses.map((process) => {
              const steps = Array.isArray(process.steps) ? process.steps : [];
              const progress = getProgressFromSteps(steps);
              const nextStepNumber = steps.length + 1;
              const defaultStepDraft = getStepDraftForProcess(process);
              const draft = {
                ...defaultStepDraft,
                ...(newStepByProcess[process.id] || {}),
              };
              const draftDueDate = addDaysToYYYYMMDD(draft.startDate, draft.durationDays);
              const isStepFormOpen = openStepFormByProcess[process.id] === true;

              return (
                <div
                  key={process.id}
                  style={{
                    borderRadius: "16px",
                    border: "1px solid rgba(148,163,184,0.16)",
                    background: "linear-gradient(180deg, rgba(15,23,42,0.86), rgba(5,10,22,0.96))",
                    padding: "12px",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                      <strong style={{ color: "#e5e7eb", fontSize: "0.98rem" }}>
                        {process.name}
                      </strong>

                      <span style={{ ...tinyPillStyle, ...getStatusPillStyle(process.status || "Activo") }}>
                        {process.status || "Activo"}
                      </span>

                      <span style={{ ...tinyPillStyle, ...getPriorityPillStyle(process.priority || "Media") }}>
                        Prioridad {process.priority || "Media"}
                      </span>

                      <span style={{ ...tinyPillStyle, border: "1px solid rgba(148,163,184,0.18)", background: "rgba(15,23,42,0.6)", color: "#cbd5e1" }}>
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
                            background: "linear-gradient(90deg, rgba(34,197,94,0.95), rgba(20,184,166,0.95))",
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "10px" }}>
                      <button type="button" className="secondary-btn" disabled={processActionLoading || process.status === "Completado"} onClick={() => updateProcessStatus(process, "Completado")}>
                        Completar
                      </button>

                      <button type="button" className="danger-link" onClick={() => deleteProcess(process)} disabled={processActionLoading}>
                        Borrar proceso
                      </button>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          const willOpen = !openStepFormByProcess[process.id];
                          setOpenStepFormByProcess((prev) => ({ ...prev, [process.id]: willOpen }));

                          if (willOpen) {
                            const nextDraft = getStepDraftForProcess(process);
                            updateStepDraftField(process.id, "name", nextDraft.name);
                            updateStepDraftField(process.id, "startDate", nextDraft.startDate);
                            updateStepDraftField(process.id, "durationDays", nextDraft.durationDays);
                            updateStepDraftField(process.id, "notes", nextDraft.notes);
                          }

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
                          <label style={labelStyle}>Etapa</label>
                          <input
                            className="farm-feature-input"
                            value={draft.name || `Etapa ${nextStepNumber}`}
                            onChange={(e) => updateStepDraftField(process.id, "name", e.target.value)}
                            placeholder={`Etapa ${nextStepNumber}`}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Fecha de inicio</label>
                          <input className="farm-feature-input" type="date" value={draft.startDate} onChange={(e) => updateStepDraftField(process.id, "startDate", e.target.value)} />
                        </div>

                        <div>
                          <label style={labelStyle}>Duración en días</label>
                          <input className="farm-feature-input" type="number" min="0" step="1" value={draft.durationDays} onChange={(e) => updateStepDraftField(process.id, "durationDays", e.target.value)} placeholder="Ej: 7" />
                        </div>

                        <div>
                          <label style={labelStyle}>Fecha final</label>
                          <input className="farm-feature-input" value={draftDueDate || ""} readOnly placeholder="Se calcula automáticamente" />
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={labelStyle}>Notas</label>
                          <textarea className="farm-feature-textarea" value={draft.notes} onChange={(e) => updateStepDraftField(process.id, "notes", e.target.value)} placeholder="Notas de la etapa, observaciones o instrucciones" rows={3} />
                        </div>

                        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                          <button type="button" className="primary-btn" onClick={() => createStepForProcess(process)} disabled={processActionLoading}>
                            {processActionLoading ? "Agregando..." : `Agregar etapa ${nextStepNumber}`}
                          </button>
                        </div>
                      </div>
                    )}

                    {steps.length > 0 && (
                      <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {[...steps]
                          .sort((a, b) => Number(a?.stepOrder || 0) - Number(b?.stepOrder || 0))
                          .map((step) => {
                          const isCompleted = step.status === "Completada";

                          return (
                            <div key={step.id} style={{ padding: "10px", borderRadius: "12px", background: "rgba(2,6,23,0.4)", border: "1px solid rgba(148,163,184,0.12)" }}>
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
                                      border: isCompleted ? "1px solid rgba(34,197,94,0.38)" : "1px solid rgba(148,163,184,0.28)",
                                      background: isCompleted ? "rgba(34,197,94,0.16)" : "rgba(15,23,42,0.9)",
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

                                      <span style={{ ...tinyPillStyle, ...getStatusPillStyle(step.status || "Pendiente") }}>
                                        {step.status || "Pendiente"}
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

                                <button type="button" className="secondary-btn" onClick={() => toggleStepCompletion(step)} disabled={processActionLoading}>
                                  {isCompleted ? "Reabrir" : "Completar"}
                                </button>
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
        </>
      ) : null}
    </div>
  );
}
