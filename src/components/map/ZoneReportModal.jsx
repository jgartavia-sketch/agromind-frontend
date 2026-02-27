// src/components/map/ZoneReportModal.jsx
import { useMemo, useState } from "react";

function formatDateTimeCR(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export default function ZoneReportModal({
  open,
  zone,
  reportStats,
  reportComponents,
  onClose,
  onEditComponents,
  onDeleteZone,
  onCreateTask,
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [activeComp, setActiveComp] = useState(null);

  const zoneLastUpdated = useMemo(() => formatDateTimeCR(zone?.updatedAt), [zone?.updatedAt]);

  const openNotes = (comp) => {
    setActiveComp(comp || null);
    setNotesOpen(true);
  };

  const closeNotes = () => {
    setNotesOpen(false);
    setActiveComp(null);
  };

  if (!open || !zone) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
        }}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "min(920px, 100%)",
          maxHeight: "min(78vh, 780px)",
          background: "rgba(2,6,23,0.96)",
          border: "1px solid rgba(148,163,184,0.22)",
          borderRadius: "18px",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 14px",
            borderBottom: "1px solid rgba(148,163,184,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h4 style={{ margin: 0, color: "#e5e7eb" }}>Reporte de zona</h4>
            <span className="zone-tag">{zone.name}</span>
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
            style={{ padding: "0.35rem 0.65rem" }}
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "14px", overflow: "auto" }}>
          {/* Resumen ejecutivo (lo que marcaste en azul) */}
          <div
            style={{
              border: "1px solid rgba(148,163,184,0.18)",
              borderRadius: "14px",
              padding: "12px",
              background: "rgba(2,6,23,0.35)",
            }}
          >
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <span
                className="component-kind-badge"
                style={{
                  borderColor: "rgba(56,189,248,0.35)",
                  background: "rgba(56,189,248,0.08)",
                  color: "#bae6fd",
                }}
              >
                {zone.zoneType || "Zona"}
              </span>

              <span
                className="component-kind-badge"
                style={{
                  borderColor: "rgba(34,197,94,0.28)",
                  background: "rgba(34,197,94,0.08)",
                  color: "#bbf7d0",
                }}
              >
                {zone.status || "Disponible"}
              </span>

              <span style={{ color: "rgba(226,232,240,0.85)", fontSize: "0.9rem" }}>
                Componentes:{" "}
                <strong style={{ color: "#e5e7eb" }}>{reportStats?.total ?? 0}</strong>
              </span>

              <span style={{ color: "rgba(226,232,240,0.78)", fontSize: "0.9rem" }}>
                Última actualización:{" "}
                <strong style={{ color: "#e5e7eb" }}>{zoneLastUpdated}</strong>
              </span>
            </div>

            {reportStats?.topTypes?.length > 0 && (
              <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {reportStats.topTypes.map(([t, n]) => (
                  <span
                    key={t}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "999px",
                      border: "1px solid rgba(148,163,184,0.18)",
                      background: "rgba(15,23,42,0.7)",
                      color: "#e5e7eb",
                      fontSize: "0.82rem",
                    }}
                  >
                    {t}: <strong>{n}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Componentes en fila (compacto) */}
          <div style={{ marginTop: "12px" }}>
            {reportComponents.length === 0 ? (
              <p style={{ color: "rgba(226,232,240,0.7)" }}>Esta zona no tiene componentes todavía.</p>
            ) : (
              <div
                style={{
                  border: "1px solid rgba(148,163,184,0.18)",
                  borderRadius: "14px",
                  overflow: "hidden",
                  background: "rgba(15,23,42,0.35)",
                }}
              >
                {/* Header row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "170px 170px 1fr auto auto",
                    gap: "10px",
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(148,163,184,0.14)",
                    color: "rgba(226,232,240,0.75)",
                    fontSize: "0.8rem",
                  }}
                >
                  <div>Últ. actualización</div>
                  <div>Tipo</div>
                  <div>Componente</div>
                  <div style={{ textAlign: "right" }}>Notas</div>
                  <div style={{ textAlign: "right" }}>Tarea</div>
                </div>

                {reportComponents.map((comp) => {
                  const noteText = String(comp.note || "").trim();

                  // Por ahora usamos updatedAt de la zona (los componentes son Json).
                  // Cuando los pasemos a tabla, aquí va comp.updatedAt real.
                  const compLastUpdated = zoneLastUpdated;

                  return (
                    <div
                      key={comp.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "170px 170px 1fr auto auto",
                        gap: "10px",
                        padding: "10px 12px",
                        borderBottom: "1px solid rgba(148,163,184,0.10)",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ color: "rgba(226,232,240,0.82)", fontSize: "0.86rem" }}>
                        {compLastUpdated}
                      </div>

                      <div>
                        <span className="component-kind-badge">{comp.type || "Otro"}</span>
                      </div>

                      <div style={{ color: "#e5e7eb", fontWeight: 700, fontSize: "0.95rem" }}>
                        {comp.name || "(Sin nombre)"}
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => openNotes(comp)}
                          title={noteText ? "Ver notas" : "Este componente no tiene notas"}
                          style={{ opacity: noteText ? 1 : 0.7 }}
                        >
                          Notas
                        </button>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => onCreateTask(zone, comp)}
                          title="Crear tarea rápida desde este componente"
                        >
                          Crear tarea
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid rgba(148,163,184,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cerrar
          </button>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" className="secondary-btn" onClick={onEditComponents}>
              Ver componentes
            </button>
            <button type="button" className="danger-link" onClick={onDeleteZone}>
              Borrar zona
            </button>
          </div>
        </div>

        {/* Mini modal de notas (compacto) */}
        {notesOpen && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              background: "rgba(0,0,0,0.35)",
            }}
            onClick={closeNotes}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(680px, 100%)",
                maxHeight: "min(60vh, 520px)",
                background: "rgba(2,6,23,0.98)",
                border: "1px solid rgba(148,163,184,0.22)",
                borderRadius: "16px",
                boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid rgba(148,163,184,0.18)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ color: "#e5e7eb" }}>Notas</strong>
                  <span className="component-kind-badge">{activeComp?.type || "Otro"}</span>
                  <span style={{ color: "rgba(226,232,240,0.85)" }}>
                    {activeComp?.name || "(Sin nombre)"}
                  </span>
                </div>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeNotes}
                  style={{ padding: "0.3rem 0.6rem" }}
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: "14px", overflow: "auto" }}>
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "14px",
                    border: "1px solid rgba(148,163,184,0.18)",
                    background: "rgba(2,6,23,0.35)",
                    color: String(activeComp?.note || "").trim()
                      ? "#e5e7eb"
                      : "rgba(226,232,240,0.6)",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.4,
                  }}
                >
                  {String(activeComp?.note || "").trim()
                    ? String(activeComp.note)
                    : "Este componente no tiene notas registradas."}
                </div>
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  borderTop: "1px solid rgba(148,163,184,0.18)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button type="button" className="secondary-btn" onClick={closeNotes}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}