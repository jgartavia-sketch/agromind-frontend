// src/pages/BitacoraPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFarm } from "../context/FarmContext";
import {
  createBitacoraEntry,
  loadBitacoraEntries,
} from "../services/bitacoraService";

const MONTH_FORMATTER = new Intl.DateTimeFormat("es-CR", {
  month: "long",
  year: "numeric",
});

const DAY_FORMATTER = new Intl.DateTimeFormat("es-CR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("es-CR", {
  hour: "2-digit",
  minute: "2-digit",
});

export default function BitacoraPage() {
  const navigate = useNavigate();
  const { activeFarm, farmId, farmName } = useFarm();

  const [entry, setEntry] = useState("");
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const groupedEntries = useMemo(
    () => groupEntriesByDate(entries),
    [entries]
  );

  useEffect(() => {
    let isMounted = true;

    async function fetchEntries() {
      if (!farmId) {
        setEntries([]);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const data = await loadBitacoraEntries(farmId);

        if (isMounted) {
          setEntries(Array.isArray(data) ? data : []);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError?.message ||
              "No se pudo cargar la Bitácora."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchEntries();

    return () => {
      isMounted = false;
    };
  }, [farmId]);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage("");
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const handleSave = async () => {
    const cleanText = entry.trim();

    if (!farmId) {
      setError("Seleccioná una finca activa antes de guardar.");
      return;
    }

    if (!cleanText || isSaving) return;

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const savedEntry = await createBitacoraEntry({
        farmId,
        text: cleanText,
      });

      setEntries((currentEntries) => [
        savedEntry,
        ...currentEntries.filter(
          (item) => item.id !== savedEntry?.id
        ),
      ]);

      setEntry("");
      setSuccessMessage("Nota guardada correctamente.");
    } catch (requestError) {
      setError(
        requestError?.message ||
          "No se pudo guardar la nota."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page">
      <section style={activeFarmBannerStyle}>
        <div style={activeFarmBannerLeftStyle}>
          <div style={activeFarmLabelStyle}>🌱 Finca activa</div>

          <div style={activeFarmNameStyle}>
            {farmName || activeFarm?.name || "Finca activa"}
          </div>
        </div>

        <p style={activeFarmTextStyle}>
          Todas las anotaciones pertenecen únicamente a esta finca.
          Para trabajar en otra, cambiá la finca activa desde el mapa.
        </p>
      </section>

      <section className="card">
        <h2 style={titleStyle}>Bitácora</h2>

        <textarea
          value={entry}
          onChange={(event) => setEntry(event.target.value)}
          placeholder="Escribí lo que ocurrió en la finca..."
          style={textareaStyle}
          disabled={!farmId || isSaving}
        />

        <div style={actionsStyle}>
          <button
            type="button"
            className="primary-btn"
            onClick={handleSave}
            disabled={!farmId || !entry.trim() || isSaving}
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>

          <button
            type="button"
            style={secondaryActionStyle}
            onClick={() => navigate("/tareas")}
          >
            Crear tarea
          </button>

          <button
            type="button"
            style={secondaryActionStyle}
            onClick={() => navigate("/finanzas")}
          >
            Agregar movimiento
          </button>
        </div>

        {successMessage && (
          <div style={successStyle}>
            ✓ {successMessage}
          </div>
        )}

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}
      </section>

      <section className="card" style={historySectionStyle}>
        <div style={historyHeaderStyle}>
          <h3 style={{ margin: 0 }}>Historial</h3>

          {!isLoading && entries.length > 0 && (
            <span style={entriesCountStyle}>
              {entries.length}{" "}
              {entries.length === 1 ? "nota" : "notas"}
            </span>
          )}
        </div>

        {isLoading ? (
          <p style={emptyStateStyle}>Cargando Bitácora...</p>
        ) : groupedEntries.length === 0 ? (
          <p style={emptyStateStyle}>
            Todavía no hay notas registradas.
          </p>
        ) : (
          <div style={accordionListStyle}>
            {groupedEntries.map((monthGroup, monthIndex) => (
              <details
                key={monthGroup.key}
                open={monthIndex === 0}
                style={monthAccordionStyle}
              >
                <summary style={monthSummaryStyle}>
                  <span>{capitalize(monthGroup.label)}</span>
                  <span style={groupCountStyle}>
                    {monthGroup.count}
                  </span>
                </summary>

                <div style={monthContentStyle}>
                  {monthGroup.weeks.map((weekGroup, weekIndex) => (
                    <details
                      key={weekGroup.key}
                      open={monthIndex === 0 && weekIndex === 0}
                      style={weekAccordionStyle}
                    >
                      <summary style={weekSummaryStyle}>
                        <span>{weekGroup.label}</span>
                        <span style={groupCountStyle}>
                          {weekGroup.count}
                        </span>
                      </summary>

                      <div style={weekContentStyle}>
                        {weekGroup.days.map((dayGroup, dayIndex) => (
                          <details
                            key={dayGroup.key}
                            open={
                              monthIndex === 0 &&
                              weekIndex === 0 &&
                              dayIndex === 0
                            }
                            style={dayAccordionStyle}
                          >
                            <summary style={daySummaryStyle}>
                              <span>{capitalize(dayGroup.label)}</span>
                              <span style={groupCountStyle}>
                                {dayGroup.entries.length}
                              </span>
                            </summary>

                            <div style={dayContentStyle}>
                              {dayGroup.entries.map((item) => (
                                <article
                                  key={item.id}
                                  style={entryCardStyle}
                                >
                                  <time style={timeStyle}>
                                    {formatEntryTime(item)}
                                  </time>

                                  <p style={entryTextStyle}>
                                    {item.text}
                                  </p>
                                </article>
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function groupEntriesByDate(entries) {
  const sortedEntries = [...entries].sort(
    (first, second) =>
      getEntryDate(second).getTime() -
      getEntryDate(first).getTime()
  );

  const monthsMap = new Map();

  sortedEntries.forEach((entry) => {
    const date = getEntryDate(entry);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    if (!monthsMap.has(monthKey)) {
      monthsMap.set(monthKey, {
        key: monthKey,
        label: MONTH_FORMATTER.format(date),
        count: 0,
        weeksMap: new Map(),
      });
    }

    const monthGroup = monthsMap.get(monthKey);
    const weekStart = getStartOfWeek(date);
    const weekEnd = getEndOfWeek(date);
    const weekKey = toLocalDateKey(weekStart);

    if (!monthGroup.weeksMap.has(weekKey)) {
      monthGroup.weeksMap.set(weekKey, {
        key: weekKey,
        label: `Semana del ${weekStart.getDate()} al ${weekEnd.getDate()} de ${capitalize(
          new Intl.DateTimeFormat("es-CR", {
            month: "long",
          }).format(weekEnd)
        )}`,
        count: 0,
        daysMap: new Map(),
      });
    }

    const weekGroup = monthGroup.weeksMap.get(weekKey);
    const dayKey = toLocalDateKey(date);

    if (!weekGroup.daysMap.has(dayKey)) {
      weekGroup.daysMap.set(dayKey, {
        key: dayKey,
        label: DAY_FORMATTER.format(date),
        entries: [],
      });
    }

    weekGroup.daysMap.get(dayKey).entries.push(entry);
    weekGroup.count += 1;
    monthGroup.count += 1;
  });

  return Array.from(monthsMap.values()).map((monthGroup) => ({
    key: monthGroup.key,
    label: monthGroup.label,
    count: monthGroup.count,
    weeks: Array.from(monthGroup.weeksMap.values()).map(
      (weekGroup) => ({
        key: weekGroup.key,
        label: weekGroup.label,
        count: weekGroup.count,
        days: Array.from(weekGroup.daysMap.values()),
      })
    ),
  }));
}

function getEntryDate(entry) {
  const candidate =
    entry?.date ||
    entry?.createdAt ||
    entry?.updatedAt ||
    new Date();

  const parsedDate = new Date(candidate);

  return Number.isNaN(parsedDate.getTime())
    ? new Date()
    : parsedDate;
}

function getStartOfWeek(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  return result;
}

function getEndOfWeek(date) {
  const result = getStartOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

function toLocalDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatEntryTime(entry) {
  return TIME_FORMATTER.format(getEntryDate(entry));
}

function capitalize(value) {
  const cleanValue = String(value || "");
  return cleanValue
    ? cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1)
    : "";
}

const activeFarmBannerStyle = {
  marginBottom: 20,
  padding: "16px 18px",
  borderRadius: 14,
  background:
    "linear-gradient(135deg, rgba(2, 6, 23, 0.92), rgba(15, 23, 42, 0.86))",
  color: "#fff",
  border: "1px solid rgba(34, 197, 94, 0.35)",
  display: "grid",
  gridTemplateColumns: "minmax(180px, 1fr) minmax(260px, 1.4fr)",
  gap: "1rem",
  alignItems: "center",
};

const activeFarmBannerLeftStyle = {
  minWidth: 0,
};

const activeFarmLabelStyle = {
  fontSize: 12,
  opacity: 0.8,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: "#86efac",
  fontWeight: 800,
};

const activeFarmNameStyle = {
  fontSize: 22,
  fontWeight: 800,
  marginTop: 4,
  color: "#ffffff",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const activeFarmTextStyle = {
  margin: 0,
  opacity: 0.9,
  lineHeight: 1.5,
};

const titleStyle = {
  margin: 0,
};

const textareaStyle = {
  width: "100%",
  minHeight: "190px",
  marginTop: "1rem",
  padding: "1rem",
  borderRadius: "16px",
  border: "1px solid #334155",
  background: "#020617",
  color: "#e5e7eb",
  resize: "vertical",
  boxSizing: "border-box",
  lineHeight: 1.6,
  font: "inherit",
  outline: "none",
};

const actionsStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.7rem",
  marginTop: "1rem",
};

const secondaryActionStyle = {
  border: "1px solid rgba(34, 197, 94, 0.42)",
  borderRadius: "999px",
  padding: "0.68rem 1.05rem",
  background: "rgba(22, 163, 74, 0.14)",
  color: "#e5e7eb",
  cursor: "pointer",
  fontWeight: 700,
};

const successStyle = {
  marginTop: "0.9rem",
  padding: "0.75rem 0.9rem",
  borderRadius: "12px",
  border: "1px solid rgba(34, 197, 94, 0.34)",
  background: "rgba(22, 163, 74, 0.12)",
  color: "#bbf7d0",
};

const errorStyle = {
  marginTop: "0.9rem",
  padding: "0.75rem 0.9rem",
  borderRadius: "12px",
  border: "1px solid rgba(239, 68, 68, 0.36)",
  background: "rgba(127, 29, 29, 0.18)",
  color: "#fecaca",
};

const historySectionStyle = {
  marginTop: "1rem",
};

const historyHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "1rem",
  alignItems: "center",
  marginBottom: "1rem",
};

const entriesCountStyle = {
  fontSize: "0.82rem",
  opacity: 0.68,
};

const emptyStateStyle = {
  margin: 0,
  opacity: 0.72,
};

const accordionListStyle = {
  display: "grid",
  gap: "0.8rem",
};

const monthAccordionStyle = {
  border: "1px solid rgba(34, 197, 94, 0.24)",
  borderRadius: "16px",
  overflow: "hidden",
  background: "rgba(2, 6, 23, 0.26)",
};

const monthSummaryStyle = {
  padding: "1rem",
  cursor: "pointer",
  fontWeight: 800,
  color: "#dcfce7",
  display: "flex",
  justifyContent: "space-between",
  gap: "1rem",
  alignItems: "center",
  listStyle: "none",
};

const monthContentStyle = {
  padding: "0 0.8rem 0.8rem",
  display: "grid",
  gap: "0.65rem",
};

const weekAccordionStyle = {
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: "14px",
  overflow: "hidden",
  background: "rgba(15, 23, 42, 0.42)",
};

const weekSummaryStyle = {
  padding: "0.85rem 0.95rem",
  cursor: "pointer",
  fontWeight: 750,
  color: "#e2e8f0",
  display: "flex",
  justifyContent: "space-between",
  gap: "1rem",
  alignItems: "center",
  listStyle: "none",
};

const weekContentStyle = {
  padding: "0 0.7rem 0.7rem",
  display: "grid",
  gap: "0.55rem",
};

const dayAccordionStyle = {
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: "12px",
  overflow: "hidden",
  background: "rgba(2, 6, 23, 0.34)",
};

const daySummaryStyle = {
  padding: "0.78rem 0.9rem",
  cursor: "pointer",
  fontWeight: 700,
  color: "#cbd5e1",
  display: "flex",
  justifyContent: "space-between",
  gap: "1rem",
  alignItems: "center",
  listStyle: "none",
};

const dayContentStyle = {
  padding: "0 0.8rem 0.8rem",
  display: "grid",
  gap: "0.6rem",
};

const groupCountStyle = {
  minWidth: "28px",
  height: "28px",
  padding: "0 0.5rem",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(34, 197, 94, 0.14)",
  border: "1px solid rgba(34, 197, 94, 0.24)",
  color: "#bbf7d0",
  fontSize: "0.78rem",
  fontWeight: 800,
};

const entryCardStyle = {
  borderLeft: "3px solid rgba(34, 197, 94, 0.62)",
  borderRadius: "10px",
  padding: "0.8rem 0.9rem",
  background: "rgba(15, 23, 42, 0.62)",
};

const timeStyle = {
  display: "block",
  marginBottom: "0.4rem",
  fontSize: "0.78rem",
  fontWeight: 800,
  color: "#86efac",
};

const entryTextStyle = {
  margin: 0,
  color: "#e5e7eb",
  whiteSpace: "pre-wrap",
  lineHeight: 1.55,
};
