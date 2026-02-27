// src/components/map/CreateTaskModal.jsx

export default function CreateTaskModal({ open, draft, onClose, onChange, onConfirm }) {
  if (!open) return null;

  const title = draft?.title || "";
  const zoneName = draft?.zoneName || "";

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
          width: "min(720px, 100%)",
          background: "rgba(2,6,23,0.96)",
          border: "1px solid rgba(148,163,184,0.22)",
          borderRadius: "18px",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
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
            onClick={onClose}
            style={{ padding: "0.35rem 0.65rem" }}
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "14px" }}>
          <div style={{ color: "rgba(226,232,240,0.85)", fontSize: "0.92rem", marginBottom: 10 }}>
            Esta acción ya quedó con cara de producto. La conexión directa a <strong>Tareas</strong> la activamos en el siguiente paso.
          </div>

          <label style={{ display: "block", color: "rgba(226,232,240,0.85)", fontSize: "0.85rem", marginBottom: 6 }}>
            Título
          </label>
          <input
            className="farm-feature-input"
            value={title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Título de la tarea"
          />

          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: "12px",
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(2,6,23,0.35)",
              color: "rgba(226,232,240,0.78)",
              fontSize: "0.9rem",
            }}
          >
            Nota: cuando lo conectemos, la tarea se creará con <strong>zona</strong> + <strong>descripción automática</strong> desde el componente.
          </div>
        </div>

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
            Cancelar
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={onConfirm}
            disabled={!title.trim()}
            title={!title.trim() ? "Escribí un título" : "Confirmar (placeholder por ahora)"}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}