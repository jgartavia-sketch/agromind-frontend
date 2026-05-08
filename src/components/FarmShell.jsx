// src/components/FarmShell.jsx
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import "../styles/farm-shell.css";

const FarmMap = lazy(() => import("./map/FarmMap"));
const TareasPage = lazy(() => import("../pages/TareasPage"));
const FinanzasPage = lazy(() => import("../pages/FinanzasPage"));
const DispositivosPage = lazy(() => import("../pages/DispositivosPage"));
const InvestigadorPage = lazy(() => import("../pages/InvestigadorPage"));
const ProductosPage = lazy(() => import("../pages/ProductosPage"));
const ClimaPage = lazy(() => import("../pages/ClimaPage"));
const Footer = lazy(() => import("./Footer"));

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

function ModuleLoader({ text = "Cargando módulo..." }) {
  return (
    <div
      style={{
        minHeight: "420px",
        display: "grid",
        placeItems: "center",
        color: "#173b1a",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <strong>AgroMind CR</strong>
        <p style={{ marginTop: "0.4rem" }}>{text}</p>
      </div>
    </div>
  );
}

export default function FarmShell({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("mapa");
  const [focusZoneRequest, setFocusZoneRequest] = useState(null);

  const [token, setToken] = useState(() => getAuthToken());
  const [farmId, setFarmId] = useState(() => getActiveFarmId());

  const [farmLocation, setFarmLocation] = useState({
    lat: null,
    lon: null,
    zoom: null,
    farmId: getActiveFarmId() || null,
    source: null,
    updatedAt: null,
  });

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

    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("storage", sync);
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

  const handleFarmLocationChange = (location) => {
    if (!location) return;

    setFarmLocation((prev) => ({
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
    }));
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

  const handleLogoutClick = () => {
    clearLocalStorage(TOKEN_KEYS);
    clearLocalStorage(FARMID_KEYS);

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

    setActiveTab("mapa");
    setFocusZoneRequest(null);

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
          <Suspense fallback={<ModuleLoader text="Cargando tu finca..." />}>
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
          </Suspense>
        </section>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}