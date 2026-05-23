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
          Escribe lo que ocurrió en la finca. AgroMind analiza acciones, costos,
          cultivos, zonas, riesgos, tareas y procesos.
        </p>

        <textarea
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder="Ej: Hoy chapié dos horas en el vivero, usé un litro de gasolina y revisé la germinación de pitanga. Salieron 28 plántulas."
          style={textareaStyle}
        />

        {liveAnalysis && (
          <AnalysisPanel
            analysis={liveAnalysis}
            title="Interpretación inteligente"
          />
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
        <SummaryChip
          label="Cultivos"
          value={summary.crops?.join(", ") || "No detectado"}
        />
        <SummaryChip
          label="Zonas"
          value={summary.zones?.join(", ") || "No detectado"}
        />
        <SummaryChip
          label="Módulos"
          value={summary.modules?.join(", ") || "Bitácora"}
        />
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

      <SmartQuestionFlow questions={analysis.smartQuestions || []} />

      <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
        {insights.map((item, index) => (
          <InsightCard key={`${item.type}-${item.title}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function SmartQuestionFlow({ questions }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answered, setAnswered] = useState([]);
  const [ignored, setIgnored] = useState([]);

  if (!Array.isArray(questions) || questions.length === 0) return null;

  const currentQuestion = questions[currentIndex];
  const isDone = currentIndex >= questions.length;

  const handleAnswer = () => {
    const clean = answer.trim();
    if (!clean) return;

    setAnswered((prev) => [
      ...prev,
      {
        question: currentQuestion,
        answer: clean,
      },
    ]);

    setAnswer("");
    setCurrentIndex((prev) => prev + 1);
  };

  const handleIgnore = () => {
    setIgnored((prev) => [...prev, currentQuestion]);
    setAnswer("");
    setCurrentIndex((prev) => prev + 1);
  };

  return (
    <div style={questionBoxStyle}>
      <strong>Preguntas inteligentes</strong>

      {!isDone ? (
        <div style={{ marginTop: "0.75rem" }}>
          <p style={{ margin: "0 0 0.7rem", fontSize: "1.05rem" }}>
            {currentIndex + 1}. {currentQuestion}
          </p>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Escriba la respuesta aquí..."
            style={answerTextareaStyle}
          />

          <div style={questionActionsStyle}>
            <button
              type="button"
              className="primary-btn"
              onClick={handleAnswer}
              disabled={!answer.trim()}
            >
              Responder
            </button>

            <button type="button" onClick={handleIgnore} style={secondaryButtonStyle}>
              Ignorar
            </button>
          </div>

          <p style={{ marginTop: "0.6rem", opacity: 0.6, fontSize: "0.9rem" }}>
            Pregunta {currentIndex + 1} de {questions.length}
          </p>
        </div>
      ) : (
        <p style={{ margin: "0.75rem 0 0", opacity: 0.82 }}>
          Flujo de preguntas completado.
        </p>
      )}

      {(answered.length > 0 || ignored.length > 0) && (
        <div style={{ marginTop: "0.9rem", display: "grid", gap: "0.5rem" }}>
          {answered.map((item, index) => (
            <div key={`answered-${index}`} style={answerCardStyle}>
              <strong>{item.question}</strong>
              <p style={{ margin: "0.35rem 0 0", opacity: 0.82 }}>
                {item.answer}
              </p>
            </div>
          ))}

          {ignored.map((item, index) => (
            <div key={`ignored-${index}`} style={ignoredCardStyle}>
              <strong>Pregunta ignorada</strong>
              <p style={{ margin: "0.35rem 0 0", opacity: 0.75 }}>{item}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InsightCard({ item }) {
  return (
    <div style={insightCardStyle}>
      <strong>
        {getSeverityIcon(item.severity)} {item.type} · {item.title}
      </strong>

      <p style={{ margin: "0.4rem 0 0", opacity: 0.82 }}>{item.message}</p>

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

const answerTextareaStyle = {
  width: "100%",
  minHeight: "90px",
  padding: "0.85rem",
  borderRadius: "14px",
  border: "1px solid #334155",
  background: "#020617",
  color: "#e5e7eb",
  resize: "vertical",
  boxSizing: "border-box",
  lineHeight: 1.45,
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

const questionActionsStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.65rem",
  marginTop: "0.75rem",
};

const secondaryButtonStyle = {
  border: "1px solid #334155",
  borderRadius: "999px",
  padding: "0.65rem 1rem",
  background: "rgba(15, 23, 42, 0.88)",
  color: "#e5e7eb",
  cursor: "pointer",
};

const answerCardStyle = {
  border: "1px solid rgba(34, 197, 94, 0.28)",
  borderRadius: "12px",
  padding: "0.75rem",
  background: "rgba(20, 83, 45, 0.14)",
};

const ignoredCardStyle = {
  border: "1px solid rgba(148, 163, 184, 0.25)",
  borderRadius: "12px",
  padding: "0.75rem",
  background: "rgba(15, 23, 42, 0.5)",
};

const insightCardStyle = {
  border: "1px solid #1e293b",
  borderRadius: "14px",
  padding: "0.9rem",
  background: "rgba(15, 23, 42, 0.72)",
};