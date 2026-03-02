// src/components/map/CreateTaskModal.jsx
import { useMemo } from "react";

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CreateTaskModal({
  open,
  draft,
  onClose,
  onChange,
  onConfirm,
  loading = false,
  error = "",
  success = "",
}) {
  if (!open) return null;

  const title = draft?.title || "";
  const zoneName = draft?.zoneName || "";
  const type = draft?.type || "Mantenimiento";
  const priority = draft?.priority || "Media";
  const status = draft?.status || "Pendiente";
  const owner = draft?.owner || "";

  const start = draft?.start || todayYYYYMMDD();
  const due = draft?.due || start;

  const canConfirm = useMemo(() => {
    if (!title.trim()) return false;
    if (!String(start || "").match(/^\d{4}-\d{2}-\d{2}$/)) return false;
    if (!String(due || "").match(/^\d{4}-\d{2}-\d{2}$/)) return false;
    return true;
  }, [title, start, due]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={loading ? undefined : onClose}
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
          width: "min(760px, 100%)",
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
            <h4 style={{ margin: 0, color: "#e5e7eb" }}>Crear tarea</h4>
            {zoneName ? <span className="zone-tag">{zoneName}</span> : null}
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={loading ? undefined : onClose}
            style={{ padding: "0.35rem 0.65rem", opacity: loading ? 0.65 : 1 }}
            title={loading ? "Creando..." : "Cerrar"}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "14px" }}>
          {/* banners */}
          {error ? (
            <div
              style={{
                marginBottom: 10,
                padding: "10px 12px",
                borderRadius: "12px",
                border: "1px solid rgba(248,113,113,0.25)",
                background: "rgba(248,113,113,0.08)",
                color: "#fecaca",
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          ) : null}

          {success ? (
            <div
              style={{
                marginBottom: 10,
                padding: "10px 12px",
                borderRadius: "12px",
                border: "1px solid rgba(34,197,94,0.25)",
                background: "rgba(34,197,94,0.08)",
                color: "#bbf7d0",
                fontSize: "0.9rem",
              }}
            >
              {success}
            </div>
          ) : null}

          <label style={{ display: "block", color: "rgba(226,232,240,0.85)", fontSize: "0.85rem", marginBottom: 6 }}>
            Título
          </label>
          <input
            className="farm-feature-input"
            value={title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Título de la tarea"
            disabled={loading}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <div>
              <label style={{ display: "block", color: "rgba(226,232,240,0.85)", fontSize: "0.85rem", marginBottom: 6 }}>
                Inicio (YYYY-MM-DD)
              </label>
              <input
                className="farm-feature-input"
                value={start}
                onChange={(e) => onChange({ start: e.target.value })}
                disabled={loading}
                placeholder="2026-03-02"
              />
            </div>

            <div>
              <label style={{ display: "block", color: "rgba(226,232,240,0.85)", fontSize: "0.85rem", marginBottom: 6 }}>
                Vence (YYYY-MM-DD)
              </label>
              <input
                className="farm-feature-input"
                value={due}
                onChange={(e) => onChange({ due: e.target.value })}
                disabled={loading}
                placeholder="2026-03-02"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <div>
              <label style={{ display: "block", color: "rgba(226,232,240,0.85)", fontSize: "0.85rem", marginBottom: 6 }}>
                Tipo
              </label>
              <input
                className="farm-feature-input"
                value={type}
                onChange={(e) => onChange({ type: e.target.value })}
                disabled={loading}
                placeholder="Mantenimiento"
              />
            </div>

            <div>
              <label style={{ display: "block", color: "rgba(226,232,240,0.85)", fontSize: "0.85rem", marginBottom: 6 }}>
                Prioridad
              </label>
              <input
                className="farm-feature-input"
                value={priority}
                onChange={(e) => onChange({ priority: e.target.value })}
                disabled={loading}
                placeholder="Media"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <div>
              <label style={{ display: "block", color: "rgba(226,232,240,0.85)", fontSize: "0.85rem", marginBottom: 6 }}>
                Estado
              </label>
              <input
                className="farm-feature-input"
                value={status}
                onChange={(e) => onChange({ status: e.target.value })}
                disabled={loading}
                placeholder="Pendiente"
              />
            </div>

            <div>
              <label style={{ display: "block", color: "rgba(226,232,240,0.85)", fontSize: "0.85rem", marginBottom: 6 }}>
                Responsable (opcional)
              </label>
              <input
                className="farm-feature-input"
                value={owner}
                onChange={(e) => onChange({ owner: e.target.value })}
                disabled={loading}
                placeholder="(vacío)"
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: "12px",
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(2,6,23,0.35)",
              color: "rgba(226,232,240,0.78)",
              fontSize: "0.9rem",
              lineHeight: 1.35,
            }}
          >
            Esta tarea se crea en tu backend y queda lista para <strong>Tareas</strong>. Sin humo, sin pop-ups: puro execution.
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
          <button type="button" className="secondary-btn" onClick={loading ? undefined : onClose} disabled={loading}>
            Cancelar
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={onConfirm}
            disabled={!canConfirm || loading}
            title={!canConfirm ? "Revisá título y fechas (YYYY-MM-DD)" : "Crear tarea"}
            style={{ opacity: !canConfirm || loading ? 0.75 : 1 }}
          >
            {loading ? "Creando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}