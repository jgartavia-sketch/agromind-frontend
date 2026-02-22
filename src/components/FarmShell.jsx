// src/components/FarmShell.jsx
import { useEffect, useMemo, useState } from "react";
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

const TOKEN_KEYS = [
  "agromind_token",
  "agromind_jwt",
  "token",
  "jwt",
  "access_token",
];

const FARMID_KEYS = [
  "agromind_active_farm_id",
  "activeFarmId",
  "farmId",
  "agromind_farm_id",
];

function getAuthToken() {
  return pickLocalStorage(TOKEN_KEYS);
}

function getActiveFarmId() {
  return pickLocalStorage(FARMID_KEYS);
}

function clearLocalStorage(keys) {
  for (const k of keys) localStorage.removeItem(k);
}

export default function FarmShell({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("mapa");
  const [focusZoneRequest, setFocusZoneRequest] = useState(null);

  // ✅ estado reactivo (NO congelado)
  const [token, setToken] = useState(() => getAuthToken());
  const [farmId, setFarmId] = useState(() => getActiveFarmId());

  // ✅ si cambia localStorage (login/logout en otra parte), nos enteramos
  useEffect(() => {
    const sync = () => {
      setToken(getAuthToken());
      setFarmId(getActiveFarmId());
    };

    // evento nativo (entre tabs) + fallback (mismo tab) por seguridad
    window.addEventListener("storage", sync);

    // “poll” ligero: evita quedarnos pegados si login/logout ocurre sin storage event
    const t = setInterval(sync, 800);

    return () => {
      window.removeEventListener("storage", sync);
      clearInterval(t);
    };
  }, []);

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

  // ✅ Logout “a prueba de usuarios”
  const handleLogoutClick = () => {
    // limpia token + finca activa (y cualquier rastro)
    clearLocalStorage(TOKEN_KEYS);
    clearLocalStorage(FARMID_KEYS);

    // refresca estado local inmediato
    setToken("");
    setFarmId("");

    // vuelve a mapa por higiene visual
    setActiveTab("mapa");
    setFocusZoneRequest(null);

    // delega flujo de logout real (backend/estado global)
    if (onLogout) onLogout();
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
              onClick={handleLogoutClick}
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </header>

      <main className="farm-shell-main">
        <section className="farm-shell-map-card">
          {activeTab === "mapa" && <FarmMap focusZoneRequest={focusZoneRequest} />}

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