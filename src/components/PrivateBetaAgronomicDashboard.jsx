import { useEffect, useState } from "react";
import "../styles/technical-sheets-beta.css";

const PRIVATE_BETA_EMAIL = "memo@gmail.com";
const API_BASE = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "https://agromind-backend-slem.onrender.com"
).replace(/\/+$/, "");

function getToken() {
  return (
    localStorage.getItem("agromind_token") ||
    localStorage.getItem("agromind_jwt") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CR", { day: "2-digit", month: "short" });
}

export default function PrivateBetaAgronomicDashboard({ user, farmId }) {
  const betaEnabled = String(user?.email || "").trim().toLowerCase() === PRIVATE_BETA_EMAIL;
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!betaEnabled || !farmId) {
      setSummary(null);
      return;
    }

    let alive = true;

    async function load() {
      try {
        const response = await fetch(
          `${API_BASE}/api/farms/${farmId}/technical-beta/summary?ts=${Date.now()}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
            cache: "no-store",
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "No se pudo cargar el resumen técnico.");
        if (alive) {
          setSummary(data);
          setError("");
        }
      } catch (e) {
        if (alive) setError(e?.message || "No se pudo cargar el resumen técnico.");
      }
    }

    load();
    const refresh = () => load();
    window.addEventListener("agromind:tasks:refresh", refresh);
    window.addEventListener("agromind:technical:refresh", refresh);
    return () => {
      alive = false;
      window.removeEventListener("agromind:tasks:refresh", refresh);
      window.removeEventListener("agromind:technical:refresh", refresh);
    };
  }, [betaEnabled, farmId]);

  if (!betaEnabled || !farmId) return null;

  return (
    <section className="agts-dashboard" aria-label="Operación agronómica beta">
      <span className="agts-kicker">AgroMind Next · beta privada</span>
      <h2>Operación agronómica</h2>
      <div className="agts-mini">
        Lectura en vivo de ciclos y aplicaciones generadas desde fichas técnicas.
      </div>

      {error && <div className="agts-alert error" style={{ marginTop: 10 }}>{error}</div>}
      {!summary && !error && <div className="agts-loading" style={{ marginTop: 10 }}>Calculando operación técnica…</div>}

      {summary && (
        <>
          <div className="agts-dashboard-grid">
            <div className="agts-dashboard-card"><strong>{summary.activeCycles ?? 0}</strong><span>Ciclos activos</span></div>
            <div className="agts-dashboard-card"><strong>{summary.todayApplications ?? 0}</strong><span>Aplicaciones para hoy</span></div>
            <div className="agts-dashboard-card"><strong>{summary.overdueApplications ?? 0}</strong><span>Aplicaciones vencidas</span></div>
            <div className="agts-dashboard-card"><strong>{summary.compliancePct ?? 0}%</strong><span>Cumplimiento programado</span></div>
          </div>

          <div className="agts-dashboard-grid" style={{ marginTop: 10 }}>
            <div className="agts-dashboard-card"><strong>{summary.completedApplications ?? 0}</strong><span>Realizadas</span></div>
            <div className="agts-dashboard-card"><strong>{summary.pendingApplications ?? 0}</strong><span>Pendientes</span></div>
            <div className="agts-dashboard-card"><strong>{summary.extraApplications ?? 0}</strong><span>Extraordinarias</span></div>
            <div className="agts-dashboard-card"><strong>{summary.totalCycles ?? 0}</strong><span>Ciclos históricos</span></div>
          </div>

          {(summary.upcomingApplications || []).length > 0 && (
            <div className="agts-upcoming">
              <strong style={{ color: "#e2e8f0", fontSize: ".82rem" }}>Próximas aplicaciones</strong>
              {(summary.upcomingApplications || []).slice(0, 5).map((app) => (
                <div className="agts-upcoming-item" key={app.id}>
                  <span>{app.name}{app.product ? ` · ${app.product}` : ""}</span>
                  <strong>{formatDate(app.scheduledDate)}</strong>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
