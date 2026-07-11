// src/pages/DashboardPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFarm } from "../context/FarmContext";
import { loadBitacoraEntries } from "../services/bitacoraService";
import "../styles/dashboard.css";

const RAW_API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://agromind-backend-slem.onrender.com";

const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

function pickLocalStorage(keys) {
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value && String(value).trim()) return String(value).trim();
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
    "agromind_auth_token",
    "auth_token",
  ]);
}

async function apiFetch(path, options = {}) {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        (typeof data === "string" && data.trim()) ||
        `Error HTTP ${response.status}`
    );
  }

  return data;
}

function toYYYYMMDD(value) {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  const normalized = toYYYYMMDD(value);
  if (!normalized) return "Sin fecha";

  try {
    return new Date(`${normalized}T12:00:00`).toLocaleDateString("es-CR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return normalized;
  }
}

function formatRelativeTime(value) {
  if (!value) return "Reciente";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Reciente";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Ahora";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;

  return date.toLocaleDateString("es-CR");
}

function formatMoneyCRC(value) {
  return Number(value || 0).toLocaleString("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  });
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function normalizeTasks(payload) {
  const list = Array.isArray(payload?.tasks)
    ? payload.tasks
    : Array.isArray(payload)
    ? payload
    : [];

  return list.map((task) => ({
    ...task,
    start: toYYYYMMDD(task?.start),
    due: toYYYYMMDD(task?.due),
    status: task?.status === "Completada" ? "Completada" : "En progreso",
  }));
}

function normalizeMovements(payload) {
  return Array.isArray(payload?.movements)
    ? payload.movements
    : Array.isArray(payload)
    ? payload
    : [];
}

function normalizeBitacoraEntry(entry, index) {
  const title =
    entry?.title ||
    entry?.action ||
    entry?.type ||
    entry?.category ||
    "Registro de bitácora";

  const description =
    entry?.text ||
    entry?.description ||
    entry?.note ||
    entry?.message ||
    "Se registró una nueva actividad en la finca.";

  const date =
    entry?.createdAt ||
    entry?.updatedAt ||
    entry?.date ||
    entry?.timestamp ||
    null;

  return {
    id: entry?.id || entry?._id || `bitacora-${index}`,
    title: String(title),
    description: String(description),
    date,
  };
}

function buildRecentActivity(entries, movements, tasks) {
  const bitacoraItems = entries.map((entry, index) =>
    normalizeBitacoraEntry(entry, index)
  );

  const movementItems = movements.map((movement, index) => ({
    id: `finance-${movement?.id || index}`,
    title:
      movement?.type === "Ingreso"
        ? "Ingreso registrado"
        : "Gasto registrado",
    description:
      movement?.concept ||
      movement?.category ||
      "Movimiento financiero actualizado.",
    date:
      movement?.createdAt ||
      movement?.updatedAt ||
      movement?.date ||
      null,
  }));

  const taskItems = tasks.map((task, index) => ({
    id: `task-${task?.id || index}`,
    title:
      task?.status === "Completada"
        ? "Tarea completada"
        : "Tarea registrada",
    description: task?.title || "Actividad operativa de la finca.",
    date:
      task?.updatedAt ||
      task?.createdAt ||
      task?.start ||
      task?.due ||
      null,
  }));

  return [...bitacoraItems, ...movementItems, ...taskItems]
    .sort((a, b) => {
      const aTime = a?.date ? new Date(a.date).getTime() : 0;
      const bTime = b?.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5);
}

function getUpcomingTasks(tasks) {
  const today = new Date().toISOString().slice(0, 10);

  return tasks
    .filter(
      (task) =>
        task?.status !== "Completada" &&
        task?.due &&
        task.due >= today
    )
    .sort((a, b) => String(a.due).localeCompare(String(b.due)))
    .slice(0, 5);
}

function buildAlerts({ tasks, processes, movements }) {
  const today = new Date().toISOString().slice(0, 10);

  const overdueTasks = tasks.filter(
    (task) =>
      task?.status !== "Completada" &&
      task?.due &&
      task.due < today
  ).length;

  const blockedProcesses = processes.filter(
    (process) => process?.status === "Bloqueado"
  ).length;

  const activeProcessesWithoutSteps = processes.filter(
    (process) =>
      process?.status === "Activo" &&
      (!Array.isArray(process?.steps) || process.steps.length === 0)
  ).length;

  const alertList = [];

  if (overdueTasks > 0) {
    alertList.push({
      title: `${overdueTasks} ${
        overdueTasks === 1 ? "tarea vencida" : "tareas vencidas"
      }`,
      description: "Hay actividades pendientes cuya fecha límite ya pasó.",
      level: "danger",
      icon: "!",
    });
  }

  if (blockedProcesses > 0) {
    alertList.push({
      title: `${blockedProcesses} ${
        blockedProcesses === 1 ? "proceso bloqueado" : "procesos bloqueados"
      }`,
      description: "Revisá los procesos que no pueden continuar.",
      level: "warning",
      icon: "!",
    });
  }

  if (activeProcessesWithoutSteps > 0) {
    alertList.push({
      title: `${activeProcessesWithoutSteps} ${
        activeProcessesWithoutSteps === 1
          ? "proceso sin etapas"
          : "procesos sin etapas"
      }`,
      description: "Estos procesos están activos, pero todavía no tienen ruta operativa.",
      level: "warning",
      icon: "!",
    });
  }

  if (movements.length === 0) {
    alertList.push({
      title: "Sin movimientos financieros",
      description: "Todavía no hay ingresos ni gastos registrados para esta finca.",
      level: "info",
      icon: "i",
    });
  }

  if (alertList.length === 0) {
    alertList.push({
      title: "Todo en orden",
      description: "No hay alertas activas en este momento.",
      level: "success",
      icon: "✓",
    });
  }

  return alertList.slice(0, 4);
}

export default function DashboardPage({ user }) {
  const {
    activeFarm,
    farmId: contextFarmId,
    farmName,
  } = useFarm();

  const farmId = contextFarmId || activeFarm?.id || "";

  const [data, setData] = useState({
    map: {
      zones: [],
      points: [],
      lines: [],
    },
    tasks: [],
    movements: [],
    processes: [],
    bitacora: [],
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const displayName =
    user?.name ||
    user?.firstName ||
    user?.first_name ||
    user?.email?.split("@")?.[0] ||
    "Productor";

  const activeFarmLabel =
    farmName ||
    activeFarm?.name ||
    (farmId ? "Finca activa" : "Sin finca seleccionada");

  const loadDashboard = useCallback(async () => {
    if (!farmId) {
      setData({
        map: { zones: [], points: [], lines: [] },
        tasks: [],
        movements: [],
        processes: [],
        bitacora: [],
      });
      setErrorMsg("");
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setErrorMsg("");

    try {
      const timestamp = Date.now();

      const [mapPayload, tasksPayload, financePayload, bitacoraPayload] =
        await Promise.all([
          apiFetch(`/api/farms/${farmId}/map?ts=${timestamp}`),
          apiFetch(`/api/farms/${farmId}/tasks?ts=${timestamp}`),
          apiFetch(`/api/farms/${farmId}/finance/movements?ts=${timestamp}`),
          loadBitacoraEntries(farmId).catch(() => []),
        ]);

      if (cancelled) return;

      const zones = Array.isArray(mapPayload?.zones)
        ? mapPayload.zones
        : [];
      const points = Array.isArray(mapPayload?.points)
        ? mapPayload.points
        : [];
      const lines = Array.isArray(mapPayload?.lines)
        ? mapPayload.lines
        : [];

      const processLists = await Promise.all(
        zones
          .filter((zone) => zone?.id)
          .map((zone) =>
            apiFetch(`/api/processes/zone/${zone.id}`, {
              method: "GET",
            }).catch(() => [])
          )
      );

      if (cancelled) return;

      setData({
        map: {
          zones,
          points,
          lines,
        },
        tasks: normalizeTasks(tasksPayload),
        movements: normalizeMovements(financePayload),
        processes: processLists.flat(),
        bitacora: Array.isArray(bitacoraPayload) ? bitacoraPayload : [],
      });
    } catch (error) {
      if (cancelled) return;

      setErrorMsg(
        error?.message || "No se pudo cargar el centro de control."
      );
    } finally {
      if (!cancelled) setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [farmId]);

  useEffect(() => {
    let active = true;

    async function run() {
      if (!active) return;
      await loadDashboard();
    }

    run();

    return () => {
      active = false;
    };
  }, [loadDashboard]);

  useEffect(() => {
    function handleRefresh(event) {
      const targetFarmId = event?.detail?.farmId
        ? String(event.detail.farmId)
        : "";

      if (
        targetFarmId &&
        farmId &&
        targetFarmId !== String(farmId)
      ) {
        return;
      }

      loadDashboard();
    }

    window.addEventListener("agromind:tasks:refresh", handleRefresh);
    window.addEventListener("agromind:map:refresh", handleRefresh);
    window.addEventListener("agromind:zones:refresh", handleRefresh);
    window.addEventListener("agromind:farm:refresh", handleRefresh);
    window.addEventListener("agromind:finance:refresh", handleRefresh);
    window.addEventListener("agromind:bitacora:refresh", handleRefresh);

    return () => {
      window.removeEventListener("agromind:tasks:refresh", handleRefresh);
      window.removeEventListener("agromind:map:refresh", handleRefresh);
      window.removeEventListener("agromind:zones:refresh", handleRefresh);
      window.removeEventListener("agromind:farm:refresh", handleRefresh);
      window.removeEventListener("agromind:finance:refresh", handleRefresh);
      window.removeEventListener("agromind:bitacora:refresh", handleRefresh);
    };
  }, [farmId, loadDashboard]);

  const registeredComponents = useMemo(
    () =>
      data.map.zones.reduce(
        (total, zone) =>
          total +
          (Array.isArray(zone?.components)
            ? zone.components.length
            : 0),
        0
      ),
    [data.map.zones]
  );

  const activeProcesses = useMemo(
    () =>
      data.processes.filter(
        (process) => process?.status === "Activo"
      ).length,
    [data.processes]
  );

  const pendingTasks = useMemo(
    () =>
      data.tasks.filter(
        (task) => task?.status !== "Completada"
      ).length,
    [data.tasks]
  );

  const currentMonthMovements = useMemo(() => {
    const monthKey = getCurrentMonthKey();

    return data.movements.filter(
      (movement) => toYYYYMMDD(movement?.date).slice(0, 7) === monthKey
    );
  }, [data.movements]);

  const financeSummary = useMemo(() => {
    const ingresos = currentMonthMovements
      .filter((movement) => movement?.type === "Ingreso")
      .reduce(
        (total, movement) =>
          total + Number(movement?.amount || 0),
        0
      );

    const gastos = currentMonthMovements
      .filter((movement) => movement?.type === "Gasto")
      .reduce(
        (total, movement) =>
          total + Number(movement?.amount || 0),
        0
      );

    return {
      ingresos,
      gastos,
      balance: ingresos - gastos,
    };
  }, [currentMonthMovements]);

  const recentActivity = useMemo(
    () =>
      buildRecentActivity(
        data.bitacora,
        data.movements,
        data.tasks
      ),
    [data.bitacora, data.movements, data.tasks]
  );

  const upcomingTasks = useMemo(
    () => getUpcomingTasks(data.tasks),
    [data.tasks]
  );

  const alerts = useMemo(
    () =>
      buildAlerts({
        tasks: data.tasks,
        processes: data.processes,
        movements: data.movements,
      }),
    [data.tasks, data.processes, data.movements]
  );

  const kpis = [
    {
      label: "Procesos activos",
      value: loading ? "—" : String(activeProcesses),
      detail: "Procesos actualmente en ejecución",
      tone: "green",
    },
    {
      label: "Tareas pendientes",
      value: loading ? "—" : String(pendingTasks),
      detail: "Actividades que requieren seguimiento",
      tone: "amber",
    },
    {
      label: "Componentes registrados",
      value: loading ? "—" : String(registeredComponents),
      detail: "Elementos registrados en la finca",
      tone: "blue",
    },
  ];

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-eyebrow">Centro de control</span>
          <h1>Buenos días, {displayName}</h1>
          <p>
            Visualizá el estado general de tu finca y tomá decisiones con una
            lectura clara de tu operación.
          </p>
        </div>

        <div className="dashboard-farm-chip">
          <span className="dashboard-farm-chip-label">Finca activa</span>
          <strong>{activeFarmLabel}</strong>
        </div>
      </section>

      {errorMsg ? (
        <div
          role="alert"
          style={{
            marginBottom: "1rem",
            padding: "0.8rem 1rem",
            borderRadius: "14px",
            border: "1px solid rgba(248,113,113,0.24)",
            background: "rgba(248,113,113,0.10)",
            color: "#fecaca",
            fontSize: "0.88rem",
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      <section
        className="dashboard-kpi-grid"
        aria-label="Indicadores principales"
        aria-busy={loading}
      >
        {kpis.map((item) => (
          <article
            key={item.label}
            className={`dashboard-kpi-card dashboard-kpi-${item.tone}`}
            tabIndex="0"
          >
            <div className="dashboard-kpi-top">
              <span>{item.label}</span>
              <span className="dashboard-kpi-dot" aria-hidden="true" />
            </div>

            <strong>{item.value}</strong>
            <p>{loading ? "Actualizando finca..." : item.detail}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-panel dashboard-alerts-panel dashboard-interactive-panel">
        <div className="dashboard-panel-header">
          <div>
            <span className="dashboard-section-kicker">Seguimiento</span>
            <h2>Alertas</h2>
          </div>
        </div>

        <div className="dashboard-alert-list">
          {alerts.map((alert, index) => (
            <div
              className={`dashboard-alert dashboard-alert-${alert.level}`}
              key={`${alert.title}-${index}`}
            >
              <span className="dashboard-alert-icon" aria-hidden="true">
                {alert.icon}
              </span>

              <div>
                <strong>{alert.title}</strong>
                <p>{alert.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-main-grid dashboard-secondary-grid">
        <article className="dashboard-panel dashboard-interactive-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="dashboard-section-kicker">
                Últimos movimientos
              </span>
              <h2>Actividad reciente</h2>
            </div>
          </div>

          <div className="dashboard-timeline">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div
                  className="dashboard-timeline-item"
                  key={activity.id}
                >
                  <span
                    className="dashboard-timeline-marker"
                    aria-hidden="true"
                  />

                  <div className="dashboard-timeline-content">
                    <div>
                      <strong>{activity.title}</strong>
                      <span>{formatRelativeTime(activity.date)}</span>
                    </div>

                    <p>{activity.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="dashboard-timeline-item">
                <span
                  className="dashboard-timeline-marker"
                  aria-hidden="true"
                />

                <div className="dashboard-timeline-content">
                  <div>
                    <strong>Todavía no hay actividad reciente</strong>
                    <span>Ahora</span>
                  </div>

                  <p>
                    Las acciones realizadas en AgroMind aparecerán aquí
                    automáticamente.
                  </p>
                </div>
              </div>
            )}
          </div>
        </article>

        <article className="dashboard-panel dashboard-interactive-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="dashboard-section-kicker">Planificación</span>
              <h2>Próximas actividades</h2>
            </div>
          </div>

          <div className="dashboard-upcoming-list">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map((task) => (
                <div
                  className="dashboard-upcoming-item"
                  key={task.id}
                >
                  <div className="dashboard-upcoming-date">
                    <span>{formatDate(task.due)}</span>
                    <small>{task.priority || "Media"}</small>
                  </div>

                  <div>
                    <strong>{task.title}</strong>
                    <p>
                      {task.zone || "Zona general"}
                      {task.owner ? ` · ${task.owner}` : ""}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="dashboard-upcoming-item">
                <div className="dashboard-upcoming-date">
                  <span>—</span>
                  <small>Sin fecha</small>
                </div>

                <div>
                  <strong>No hay tareas próximas</strong>
                  <p>
                    Las próximas actividades aparecerán en esta sección.
                  </p>
                </div>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-finance-grid">
        <article className="dashboard-panel dashboard-finance-card dashboard-interactive-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="dashboard-section-kicker">Finanzas</span>
              <h2>Resumen del mes</h2>
            </div>
          </div>

          <div className="dashboard-finance-summary">
            <div>
              <span>Ingresos</span>
              <strong>
                {loading
                  ? "—"
                  : formatMoneyCRC(financeSummary.ingresos)}
              </strong>
            </div>

            <div>
              <span>Gastos</span>
              <strong>
                {loading
                  ? "—"
                  : formatMoneyCRC(financeSummary.gastos)}
              </strong>
            </div>

            <div className="dashboard-finance-balance">
              <span>Balance</span>
              <strong>
                {loading
                  ? "—"
                  : formatMoneyCRC(financeSummary.balance)}
              </strong>
            </div>
          </div>
        </article>

        <article className="dashboard-panel dashboard-map-summary dashboard-interactive-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="dashboard-section-kicker">Territorio</span>
              <h2>Resumen del mapa</h2>
            </div>
          </div>

          <div className="dashboard-map-metrics">
            <div>
              <strong>{loading ? "—" : data.map.zones.length}</strong>
              <span>Zonas</span>
            </div>

            <div>
              <strong>{loading ? "—" : data.map.points.length}</strong>
              <span>Puntos</span>
            </div>

            <div>
              <strong>{loading ? "—" : data.map.lines.length}</strong>
              <span>Líneas</span>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
