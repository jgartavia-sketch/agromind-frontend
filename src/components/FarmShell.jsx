// src/components/FarmShell.jsx
import { useEffect, useMemo, useState } from "react";
import FarmMap from "./map/FarmMap";
import TareasPage from "../pages/TareasPage";
import FinanzasPage from "../pages/FinanzasPage";
import DispositivosPage from "../pages/DispositivosPage";
import InvestigadorPage from "../pages/InvestigadorPage";
import ProductosPage from "../pages/ProductosPage";
import ClimaPage from "../pages/ClimaPage";
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

  // ✅ nueva fuente de verdad para ubicación real de la finca
  const [farmLocation, setFarmLocation] = useState({
    lat: null,
    lon: null,
    zoom: null,
    farmId: getActiveFarmId() || null,
    source: null,
    updatedAt: null,
  });

  // ✅ si cambia localStorage (login/logout en otra parte), nos enteramos
  useEffect(() => {
    const sync = () => {
      const nextToken = getAuthToken();
      const nextFarmId = getActiveFarmId();

      setToken(nextToken);
      setFarmId(nextFarmId);

      setFarmLocation((prev) => ({
        ...prev,
        farmId: nextFarmId || prev.farmId || null,
      }));
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

  // ✅ FarmMap nos empuja la ubicación real aquí
  const handleFarmLocationChange = (location) => {
    if (!location) return;

    setFarmLocation((prev) => {
      const next = {
        lat:
          typeof location.lat === "number" && !Number.isNaN(location.lat)
            ? location.lat
            : prev.lat,
        lon:
          typeof location.lon === "number" && !Number.isNaN(location.lon)
            ? location.lon
            : prev.lon,
        zoom:
          typeof location.zoom === "number" && !Number.isNaN(location.zoom)
            ? location.zoom
            : prev.zoom,
        farmId: location.farmId || farmId || prev.farmId || null,
        source: location.source || prev.source || null,
        updatedAt: Date.now(),
      };

      return next;
    });
  };

  const climaLocation = useMemo(() => {
    return {
      lat: farmLocation?.lat,
      lon: farmLocation?.lon,
      zoom: farmLocation?.zoom,
      farmId: farmLocation?.farmId || farmId || null,
      source: farmLocation?.source || null,
      updatedAt: farmLocation?.updatedAt || null,
    };
  }, [farmLocation, farmId]);

  // ✅ Logout “a prueba de usuarios”
  const handleLogoutClick = () => {
    // limpia token + finca activa (y cualquier rastro)
    clearLocalStorage(TOKEN_KEYS);
    clearLocalStorage(FARMID_KEYS);

    // refresca estado local inmediato
    setToken("");
    setFarmId("");
    setFarmLocation({
      lat: null,
      lon: null,
      zoom: null,
      farmId: null,
      source: null,
      updatedAt: Date.now(),
    });

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
            ["clima", "Clima"],
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
          {activeTab === "mapa" && (
            <FarmMap
              focusZoneRequest={focusZoneRequest}
              onFarmLocationChange={handleFarmLocationChange}
            />
          )}

          {activeTab === "tareas" && (
            <TareasPage
              onOpenZoneInMap={handleOpenZoneInMap}
              token={token}
              farmId={farmId}
            />
          )}

          {activeTab === "finanzas" && <FinanzasPage />}

          {activeTab === "clima" && (
            <ClimaPage
              farmLocation={climaLocation}
              token={token}
              farmId={farmId}
            />
          )}

          {activeTab === "dispositivos" && <DispositivosPage />}
          {activeTab === "investigador" && <InvestigadorPage />}
          {activeTab === "productos" && <ProductosPage />}
        </section>
      </main>

      <Footer />
    </div>
  );
}