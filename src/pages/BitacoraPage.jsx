// src/pages/BitacoraPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useFarm } from "../context/FarmContext";
import {
  createBitacoraEntry,
  deleteBitacoraEntry,
  loadBitacoraEntries,
  updateBitacoraEntry,
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

const TODAY_FORMATTER = new Intl.DateTimeFormat("es-CR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default function BitacoraPage({
  onOpenTasks,
  onOpenFinance,
}) {
  const { activeFarm, farmId, farmName } = useFarm();

  const [entry, setEntry] = useState("");
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editingText, setEditingText] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [busyEntryId, setBusyEntryId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [menuOpenId, setMenuOpenId] = useState("");

  const filteredEntries = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    if (!cleanSearch) return entries;

    return entries.filter((item) =>
      String(item?.text || "")
        .toLowerCase()
        .includes(cleanSearch)
    );
  }, [entries, searchTerm]);

  const groupedEntries = useMemo(
    () => groupEntriesByDate(filteredEntries),
    [filteredEntries]
  );

  const todayNotes = useMemo(() => {
    const todayKey = toLocalDateKey(new Date());

    return entries.filter(
      (item) => toLocalDateKey(getEntryDate(item)) === todayKey
    ).length;
  }, [entries]);

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

  const startEditing = (item) => {
    setDeletingId("");
    setMenuOpenId("");
    setEditingId(item.id);
    setEditingText(item.text || "");
    setError("");
  };

  const cancelEditing = () => {
    setEditingId("");
    setEditingText("");
  };

  const handleUpdate = async (entryId) => {
    const cleanText = editingText.trim();

    if (!cleanText || busyEntryId) return;

    setBusyEntryId(entryId);
    setError("");
    setSuccessMessage("");

    try {
      const updatedEntry = await updateBitacoraEntry({
        farmId,
        entryId,
        text: cleanText,
      });

      setEntries((currentEntries) =>
        currentEntries.map((item) =>
          item.id === entryId ? updatedEntry : item
        )
      );

      cancelEditing();
      setSuccessMessage("Nota actualizada correctamente.");
    } catch (requestError) {
      setError(
        requestError?.message ||
          "No se pudo actualizar la nota."
      );
    } finally {
      setBusyEntryId("");
    }
  };

  const handleDelete = async (entryId) => {
    if (busyEntryId) return;

    setBusyEntryId(entryId);
    setError("");
    setSuccessMessage("");

    try {
      await deleteBitacoraEntry({
        farmId,
        entryId,
      });

      setEntries((currentEntries) =>
        currentEntries.filter((item) => item.id !== entryId)
      );

      setDeletingId("");
      setMenuOpenId("");
      if (editingId === entryId) cancelEditing();
      setSuccessMessage("Nota eliminada correctamente.");
    } catch (requestError) {
      setError(
        requestError?.message ||
          "No se pudo eliminar la nota."
      );
    } finally {
      setBusyEntryId("");
    }
  };

  return (
    <div className="page bitacora-page">
      <style>{BITACORA_STYLES}</style>

      <section className="bitacora-farm-banner">
        <div className="bitacora-farm-main">
          <span className="bitacora-eyebrow">Finca activa</span>

          <strong className="bitacora-farm-name">
            {farmName || activeFarm?.name || "Finca activa"}
          </strong>
        </div>

        <p className="bitacora-farm-copy">
          Todas las anotaciones pertenecen únicamente a esta finca.
          Para trabajar en otra, cambiá la finca activa desde el mapa.
        </p>
      </section>

      <section className="bitacora-hero card">
        <div className="bitacora-hero-top">
          <div>
            <span className="bitacora-kicker">Registro diario</span>
            <h2 className="bitacora-title">Bitácora</h2>
            <p className="bitacora-today">
              {capitalize(TODAY_FORMATTER.format(new Date()))}
            </p>
          </div>

          <div className="bitacora-daily-counter">
            <strong>{todayNotes}</strong>
            <span>
              {todayNotes === 1
                ? "nota registrada hoy"
                : "notas registradas hoy"}
            </span>
          </div>
        </div>

        <div className="bitacora-editor-shell">
          <textarea
            value={entry}
            onChange={(event) => setEntry(event.target.value)}
            placeholder="¿Qué ocurrió hoy en la finca?"
            className="bitacora-main-textarea"
            disabled={!farmId || isSaving}
          />

          <div className="bitacora-editor-footer">
            <span className="bitacora-char-count">
              {entry.length} caracteres
            </span>

            <div className="bitacora-actions">
              <button
                type="button"
                className="bitacora-btn bitacora-btn-primary"
                onClick={handleSave}
                disabled={!farmId || !entry.trim() || isSaving}
              >
                {isSaving ? "Guardando..." : "Guardar nota"}
              </button>

              <button
                type="button"
                className="bitacora-btn bitacora-btn-secondary"
                onClick={onOpenTasks}
              >
                + Crear tarea
              </button>

              <button
                type="button"
                className="bitacora-btn bitacora-btn-secondary"
                onClick={onOpenFinance}
              >
                $ Agregar movimiento
              </button>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="bitacora-feedback bitacora-feedback-success">
            ✓ {successMessage}
          </div>
        )}

        {error && (
          <div className="bitacora-feedback bitacora-feedback-error">
            {error}
          </div>
        )}
      </section>

      <section className="card bitacora-history">
        <div className="bitacora-history-header">
          <div>
            <span className="bitacora-kicker">Memoria operativa</span>
            <h3>Historial</h3>
          </div>

          <div className="bitacora-history-tools">
            <label className="bitacora-search">
              <span>⌕</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar en notas..."
              />
            </label>

            {!isLoading && entries.length > 0 && (
              <span className="bitacora-total-count">
                {entries.length}{" "}
                {entries.length === 1 ? "nota" : "notas"}
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="bitacora-empty-state">
            Cargando Bitácora...
          </div>
        ) : groupedEntries.length === 0 ? (
          <div className="bitacora-empty-state">
            {searchTerm.trim()
              ? "No encontramos notas con esa búsqueda."
              : "Todavía no hay notas registradas."}
          </div>
        ) : (
          <div className="bitacora-accordion-list">
            {groupedEntries.map((monthGroup, monthIndex) => (
              <details
                key={monthGroup.key}
                open={monthIndex === 0}
                className="bitacora-month"
              >
                <summary className="bitacora-month-summary">
                  <div>
                    <span className="bitacora-summary-dot" />
                    <strong>{capitalize(monthGroup.label)}</strong>
                  </div>

                  <span className="bitacora-count-badge">
                    {monthGroup.count}{" "}
                    {monthGroup.count === 1 ? "nota" : "notas"}
                  </span>
                </summary>

                <div className="bitacora-month-content">
                  {monthGroup.weeks.map((weekGroup, weekIndex) => (
                    <details
                      key={weekGroup.key}
                      open={monthIndex === 0 && weekIndex === 0}
                      className="bitacora-week"
                    >
                      <summary className="bitacora-week-summary">
                        <span>{weekGroup.label}</span>
                        <span className="bitacora-count-badge subtle">
                          {weekGroup.count}
                        </span>
                      </summary>

                      <div className="bitacora-week-content">
                        {weekGroup.days.map((dayGroup, dayIndex) => (
                          <details
                            key={dayGroup.key}
                            open={
                              monthIndex === 0 &&
                              weekIndex === 0 &&
                              dayIndex === 0
                            }
                            className="bitacora-day"
                          >
                            <summary className="bitacora-day-summary">
                              <span>{capitalize(dayGroup.label)}</span>
                              <span className="bitacora-count-badge subtle">
                                {dayGroup.entries.length}
                              </span>
                            </summary>

                            <div className="bitacora-day-content">
                              {dayGroup.entries.map((item) => {
                                const isEditing = editingId === item.id;
                                const isDeleting = deletingId === item.id;
                                const isBusy = busyEntryId === item.id;
                                const isMenuOpen = menuOpenId === item.id;

                                return (
                                  <article
                                    key={item.id}
                                    className="bitacora-note-card"
                                  >
                                    <div className="bitacora-note-icon">
                                      📝
                                    </div>

                                    <div className="bitacora-note-main">
                                      <div className="bitacora-note-header">
                                        <time>
                                          {formatEntryTime(item)}
                                        </time>

                                        {!isEditing && !isDeleting && (
                                          <div className="bitacora-note-menu-wrap">
                                            <button
                                              type="button"
                                              className="bitacora-menu-trigger"
                                              onClick={() =>
                                                setMenuOpenId(
                                                  isMenuOpen ? "" : item.id
                                                )
                                              }
                                              aria-label="Opciones de la nota"
                                            >
                                              ⋮
                                            </button>

                                            {isMenuOpen && (
                                              <div className="bitacora-note-menu">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    startEditing(item)
                                                  }
                                                >
                                                  Editar nota
                                                </button>

                                                <button
                                                  type="button"
                                                  className="danger"
                                                  onClick={() => {
                                                    setMenuOpenId("");
                                                    setDeletingId(item.id);
                                                  }}
                                                >
                                                  Eliminar nota
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {isEditing ? (
                                        <div className="bitacora-edit-panel">
                                          <textarea
                                            value={editingText}
                                            onChange={(event) =>
                                              setEditingText(event.target.value)
                                            }
                                            className="bitacora-edit-textarea"
                                            disabled={isBusy}
                                          />

                                          <div className="bitacora-inline-actions">
                                            <button
                                              type="button"
                                              className="bitacora-btn bitacora-btn-primary"
                                              onClick={() =>
                                                handleUpdate(item.id)
                                              }
                                              disabled={
                                                !editingText.trim() || isBusy
                                              }
                                            >
                                              {isBusy
                                                ? "Guardando..."
                                                : "Guardar cambios"}
                                            </button>

                                            <button
                                              type="button"
                                              className="bitacora-btn bitacora-btn-ghost"
                                              onClick={cancelEditing}
                                              disabled={isBusy}
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="bitacora-note-text">
                                          {item.text}
                                        </p>
                                      )}

                                      {isDeleting && (
                                        <div className="bitacora-delete-panel">
                                          <strong>¿Eliminar esta nota?</strong>
                                          <p>
                                            Esta acción no se puede deshacer.
                                          </p>

                                          <div className="bitacora-inline-actions">
                                            <button
                                              type="button"
                                              className="bitacora-btn bitacora-btn-danger"
                                              onClick={() =>
                                                handleDelete(item.id)
                                              }
                                              disabled={isBusy}
                                            >
                                              {isBusy
                                                ? "Eliminando..."
                                                : "Sí, eliminar"}
                                            </button>

                                            <button
                                              type="button"
                                              className="bitacora-btn bitacora-btn-ghost"
                                              onClick={() =>
                                                setDeletingId("")
                                              }
                                              disabled={isBusy}
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </article>
                                );
                              })}
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

const BITACORA_STYLES = `
  .bitacora-page {
    display: grid;
    gap: 1rem;
  }

  .bitacora-farm-banner,
  .bitacora-hero,
  .bitacora-history {
    border: 1px solid rgba(34, 197, 94, 0.22);
    background:
      radial-gradient(circle at top right, rgba(34, 197, 94, 0.08), transparent 34%),
      linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.92));
    box-shadow: 0 18px 50px rgba(2, 6, 23, 0.28);
  }

  .bitacora-farm-banner {
    display: grid;
    grid-template-columns: minmax(200px, 0.85fr) minmax(280px, 1.35fr);
    align-items: center;
    gap: 1.25rem;
    padding: 1rem 1.1rem;
    border-radius: 18px;
  }

  .bitacora-farm-main {
    min-width: 0;
  }

  .bitacora-eyebrow,
  .bitacora-kicker {
    display: block;
    margin-bottom: 0.35rem;
    color: #86efac;
    font-size: 0.74rem;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .bitacora-farm-name {
    display: block;
    overflow: hidden;
    color: #fff;
    font-size: clamp(1.1rem, 2vw, 1.45rem);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bitacora-farm-copy {
    margin: 0;
    color: #cbd5e1;
    line-height: 1.65;
  }

  .bitacora-hero,
  .bitacora-history {
    border-radius: 22px;
    padding: clamp(1rem, 2.5vw, 1.6rem);
  }

  .bitacora-hero-top,
  .bitacora-history-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .bitacora-title,
  .bitacora-history h3 {
    margin: 0;
    color: #f8fafc;
  }

  .bitacora-title {
    font-size: clamp(1.65rem, 3vw, 2.35rem);
  }

  .bitacora-today {
    margin: 0.35rem 0 0;
    color: #94a3b8;
  }

  .bitacora-daily-counter {
    display: grid;
    min-width: 150px;
    padding: 0.9rem 1rem;
    border: 1px solid rgba(34, 197, 94, 0.22);
    border-radius: 16px;
    background: rgba(15, 23, 42, 0.6);
    text-align: right;
  }

  .bitacora-daily-counter strong {
    color: #86efac;
    font-size: 1.65rem;
    line-height: 1;
  }

  .bitacora-daily-counter span {
    margin-top: 0.35rem;
    color: #94a3b8;
    font-size: 0.78rem;
  }

  .bitacora-editor-shell {
    margin-top: 1.2rem;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 20px;
    background: rgba(2, 6, 23, 0.78);
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      transform 180ms ease;
  }

  .bitacora-editor-shell:focus-within {
    border-color: rgba(34, 197, 94, 0.62);
    box-shadow:
      0 0 0 4px rgba(34, 197, 94, 0.08),
      0 18px 38px rgba(2, 6, 23, 0.28);
    transform: translateY(-1px);
  }

  .bitacora-main-textarea,
  .bitacora-edit-textarea {
    width: 100%;
    border: 0;
    background: transparent;
    color: #e5e7eb;
    font: inherit;
    line-height: 1.65;
    outline: none;
    resize: vertical;
    box-sizing: border-box;
  }

  .bitacora-main-textarea {
    min-height: 220px;
    padding: 1.2rem;
    font-size: 1rem;
  }

  .bitacora-main-textarea::placeholder,
  .bitacora-edit-textarea::placeholder {
    color: #64748b;
  }

  .bitacora-editor-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.9rem 1rem 1rem;
    border-top: 1px solid rgba(148, 163, 184, 0.12);
    background: rgba(15, 23, 42, 0.38);
  }

  .bitacora-char-count {
    color: #64748b;
    font-size: 0.78rem;
  }

  .bitacora-actions,
  .bitacora-inline-actions,
  .bitacora-history-tools {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.65rem;
  }

  .bitacora-btn {
    border-radius: 999px;
    padding: 0.7rem 1rem;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      border-color 160ms ease,
      background 160ms ease;
  }

  .bitacora-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .bitacora-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .bitacora-btn-primary {
    border: 1px solid rgba(74, 222, 128, 0.55);
    background: linear-gradient(135deg, #16a34a, #22c55e);
    color: #02120a;
    box-shadow: 0 10px 24px rgba(34, 197, 94, 0.22);
  }

  .bitacora-btn-primary:hover:not(:disabled) {
    box-shadow: 0 14px 30px rgba(34, 197, 94, 0.3);
  }

  .bitacora-btn-secondary,
  .bitacora-btn-ghost {
    border: 1px solid rgba(148, 163, 184, 0.24);
    background: rgba(15, 23, 42, 0.72);
    color: #e2e8f0;
  }

  .bitacora-btn-secondary:hover:not(:disabled),
  .bitacora-btn-ghost:hover:not(:disabled) {
    border-color: rgba(34, 197, 94, 0.42);
    background: rgba(22, 163, 74, 0.12);
  }

  .bitacora-btn-danger {
    border: 1px solid rgba(248, 113, 113, 0.44);
    background: rgba(220, 38, 38, 0.2);
    color: #fee2e2;
  }

  .bitacora-feedback {
    margin-top: 0.9rem;
    padding: 0.8rem 0.95rem;
    border-radius: 13px;
    font-weight: 700;
  }

  .bitacora-feedback-success {
    border: 1px solid rgba(34, 197, 94, 0.34);
    background: rgba(22, 163, 74, 0.12);
    color: #bbf7d0;
  }

  .bitacora-feedback-error {
    border: 1px solid rgba(239, 68, 68, 0.36);
    background: rgba(127, 29, 29, 0.18);
    color: #fecaca;
  }

  .bitacora-history-header {
    margin-bottom: 1rem;
  }

  .bitacora-search {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: min(100%, 240px);
    padding: 0.7rem 0.85rem;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 999px;
    background: rgba(2, 6, 23, 0.56);
    color: #64748b;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease;
  }

  .bitacora-search:focus-within {
    border-color: rgba(34, 197, 94, 0.5);
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.08);
  }

  .bitacora-search input {
    width: 100%;
    border: 0;
    background: transparent;
    color: #e2e8f0;
    font: inherit;
    outline: none;
  }

  .bitacora-total-count,
  .bitacora-count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(34, 197, 94, 0.22);
    border-radius: 999px;
    background: rgba(22, 163, 74, 0.12);
    color: #bbf7d0;
    font-size: 0.78rem;
    font-weight: 900;
  }

  .bitacora-total-count {
    padding: 0.62rem 0.8rem;
  }

  .bitacora-count-badge {
    min-width: 34px;
    min-height: 30px;
    padding: 0.25rem 0.7rem;
  }

  .bitacora-count-badge.subtle {
    min-width: 30px;
    background: rgba(15, 23, 42, 0.78);
  }

  .bitacora-empty-state {
    padding: 2rem 1rem;
    border: 1px dashed rgba(148, 163, 184, 0.18);
    border-radius: 16px;
    color: #94a3b8;
    text-align: center;
  }

  .bitacora-accordion-list {
    display: grid;
    gap: 0.85rem;
  }

  .bitacora-month,
  .bitacora-week,
  .bitacora-day {
    overflow: hidden;
    border-radius: 16px;
  }

  .bitacora-month {
    border: 1px solid rgba(34, 197, 94, 0.2);
    background: rgba(2, 6, 23, 0.28);
  }

  .bitacora-week {
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: rgba(15, 23, 42, 0.42);
  }

  .bitacora-day {
    border: 1px solid rgba(148, 163, 184, 0.12);
    background: rgba(2, 6, 23, 0.36);
  }

  .bitacora-month-summary,
  .bitacora-week-summary,
  .bitacora-day-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    cursor: pointer;
    list-style: none;
    transition:
      background 160ms ease,
      color 160ms ease;
  }

  .bitacora-month-summary::-webkit-details-marker,
  .bitacora-week-summary::-webkit-details-marker,
  .bitacora-day-summary::-webkit-details-marker {
    display: none;
  }

  .bitacora-month-summary {
    padding: 1rem;
    color: #dcfce7;
    font-size: 1rem;
  }

  .bitacora-month-summary > div {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }

  .bitacora-week-summary {
    padding: 0.9rem 0.95rem;
    color: #e2e8f0;
    font-weight: 800;
  }

  .bitacora-day-summary {
    padding: 0.85rem 0.9rem;
    color: #cbd5e1;
    font-weight: 800;
  }

  .bitacora-month-summary:hover,
  .bitacora-week-summary:hover,
  .bitacora-day-summary:hover {
    background: rgba(34, 197, 94, 0.06);
  }

  .bitacora-summary-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: #22c55e;
    box-shadow: 0 0 16px rgba(34, 197, 94, 0.65);
  }

  .bitacora-month-content,
  .bitacora-week-content,
  .bitacora-day-content {
    display: grid;
    gap: 0.7rem;
  }

  .bitacora-month-content {
    padding: 0 0.85rem 0.85rem;
  }

  .bitacora-week-content {
    padding: 0 0.7rem 0.7rem;
  }

  .bitacora-day-content {
    position: relative;
    padding: 0 0.8rem 0.8rem 1rem;
  }

  .bitacora-day-content::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0.8rem;
    left: 1.25rem;
    width: 1px;
    background: linear-gradient(
      180deg,
      rgba(34, 197, 94, 0.55),
      rgba(34, 197, 94, 0.06)
    );
  }

  .bitacora-note-card {
    position: relative;
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 0.8rem;
    padding: 0.95rem;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 15px;
    background:
      linear-gradient(180deg, rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.66));
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease;
  }

  .bitacora-note-card:hover {
    transform: translateY(-2px);
    border-color: rgba(34, 197, 94, 0.26);
    box-shadow: 0 14px 28px rgba(2, 6, 23, 0.26);
  }

  .bitacora-note-icon {
    position: relative;
    z-index: 1;
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border: 1px solid rgba(34, 197, 94, 0.28);
    border-radius: 50%;
    background: #052e16;
    font-size: 0.9rem;
  }

  .bitacora-note-main {
    min-width: 0;
  }

  .bitacora-note-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .bitacora-note-header time {
    color: #86efac;
    font-size: 0.78rem;
    font-weight: 900;
    letter-spacing: 0.02em;
  }

  .bitacora-note-text {
    margin: 0.55rem 0 0;
    color: #e5e7eb;
    line-height: 1.65;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .bitacora-note-menu-wrap {
    position: relative;
  }

  .bitacora-menu-trigger {
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 50%;
    background: rgba(2, 6, 23, 0.56);
    color: #cbd5e1;
    cursor: pointer;
    font-size: 1.1rem;
    transition:
      border-color 160ms ease,
      background 160ms ease;
  }

  .bitacora-menu-trigger:hover {
    border-color: rgba(34, 197, 94, 0.38);
    background: rgba(22, 163, 74, 0.1);
  }

  .bitacora-note-menu {
    position: absolute;
    z-index: 20;
    top: calc(100% + 0.4rem);
    right: 0;
    display: grid;
    min-width: 150px;
    padding: 0.4rem;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 12px;
    background: #0f172a;
    box-shadow: 0 16px 36px rgba(2, 6, 23, 0.42);
  }

  .bitacora-note-menu button {
    border: 0;
    border-radius: 9px;
    padding: 0.65rem 0.75rem;
    background: transparent;
    color: #e2e8f0;
    text-align: left;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
  }

  .bitacora-note-menu button:hover {
    background: rgba(34, 197, 94, 0.08);
  }

  .bitacora-note-menu button.danger {
    color: #fecaca;
  }

  .bitacora-note-menu button.danger:hover {
    background: rgba(220, 38, 38, 0.12);
  }

  .bitacora-edit-panel,
  .bitacora-delete-panel {
    display: grid;
    gap: 0.7rem;
    margin-top: 0.75rem;
    padding: 0.85rem;
    border-radius: 13px;
  }

  .bitacora-edit-panel {
    border: 1px solid rgba(34, 197, 94, 0.2);
    background: rgba(2, 6, 23, 0.56);
  }

  .bitacora-edit-textarea {
    min-height: 120px;
    padding: 0.85rem;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 11px;
    background: rgba(2, 6, 23, 0.72);
  }

  .bitacora-delete-panel {
    border: 1px solid rgba(248, 113, 113, 0.28);
    background: rgba(127, 29, 29, 0.14);
  }

  .bitacora-delete-panel strong {
    color: #fee2e2;
  }

  .bitacora-delete-panel p {
    margin: 0;
    color: #fecaca;
    opacity: 0.86;
  }

  @media (max-width: 820px) {
    .bitacora-farm-banner {
      grid-template-columns: 1fr;
    }

    .bitacora-hero-top,
    .bitacora-history-header {
      align-items: stretch;
      flex-direction: column;
    }

    .bitacora-daily-counter {
      min-width: 0;
      text-align: left;
    }

    .bitacora-history-tools,
    .bitacora-search {
      width: 100%;
    }
  }

  @media (max-width: 640px) {
    .bitacora-hero,
    .bitacora-history,
    .bitacora-farm-banner {
      padding: 0.9rem;
      border-radius: 16px;
    }

    .bitacora-main-textarea {
      min-height: 180px;
      padding: 1rem;
    }

    .bitacora-editor-footer {
      align-items: stretch;
      flex-direction: column;
    }

    .bitacora-actions,
    .bitacora-inline-actions {
      width: 100%;
      align-items: stretch;
      flex-direction: column;
    }

    .bitacora-btn {
      width: 100%;
      justify-content: center;
      text-align: center;
    }

    .bitacora-month-summary,
    .bitacora-week-summary,
    .bitacora-day-summary {
      align-items: flex-start;
    }

    .bitacora-count-badge {
      flex-shrink: 0;
    }

    .bitacora-day-content {
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }

    .bitacora-day-content::before {
      left: 1rem;
    }

    .bitacora-note-card {
      grid-template-columns: 30px minmax(0, 1fr);
      gap: 0.65rem;
      padding: 0.8rem;
    }

    .bitacora-note-icon {
      width: 30px;
      height: 30px;
    }

    .bitacora-note-menu {
      right: -0.25rem;
    }
  }
`;
