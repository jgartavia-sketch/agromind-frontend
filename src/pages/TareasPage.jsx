// src/pages/TareasPage.jsx
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";

import { useEffect, useMemo, useState } from "react";
import "../styles/tasks.css";

function getPriorityClass(priority) {
  switch (priority) {
    case "Alta":
      return "priority-badge priority-high";
    case "Media":
      return "priority-badge priority-medium";
    case "Baja":
      return "priority-badge priority-low";
    default:
      return "priority-badge";
  }
}

function getStatusClass(status) {
  switch (status) {
    case "Pendiente":
      return "status-badge status-pending";
    case "En progreso":
      return "status-badge status-progress";
    case "Completada":
      return "status-badge status-done";
    default:
      return "status-badge";
  }
}

const PRIORIDADES = ["Alta", "Media", "Baja"];
const TIPOS = ["Riego", "Alimentación", "Mantenimiento", "Cosecha"];
const ESTADOS = ["Pendiente", "En progreso", "Completada"];

const EMPTY_FORM = {
  title: "",
  zone: "",
  type: "Mantenimiento",
  priority: "Media",
  due: "",
  status: "Pendiente",
  owner: "",
};

function pickLocalStorage(keys) {
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

function getAuthToken() {
  return pickLocalStorage([
    "agromind_token",
    "agromind_jwt",
    "token",
    "jwt",
    "access_token",
  ]);
}

function getActiveFarmId() {
  return pickLocalStorage([
    "agromind_active_farm_id",
    "activeFarmId",
    "farmId",
    "agromind_farm_id",
  ]);
}

function toYYYYMMDD(value) {
  // value puede venir como Date, ISO string o "YYYY-MM-DD"
  if (!value) return "";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return "";
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function TareasPage({
  onOpenZoneInMap,
  zonesFromMap = [],
  farmId: farmIdProp,
  token: tokenProp,
}) {
  // ✅ Datos reales desde backend
  const [tasks, setTasks] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Filtros
  const [statusFilter, setStatusFilter] = useState("Todas");
  const [typeFilter, setTypeFilter] = useState("Todas");
  const [zoneFilter, setZoneFilter] = useState("Todas");
  const [searchText, setSearchText] = useState("");

  // Form
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  // 🔗 Zonas
  const mapZones = Array.isArray(zonesFromMap) ? zonesFromMap : [];

  // Config API
  const API_BASE =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ""; // si está vacío, usa mismo origen

  const token = tokenProp || getAuthToken();
  const farmId = farmIdProp || getActiveFarmId();

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      // no-op
    }

    if (!res.ok) {
      const msg = data?.error || `Error HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  // =========================
  // LOAD TASKS
  // =========================
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErrorMsg("");

      if (!farmId) {
        setTasks([]);
        setErrorMsg(
          "No se detectó una finca activa. Selecciona/crea una finca primero."
        );
        return;
      }
      if (!token) {
        setTasks([]);
        setErrorMsg("No hay token. Inicia sesión nuevamente.");
        return;
      }

      try {
        setLoading(true);
        const data = await apiFetch(`/api/farms/${farmId}/tasks`);
        if (cancelled) return;

        const list = Array.isArray(data?.tasks) ? data.tasks : [];
        // Normalizamos due a YYYY-MM-DD para el UI
        const normalized = list.map((t) => ({
          ...t,
          due: toYYYYMMDD(t.due),
        }));

        setTasks(normalized);
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err?.message || "No se pudieron cargar las tareas.");
        setTasks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId, token, API_BASE]);

  // Resumen
  const summary = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "Pendiente").length;
    const inProgress = tasks.filter((t) => t.status === "En progreso").length;
    const done = tasks.filter((t) => t.status === "Completada").length;
    return { total, pending, inProgress, done };
  }, [tasks]);

  // Zonas para filtros
  const zoneOptions = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => t.zone && set.add(t.zone));
    mapZones.forEach((z) => z && set.add(z));
    return Array.from(set);
  }, [tasks, mapZones]);

  const filteredTasks = tasks.filter((task) => {
    const matchStatus =
      statusFilter === "Todas" || task.status === statusFilter;
    const matchType = typeFilter === "Todas" || task.type === typeFilter;
    const matchZone = zoneFilter === "Todas" || task.zone === zoneFilter;

    const query = searchText.trim().toLowerCase();
    const matchSearch =
      query === "" ||
      (task.title || "").toLowerCase().includes(query) ||
      (task.zone || "").toLowerCase().includes(query) ||
      (task.type || "").toLowerCase().includes(query) ||
      (task.owner || "").toLowerCase().includes(query);

    return matchStatus && matchType && matchZone && matchSearch;
  });

  // =========================
  // FORM
  // =========================
  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMsg("");

    if (!farmId) {
      setErrorMsg("No hay finca activa. Selecciona/crea una finca primero.");
      return;
    }
    if (!token) {
      setErrorMsg("No hay token. Inicia sesión nuevamente.");
      return;
    }

    const trimmed = {
      ...formData,
      title: formData.title.trim(),
      zone: formData.zone.trim(),
      owner: formData.owner.trim(),
    };

    if (!trimmed.title) {
      alert("La tarea necesita al menos un título.");
      return;
    }
    if (!trimmed.due) {
      alert("Define una fecha de vencimiento para la tarea.");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        // UPDATE
        const data = await apiFetch(`/api/farms/${farmId}/tasks/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(trimmed),
        });

        const updated = data?.task
          ? { ...data.task, due: toYYYYMMDD(data.task.due) }
          : null;

        if (updated) {
          setTasks((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
        }
      } else {
        // CREATE
        const data = await apiFetch(`/api/farms/${farmId}/tasks`, {
          method: "POST",
          body: JSON.stringify(trimmed),
        });

        const created = data?.task
          ? { ...data.task, due: toYYYYMMDD(data.task.due) }
          : null;

        if (created) {
          setTasks((prev) => [created, ...prev]);
        }
      }

      handleResetForm();
    } catch (err) {
      setErrorMsg(err?.message || "No se pudo guardar la tarea.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (task) => {
    setEditingId(task.id);
    setFormData({
      title: task.title || "",
      zone: task.zone || "",
      type: task.type || "Mantenimiento",
      priority: task.priority || "Media",
      due: task.due || "",
      status: task.status || "Pendiente",
      owner: task.owner || "",
    });
  };

  const handleDeleteClick = async (id) => {
    const ok = window.confirm("¿Eliminar esta tarea?");
    if (!ok) return;

    setErrorMsg("");

    if (!farmId) {
      setErrorMsg("No hay finca activa.");
      return;
    }
    if (!token) {
      setErrorMsg("No hay token. Inicia sesión nuevamente.");
      return;
    }

    try {
      setSaving(true);
      await apiFetch(`/api/farms/${farmId}/tasks/${id}`, { method: "DELETE" });

      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) handleResetForm();
    } catch (err) {
      setErrorMsg(err?.message || "No se pudo eliminar la tarea.");
    } finally {
      setSaving(false);
    }
  };

  // Calendar events
  const calendarEvents = useMemo(() => {
    return tasks
      .filter((t) => t?.due && t?.title)
      .map((t) => ({
        id: t.id,
        title: t.title,
        date: t.due,
      }));
  }, [tasks]);

  // =========================
  // RENDER
  // =========================
  return (
    <div className="page">
      <header className="page-header">
        <h1>Tareas de la finca</h1>
        <p className="page-subtitle">
          Operación diaria, con datos reales desde backend. Si el mapa es el
          territorio, las tareas son la estrategia.
        </p>
      </header>

      {/* Mensajes */}
      {(errorMsg || loading) && (
        <section className="card" style={{ marginBottom: "1rem" }}>
          {loading ? (
            <p style={{ margin: 0, opacity: 0.85 }}>Cargando tareas…</p>
          ) : (
            <p style={{ margin: 0, opacity: 0.85 }}>{errorMsg}</p>
          )}
        </section>
      )}

      {/* IA placeholder */}
      <section className="card ia-placeholder">
        <h3>Recomendaciones IA</h3>
        <p>
          Aquí aparecerán sugerencias automáticas según zonas, clima, cultivos y
          carga de trabajo. Próximamente.
        </p>
      </section>

      {/* Dashboard */}
      <section className="tasks-summary">
        <div className="summary-card">
          <span className="summary-label">Total de tareas</span>
          <span className="summary-value">{summary.total}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Pendientes</span>
          <span className="summary-value summary-value-warning">
            {summary.pending}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">En progreso</span>
          <span className="summary-value summary-value-info">
            {summary.inProgress}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Completadas</span>
          <span className="summary-value summary-value-ok">{summary.done}</span>
        </div>
      </section>

      {/* Form */}
      <section className="task-editor card">
        <h3>{editingId ? "Editar tarea" : "Nueva tarea"}</h3>

        <form onSubmit={handleSubmit}>
          <div className="task-editor-grid">
            <div className="task-field">
              <label>Título</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleFormChange("title", e.target.value)}
                placeholder="Ej: Revisar cerca norte"
                disabled={saving}
              />
            </div>

            <div className="task-field">
              <label>Zona / elemento</label>
              <div className="task-zone-input-row">
                <input
                  type="text"
                  value={formData.zone}
                  onChange={(e) => handleFormChange("zone", e.target.value)}
                  placeholder="Ej: Zona de vivero, Calle 1..."
                  disabled={saving}
                />
                {mapZones.length > 0 && (
                  <select
                    value=""
                    disabled={saving}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) return;
                      handleFormChange("zone", value);
                    }}
                  >
                    <option value="">Zonas del mapa</option>
                    {mapZones.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="task-field">
              <label>Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => handleFormChange("type", e.target.value)}
                disabled={saving}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-field">
              <label>Prioridad</label>
              <select
                value={formData.priority}
                onChange={(e) => handleFormChange("priority", e.target.value)}
                disabled={saving}
              >
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-field">
              <label>Vence</label>
              <input
                type="date"
                value={formData.due}
                onChange={(e) => handleFormChange("due", e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="task-field">
              <label>Estado</label>
              <select
                value={formData.status}
                onChange={(e) => handleFormChange("status", e.target.value)}
                disabled={saving}
              >
                {ESTADOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-field">
              <label>Responsable</label>
              <input
                type="text"
                value={formData.owner}
                onChange={(e) => handleFormChange("owner", e.target.value)}
                placeholder="Ej: José, Personal..."
                disabled={saving}
              />
            </div>
          </div>

          <div className="task-editor-actions">
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving
                ? "Guardando…"
                : editingId
                ? "Guardar cambios"
                : "Crear tarea"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary-btn"
                onClick={handleResetForm}
                disabled={saving}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Filtros */}
      <section className="filters-bar">
        <div className="filter-group">
          <label>Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={saving}
          >
            <option value="Todas">Todas</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En progreso">En progreso</option>
            <option value="Completada">Completada</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Tipo</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            disabled={saving}
          >
            <option value="Todas">Todas</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Zona</label>
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            disabled={saving}
          >
            <option value="Todas">Todas</option>
            {zoneOptions.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group filter-group-wide">
          <label>Buscar</label>
          <input
            type="text"
            placeholder="Buscar por tarea, zona o responsable..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            disabled={saving}
          />
        </div>
      </section>

      {/* Tabla */}
      <section className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Prioridad</th>
              <th>Tarea</th>
              <th>Zona / elemento</th>
              <th>Tipo</th>
              <th>Vence</th>
              <th>Estado</th>
              <th>Responsable</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <span className={getPriorityClass(task.priority)}>
                    {task.priority}
                  </span>
                </td>
                <td>{task.title}</td>
                <td>
                  <div className="task-zone-cell">
                    <span>{task.zone}</span>
                    <div className="task-zone-actions">
                      {onOpenZoneInMap && task.zone && (
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => onOpenZoneInMap(task.zone)}
                          disabled={saving}
                        >
                          Ver en mapa
                        </button>
                      )}
                    </div>
                  </div>
                </td>
                <td>{task.type}</td>
                <td>{task.due}</td>
                <td>
                  <span className={getStatusClass(task.status)}>
                    {task.status}
                  </span>
                </td>
                <td>{task.owner}</td>
                <td>
                  <div className="task-actions">
                    <button
                      type="button"
                      className="small-btn"
                      onClick={() => handleEditClick(task)}
                      disabled={saving}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="small-btn small-btn-danger"
                      onClick={() => handleDeleteClick(task.id)}
                      disabled={saving}
                    >
                      Borrar
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", opacity: 0.7 }}>
                  {loading
                    ? "Cargando…"
                    : "No hay tareas todavía. Creá la primera."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Calendario */}
      <section className="card tasks-calendar">
        <h3>Calendario de tareas</h3>

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listYear",
          }}
          locale="es"
          height="auto"
          events={calendarEvents}
        />
      </section>
    </div>
  );
}