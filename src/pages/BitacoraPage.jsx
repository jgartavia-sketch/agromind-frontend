// src/pages/BitacoraPage.jsx
import { useMemo, useState } from "react";

function analyzeEntry(text) {
  const clean = String(text || "").toLowerCase();
  const insights = [];

  const moneyMatches = text.match(/₡\s?[\d.,]+|crc\s?[\d.,]+|colones\s?[\d.,]+/gi);

  if (moneyMatches?.length) {
    insights.push({
      type: "Finanzas",
      title: "Posible movimiento financiero",
      message: `Se detectó un monto: ${moneyMatches.join(", ")}. Podría registrarse como gasto o ingreso.`,
    });
  }

  if (
    clean.includes("compr") ||
    clean.includes("pagu") ||
    clean.includes("factura") ||
    clean.includes("sustrato") ||
    clean.includes("abono") ||
    clean.includes("fertilizante")
  ) {
    insights.push({
      type: "Finanzas",
      title: "Compra o gasto detectado",
      message: "Esta entrada podría alimentar el módulo de Finanzas automáticamente.",
    });
  }

  if (
    clean.includes("pendiente") ||
    clean.includes("faltó") ||
    clean.includes("falta") ||
    clean.includes("mañana") ||
    clean.includes("revisar")
  ) {
    insights.push({
      type: "Tareas",
      title: "Posible tarea pendiente",
      message: "AgroMind podría crear una tarea de seguimiento a partir de esta entrada.",
    });
  }

  if (
    clean.includes("sembr") ||
    clean.includes("trasplant") ||
    clean.includes("germin") ||
    clean.includes("vivero") ||
    clean.includes("pitanga") ||
    clean.includes("pintanga")
  ) {
    insights.push({
      type: "Proceso",
      title: "Actividad agrícola detectada",
      message: "Esta entrada puede asociarse a un proceso productivo o etapa de cultivo.",
    });
  }

  if (clean.includes("riego") || clean.includes("regar") || clean.includes("agua")) {
    insights.push({
      type: "Clima/Tareas",
      title: "Actividad de riego detectada",
      message: "Más adelante se podrá cruzar esta información con lluvia, humedad y temperatura.",
    });
  }

  if (
    clean.includes("mantenimiento") ||
    clean.includes("cerca") ||
    clean.includes("chapia") ||
    clean.includes("limpieza")
  ) {
    insights.push({
      type: "Operación",
      title: "Mantenimiento detectado",
      message: "Puede convertirse en registro operativo o tarea recurrente.",
    });
  }

  if (!insights.length) {
    insights.push({
      type: "IA",
      title: "Entrada guardada",
      message: "No se detectaron acciones automáticas claras todavía, pero queda registrada para análisis futuro.",
    });
  }

  return insights;
}

export default function BitacoraPage() {
  const [entry, setEntry] = useState("");
  const [entries, setEntries] = useState([]);

  const liveInsights = useMemo(() => {
    if (!entry.trim()) return [];
    return analyzeEntry(entry);
  }, [entry]);

  const handleSave = () => {
    const clean = entry.trim();
    if (!clean) return;

    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString("es-CR"),
      time: new Date().toLocaleTimeString("es-CR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      text: clean,
      insights: analyzeEntry(clean),
    };

    setEntries((prev) => [newEntry, ...prev]);
    setEntry("");
  };

  return (
    <div className="page">
      <section className="card">
        <h2>Bitácora de la finca</h2>
        <p style={{ opacity: 0.8 }}>
          Escribe lo que pasó en la finca. AgroMind empieza a leer señales de
          tareas, gastos, procesos y clima.
        </p>

        <textarea
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder="Ej: Hoy trasplantamos 200 pitangas en vivero 2, compramos ₡45.000 en sustrato y quedó pendiente revisar el riego."
          style={{
            width: "100%",
            minHeight: "170px",
            marginTop: "1rem",
            padding: "1rem",
            borderRadius: "16px",
            border: "1px solid #334155",
            background: "#020617",
            color: "#e5e7eb",
            resize: "vertical",
            boxSizing: "border-box",
            lineHeight: 1.5,
          }}
        />

        {liveInsights.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <h3 style={{ marginBottom: "0.75rem" }}>Interpretación IA</h3>

            <div style={{ display: "grid", gap: "0.75rem" }}>
              {liveInsights.map((item, index) => (
                <div
                  key={`${item.type}-${index}`}
                  style={{
                    border: "1px solid #1e293b",
                    borderRadius: "14px",
                    padding: "0.9rem",
                    background: "rgba(15, 23, 42, 0.72)",
                  }}
                >
                  <strong>{item.type} · {item.title}</strong>
                  <p style={{ margin: "0.4rem 0 0", opacity: 0.82 }}>
                    {item.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

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
            <div
              key={item.id}
              style={{
                borderTop: "1px solid #1e293b",
                padding: "1rem 0",
              }}
            >
              <strong>
                {item.date} · {item.time}
              </strong>

              <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>

              {Array.isArray(item.insights) && item.insights.length > 0 && (
                <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.75rem" }}>
                  {item.insights.map((insight, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      style={{
                        border: "1px solid #1e293b",
                        borderRadius: "12px",
                        padding: "0.75rem",
                        background: "rgba(2, 6, 23, 0.5)",
                      }}
                    >
                      <strong>{insight.type}</strong>
                      <p style={{ margin: "0.35rem 0 0", opacity: 0.82 }}>
                        {insight.title}: {insight.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}