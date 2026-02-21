// src/components/FarmShell.jsx
import { useMemo, useState } from "react";
import FarmMap from "./FarmMap";
import TareasPage from "../pages/TareasPage";
import FinanzasPage from "../pages/FinanzasPage";
import DispositivosPage from "../pages/DispositivosPage";
import InvestigadorPage from "../pages/InvestigadorPage";
import ProductosPage from "../pages/ProductosPage";
import Footer from "./Footer";
import "../styles/farm-shell.css";

// Helpers: fuente única para token/farmId (sin “magia” dispersa)
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

export default function FarmShell({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("mapa");
  const [focusZoneRequest, setFocusZoneRequest] = useState(null);

  // ✅ Token y farmId desde aquí (una sola fuente)
  const token = useMemo(() => getAuthToken(), []);
  const farmId = useMemo(() => getActiveFarmId(), []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleOpenZoneInMap = (zoneName) => {
    if (!zoneName) return;
    setFocusZoneRequest({
      name: zoneName,
      ts: Date.now(),
    });
    setActiveTab("mapa");
  };

  return (
    <div className="farm-shell">
      <header className="farm-shell-header">
        <div className="farm-shell-brand">
          <div className="brand-logo-circle">AG</div>
          <div className="brand-text">
            <div className="brand-name">AgroMind CR</div>
            <div className="brand-tagline">La finca que piensa.</div>
          </div>
        </div>

        <nav className="farm-shell-nav">
          {[
            ["mapa", "Mapa de la finca"],
            ["tareas", "Tareas"],
            ["finanzas", "Finanzas"],
            ["dispositivos", "Dispositivos"],
            ["investigador", "Investigador IA"],
            ["productos", "Productos de interés"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={activeTab === key ? "nav-tab nav-tab-active" : "nav-tab"}
              onClick={() => handleTabChange(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="farm-shell-right">
          {onLogout && (
            <button
              type="button"
              className="farm-logout-btn"
              onClick={onLogout}
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </header>

      <main className="farm-shell-main">
        <section className="farm-shell-map-card">
          {activeTab === "mapa" && (
            <FarmMap focusZoneRequest={focusZoneRequest} />
          )}

          {activeTab === "tareas" && (
            <TareasPage
              onOpenZoneInMap={handleOpenZoneInMap}
              token={token}
              farmId={farmId}
            />
          )}

          {activeTab === "finanzas" && <FinanzasPage />}
          {activeTab === "dispositivos" && <DispositivosPage />}
          {activeTab === "investigador" && <InvestigadorPage />}
          {activeTab === "productos" && <ProductosPage />}
        </section>
      </main>

      <Footer />
    </div>
  );
}