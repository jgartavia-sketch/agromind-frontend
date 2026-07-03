import { useEffect, useMemo, useState } from "react";

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
  getComponentIcon,
  getComponentDisplayName,
}) {
  const safeComponents = Array.isArray(componentsDraft) ? componentsDraft : [];
  const totalComponents = safeComponents.length;

  const [expandedComponentId, setExpandedComponentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState("Todos");
  const [hoveredComponentId, setHoveredComponentId] = useState(null);

  const componentTypeOptions = useMemo(() => {
    const baseTypes = Array.isArray(COMPONENT_TYPES) ? COMPONENT_TYPES : [];
    const requiredTypes = [
      "Árbol",
      "Animal",
      "Bebedero",
      "Comedero",
      "Bodega",
      "Lote de cultivo",
      "Pasillo",
      "Área de descanso",
      "Riego",
      "Infraestructura",
      "Otro",
    ];

    return Array.from(
      new Set(
        [...baseTypes, ...requiredTypes]
          .map((type) => String(type || "").trim())
          .filter(Boolean)
      )
    );
  }, [COMPONENT_TYPES]);

  const resolveIcon = (type) => {
    if (typeof getComponentIcon === "function") return getComponentIcon(type);

    const value = String(type || "Otro").toLowerCase();
    if (value.includes("animal")) return "🐄";
    if (
      value.includes("árbol") ||
      value.includes("arbol") ||
      value.includes("aguacate") ||
      value.includes("frutal")
    ) {
      return "🌳";
    }
    if (value.includes("cultivo") || value.includes("lote")) return "🌱";
    if (value.includes("bebedero") || value.includes("riego")) return "💧";
    if (value.includes("comedero")) return "🌾";
    if (value.includes("bodega") || value.includes("infraestructura")) return "🏠";
    if (value.includes("pasillo")) return "↔️";
    if (value.includes("descanso")) return "🟢";
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

  const typeCounts = useMemo(() => {
    const counts = {};
    safeComponents.forEach((component) => {
      const type = String(component?.type || "Otro").trim() || "Otro";
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [safeComponents]);

  const availableFilterTypes = useMemo(() => {
    const currentTypes = Object.keys(typeCounts);
    return ["Todos", ...currentTypes];
  }, [typeCounts]);

  const filteredComponents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return safeComponents.filter((component, index) => {
      const name = resolveDisplayName(component, index).toLowerCase();
      const type = String(component?.type || "Otro").toLowerCase();
      const note = String(component?.note || "").toLowerCase();

      const matchesSearch = !query || name.includes(query) || type.includes(query) || note.includes(query);
      const matchesType = activeTypeFilter === "Todos" || String(component?.type || "Otro") === activeTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [safeComponents, searchTerm, activeTypeFilter]);

  const componentIconPreview = useMemo(
    () =>
      safeComponents.slice(0, 16).map((component, index) => ({
        key: component?.id || `component-icon-${index}`,
        icon: resolveIcon(component?.type),
        label: resolveDisplayName(component, index),
      })),
    [safeComponents]
  );

  const remainingIconCount = Math.max(totalComponents - componentIconPreview.length, 0);
  const topTypes = Object.entries(typeCounts).slice(0, 6);
  const hasActiveFilters = searchTerm.trim() || activeTypeFilter !== "Todos";

  useEffect(() => {
    if (safeComponents.length === 0) {
      setExpandedComponentId(null);
      return;
    }

    if (!expandedComponentId) return;

    const expandedStillExists = safeComponents.some(
      (component) => component?.id === expandedComponentId
    );

    if (!expandedStillExists) {
      setExpandedComponentId(null);
    }
  }, [safeComponents, expandedComponentId]);

  const handleToggleExpanded = (componentId) => {
    setExpandedComponentId((prev) => (prev === componentId ? null : componentId));
  };

  const handleAddComponent = () => {
    const beforeIds = new Set(safeComponents.map((component) => component?.id));
    draftAddComponent();

    setTimeout(() => {
      const newest = (Array.isArray(componentsDraft) ? componentsDraft : []).find(
        (component) => component?.id && !beforeIds.has(component.id)
      );
      if (newest?.id) setExpandedComponentId(newest.id);
    }, 0);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setActiveTypeFilter("Todos");
  };

  const handleComponentCardMouseMove = (event) => {
    const card = event.currentTarget;
    if (!card || typeof card.getBoundingClientRect !== "function") return;

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    card.style.setProperty("--component-glow-x", `${x}px`);
    card.style.setProperty("--component-glow-y", `${y}px`);
  };

  return (
    <div
      className="component-lab-shell"
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
          background:
            "radial-gradient(circle at top, rgba(34,197,94,0.13), transparent 36%), rgba(0,0,0,0.62)",
          backdropFilter: "blur(5px)",
        }}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "min(1080px, 100%)",
          maxHeight: "min(88vh, 900px)",
          background:
            "linear-gradient(145deg, rgba(2,6,23,0.98), rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.22)",
          borderRadius: "24px",
          boxShadow:
            "0 28px 90px rgba(0,0,0,0.62), 0 0 0 1px rgba(34,197,94,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            position: "relative",
            padding: "18px 18px 16px",
            borderBottom: "1px solid rgba(148,163,184,0.16)",
            background:
              "linear-gradient(135deg, rgba(6,78,59,0.48), rgba(15,23,42,0.86) 58%, rgba(2,6,23,0.92))",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-90px",
              right: "-90px",
              width: "220px",
              height: "220px",
              borderRadius: "999px",
              background: "rgba(34,197,94,0.12)",
              filter: "blur(4px)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "14px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "16px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(34,197,94,0.34)",
                    background:
                      "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(20,184,166,0.08))",
                    color: "#bbf7d0",
                    fontWeight: 950,
                    boxShadow: "0 0 32px rgba(34,197,94,0.13)",
                  }}
                >
                  CL
                </span>

                <div style={{ minWidth: 0 }}>
                  <h3
                    style={{
                      margin: 0,
                      color: "#f8fafc",
                      fontSize: "1.08rem",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Component Lab
                  </h3>
                  <div
                    style={{
                      marginTop: "0.22rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="zone-tag">{modalZone?.name || "Zona"}</span>
                    <span
                      style={{
                        color: "rgba(226,232,240,0.64)",
                        fontSize: "0.82rem",
                      }}
                    >
                      Inventario visual simple, listo para crecer.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="secondary-btn"
              onClick={closeComponentsModal}
              style={{ padding: "0.38rem 0.68rem" }}
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        <div style={{ padding: "16px", overflow: "auto" }}>
          <section
            style={{
              border: "1px solid rgba(34,197,94,0.22)",
              background:
                "linear-gradient(135deg, rgba(6,78,59,0.28), rgba(15,23,42,0.86))",
              borderRadius: "22px",
              padding: "16px",
              marginBottom: "14px",
              boxShadow: "0 20px 55px rgba(0,0,0,0.24)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "12px",
              }}
            >
              <div
                style={{
                  border: "1px solid rgba(148,163,184,0.17)",
                  background: "rgba(2,6,23,0.36)",
                  borderRadius: "18px",
                  padding: "13px",
                }}
              >
                <div style={{ color: "rgba(226,232,240,0.62)", fontSize: "0.78rem" }}>
                  Componentes
                </div>
                <div
                  style={{
                    marginTop: "0.24rem",
                    color: "#f8fafc",
                    fontSize: "1.65rem",
                    fontWeight: 950,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {totalComponents}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid rgba(148,163,184,0.17)",
                  background: "rgba(2,6,23,0.36)",
                  borderRadius: "18px",
                  padding: "13px",
                }}
              >
                <div style={{ color: "rgba(226,232,240,0.62)", fontSize: "0.78rem" }}>
                  Modelo
                </div>
                <div
                  style={{
                    marginTop: "0.34rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: "#bbf7d0", fontSize: "0.94rem", fontWeight: 950 }}>
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
                            width: "25px",
                            height: "25px",
                            borderRadius: "999px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid rgba(34,197,94,0.24)",
                            background: "rgba(34,197,94,0.10)",
                            fontSize: "0.78rem",
                            boxShadow: "0 0 16px rgba(34,197,94,0.08)",
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
                          minWidth: "25px",
                          height: "25px",
                          padding: "0 7px",
                          borderRadius: "999px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(148,163,184,0.22)",
                          background: "rgba(15,23,42,0.62)",
                          color: "#bbf7d0",
                          fontSize: "0.72rem",
                          fontWeight: 950,
                        }}
                      >
                        +{remainingIconCount}
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>

              <div
                style={{
                  border: "1px solid rgba(148,163,184,0.17)",
                  background: "rgba(2,6,23,0.36)",
                  borderRadius: "18px",
                  padding: "13px",
                }}
              >
                <div style={{ color: "rgba(226,232,240,0.62)", fontSize: "0.78rem" }}>
                  Futuro
                </div>
                <div
                  style={{
                    marginTop: "0.36rem",
                    color: "#e5e7eb",
                    fontSize: "0.92rem",
                    fontWeight: 900,
                  }}
                >
                  📷 Fotos preparadas
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "12px",
                display: "flex",
                gap: "10px",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {topTypes.length > 0 ? (
                  topTypes.map(([type, count]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActiveTypeFilter(type)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.38rem",
                        padding: "0.35rem 0.62rem",
                        borderRadius: "999px",
                        border:
                          activeTypeFilter === type
                            ? "1px solid rgba(34,197,94,0.42)"
                            : "1px solid rgba(148,163,184,0.18)",
                        background:
                          activeTypeFilter === type
                            ? "rgba(34,197,94,0.13)"
                            : "rgba(15,23,42,0.50)",
                        color: activeTypeFilter === type ? "#bbf7d0" : "rgba(226,232,240,0.82)",
                        fontSize: "0.76rem",
                        fontWeight: 850,
                        cursor: "pointer",
                      }}
                    >
                      <span>{resolveIcon(type)}</span>
                      <span>{type}</span>
                      <strong>{count}</strong>
                    </button>
                  ))
                ) : (
                  <span style={{ color: "rgba(226,232,240,0.55)", fontSize: "0.82rem" }}>
                    Los tipos aparecerán aquí cuando agregues componentes.
                  </span>
                )}
              </div>

              <button type="button" className="primary-btn" onClick={handleAddComponent}>
                + Nuevo componente
              </button>
            </div>
          </section>

          <section
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                flex: "1 1 280px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0.55rem 0.72rem",
                borderRadius: "999px",
                border: "1px solid rgba(148,163,184,0.18)",
                background: "rgba(2,6,23,0.42)",
              }}
            >
              <span style={{ color: "rgba(226,232,240,0.56)" }}>🔍</span>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, tipo o nota..."
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "#e5e7eb",
                  fontSize: "0.88rem",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {availableFilterTypes.slice(0, 8).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveTypeFilter(type)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.32rem",
                    padding: "0.46rem 0.72rem",
                    borderRadius: "999px",
                    border:
                      activeTypeFilter === type
                        ? "1px solid rgba(34,197,94,0.40)"
                        : "1px solid rgba(148,163,184,0.17)",
                    background:
                      activeTypeFilter === type
                        ? "rgba(34,197,94,0.12)"
                        : "rgba(15,23,42,0.42)",
                    color: activeTypeFilter === type ? "#bbf7d0" : "rgba(226,232,240,0.78)",
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    fontWeight: 850,
                  }}
                >
                  {type !== "Todos" ? <span>{resolveIcon(type)}</span> : null}
                  <span>{type}</span>
                </button>
              ))}
            </div>
          </section>

          {totalComponents === 0 ? (
            <div
              style={{
                border: "1px dashed rgba(148,163,184,0.28)",
                background:
                  "linear-gradient(135deg, rgba(15,23,42,0.45), rgba(6,78,59,0.16))",
                borderRadius: "20px",
                padding: "20px",
                color: "rgba(226,232,240,0.74)",
              }}
            >
              <strong style={{ color: "#e5e7eb" }}>Aún no hay componentes.</strong>
              <div style={{ marginTop: "0.35rem" }}>
                Agregá árboles, animales, camas, tanques, bodegas, pasillos o cualquier elemento que exista en la zona.
              </div>
            </div>
          ) : filteredComponents.length === 0 ? (
            <div
              style={{
                border: "1px dashed rgba(148,163,184,0.26)",
                background: "rgba(15,23,42,0.38)",
                borderRadius: "18px",
                padding: "18px",
                color: "rgba(226,232,240,0.72)",
              }}
            >
              No encontré componentes con esos filtros.
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={resetFilters}
                  style={{ marginLeft: "10px", padding: "0.28rem 0.55rem" }}
                >
                  Limpiar filtros
                </button>
              ) : null}
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {filteredComponents.map((comp) => {
                const realIndex = safeComponents.findIndex((item) => item?.id === comp?.id);
                const index = realIndex >= 0 ? realIndex : 0;
                const isEditingNote = editingNotesMap?.[comp.id] === true;
                const noteText = String(comp.note || "").trim();
                const displayName = resolveDisplayName(comp, index);
                const icon = resolveIcon(comp.type);
                const isExpanded = expandedComponentId === comp.id;
                const isHovered = hoveredComponentId === comp.id;

                return (
                  <article
                    key={comp.id}
                    style={{
                      "--component-glow-x": "50%",
                      "--component-glow-y": "50%",
                      position: "relative",
                      margin: 0,
                      borderRadius: "20px",
                      border:
                        isExpanded || isHovered
                          ? "1px solid rgba(34,197,94,0.44)"
                          : "1px solid rgba(148,163,184,0.18)",
                      background: isExpanded
                        ? "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(6,78,59,0.34))"
                        : isHovered
                        ? "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(20,184,166,0.18), rgba(6,78,59,0.16))"
                        : "linear-gradient(135deg, rgba(15,23,42,0.94), rgba(8,47,73,0.16))",
                      boxShadow: isExpanded
                        ? "0 24px 60px rgba(0,0,0,0.34), 0 0 44px rgba(34,197,94,0.16), inset 0 0 0 1px rgba(34,197,94,0.06)"
                        : isHovered
                        ? "0 22px 54px rgba(0,0,0,0.30), 0 0 40px rgba(34,197,94,0.13), inset 0 1px 0 rgba(255,255,255,0.04)"
                        : "0 12px 30px rgba(0,0,0,0.17)",
                      overflow: "hidden",
                      transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                      transition:
                        "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease",
                    }}
                    onMouseEnter={() => setHoveredComponentId(comp.id)}
                    onMouseMove={handleComponentCardMouseMove}
                    onMouseLeave={() =>
                      setHoveredComponentId((prev) => (prev === comp.id ? null : prev))
                    }
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        opacity: isExpanded || isHovered ? 1 : 0,
                        background:
                          "radial-gradient(420px circle at var(--component-glow-x) var(--component-glow-y), rgba(255,255,255,0.16), rgba(34,197,94,0.13) 18%, rgba(20,184,166,0.08) 32%, transparent 58%), radial-gradient(circle at 16% 0%, rgba(34,197,94,0.16), transparent 34%), radial-gradient(circle at 92% 18%, rgba(20,184,166,0.12), transparent 28%)",
                        transition: "opacity 180ms ease",
                        mixBlendMode: "screen",
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => handleToggleExpanded(comp.id)}
                      style={{
                        position: "relative",
                        zIndex: 1,
                        width: "100%",
                        border: "none",
                        background: "transparent",
                        color: "inherit",
                        cursor: "pointer",
                        padding: "15px",
                        display: "grid",
                        gridTemplateColumns: "auto minmax(0, 1fr) auto",
                        gap: "12px",
                        alignItems: "center",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "999px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(34,197,94,0.26)",
                          background:
                            "linear-gradient(135deg, rgba(34,197,94,0.14), rgba(20,184,166,0.06))",
                          fontSize: "1.08rem",
                          boxShadow:
                            isExpanded || isHovered
                              ? "0 0 34px rgba(34,197,94,0.20), inset 0 1px 0 rgba(255,255,255,0.06)"
                              : "none",
                        }}
                      >
                        {icon}
                      </span>

                      <span style={{ minWidth: 0 }}>
                        <span
                          style={{
                            display: "block",
                            color: "#f8fafc",
                            fontSize: "0.99rem",
                            fontWeight: 950,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {displayName}
                        </span>

                        <span
                          style={{
                            marginTop: "0.32rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.48rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.34rem",
                              padding: "0.25rem 0.54rem",
                              borderRadius: "999px",
                              border: "1px solid rgba(148,163,184,0.18)",
                              background: "rgba(2,6,23,0.38)",
                              color: "rgba(226,232,240,0.80)",
                              fontSize: "0.74rem",
                              fontWeight: 850,
                            }}
                          >
                            <span>{icon}</span>
                            <span>{comp.type || "Otro"}</span>
                          </span>

                          <span
                            style={{
                              color: noteText ? "rgba(187,247,208,0.86)" : "rgba(226,232,240,0.48)",
                              fontSize: "0.76rem",
                              fontWeight: 750,
                            }}
                          >
                            {noteText ? "Con nota" : "Sin nota"}
                          </span>

                          <span
                            style={{
                              color: "rgba(226,232,240,0.44)",
                              fontSize: "0.76rem",
                              fontWeight: 750,
                            }}
                          >
                            📷 preparado
                          </span>
                        </span>
                      </span>

                      <span
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "999px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: isExpanded
                            ? "1px solid rgba(34,197,94,0.38)"
                            : "1px solid rgba(148,163,184,0.16)",
                          background: isExpanded ? "rgba(34,197,94,0.13)" : "rgba(2,6,23,0.44)",
                          color: isExpanded ? "#86efac" : "#cbd5e1",
                          fontWeight: 950,
                          transition: "transform 180ms ease, background 180ms ease, border-color 180ms ease",
                          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        }}
                        title={isExpanded ? "Contraer" : "Expandir"}
                      >
                        ›
                      </span>
                    </button>

                    {isExpanded ? (
                      <div
                        style={{
                          position: "relative",
                          zIndex: 1,
                          padding: "0 15px 15px",
                          borderTop: "1px dashed rgba(148,163,184,0.18)",
                          animation: "componentLabFadeIn 160ms ease",
                        }}
                      >
                        <div
                          className="component-lab-edit-grid"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(180px, 1fr) minmax(160px, 0.58fr)",
                            gap: "10px",
                            paddingTop: "14px",
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
                            {componentTypeOptions.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div
                          style={{
                            marginTop: "12px",
                            border: "1px dashed rgba(148,163,184,0.17)",
                            background: "rgba(2,6,23,0.26)",
                            borderRadius: "15px",
                            padding: "11px 12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ color: "rgba(226,232,240,0.72)", fontSize: "0.82rem" }}>
                            📷 Espacio preparado para fotografías del componente.
                          </span>
                          <span style={{ color: "rgba(187,247,208,0.72)", fontSize: "0.78rem", fontWeight: 850 }}>
                            Próxima iteración
                          </span>
                        </div>

                        <div style={{ marginTop: "12px" }}>
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
                                fontWeight: 850,
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
                                padding: "11px 12px",
                                borderRadius: "14px",
                                border: "1px solid rgba(148,163,184,0.16)",
                                background: "rgba(2,6,23,0.36)",
                                color: noteText ? "#e5e7eb" : "rgba(226,232,240,0.50)",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {noteText || "Sin nota. Podés dejarlo así o agregar una observación rápida."}
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            marginTop: "12px",
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            type="button"
                            className="danger-link"
                            onClick={() => draftDeleteComponent(comp.id)}
                          >
                            Borrar componente
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "13px 16px",
            borderTop: "1px solid rgba(148,163,184,0.16)",
            background: "rgba(2,6,23,0.42)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ color: "rgba(226,232,240,0.58)", fontSize: "0.8rem" }}>
            {filteredComponents.length} visible{filteredComponents.length === 1 ? "" : "s"} · {totalComponents} total
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="secondary-btn" onClick={closeComponentsModal}>
              Cancelar
            </button>
            <button type="button" className="primary-btn" onClick={saveComponentsModal}>
              Guardar cambios
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes componentLabFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .component-lab-shell input:focus,
        .component-lab-shell textarea:focus,
        .component-lab-shell select:focus {
          border-color: rgba(34,197,94,0.48) !important;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.10), 0 0 28px rgba(34,197,94,0.08) !important;
        }

        @media (max-width: 720px) {
          .component-lab-edit-grid {
            grid-template-columns: 1fr !important;
          }
        }

      `}</style>
    </div>
  );
}
