



// src/pages/TareasPage.jsx
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";

import { useEffect, useMemo, useState } from "react";
import "../styles/tasks.css";

const STORAGE_KEY = "agromind_tasks_v1";
const DRAWINGS_KEY = "agromind_farm_drawings"; // mismo key que usa el mapa

const DEFAULT_TASKS = [
  {
    id: 1,
    title: "Revisar cerca norte",
    zone: "Cerca y límite de la propiedad",
    type: "Mantenimiento",
    priority: "Alta",
    due: "2026-01-25",
    status: "Pendiente",
    owner: "José",
  },
  {
    id: 2,
    title: "Riego zona de vivero",
    zone: "Zona de vivero",
    type: "Riego",
    priority: "Media",
    due: "2026-01-23",
    status: "En progreso",
    owner: "Personal",
  },
  {
    id: 3,
    title: "Limpieza calle 1",
    zone: "Calle 1",
    type: "Mantenimiento",
    priority: "Baja",
    due: "2026-01-30",
    status: "Completada",
    owner: "José",
  },
];

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

export default function TareasPage({ onOpenZoneInMap }) {
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [statusFilter, setStatusFilter] = useState("Todas");
  const [typeFilter, setTypeFilter] = useState("Todas");
  const [zoneFilter, setZoneFilter] = useState("Todas");
  const [searchText, setSearchText] = useState("");

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  // 🔗 Zonas que vienen del mapa (polígonos)
  const [mapZones, setMapZones] = useState([]);

  // Cargar tareas desde localStorage al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed);
        }
      }
    } catch (err) {
      console.warn("No se pudieron cargar tareas desde localStorage:", err);
    }
  }, []);

  // Guardar tareas en localStorage cuando cambian
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.warn("No se pudieron guardar tareas en localStorage:", err);
    }
  }, [tasks]);

  // Cargar zonas desde el mapa (localStorage del FarmMap)
  const refreshMapZones = () => {
    try {
      const raw = localStorage.getItem(DRAWINGS_KEY);
      if (!raw) {
        setMapZones([]);
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setMapZones([]);
        return;
      }

      const setNames = new Set();

      parsed.forEach((item) => {
        // Buscamos solo zonas (polígonos)
        const isPolygon =
          item.kind === "polygon" ||
          item.geomType === "Polygon";

        if (!isPolygon) return;

        const name = (item.name || "").trim();
        if (name.length > 0) {
          setNames.add(name);
        }
      });

      setMapZones(Array.from(setNames));
    } catch (err) {
      console.warn("No se pudieron leer zonas desde DRAWINGS_KEY:", err);
      setMapZones([]);
    }
  };

  // Leer zonas del mapa al montar
  useEffect(() => {
    refreshMapZones();
  }, []);

  // Resumen general
  const summary = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "Pendiente").length;
    const inProgress = tasks.filter((t) => t.status === "En progreso").length;
    const done = tasks.filter((t) => t.status === "Completada").length;

    return { total, pending, inProgress, done };
  }, [tasks]);

  // Zonas únicas para el filtro (tareas + mapa)
  const zoneOptions = useMemo(() => {
    const set = new Set();

    // Zonas de tareas
    tasks.forEach((t) => {
      if (t.zone) set.add(t.zone);
    });

    // Zonas del mapa
    mapZones.forEach((z) => {
      if (z) set.add(z);
    });

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
      task.title.toLowerCase().includes(query) ||
      (task.zone || "").toLowerCase().includes(query) ||
      task.type.toLowerCase().includes(query) ||
      (task.owner || "").toLowerCase().includes(query);

    return matchStatus && matchType && matchZone && matchSearch;
  });

  // --------- MANEJO DEL FORMULARIO ---------

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleResetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

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

    if (editingId) {
      // Modo edición
      setTasks((prev) =>
        prev.map((t) => (t.id === editingId ? { ...t, ...trimmed } : t))
      );
    } else {
      // Modo creación
      const newTask = {
        id: Date.now(),
        ...trimmed,
      };
      setTasks((prev) => [newTask, ...prev]);
    }

    handleResetForm();
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

  const handleDeleteClick = (id) => {
    const ok = window.confirm("¿Eliminar esta tarea?");
    if (!ok) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) {
      handleResetForm();
    }
  };

  // --------- RENDER ---------

  return (
    <div className="page">
      {/* ENCABEZADO */}
      <header className="page-header">
        <h1>Tareas de la finca</h1>
        <p className="page-subtitle">
          Organización operativa día a día. Tareas guardadas localmente en tu
          navegador (modo demo sin backend). Zonas enlazadas con el mapa.
        </p>
      </header>
  {/* ⬇️ NUEVA SECCIÓN IA (placeholder visual) */}
      <section className="card ia-placeholder">
        <h3>Recomendaciones IA</h3>
        <p>
          Aquí aparecerán sugerencias automáticas según zonas, clima, cultivos
          y carga de trabajo. Próximamente.
        </p>
      </section>


      {/* MINI DASHBOARD DE TAREAS */}
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
          <span className="summary-value summary-value-ok">
            {summary.done}
          </span>
        </div>
      </section>

      {/* FORMULARIO DE CREACIÓN / EDICIÓN */}
      <section className="task-editor card">
        <h3>{editingId ? "Editar tarea" : "Nueva tarea"}</h3>

        <div className="task-editor-grid">
          <div className="task-field">
            <label>Título</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFormChange("title", e.target.value)}
              placeholder="Ej: Revisar cerca norte"
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
              />
              {mapZones.length > 0 && (
                <select
                  value=""
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
            {mapZones.length === 0 && (
              <p className="task-hint">
                Dibujá zonas en el mapa para poder seleccionarlas aquí.
              </p>
            )}
          </div>

          <div className="task-field">
            <label>Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => handleFormChange("type", e.target.value)}
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
            />
          </div>

          <div className="task-field">
            <label>Estado</label>
            <select
              value={formData.status}
              onChange={(e) => handleFormChange("status", e.target.value)}
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
            />
          </div>
        </div>

        <div className="task-editor-actions">
          <button type="button" className="primary-btn" onClick={handleSubmit}>
            {editingId ? "Guardar cambios" : "Crear tarea"}
          </button>
          {editingId && (
            <button
              type="button"
              className="secondary-btn"
              onClick={handleResetForm}
            >
              Cancelar edición
            </button>
          )}

          <button
            type="button"
            className="secondary-btn"
            onClick={refreshMapZones}
            style={{ marginLeft: "auto" }}
          >
            Actualizar zonas desde mapa
          </button>
        </div>
      </section>

      {/* FILTROS */}
      <section className="filters-bar">
        <div className="filter-group">
          <label>Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
          />
        </div>
      </section>

      {/* TABLA PRINCIPAL */}
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
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="small-btn small-btn-danger"
                      onClick={() => handleDeleteClick(task.id)}
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
                  No hay tareas que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
   
     {/* ===== CALENDARIO ===== */}
      <section className="card tasks-calendar">
        <h3>Calendario de tareas</h3>

        <FullCalendar
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            listPlugin,
          ]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right:
              "dayGridMonth,timeGridWeek,timeGridDay,listYear",
          }}
          locale="es"
          height="auto"
          events={[]}
        />
      </section>
    </div>
  );
}
