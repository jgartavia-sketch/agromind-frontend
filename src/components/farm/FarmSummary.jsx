// src/components/FarmSummary.jsx

export default function FarmSummary({ pointCount = 0 }) {
  return (
    <div className="summary-chip">
      <span className="summary-dot dot-point" />
      <span className="summary-label">
        {pointCount} {pointCount === 1 ? "punto" : "puntos"}
      </span>
    </div>
  );
}
