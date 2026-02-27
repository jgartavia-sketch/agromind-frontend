// src/components/map/MapToolbar.jsx

export default function MapToolbar({
  searchQuery,
  setSearchQuery,
  searchLoading,
  searchError,
  searchResults,
  showResults,
  setShowResults,
  onSubmit,
  onPick,
  drawMode,
  setDrawMode,
  onSaveView,
}) {
  return (
    <div className="farm-map-toolbar" style={{ gap: "0.75rem" }}>
      <div className="agromind-search-wrap" style={{ position: "relative", flex: 1, maxWidth: 560 }}>
        <form onSubmit={onSubmit} style={{ display: "flex", gap: "0.5rem" }}>
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Buscar lugar (ej: Ciudad Quesada, Dulce Nombre, San Carlos...)"
            style={{
              flex: 1,
              padding: "0.65rem 0.8rem",
              borderRadius: "999px",
              border: "1px solid rgba(148,163,184,0.25)",
              background: "rgba(2,6,23,0.35)",
              color: "#e5e7eb",
              outline: "none",
            }}
          />
          <button
            type="submit"
            className="secondary-btn"
            style={{ whiteSpace: "nowrap" }}
            disabled={searchLoading || searchQuery.trim().length < 3}
          >
            {searchLoading ? "Buscando..." : "Ir"}
          </button>
        </form>

        {searchError ? (
          <div style={{ marginTop: "0.35rem", color: "#fca5a5", fontSize: "0.9rem" }}>{searchError}</div>
        ) : null}

        {showResults && searchResults.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              zIndex: 50,
              background: "rgba(2,6,23,0.96)",
              border: "1px solid rgba(148,163,184,0.25)",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            {searchResults.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onPick(r)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "0.7rem 0.85rem",
                  background: "transparent",
                  color: "#e5e7eb",
                  border: "none",
                  cursor: "pointer",
                  display: "block",
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                {r.place_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="farm-map-tools-left">
        <button type="button" className={drawMode === "move" ? "tool-btn active" : "tool-btn"} onClick={() => setDrawMode("move")}>
          Mover
        </button>
        <button type="button" className={drawMode === "point" ? "tool-btn active" : "tool-btn"} onClick={() => setDrawMode("point")}>
          Punto
        </button>
        <button type="button" className={drawMode === "line" ? "tool-btn active" : "tool-btn"} onClick={() => setDrawMode("line")}>
          Línea
        </button>
        <button type="button" className={drawMode === "polygon" ? "tool-btn active" : "tool-btn"} onClick={() => setDrawMode("polygon")}>
          Zona
        </button>
      </div>

      <button type="button" className="primary-btn" onClick={onSaveView}>
        Usar esta vista como mi finca
      </button>
    </div>
  );
}