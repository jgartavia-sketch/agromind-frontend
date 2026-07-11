// src/pages/DashboardPage.jsx
import "../styles/dashboard.css";

const kpis = [
  {
    label: "Procesos activos",
    value: "0",
    detail: "Procesos actualmente en ejecución",
    tone: "green",
  },
  {
    label: "Tareas pendientes",
    value: "0",
    detail: "Actividades que requieren seguimiento",
    tone: "amber",
  },
  {
    label: "Balance del mes",
    value: "₡0",
    detail: "Ingresos menos gastos registrados",
    tone: "blue",
  },
];

const systemStatus = [
  { label: "Mapa de la finca", status: "Sin revisar", tone: "neutral" },
  { label: "Procesos", status: "Sin actividad", tone: "neutral" },
  { label: "Tareas", status: "Sin pendientes", tone: "good" },
  { label: "Finanzas", status: "Sin movimientos", tone: "neutral" },
  { label: "Bitácora", status: "Sin registros", tone: "neutral" },
];

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

const activeProcesses = [
  {
    name: "Sin procesos activos",
    zone: "Cuando inicies un proceso se mostrará aquí.",
    progress: 0,
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
  const displayName =
    user?.name ||
    user?.firstName ||
    user?.first_name ||
    user?.email?.split("@")?.[0] ||
    "Productor";

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
          <strong>{farmId ? `Finca #${farmId}` : "Sin finca seleccionada"}</strong>
        </div>
      </section>

      <section className="dashboard-kpi-grid" aria-label="Indicadores principales">
        {kpis.map((item) => (
          <article
            key={item.label}
            className={`dashboard-kpi-card dashboard-kpi-${item.tone}`}
          >
            <div className="dashboard-kpi-top">
              <span>{item.label}</span>
              <span className="dashboard-kpi-dot" aria-hidden="true" />
            </div>

            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-panel dashboard-status-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="dashboard-section-kicker">Vista general</span>
              <h2>Estado de la finca</h2>
            </div>

            <span className="dashboard-health-badge">Operación estable</span>
          </div>

          <div className="dashboard-status-list">
            {systemStatus.map((item) => (
              <div className="dashboard-status-row" key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.status}</span>
                </div>

                <span
                  className={`dashboard-status-indicator dashboard-status-${item.tone}`}
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-panel dashboard-alerts-panel">
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
        </article>
      </section>

      <section className="dashboard-main-grid dashboard-secondary-grid">
        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="dashboard-section-kicker">Últimos movimientos</span>
              <h2>Actividad reciente</h2>
            </div>
          </div>

          <div className="dashboard-timeline">
            {recentActivity.map((activity) => (
              <div className="dashboard-timeline-item" key={activity.title}>
                <span className="dashboard-timeline-marker" aria-hidden="true" />

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

        <article className="dashboard-panel">
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

      <section className="dashboard-panel dashboard-process-panel">
        <div className="dashboard-panel-header">
          <div>
            <span className="dashboard-section-kicker">Operación</span>
            <h2>Procesos activos</h2>
          </div>
        </div>

        <div className="dashboard-process-list">
          {activeProcesses.map((process) => (
            <div className="dashboard-process-item" key={process.name}>
              <div className="dashboard-process-copy">
                <div>
                  <strong>{process.name}</strong>
                  <span>{process.zone}</span>
                </div>

                <span>{process.progress}%</span>
              </div>

              <div
                className="dashboard-progress-track"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={process.progress}
              >
                <span style={{ width: `${process.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-finance-grid">
        <article className="dashboard-panel dashboard-finance-card">
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

        <article className="dashboard-panel dashboard-map-summary">
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
