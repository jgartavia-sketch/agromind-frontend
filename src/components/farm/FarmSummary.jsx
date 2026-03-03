// src/components/farm/FarmSummary.jsx
import React from "react";

export default function FarmSummary({
  pointCount = 0,
  lineCount = 0,
  zoneCount = 0,
  operativeCount = 0,
  priorityCount = 0,

  // ✅ filtros opcionales (si no se pasan, no revientan nada)
  isActiveFilter = () => false,
  onSetFilter = null,
}) {
  const canFilter = typeof onSetFilter === "function";

  const btnBase = "summary-chip summary-btn";
  const active = (k) => (isActiveFilter(k) ? " active" : "");

  const toggleKind = (kind) => {
    if (!canFilter) return;
    onSetFilter((prev) => ({
      kind: prev?.kind === kind ? "all" : kind,
      status: null,
    }));
  };

  const toggleStatus = (status) => {
    if (!canFilter) return;
    onSetFilter((prev) => {
      const nextStatus = prev?.status === status ? null : status;
      return {
        // al filtrar por estado, dejamos kind en "all" para no mezclar rarezas
        kind: "all",
        status: nextStatus,
      };
    });
  };

  const cursorStyle = { cursor: canFilter ? "pointer" : "default" };

  return (
    <>
      {/* PUNTOS */}
      <button
        type="button"
        className={btnBase + active("point")}
        aria-pressed={!!isActiveFilter("point")}
        title={canFilter ? "Filtrar: Puntos" : "Puntos"}
        onClick={() => toggleKind("point")}
        style={cursorStyle}
      >
        <span className="summary-dot dot-point" />
        <span className="summary-label">
          {pointCount} {pointCount === 1 ? "punto" : "puntos"}
        </span>
      </button>

      {/* LÍNEAS */}
      <button
        type="button"
        className={btnBase + active("line")}
        aria-pressed={!!isActiveFilter("line")}
        title={canFilter ? "Filtrar: Líneas" : "Líneas"}
        onClick={() => toggleKind("line")}
        style={cursorStyle}
      >
        <span className="summary-dot dot-line" />
        <span className="summary-label">
          {lineCount} {lineCount === 1 ? "línea" : "líneas"}
        </span>
      </button>

      {/* ZONAS */}
      <button
        type="button"
        className={btnBase + active("zone")}
        aria-pressed={!!isActiveFilter("zone")}
        title={canFilter ? "Filtrar: Zonas" : "Zonas"}
        onClick={() => toggleKind("zone")}
        style={cursorStyle}
      >
        <span className="summary-dot dot-zone" />
        <span className="summary-label">
          {zoneCount} {zoneCount === 1 ? "zona" : "zonas"}
        </span>
      </button>

      {/* OPERATIVAS (status filter) */}
      <button
        type="button"
        className={btnBase + active("operative")}
        aria-pressed={!!isActiveFilter("operative")}
        title={canFilter ? "Filtrar: Operativas" : "Operativas"}
        onClick={() => toggleStatus("Operativa")}
        style={cursorStyle}
      >
        <span className="summary-dot dot-operative" />
        <span className="summary-label">
          {operativeCount} operativas
        </span>
      </button>

      {/* CON PRIORIDAD (status filter) */}
      <button
        type="button"
        className={btnBase + active("priority")}
        aria-pressed={!!isActiveFilter("priority")}
        title={canFilter ? "Filtrar: Con prioridad" : "Con prioridad"}
        onClick={() => toggleStatus("Prioridad")}
        style={cursorStyle}
      >
        <span className="summary-dot dot-priority" />
        <span className="summary-label">
          {priorityCount} con prioridad
        </span>
      </button>

      {/* ❌ ELIMINADOS A PROPÓSITO:
          - "Cosecha próxima"
          - "Backend OK"
          Producción no necesita humo, necesita señales útiles.
      */}
    </>
  );
}