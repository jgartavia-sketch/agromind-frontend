// src/components/farm/FarmSummary.jsx
import React from "react";

export default function FarmSummary({
  pointCount = 0,
  // ✅ filtros opcionales (si no se pasan, no revientan nada)
  isActiveFilter = () => false,
  onSetFilter = null,
}) {
  const canFilter = typeof onSetFilter === "function";

  const btnBase = "summary-chip summary-btn";
  const active = (k) => (isActiveFilter(k) ? " active" : "");

  return (
    <>
      {/* PUNTOS */}
      <button
        type="button"
        className={btnBase + active("point")}
        aria-pressed={!!isActiveFilter("point")}
        title={canFilter ? "Filtrar: Puntos" : "Puntos"}
        onClick={() => {
          if (!canFilter) return;
          onSetFilter((prev) => ({
            kind: prev?.kind === "point" ? "all" : "point",
            status: null,
          }));
        }}
        style={{ cursor: canFilter ? "pointer" : "default" }}
      >
        <span className="summary-dot dot-point" />
        <span className="summary-label">
          {pointCount} {pointCount === 1 ? "punto" : "puntos"}
        </span>
      </button>
    </>
  );
}