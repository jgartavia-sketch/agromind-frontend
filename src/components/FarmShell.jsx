// src/components/FarmShell.jsx
import { useState } from "react";
import FarmMap from "./FarmMap";
import TareasPage from "../pages/TareasPage";
import FinanzasPage from "../pages/FinanzasPage";
import DispositivosPage from "../pages/DispositivosPage";
import InvestigadorPage from "../pages/InvestigadorPage";
import ProductosPage from "../pages/ProductosPage";
import "../styles/farm-shell.css";

export default function FarmShell({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("mapa");
  const [focusZoneRequest, setFocusZoneRequest] = useState(null);

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
            ["finanzas", "Finanzas (demo)"],
            ["dispositivos", "Dispositivos"],
            ["investigador", "Investigador IA"],
            ["productos", "Productos de interés"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={
                activeTab === key ? "nav-tab nav-tab-active" : "nav-tab"
              }
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

      {/* 🔥 Banner de validación de deploy */}
      <div
        style={{
          background: "linear-gradient(90deg, #0f172a, #022c22)",
          border: "1px solid #22c55e",
          color: "#22c55e",
          padding: "8px 16px",
          textAlign: "center",
          fontWeight: "bold",
          letterSpacing: "0.5px",
        }}
      >
        ✅ AgroMind CR está oficialmente online 🚀
      </div>

      <main className="farm-shell-main">
        <section className="farm-shell-map-card">
          {activeTab === "mapa" && (
            <FarmMap focusZoneRequest={focusZoneRequest} />
          )}
          {activeTab === "tareas" && (
            <TareasPage onOpenZoneInMap={handleOpenZoneInMap} />
          )}
          {activeTab === "finanzas" && <FinanzasPage />}
          {activeTab === "dispositivos" && <DispositivosPage />}
          {activeTab === "investigador" && <InvestigadorPage />}
          {activeTab === "productos" && <ProductosPage />}
        </section>
      </main>
    </div>
  );
}
