// src/pages/BitacoraPage.jsx
import { useMemo, useState } from "react";
import { analyzeEntry } from "../lib/bitacora/analyzer";
import { formatCRC } from "../lib/bitacora/costEngine";

export default function BitacoraPage() {
  const [entry, setEntry] = useState("");
  const [entries, setEntries] = useState([]);

  const liveAnalysis = useMemo(() => {
    if (!entry.trim()) return null;
    return analyzeEntry(entry);
  }, [entry]);

  const handleSave = () => {
    const clean = entry.trim();
    if (!clean) return;

    const analysis = analyzeEntry(clean);

    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString("es-CR"),
      time: new Date().toLocaleTimeString("es-CR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      text: clean,
      analysis,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setEntry("");
  };

  return (
    <div className="page">
      <section className="card">
        <h2>Bitácora inteligente de la finca</h2>

        <p style={{ opacity: 0.8 }}>
          Escribe lo que ocurrió en la finca. AgroMind analiza acciones,
          costos, cultivos, zonas, riesgos, tareas y procesos.
        </p>

        <textarea
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder="Ej: Hoy chapié dos horas en el vivero, usé un litro de gasolina y revisé la germinación de pitanga. Salieron 28 plántulas."
          style={textareaStyle}
        />

        {liveAnalysis && (
          <AnalysisPanel analysis={liveAnalysis} title="Interpretación inteligente" />
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
            <div key={item.id} style={historyItemStyle}>
              <strong>
                {item.date} · {item.time}
              </strong>

              <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>

              <AnalysisPanel analysis={item.analysis} compact />
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function AnalysisPanel({ analysis, title, compact = false }) {
  if (!analysis) return null;

  const insights = analysis.insights || [];
  const summary = analysis.summary || {};
  const costEstimate = analysis.costEstimate;

  return (
    <div style={{ marginTop: compact ? "0.75rem" : "1rem" }}>
      {!compact && <h3 style={{ marginBottom: "0.75rem" }}>{title}</h3>}

      <div style={summaryGridStyle}>
        <SummaryChip label="Severidad" value={summary.highestSeverity || "baja"} />
        <SummaryChip label="Cultivos" value={summary.crops?.join(", ") || "No detectado"} />
        <SummaryChip label="Zonas" value={summary.zones?.join(", ") || "No detectado"} />
        <SummaryChip label="Módulos" value={summary.modules?.join(", ") || "Bitácora"} />
      </div>

      {costEstimate?.hasEstimate && (
        <div style={costBoxStyle}>
          <strong>Estimación financiera</strong>

          <p style={{ margin: "0.4rem 0", opacity: 0.85 }}>
            Total estimado: <strong>{formatCRC(costEstimate.total)}</strong>
          </p>

          <div style={{ display: "grid", gap: "0.35rem" }}>
            {costEstimate.lines.map((line, index) => (
              <div key={`${line.label}-${index}`} style={{ opacity: 0.82 }}>
                {line.label}: {formatCRC(line.amount)} · {line.detail}
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(analysis.smartQuestions) && analysis.smartQuestions.length > 0 && (
        <div style={questionBoxStyle}>
          <strong>Preguntas inteligentes sugeridas</strong>

          <ul style={listStyle}>
            {analysis.smartQuestions.map((question, index) => (
              <li key={`smart-question-${index}`}>{question}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
        {insights.map((item, index) => (
          <InsightCard key={`${item.type}-${item.title}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ item }) {
  return (
    <div style={insightCardStyle}>
      <strong>
        {getSeverityIcon(item.severity)} {item.type} · {item.title}
      </strong>

      <p style={{ margin: "0.4rem 0 0", opacity: 0.82 }}>
        {item.message}
      </p>

      {Array.isArray(item.matchedKeywords) && item.matchedKeywords.length > 0 && (
        <p style={{ margin: "0.45rem 0 0", opacity: 0.65, fontSize: "0.9rem" }}>
          Señales: {item.matchedKeywords.join(", ")}
        </p>
      )}

      {Array.isArray(item.modules) && item.modules.length > 0 && (
        <p style={{ margin: "0.35rem 0 0", opacity: 0.65, fontSize: "0.9rem" }}>
          Módulos sugeridos: {item.modules.join(", ")}
        </p>
      )}
    </div>
  );
}

function SummaryChip({ label, value }) {
  return (
    <div style={summaryChipStyle}>
      <span style={{ opacity: 0.65, fontSize: "0.78rem" }}>{label}</span>
      <strong style={{ fontSize: "0.9rem" }}>{value}</strong>
    </div>
  );
}

function getSeverityIcon(severity) {
  if (severity === "alta") return "⚠️";
  if (severity === "media") return "🟡";
  return "🟢";
}

const textareaStyle = {
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
};

const historyItemStyle = {
  borderTop: "1px solid #1e293b",
  padding: "1rem 0",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "0.65rem",
  marginBottom: "0.85rem",
};

const summaryChipStyle = {
  border: "1px solid #1e293b",
  borderRadius: "14px",
  padding: "0.75rem",
  background: "rgba(2, 6, 23, 0.45)",
  display: "grid",
  gap: "0.25rem",
};

const costBoxStyle = {
  border: "1px solid rgba(34, 197, 94, 0.35)",
  borderRadius: "14px",
  padding: "0.9rem",
  background: "rgba(20, 83, 45, 0.18)",
  marginBottom: "0.75rem",
};

const questionBoxStyle = {
  border: "1px solid rgba(59, 130, 246, 0.35)",
  borderRadius: "14px",
  padding: "0.9rem",
  background: "rgba(30, 64, 175, 0.14)",
  marginBottom: "0.75rem",
};

const insightCardStyle = {
  border: "1px solid #1e293b",
  borderRadius: "14px",
  padding: "0.9rem",
  background: "rgba(15, 23, 42, 0.72)",
};

const listStyle = {
  margin: "0.5rem 0 0",
  paddingLeft: "1.2rem",
  opacity: 0.84,
};