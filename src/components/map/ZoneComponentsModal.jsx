// src/components/map/ZoneComponentsModal.jsx

export default function ZoneComponentsModal({
  open,
  zone,
  componentsDraft,
  editingNotesMap,
  onClose,
  onSave,
  onAdd,
  onDeleteComponent,
  onUpdateComponent,
  onToggleEditNote,
  onDeleteZone,
  COMPONENT_TYPES,
}) {
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
          width: "min(880px, 100%)",
          maxHeight: "min(78vh, 760px)",
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <h4 style={{ margin: 0, color: "#e5e7eb" }}>
              Componentes de la zona
            </h4>
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
          {componentsDraft.length === 0 && (
            <p
              className="farm-zone-components-empty"
              style={{ marginTop: 0 }}
            >
              Aún no has agregado componentes a esta zona. Usa el botón{" "}
              <strong>“Agregar componente”</strong>.
            </p>
          )}

          {componentsDraft.map((comp) => {
            const isEditingNote = editingNotesMap?.[comp.id] === true;
            const noteText = (comp.note || "").trim();

            return (
              <div key={comp.id} className="farm-zone-component-row">
                <div className="farm-zone-component-icon">
                  <span className="geom-dot" />
                </div>

                <div className="farm-zone-component-body">
                  <div
                    className="farm-zone-component-header"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      type="button"
                      className="danger-link"
                      onClick={() => onDeleteComponent(comp.id)}
                    >
                      Borrar
                    </button>
                  </div>

                  <div className="farm-zone-component-type-row">
                    <label className="component-type-label">
                      Tipo de componente
                    </label>
                    <select
                      className="component-type-select"
                      value={comp.type || "Otro"}
                      onChange={(e) =>
                        onUpdateComponent(comp.id, { type: e.target.value })
                      }
                    >
                      {COMPONENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    className="farm-feature-input"
                    value={comp.name}
                    onChange={(e) =>
                      onUpdateComponent(comp.id, { name: e.target.value })
                    }
                    placeholder="Nombre del componente (ej: Gallinero, Bebedero, Bodega)"
                  />

                  <div style={{ marginTop: "10px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "rgba(226,232,240,0.85)",
                        }}
                      >
                        Nota / comentario
                      </span>

                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => onToggleEditNote(comp.id)}
                        style={{ padding: "0.25rem 0.55rem" }}
                        title={isEditingNote ? "Cerrar edición" : "Editar nota"}
                      >
                        ✏️ {isEditingNote ? "Listo" : "Editar"}
                      </button>
                    </div>

                    {isEditingNote ? (
                      <textarea
                        className="farm-feature-textarea"
                        value={comp.note}
                        onChange={(e) =>
                          onUpdateComponent(comp.id, { note: e.target.value })
                        }
                        placeholder="Notas / detalles (ej: revisar techo, cambiar malla, etc.)"
                        rows={3}
                      />
                    ) : (
                      <div
                        style={{
                          marginTop: "8px",
                          padding: "10px 12px",
                          borderRadius: "12px",
                          border: "1px solid rgba(148,163,184,0.18)",
                          background: "rgba(2,6,23,0.35)",
                          color: noteText
                            ? "#e5e7eb"
                            : "rgba(226,232,240,0.55)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {noteText
                          ? noteText
                          : "Sin nota. Tocá ✏️ para agregar una."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button type="button" className="primary-btn" onClick={onAdd}>
              Agregar componente
            </button>

            <button type="button" className="danger-link" onClick={onDeleteZone}>
              Borrar zona
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="primary-btn" onClick={onSave}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}