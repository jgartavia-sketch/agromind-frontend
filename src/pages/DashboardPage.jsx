// src/pages/DashboardPage.jsx
import { useEffect, useMemo, useState } from "react";
import "../styles/dashboard.css";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://agromind-backend-slem.onrender.com";

function getAuthToken() {
  return (
    localStorage.getItem("agromind_token") ||
    localStorage.getItem("agromind_jwt") ||
    localStorage.getItem("token") ||
    localStorage.getItem("agromind_auth_token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token") ||
    ""
  );
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
    const message =
      data?.error ||
      data?.message ||
      (typeof data === "string" && data.trim()) ||
      `Error HTTP ${response.status}`;

    throw new Error(message);
  }

  return data;
}

function getMapZones(mapPayload) {
  return Array.isArray(mapPayload?.zones) ? mapPayload.zones : [];
}

function countComponents(zones) {
  return zones.reduce((total, zone) => {
    return total + (Array.isArray(zone?.components) ? zone.components.length : 0);
  }, 0);
}

function countPendingTasks(tasks) {
  return tasks.filter((task) => task?.status !== "Completada").length;
}

function countActiveProcesses(processLists) {
  return processLists
    .flat()
    .filter((process) => process?.status === "Activo").length;
}

const recentActivity = [
  {
    title: "Todavía no hay actividad reciente",
    description:
      "Las acciones realizadas en AgroMind aparecerán aquí automáticamente.",
    time: "Ahora",
  },
];

const upcomingTasks = [
  {
    title: "No hay tareas próximas",
    meta: "Las próximas actividades aparecerán en esta sección.",
  },
];

const alerts = [
  {
    title: "Todo en orden",
    description: "No hay alertas activas en este momento.",
    level: "success",
  },
];

export default function DashboardPage({ user, farmId }) {
  const [dashboardKpis, setDashboardKpis] = useState({
    activeProcesses: 0,
    pendingTasks: 0,
    registeredComponents: 0,
  });

  const [kpisLoading, setKpisLoading] = useState(false);
  const [kpisError, setKpisError] = useState("");

  const displayName =
    user?.name ||
    user?.firstName ||
    user?.first_name ||
    user?.email?.split("@")?.[0] ||
    "Productor";

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardKpis() {
      if (!farmId) {
        setDashboardKpis({
          activeProcesses: 0,
          pendingTasks: 0,
          registeredComponents: 0,
        });
        setKpisError("");
        setKpisLoading(false);
        return;
      }

      try {
        setKpisLoading(true);
        setKpisError("");

        const timestamp = Date.now();

        const [mapPayload, tasksPayload] = await Promise.all([
          apiFetch(`/api/farms/${farmId}/map?ts=${timestamp}`),
          apiFetch(`/api/farms/${farmId}/tasks?ts=${timestamp}`),
        ]);

        if (cancelled) return;

        const zones = getMapZones(mapPayload);
        const tasks = Array.isArray(tasksPayload?.tasks)
          ? tasksPayload.tasks
          : [];

        const processRequests = zones
          .filter((zone) => zone?.id)
          .map((zone) =>
            apiFetch(`/api/processes/zone/${zone.id}`, {
              method: "GET",
            }).catch(() => [])
          );

        const processLists =
          processRequests.length > 0
            ? await Promise.all(processRequests)
            : [];

        if (cancelled) return;

        setDashboardKpis({
          activeProcesses: countActiveProcesses(processLists),
          pendingTasks: countPendingTasks(tasks),
          registeredComponents: countComponents(zones),
        });
      } catch (error) {
        if (cancelled) return;

        setDashboardKpis({
          activeProcesses: 0,
          pendingTasks: 0,
          registeredComponents: 0,
        });

        setKpisError(
          error?.message || "No se pudieron cargar los indicadores."
        );
      } finally {
        if (!cancelled) {
          setKpisLoading(false);
        }
      }
    }

    loadDashboardKpis();

    return () => {
      cancelled = true;
    };
  }, [farmId]);

  const kpis = useMemo(
    () => [
      {
        label: "Procesos activos",
        value: kpisLoading ? "—" : String(dashboardKpis.activeProcesses),
        detail: "Procesos actualmente en ejecución",
        tone: "green",
      },
      {
        label: "Tareas pendientes",
        value: kpisLoading ? "—" : String(dashboardKpis.pendingTasks),
        detail: "Actividades que requieren seguimiento",
        tone: "amber",
      },
      {
        label: "Componentes registrados",
        value: kpisLoading ? "—" : String(dashboardKpis.registeredComponents),
        detail: "Elementos registrados en la finca",
        tone: "blue",
      },
    ],
    [dashboardKpis, kpisLoading]
  );

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
          <strong>
            {farmId ? `Finca #${farmId}` : "Sin finca seleccionada"}
          </strong>
        </div>
      </section>

      {kpisError ? (
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
          {kpisError}
        </div>
      ) : null}

      <section
        className="dashboard-kpi-grid"
        aria-label="Indicadores principales"
        aria-busy={kpisLoading}
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
            <p>{kpisLoading ? "Cargando datos reales..." : item.detail}</p>
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
          {alerts.map((alert) => (
            <div
              className={`dashboard-alert dashboard-alert-${alert.level}`}
              key={alert.title}
            >
              <span className="dashboard-alert-icon" aria-hidden="true">
                ✓
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
            {recentActivity.map((activity) => (
              <div className="dashboard-timeline-item" key={activity.title}>
                <span
                  className="dashboard-timeline-marker"
                  aria-hidden="true"
                />

                <div className="dashboard-timeline-content">
                  <div>
                    <strong>{activity.title}</strong>
                    <span>{activity.time}</span>
                  </div>

                  <p>{activity.description}</p>
                </div>
              </div>
            ))}
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
            {upcomingTasks.map((task) => (
              <div className="dashboard-upcoming-item" key={task.title}>
                <div className="dashboard-upcoming-date">
                  <span>—</span>
                  <small>Sin fecha</small>
                </div>

                <div>
                  <strong>{task.title}</strong>
                  <p>{task.meta}</p>
                </div>
              </div>
            ))}
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
              <strong>₡0</strong>
            </div>

            <div>
              <span>Gastos</span>
              <strong>₡0</strong>
            </div>

            <div className="dashboard-finance-balance">
              <span>Balance</span>
              <strong>₡0</strong>
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
              <strong>0</strong>
              <span>Zonas</span>
            </div>

            <div>
              <strong>0</strong>
              <span>Puntos</span>
            </div>

            <div>
              <strong>0</strong>
              <span>Líneas</span>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
