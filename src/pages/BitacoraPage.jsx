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

  const [selectedMonthKey, setSelectedMonthKey] = useState("");
  const [selectedWeekKey, setSelectedWeekKey] = useState("");
  const [selectedDayKey, setSelectedDayKey] = useState("");

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

  const selectedMonth = useMemo(
    () =>
      groupedEntries.find(
        (monthGroup) => monthGroup.key === selectedMonthKey
      ) || null,
    [groupedEntries, selectedMonthKey]
  );

  const selectedWeek = useMemo(
    () =>
      selectedMonth?.weeks.find(
        (weekGroup) => weekGroup.key === selectedWeekKey
      ) || null,
    [selectedMonth, selectedWeekKey]
  );

  const selectedDay = useMemo(
    () =>
      selectedWeek?.days.find(
        (dayGroup) => dayGroup.key === selectedDayKey
      ) || null,
    [selectedWeek, selectedDayKey]
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
    setSelectedMonthKey("");
    setSelectedWeekKey("");
    setSelectedDayKey("");
    setMenuOpenId("");
  }, [farmId]);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage("");
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  useEffect(() => {
    if (
      selectedMonthKey &&
      !groupedEntries.some((item) => item.key === selectedMonthKey)
    ) {
      setSelectedMonthKey("");
      setSelectedWeekKey("");
      setSelectedDayKey("");
    }
  }, [groupedEntries, selectedMonthKey]);

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

  const openMonth = (monthKey) => {
    setSelectedMonthKey(monthKey);
    setSelectedWeekKey("");
    setSelectedDayKey("");
    setMenuOpenId("");
  };

  const openWeek = (weekKey) => {
    setSelectedWeekKey(weekKey);
    setSelectedDayKey("");
    setMenuOpenId("");
  };

  const openDay = (dayKey) => {
    setSelectedDayKey(dayKey);
    setMenuOpenId("");
  };

  const goToRoot = () => {
    setSelectedMonthKey("");
    setSelectedWeekKey("");
    setSelectedDayKey("");
    setMenuOpenId("");
  };

  const goToMonth = () => {
    setSelectedWeekKey("");
    setSelectedDayKey("");
    setMenuOpenId("");
  };

  const goToWeek = () => {
    setSelectedDayKey("");
    setMenuOpenId("");
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
                Agregar movimiento
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
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setSelectedMonthKey("");
                  setSelectedWeekKey("");
                  setSelectedDayKey("");
                }}
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

        <div className="bitacora-explorer-shell">
          <nav className="bitacora-breadcrumb" aria-label="Ruta del historial">
            <button type="button" onClick={goToRoot}>
              Historial
            </button>

            {selectedMonth && (
              <>
                <span>›</span>
                <button type="button" onClick={goToMonth}>
                  {capitalize(selectedMonth.label)}
                </button>
              </>
            )}

            {selectedWeek && (
              <>
                <span>›</span>
                <button type="button" onClick={goToWeek}>
                  {selectedWeek.shortLabel}
                </button>
              </>
            )}

            {selectedDay && (
              <>
                <span>›</span>
                <strong>{capitalize(selectedDay.label)}</strong>
              </>
            )}
          </nav>

          <div className="bitacora-explorer-body">
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
            ) : !selectedMonth ? (
              <FolderGrid
                items={groupedEntries.map((monthGroup) => ({
                  key: monthGroup.key,
                  title: capitalize(monthGroup.label),
                  subtitle: `${monthGroup.count} ${
                    monthGroup.count === 1 ? "nota" : "notas"
                  }`,
                  icon: "📁",
                  onOpen: () => openMonth(monthGroup.key),
                }))}
              />
            ) : !selectedWeek ? (
              <FolderGrid
                items={selectedMonth.weeks.map((weekGroup) => ({
                  key: weekGroup.key,
                  title: weekGroup.label,
                  subtitle: `${weekGroup.count} ${
                    weekGroup.count === 1 ? "nota" : "notas"
                  }`,
                  icon: "📁",
                  onOpen: () => openWeek(weekGroup.key),
                }))}
              />
            ) : !selectedDay ? (
              <FolderGrid
                items={selectedWeek.days.map((dayGroup) => ({
                  key: dayGroup.key,
                  title: capitalize(dayGroup.label),
                  subtitle: `${dayGroup.entries.length} ${
                    dayGroup.entries.length === 1 ? "nota" : "notas"
                  }`,
                  icon: "📅",
                  onOpen: () => openDay(dayGroup.key),
                }))}
              />
            ) : (
              <div className="bitacora-notes-view">
                <div className="bitacora-day-heading">
                  <div>
                    <span className="bitacora-kicker">Día seleccionado</span>
                    <h4>{capitalize(selectedDay.label)}</h4>
                  </div>

                  <span className="bitacora-count-badge">
                    {selectedDay.entries.length}{" "}
                    {selectedDay.entries.length === 1 ? "nota" : "notas"}
                  </span>
                </div>

                <div className="bitacora-note-list">
                  {selectedDay.entries.map((item) => {
                    const isEditing = editingId === item.id;
                    const isDeleting = deletingId === item.id;
                    const isBusy = busyEntryId === item.id;
                    const isMenuOpen = menuOpenId === item.id;

                    return (
                      <article
                        key={item.id}
                        className={`bitacora-note-card ${
                          isMenuOpen ? "bitacora-note-card-active" : ""
                        }`}
                      >
                        <div className="bitacora-note-icon">
                          📝
                        </div>

                        <div className="bitacora-note-main">
                          <div className="bitacora-note-header">
                            <time>{formatEntryTime(item)}</time>

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
                                      onClick={() => startEditing(item)}
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
                                  onClick={() => handleUpdate(item.id)}
                                  disabled={!editingText.trim() || isBusy}
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
                              <p>Esta acción no se puede deshacer.</p>

                              <div className="bitacora-inline-actions">
                                <button
                                  type="button"
                                  className="bitacora-btn bitacora-btn-danger"
                                  onClick={() => handleDelete(item.id)}
                                  disabled={isBusy}
                                >
                                  {isBusy
                                    ? "Eliminando..."
                                    : "Sí, eliminar"}
                                </button>

                                <button
                                  type="button"
                                  className="bitacora-btn bitacora-btn-ghost"
                                  onClick={() => setDeletingId("")}
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
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function FolderGrid({ items }) {
  return (
    <div className="bitacora-folder-grid">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="bitacora-folder-card"
          onClick={item.onOpen}
        >
          <span className="bitacora-folder-icon">{item.icon}</span>

          <span className="bitacora-folder-content">
            <strong>{item.title}</strong>
            <small>{item.subtitle}</small>
          </span>

          <span className="bitacora-folder-arrow">→</span>
        </button>
      ))}
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
    const weekLabel = `Semana del ${weekStart.getDate()} al ${weekEnd.getDate()} de ${capitalize(
      new Intl.DateTimeFormat("es-CR", {
        month: "long",
      }).format(weekEnd)
    )}`;

    if (!monthGroup.weeksMap.has(weekKey)) {
      monthGroup.weeksMap.set(weekKey, {
        key: weekKey,
        label: weekLabel,
        shortLabel: `Semana ${weekStart.getDate()}–${weekEnd.getDate()}`,
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
        shortLabel: weekGroup.shortLabel,
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
    min-width: 0;
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
  .bitacora-history h3,
  .bitacora-day-heading h4 {
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

  .bitacora-history {
    min-height: min(74vh, 860px);
  }

  .bitacora-history-header {
    margin-bottom: 1rem;
  }

  .bitacora-search {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: min(100%, 250px);
    padding: 0.7rem 0.85rem;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 999px;
    background: rgba(2, 6, 23, 0.56);
    color: #64748b;
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

  .bitacora-total-count,
  .bitacora-count-badge {
    padding: 0.6rem 0.8rem;
  }

  .bitacora-explorer-shell {
    display: grid;
    grid-template-rows: auto minmax(420px, 1fr);
    min-height: 620px;
    overflow: visible;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 18px;
    background: rgba(2, 6, 23, 0.42);
  }

  .bitacora-breadcrumb {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.9rem 1rem;
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    color: #64748b;
  }

  .bitacora-breadcrumb button {
    border: 0;
    padding: 0;
    background: transparent;
    color: #86efac;
    cursor: pointer;
    font: inherit;
    font-weight: 800;
  }

  .bitacora-breadcrumb button:hover {
    color: #bbf7d0;
  }

  .bitacora-breadcrumb strong {
    color: #e2e8f0;
  }

  .bitacora-explorer-body {
    min-width: 0;
    padding: 1rem;
    overflow: visible;
  }

  .bitacora-empty-state {
    display: grid;
    min-height: 320px;
    place-items: center;
    padding: 2rem 1rem;
    color: #94a3b8;
    text-align: center;
  }

  .bitacora-folder-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 0.9rem;
  }

  .bitacora-folder-card {
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.9rem;
    min-height: 110px;
    padding: 1rem;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(15, 23, 42, 0.84), rgba(15, 23, 42, 0.62));
    color: #e2e8f0;
    cursor: pointer;
    text-align: left;
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease,
      background 160ms ease;
  }

  .bitacora-folder-card:hover {
    transform: translateY(-2px);
    border-color: rgba(34, 197, 94, 0.34);
    background:
      linear-gradient(180deg, rgba(20, 83, 45, 0.28), rgba(15, 23, 42, 0.72));
    box-shadow: 0 14px 30px rgba(2, 6, 23, 0.26);
  }

  .bitacora-folder-icon {
    display: grid;
    width: 46px;
    height: 46px;
    place-items: center;
    border: 1px solid rgba(34, 197, 94, 0.24);
    border-radius: 14px;
    background: rgba(5, 46, 22, 0.72);
    font-size: 1.35rem;
  }

  .bitacora-folder-content {
    display: grid;
    gap: 0.28rem;
    min-width: 0;
  }

  .bitacora-folder-content strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bitacora-folder-content small {
    color: #94a3b8;
  }

  .bitacora-folder-arrow {
    color: #86efac;
    font-size: 1.2rem;
  }

  .bitacora-notes-view {
    display: grid;
    gap: 1rem;
  }

  .bitacora-day-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.9rem;
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  }

  .bitacora-note-list {
    display: grid;
    gap: 0.85rem;
    padding-bottom: 1.5rem;
    overflow: visible;
  }

  .bitacora-note-card {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 0.9rem;
    min-height: 120px;
    padding: 1rem;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(15, 23, 42, 0.86), rgba(15, 23, 42, 0.68));
    overflow: visible;
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease;
  }


  .bitacora-note-card-active {
    z-index: 500;
  }

  .bitacora-note-card:hover {
    transform: translateY(-2px);
    border-color: rgba(34, 197, 94, 0.28);
    box-shadow: 0 14px 28px rgba(2, 6, 23, 0.26);
  }

  .bitacora-note-icon {
    display: grid;
    width: 38px;
    height: 38px;
    place-items: center;
    border: 1px solid rgba(34, 197, 94, 0.28);
    border-radius: 50%;
    background: #052e16;
    font-size: 0.95rem;
  }

  .bitacora-note-main {
    min-width: 0;
    overflow: visible;
  }

  .bitacora-note-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .bitacora-note-header time {
    color: #86efac;
    font-size: 0.8rem;
    font-weight: 900;
  }

  .bitacora-note-text {
    margin: 0.65rem 0 0;
    color: #e5e7eb;
    line-height: 1.65;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .bitacora-note-menu-wrap {
    position: relative;
    z-index: 40;
    overflow: visible;
  }

  .bitacora-menu-trigger {
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 50%;
    background: rgba(2, 6, 23, 0.72);
    color: #cbd5e1;
    cursor: pointer;
    font-size: 1.1rem;
  }

  .bitacora-note-menu {
    position: absolute;
    z-index: 9999;
    top: calc(100% + 0.45rem);
    right: 0;
    display: grid;
    min-width: 180px;
    padding: 0.45rem;
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 12px;
    background: #0f172a;
    box-shadow: 0 18px 44px rgba(2, 6, 23, 0.58);
  }

  .bitacora-note-menu button {
    border: 0;
    border-radius: 9px;
    padding: 0.72rem 0.8rem;
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
    margin-top: 0.85rem;
    padding: 0.9rem;
    border-radius: 13px;
  }

  .bitacora-edit-panel {
    border: 1px solid rgba(34, 197, 94, 0.2);
    background: rgba(2, 6, 23, 0.56);
  }

  .bitacora-edit-textarea {
    min-height: 130px;
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
    .bitacora-history-header,
    .bitacora-day-heading {
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

    .bitacora-folder-grid {
      grid-template-columns: 1fr;
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
      text-align: center;
    }

    .bitacora-explorer-shell {
      min-height: 520px;
      grid-template-rows: auto minmax(340px, 1fr);
    }

    .bitacora-explorer-body {
      padding: 0.75rem;
    }

    .bitacora-folder-card {
      grid-template-columns: 42px minmax(0, 1fr) auto;
      min-height: 96px;
      padding: 0.85rem;
    }

    .bitacora-folder-icon {
      width: 42px;
      height: 42px;
    }

    .bitacora-note-card {
      grid-template-columns: 32px minmax(0, 1fr);
      gap: 0.65rem;
      padding: 0.8rem;
    }

    .bitacora-note-icon {
      width: 32px;
      height: 32px;
    }

    .bitacora-note-menu {
      right: -0.1rem;
      min-width: 165px;
    }
  }
`;
