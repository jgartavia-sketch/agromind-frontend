export default function ComponentModal({
  modalZone,
  componentsDraft = [],
  COMPONENT_TYPES = [],
  editingNotesMap = {},
  closeComponentsModal,
  draftAddComponent,
  draftDeleteComponent,
  draftUpdate,
  toggleEditNote,
  saveComponentsModal,
  handleDeleteFeature,
  getComponentIcon,
  getComponentDisplayName,
}) {
  const safeComponents = Array.isArray(componentsDraft) ? componentsDraft : [];
  const totalComponents = safeComponents.length;

  const resolveIcon = (type) => {
    if (typeof getComponentIcon === "function") return getComponentIcon(type);

    const value = String(type || "Otro").toLowerCase();
    if (value.includes("animal") || value.includes("gallina") || value.includes("vaca") || value.includes("cerdo")) return "🐄";
    if (value.includes("cultivo") || value.includes("lote")) return "🌱";
    if (value.includes("bebedero") || value.includes("riego")) return "💧";
    if (value.includes("comedero")) return "🌾";
    if (value.includes("bodega")) return "🏠";
    if (value.includes("pasillo")) return "↔️";
    if (value.includes("descanso")) return "🟢";
    if (value.includes("árbol") || value.includes("arbol")) return "🌳";
    return "📍";
  };

  const resolveDisplayName = (component, index) => {
    if (typeof getComponentDisplayName === "function") {
      return getComponentDisplayName(component, index);
    }

    const name = String(component?.name || "").trim();
    if (name) return name;

    const type = String(component?.type || "Componente").trim() || "Componente";
    return `${type} #${index + 1}`;
  };
  const componentIconPreview = safeComponents.slice(0, 12).map((component, index) => ({
    key: component?.id || `component-icon-${index}`,
    icon: resolveIcon(component?.type),
    label: resolveDisplayName(component, index),
  }));

  const remainingIconCount = Math.max(totalComponents - componentIconPreview.length, 0);

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
        onClick={closeComponentsModal}
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
          width: "min(980px, 100%)",
          maxHeight: "min(84vh, 820px)",
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <h4 style={{ margin: 0, color: "#e5e7eb" }}>Component Lab</h4>
            <span className="zone-tag">{modalZone?.name || "Zona"}</span>
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={closeComponentsModal}
            style={{ padding: "0.35rem 0.65rem" }}
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "14px", overflow: "auto" }}>
          <section
            style={{
              border: "1px solid rgba(34,197,94,0.20)",
              background:
                "linear-gradient(135deg, rgba(6,78,59,0.32), rgba(15,23,42,0.92))",
              borderRadius: "20px",
              padding: "18px",
              marginBottom: "16px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.22)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "16px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(34,197,94,0.28)",
                    background: "rgba(34,197,94,0.12)",
                    color: "#86efac",
                    fontWeight: 900,
                  }}
                >
                  CL
                </div>

                <div>
                  <h3 style={{ margin: 0, color: "#e5e7eb", fontSize: "1rem" }}>
                    Componentes de la zona
                  </h3>
                  <p
                    style={{
                      margin: "0.25rem 0 0",
                      color: "rgba(226,232,240,0.68)",
                      fontSize: "0.86rem",
                    }}
                  >
                    Inventario simple: títulos, tipos y notas. Sin procesos, sin etapas, sin fechas.
                  </p>
                </div>
              </div>

              <button type="button" className="primary-btn" onClick={draftAddComponent}>
                Nuevo componente
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "12px",
                marginTop: "16px",
              }}
            >
              <div
                style={{
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: "rgba(15,23,42,0.55)",
                  borderRadius: "16px",
                  padding: "12px",
                }}
              >
                <div style={{ color: "rgba(226,232,240,0.66)", fontSize: "0.8rem" }}>
                  Componentes
                </div>
                <div style={{ marginTop: "0.25rem", color: "#e5e7eb", fontSize: "1.45rem", fontWeight: 900 }}>
                  {totalComponents}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: "rgba(15,23,42,0.55)",
                  borderRadius: "16px",
                  padding: "12px",
                }}
              >
                <div style={{ color: "rgba(226,232,240,0.66)", fontSize: "0.8rem" }}>
                  Modelo
                </div>
                <div
                  style={{
                    marginTop: "0.32rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: "#bbf7d0", fontSize: "0.95rem", fontWeight: 900 }}>
                    Inventario visual
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: "4px",
                      flexWrap: "wrap",
                      maxWidth: "100%",
                    }}
                    aria-label="Vista rápida de tipos de componentes"
                  >
                    {componentIconPreview.length > 0 ? (
                      componentIconPreview.map((item) => (
                        <span
                          key={item.key}
                          title={item.label}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "999px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid rgba(34,197,94,0.22)",
                            background: "rgba(34,197,94,0.10)",
                            fontSize: "0.78rem",
                          }}
                        >
                          {item.icon}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: "rgba(226,232,240,0.52)", fontSize: "0.78rem" }}>
                        Sin iconos aún
                      </span>
                    )}

                    {remainingIconCount > 0 ? (
                      <span
                        style={{
                          minWidth: "24px",
                          height: "24px",
                          padding: "0 7px",
                          borderRadius: "999px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(148,163,184,0.22)",
                          background: "rgba(15,23,42,0.62)",
                          color: "#bbf7d0",
                          fontSize: "0.72rem",
                          fontWeight: 900,
                        }}
                      >
                        +{remainingIconCount}
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {totalComponents === 0 ? (
            <div
              style={{
                border: "1px dashed rgba(148,163,184,0.28)",
                background: "rgba(15,23,42,0.38)",
                borderRadius: "18px",
                padding: "18px",
                color: "rgba(226,232,240,0.74)",
              }}
            >
              <strong style={{ color: "#e5e7eb" }}>Aún no hay componentes.</strong>
              <div style={{ marginTop: "0.35rem" }}>
                Agregá árboles, camas, tanques, bodegas, pasillos o cualquier elemento que exista en la zona.
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {safeComponents.map((comp, index) => {
                const isEditingNote = editingNotesMap?.[comp.id] === true;
                const noteText = String(comp.note || "").trim();
                const displayName = resolveDisplayName(comp, index);
                const icon = resolveIcon(comp.type);

                return (
                  <article
                    key={comp.id}
                    className="farm-zone-component-row"
                    style={{
                      margin: 0,
                      borderRadius: "18px",
                      border: "1px solid rgba(148,163,184,0.18)",
                      background:
                        "linear-gradient(135deg, rgba(15,23,42,0.94), rgba(8,47,73,0.24))",
                      boxShadow: "0 14px 34px rgba(0,0,0,0.20)",
                    }}
                  >
                    <div
                      className="farm-zone-component-icon"
                      style={{ alignSelf: "flex-start", paddingTop: "4px" }}
                    >
                      <span
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "999px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(34,197,94,0.24)",
                          background: "rgba(34,197,94,0.12)",
                          fontSize: "1.05rem",
                        }}
                      >
                        {icon}
                      </span>
                    </div>

                    <div className="farm-zone-component-body" style={{ flex: 1 }}>
                      <div
                        className="farm-zone-component-header"
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "12px",
                          marginBottom: "12px",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              color: "#e5e7eb",
                              fontSize: "0.98rem",
                              fontWeight: 900,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {displayName}
                          </div>

                          <div
                            style={{
                              marginTop: "0.22rem",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              padding: "0.25rem 0.52rem",
                              borderRadius: "999px",
                              border: "1px solid rgba(148,163,184,0.18)",
                              background: "rgba(15,23,42,0.55)",
                              color: "rgba(226,232,240,0.78)",
                              fontSize: "0.74rem",
                              fontWeight: 800,
                            }}
                          >
                            <span>{icon}</span>
                            <span>{comp.type || "Otro"}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="danger-link"
                          onClick={() => draftDeleteComponent(comp.id)}
                        >
                          Borrar
                        </button>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(180px, 1fr) minmax(160px, 0.6fr)",
                          gap: "10px",
                        }}
                      >
                        <input
                          className="farm-feature-input"
                          value={comp.name}
                          onChange={(e) => draftUpdate(comp.id, { name: e.target.value })}
                          placeholder="Nombre del componente (ej: Aguacate #4, Tanque principal)"
                        />

                        <select
                          className="component-type-select"
                          value={comp.type || "Otro"}
                          onChange={(e) => draftUpdate(comp.id, { type: e.target.value })}
                        >
                          {COMPONENT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

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
                              fontSize: "0.82rem",
                              color: "rgba(226,232,240,0.72)",
                              fontWeight: 800,
                            }}
                          >
                            Nota simple
                          </span>

                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => toggleEditNote(comp.id)}
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
                            onChange={(e) => draftUpdate(comp.id, { note: e.target.value })}
                            placeholder="Nota breve del componente (ej: árbol joven, pendiente de revisión, cerca del riego...)"
                            rows={3}
                          />
                        ) : (
                          <div
                            style={{
                              marginTop: "8px",
                              padding: "10px 12px",
                              borderRadius: "12px",
                              border: "1px solid rgba(148,163,184,0.16)",
                              background: "rgba(2,6,23,0.35)",
                              color: noteText ? "#e5e7eb" : "rgba(226,232,240,0.50)",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {noteText || "Sin nota. Podés dejarlo así o agregar una observación rápida."}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="primary-btn" onClick={draftAddComponent}>
              Agregar componente
            </button>

            <button
              type="button"
              className="danger-link"
              onClick={() => handleDeleteFeature(modalZone.id)}
            >
              Borrar zona
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="secondary-btn" onClick={closeComponentsModal}>
              Cancelar
            </button>
            <button type="button" className="primary-btn" onClick={saveComponentsModal}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
