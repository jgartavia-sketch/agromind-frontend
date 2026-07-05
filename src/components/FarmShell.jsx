// src/components/FarmShell.jsx
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import "../styles/farm-shell.css";

const FarmMap = lazy(() => import("./map/FarmMap"));
const TareasPage = lazy(() => import("../pages/TareasPage"));
const FinanzasPage = lazy(() => import("../pages/FinanzasPage"));
const ClimaPage = lazy(() => import("../pages/ClimaPage"));
const BitacoraPage = lazy(() => import("../pages/BitacoraPage"));
const Footer = lazy(() => import("./Footer"));

const RAW_API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://agromind-backend-slem.onrender.com";

const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

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

function normalizeZoneName(value) {
  return String(value || "").trim().toLowerCase();
}

function getZoneLabel(item, force = false) {
  if (!item || typeof item !== "object") return "";

  const typeText = String(
    item.type ||
      item.kind ||
      item.category ||
      item.mapType ||
      item.elementType ||
      item.objectType ||
      ""
  ).toLowerCase();

  const directName = String(
    item.name ||
      item.title ||
      item.label ||
      item.zoneName ||
      item.zone ||
      item.area ||
      item.zoneLabel ||
      item.properties?.name ||
      item.properties?.title ||
      item.properties?.label ||
      ""
  ).trim();

  const looksLikeZone =
    force ||
    typeText.includes("zone") ||
    typeText.includes("zona") ||
    item.isZone === true ||
    Array.isArray(item.points) ||
    Array.isArray(item.polygon) ||
    Array.isArray(item.coordinates) ||
    Array.isArray(item.paths) ||
    Array.isArray(item.vertices) ||
    item.geometry ||
    item.geojson ||
    item.geoJson;

  return looksLikeZone ? directName : "";
}

function collectZoneNames(source, bucket = [], force = false, depth = 0) {
  if (!source || depth > 8) return bucket;

  if (typeof source === "string") {
    const clean = source.trim();
    if (force && clean) bucket.push(clean);
    return bucket;
  }

  if (Array.isArray(source)) {
    source.forEach((item) => collectZoneNames(item, bucket, force, depth + 1));
    return bucket;
  }

  if (typeof source !== "object") return bucket;

  const label = getZoneLabel(source, force);
  if (label) bucket.push(label);

  const zoneContainers = [
    "zones",
    "mapZones",
    "areas",
    "plots",
    "polygons",
    "mapElements",
    "elements",
    "items",
    "features",
    "shapes",
    "layers",
  ];

  zoneContainers.forEach((key) => {
    if (source[key]) collectZoneNames(source[key], bucket, true, depth + 1);
  });

  const nestedContainers = [
    "data",
    "farm",
    "map",
    "farmMap",
    "mapData",
    "layout",
    "payload",
    "result",
    "properties",
    "geojson",
    "geoJson",
    "geometry",
  ];

  nestedContainers.forEach((key) => {
    if (source[key]) collectZoneNames(source[key], bucket, force, depth + 1);
  });

  return bucket;
}

function extractZoneNames(payload) {
  const seen = new Set();

  return collectZoneNames(payload, [], false)
    .map((name) => String(name || "").trim())
    .filter(Boolean)
    .filter((name) => {
      const key = normalizeZoneName(name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function readStoredZones(farmId) {
  if (typeof window === "undefined" || !window.localStorage) return [];

  const candidates = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i) || "";
    const lowerKey = key.toLowerCase();

    if (
      !lowerKey.includes("agromind") &&
      !lowerKey.includes("farm") &&
      !lowerKey.includes("map") &&
      !lowerKey.includes("zone") &&
      !lowerKey.includes("zona")
    ) {
      continue;
    }

    const raw = localStorage.getItem(key);
    if (!raw || raw.length > 900000) continue;

    try {
      const parsed = JSON.parse(raw);
      const candidateFarmId = parsed?.id || parsed?._id || parsed?.farmId;

      if (
        farmId &&
        candidateFarmId &&
        String(candidateFarmId) !== String(farmId)
      ) {
        continue;
      }

      candidates.push(parsed);
    } catch {}
  }

  return extractZoneNames(candidates);
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
  const [zonesFromMap, setZonesFromMap] = useState([]);

  const [farmLocation, setFarmLocation] = useState({
    lat: null,
    lon: null,
    zoom: null,
    farmId: getActiveFarmId() || null,
    source: null,
    updatedAt: null,
  });

  const visibleTabs = [
    ["mapa", "Mapa de la finca"],
    ["tareas", "Tareas"],
    ["finanzas", "Finanzas"],
    ["clima", "Clima"],
    ["bitacora", "Bitácora"],
  ];

  const cleanZoneList = useCallback((items) => {
    const seen = new Set();

    return (Array.isArray(items) ? items : [])
      .map((zone) => String(zone || "").trim())
      .filter(Boolean)
      .filter((zone) => {
        const key = normalizeZoneName(zone);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, []);

  const fetchZonesFromMap = useCallback(async () => {
    const collected = [...readStoredZones(farmId)];

    if (farmId && token) {
      const ts = Date.now();
      const endpoints = [
        `/api/farms/${farmId}/map?ts=${ts}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(`${API_BASE}${endpoint}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          });

          if (!res.ok) continue;

          const data = await res.json().catch(() => null);
          collected.push(...extractZoneNames(data));
        } catch {}
      }
    }

    setZonesFromMap(cleanZoneList(collected));
  }, [cleanZoneList, farmId, token]);

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

  useEffect(() => {
    fetchZonesFromMap();
  }, [fetchZonesFromMap]);

  useEffect(() => {
    function onMapRefresh(e) {
      const targetFarmId = e?.detail?.farmId ? String(e.detail.farmId) : "";
      if (targetFarmId && farmId && String(farmId) !== targetFarmId) return;
      fetchZonesFromMap();
    }

    window.addEventListener("agromind:map:refresh", onMapRefresh);
    window.addEventListener("agromind:zones:refresh", onMapRefresh);
    window.addEventListener("agromind:farm:refresh", onMapRefresh);

    return () => {
      window.removeEventListener("agromind:map:refresh", onMapRefresh);
      window.removeEventListener("agromind:zones:refresh", onMapRefresh);
      window.removeEventListener("agromind:farm:refresh", onMapRefresh);
    };
  }, [farmId, fetchZonesFromMap]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "tareas") fetchZonesFromMap();
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
    setZonesFromMap([]);
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
          {visibleTabs.map(([key, label]) => (
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
                zonesFromMap={zonesFromMap}
                token={token}
                farmId={farmId}
              />
            )}

            {activeTab === "finanzas" && (
              <FinanzasPage token={token} farmId={farmId} />
            )}

            {activeTab === "clima" && (
              <ClimaPage
                farmLocation={climaLocation}
                token={token}
                farmId={farmId}
              />
            )}

            {activeTab === "bitacora" && (
              <BitacoraPage token={token} farmId={farmId} />
            )}
          </Suspense>
        </section>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}
