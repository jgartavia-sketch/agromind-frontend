// src/pages/BitacoraPage.jsx
import { useState } from "react";

export default function BitacoraPage() {
  const [entry, setEntry] = useState("");
  const [entries, setEntries] = useState([]);

  const handleSave = () => {
    const clean = entry.trim();
    if (!clean) return;

    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString("es-CR"),
      text: clean,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setEntry("");
  };

  return (
    <div className="page">
      <section className="card">
        <h2>Bitácora de la finca</h2>
        <p style={{ opacity: 0.8 }}>
          Registra lo que pasó hoy. Luego AgroMind usará esta información para sugerir tareas, finanzas y procesos.
        </p>

        <textarea
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder="Ej: Hoy trasplantamos 200 pitangas, compramos ₡45.000 en sustrato y quedó pendiente revisar el riego."
          style={{
            width: "100%",
            minHeight: "160px",
            marginTop: "1rem",
            padding: "1rem",
            borderRadius: "16px",
            border: "1px solid #334155",
            background: "#020617",
            color: "#e5e7eb",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />

        <button
          type="button"
          className="primary-btn"
          onClick={handleSave}
          style={{ marginTop: "1rem" }}
        >
          Guardar entrada
        </button>
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h3>Historial</h3>

        {entries.length === 0 ? (
          <p style={{ opacity: 0.75 }}>Todavía no hay entradas registradas.</p>
        ) : (
          entries.map((item) => (
            <div key={item.id} style={{ borderTop: "1px solid #1e293b", padding: "1rem 0" }}>
              <strong>{item.date}</strong>
              <p>{item.text}</p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}