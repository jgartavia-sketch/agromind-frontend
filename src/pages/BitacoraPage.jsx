// src/pages/BitacoraPage.jsx
import { useMemo, useState } from "react";
import { analyzeEntry } from "../lib/bitacora/analyzer";
import { formatCRC } from "../lib/bitacora/costEngine";
import {
  analyzeAnswer,
  buildDetectedActivities,
  buildFinalActions,
  getExtraQuestionsFromAnswer,
} from "../lib/bitacora/conversationEngine";

export default function BitacoraPage() {
  const [entry, setEntry] = useState("");
  const [entries, setEntries] = useState([]);

  const liveAnalysis = useMemo(() => {
    if (!entry.trim()) return null;
    return analyzeEntry(entry);
  }, [entry]);

  const handleFinalSave = (conversationResult) => {
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
      conversationResult,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setEntry("");
  };

  return (
    <div className="page">
      <section className="card">
        <h2>Bitácora inteligente de la finca</h2>

        <p style={{ opacity: 0.8 }}>
          Escribe lo que ocurrió. AgroMind detecta actividades, pregunta solo lo
          necesario y al final sugiere acciones.
        </p>

        <textarea
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder="Ej: Hoy sembré pitanga en el vivero. Salieron 28 plántulas y quedó pendiente revisar riego."
          style={textareaStyle}
        />

        {liveAnalysis && (
          <ConversationPanel
            key={entry}
            entry={entry}
            analysis={liveAnalysis}
            onFinalSave={handleFinalSave}
          />
        )}
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
              <p style={{ opacity: 0.75 }}>
                Actividades confirmadas:{" "}
                {item.conversationResult?.confirmedActivities?.length || 0}
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function ConversationPanel({ entry, analysis, onFinalSave }) {
  const detectedActivities = useMemo(
    () => buildDetectedActivities(analysis),
    [analysis]
  );

  const [activityIndex, setActivityIndex] = useState(0);
  const [confirmedActivities, setConfirmedActivities] = useState([]);
  const [ignoredActivities, setIgnoredActivities] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState([]);
  const [phase, setPhase] = useState("confirming");

  const currentActivity = detectedActivities[activityIndex];
  const currentQuestion = questions[questionIndex];

  const handleConfirmActivity = () => {
    const nextConfirmed = [...confirmedActivities, currentActivity];
    const newQuestions = [
      ...questions,
      ...(currentActivity.questions || []),
    ].filter((question, index, array) => array.indexOf(question) === index);

    setConfirmedActivities(nextConfirmed);
    setQuestions(newQuestions);
    moveToNextActivity();
  };

  const handleIgnoreActivity = () => {
    setIgnoredActivities((prev) => [...prev, currentActivity]);
    moveToNextActivity();
  };

  const moveToNextActivity = () => {
    const nextIndex = activityIndex + 1;

    if (nextIndex < detectedActivities.length) {
      setActivityIndex(nextIndex);
      return;
    }

    setPhase("questions");
  };

  const handleAnswerQuestion = () => {
    const clean = answer.trim();
    if (!clean) return;

    const answerAnalysis = analyzeAnswer(clean);
    const extraQuestions = getExtraQuestionsFromAnswer(answerAnalysis, questions);

    setAnswers((prev) => [
      ...prev,
      {
        question: currentQuestion,
        answer: clean,
        analysis: answerAnalysis,
      },
    ]);

    setQuestions((prev) => [...prev, ...extraQuestions]);
    setAnswer("");

    const nextIndex = questionIndex + 1;
    if (nextIndex < questions.length + extraQuestions.length) {
      setQuestionIndex(nextIndex);
    } else {
      setPhase("final");
    }
  };

  const handleIgnoreQuestion = () => {
    const nextIndex = questionIndex + 1;
    setAnswer("");

    if (nextIndex < questions.length) {
      setQuestionIndex(nextIndex);
    } else {
      setPhase("final");
    }
  };

  const finalActions = buildFinalActions({
    baseAnalysis: analysis,
    confirmedActivities,
    answers,
  });

  if (!detectedActivities.length) {
    return (
      <div style={questionBoxStyle}>
        <strong>Entrada lista para guardar</strong>
        <p style={{ opacity: 0.8 }}>
          No se detectaron actividades claras. Puede guardar la entrada como
          registro general.
        </p>

        <button
          type="button"
          className="primary-btn"
          onClick={() =>
            onFinalSave({
              entry,
              analysis,
              confirmedActivities: [],
              ignoredActivities: [],
              answers: [],
              finalActions: {},
            })
          }
        >
          Guardar en Bitácora
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      {phase === "confirming" && currentActivity && (
        <div style={activityBoxStyle}>
          <strong>
            {getSeverityIcon(currentActivity.severity)} Actividad detectada
          </strong>

          <h3 style={{ margin: "0.5rem 0" }}>{currentActivity.title}</h3>

          <p style={{ opacity: 0.78 }}>
            ¿Esta actividad realmente ocurrió en la finca?
          </p>

          <div style={questionActionsStyle}>
            <button
              type="button"
              className="primary-btn"
              onClick={handleConfirmActivity}
            >
              Confirmar actividad
            </button>

            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={handleIgnoreActivity}
            >
              Ignorar
            </button>
          </div>

          <p style={{ opacity: 0.55, fontSize: "0.9rem" }}>
            Actividad {activityIndex + 1} de {detectedActivities.length}
          </p>
        </div>
      )}

      {phase === "questions" && (
        <div style={questionBoxStyle}>
          {currentQuestion ? (
            <>
              <strong>Pregunta inteligente</strong>

              <p style={{ fontSize: "1.05rem" }}>{currentQuestion}</p>

              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Responda aquí..."
                style={answerTextareaStyle}
              />

              <div style={questionActionsStyle}>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={!answer.trim()}
                  onClick={handleAnswerQuestion}
                >
                  Responder
                </button>

                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={handleIgnoreQuestion}
                >
                  Ignorar pregunta
                </button>
              </div>

              <p style={{ opacity: 0.55, fontSize: "0.9rem" }}>
                Pregunta {questionIndex + 1} de {questions.length}
              </p>
            </>
          ) : (
            <FinalActions
              analysis={analysis}
              confirmedActivities={confirmedActivities}
              ignoredActivities={ignoredActivities}
              answers={answers}
              finalActions={finalActions}
              onFinalSave={onFinalSave}
            />
          )}
        </div>
      )}

      {phase === "final" && (
        <FinalActions
          analysis={analysis}
          confirmedActivities={confirmedActivities}
          ignoredActivities={ignoredActivities}
          answers={answers}
          finalActions={finalActions}
          onFinalSave={onFinalSave}
        />
      )}

      {answers.length > 0 && (
        <div style={answersBoxStyle}>
          <strong>Respuestas registradas</strong>

          {answers.map((item, index) => (
            <div key={`${item.question}-${index}`} style={answerCardStyle}>
              <strong>{item.question}</strong>
              <p style={{ margin: "0.35rem 0 0", opacity: 0.82 }}>
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FinalActions({
  analysis,
  confirmedActivities,
  ignoredActivities,
  answers,
  finalActions,
  onFinalSave,
}) {
  return (
    <div style={finalBoxStyle}>
      <strong>Resumen final</strong>

      <p style={{ opacity: 0.82 }}>
        Actividades confirmadas: {confirmedActivities.length}. Actividades
        ignoradas: {ignoredActivities.length}. Respuestas: {answers.length}.
      </p>

      {analysis?.costEstimate?.hasEstimate && (
        <div style={costBoxStyle}>
          <strong>Estimación financiera inicial</strong>
          <p style={{ margin: "0.35rem 0 0" }}>
            {formatCRC(analysis.costEstimate.total)}
          </p>
        </div>
      )}

      <div style={questionActionsStyle}>
        <button
          type="button"
          className="primary-btn"
          onClick={() =>
            onFinalSave({
              analysis,
              confirmedActivities,
              ignoredActivities,
              answers,
              finalActions,
            })
          }
        >
          Guardar en Bitácora
        </button>

        {finalActions.hasFinance && (
          <button type="button" style={actionButtonStyle}>
            Registrar en Finanzas
          </button>
        )}

        {finalActions.hasTasks && (
          <button type="button" style={actionButtonStyle}>
            Crear tarea
          </button>
        )}

        {finalActions.hasProcesses && (
          <button type="button" style={actionButtonStyle}>
            Actualizar proceso
          </button>
        )}
      </div>
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

const activityBoxStyle = {
  border: "1px solid rgba(34, 197, 94, 0.35)",
  borderRadius: "16px",
  padding: "1rem",
  background: "rgba(20, 83, 45, 0.16)",
};

const questionBoxStyle = {
  border: "1px solid rgba(59, 130, 246, 0.35)",
  borderRadius: "16px",
  padding: "1rem",
  background: "rgba(30, 64, 175, 0.14)",
};

const finalBoxStyle = {
  border: "1px solid rgba(34, 197, 94, 0.35)",
  borderRadius: "16px",
  padding: "1rem",
  background: "rgba(20, 83, 45, 0.18)",
};

const costBoxStyle = {
  border: "1px solid rgba(34, 197, 94, 0.35)",
  borderRadius: "14px",
  padding: "0.9rem",
  background: "rgba(20, 83, 45, 0.18)",
  margin: "0.75rem 0",
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

const actionButtonStyle = {
  border: "1px solid rgba(34, 197, 94, 0.45)",
  borderRadius: "999px",
  padding: "0.65rem 1rem",
  background: "rgba(22, 163, 74, 0.18)",
  color: "#e5e7eb",
  cursor: "pointer",
};

const answersBoxStyle = {
  marginTop: "0.9rem",
  display: "grid",
  gap: "0.5rem",
};

const answerCardStyle = {
  border: "1px solid rgba(34, 197, 94, 0.28)",
  borderRadius: "12px",
  padding: "0.75rem",
  background: "rgba(20, 83, 45, 0.14)",
};