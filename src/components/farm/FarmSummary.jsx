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
<button
  type="button"
  className={"summary-chip summary-btn" + (isActiveFilter("point") ? " active" : "")}
  onClick={setFilterPoints}
  aria-pressed={isActiveFilter("point")}
  title="Ver solo puntos"
>
  <span className="summary-dot dot-point" />
  <span className="summary-label">
    {pointCount} {pointCount === 1 ? "punto" : "puntos"}
  </span>
</button>