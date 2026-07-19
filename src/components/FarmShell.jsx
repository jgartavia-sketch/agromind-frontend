// src/components/FarmShell.jsx
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFarm } from "../context/FarmContext";
import "../styles/farm-shell.css";

const FarmMap = lazy(() => import("./map/FarmMap"));
const TareasPage = lazy(() => import("../pages/TareasPage"));
const FinanzasPage = lazy(() => import("../pages/FinanzasPage"));
const ClimaPage = lazy(() => import("../pages/ClimaPage"));
const BitacoraPage = lazy(() => import("../pages/BitacoraPage"));
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const TeamAccessPage = lazy(() => import("../pages/TeamAccessPage"));
const Footer = lazy(() => import("./Footer"));

const RAW_API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://agromind-backend-slem.onrender.com";

const API_BASE = RAW_API_BASE.replace(/\/+$/, "");
const SUPPORT_WEBSITE =
  import.meta.env.VITE_SUPPORT_WEBSITE || "https://agromindcr.es";
const SUPPORT_EMAIL = String(import.meta.env.VITE_SUPPORT_EMAIL || "").trim();
const SUPPORT_WHATSAPP = String(
  import.meta.env.VITE_SUPPORT_WHATSAPP || ""
).replace(/\D/g, "");

function NavIcon({ name }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    mapa: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/></>,
    tareas: <><rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 9 2 2 4-4M8 16h8"/></>,
    finanzas: <><circle cx="12" cy="12" r="9"/><path d="M16 8.5c-.7-.9-1.9-1.5-3.5-1.5-2 0-3.5 1-3.5 2.5 0 3.5 7 1.5 7 5 0 1.5-1.5 2.5-3.5 2.5-1.7 0-3-.6-3.8-1.7M12 5v14"/></>,
    clima: <><path d="M7 18h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 1.8A3.2 3.2 0 0 0 7 18Z"/><path d="M12 2v2M4.9 4.9l1.4 1.4M19.1 4.9l-1.4 1.4"/></>,
    bitacora: <><path d="M5 4h14v17H5z"/><path d="M8 2v4M16 2v4M8 10h8M8 14h8M8 18h5"/></>,
    team: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2.4-6 6-6s6 2 6 6M15 15c3.5 0 5.5 1.6 5.5 5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3A1.7 1.7 0 0 0 14 21v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14h-.2v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    support: <><path d="M4 13a8 8 0 0 1 16 0M4 13v4a2 2 0 0 0 2 2h2v-7H6a2 2 0 0 0-2 2M20 13v4a2 2 0 0 1-2 2h-2v-7h2a2 2 0 0 1 2 2M16 19c0 2-1.5 3-4 3"/></>,
    logout: <><path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.dashboard}</svg>;
}

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

function areSameStringList(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i += 1) {
    if (String(a[i] || "") !== String(b[i] || "")) return false;
  }

  return true;
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

function SettingsPanel({ user, isAdmin }) {
  return (
    <section className="shell-panel" aria-labelledby="settings-title">
      <div className="shell-panel-heading">
        <span className="shell-panel-eyebrow">TU ESPACIO</span>
        <h1 id="settings-title">Configuración</h1>
        <p>Tu perfil y las preferencias generales de AgroMind en un solo lugar.</p>
      </div>

      <div className="shell-panel-grid">
        <article className="shell-option-card shell-option-card-featured">
          <span className="shell-option-icon" aria-hidden="true">◎</span>
          <div>
            <span className="shell-option-label">Perfil</span>
            <h2>{user?.name || user?.nombre || "Usuario AgroMind"}</h2>
            <p>{user?.email || user?.correo || "Cuenta activa"}</p>
            <span className="shell-role-badge">
              {isAdmin ? "Administrador" : "Consultor"}
            </span>
          </div>
        </article>

        <article className="shell-option-card">
          <span className="shell-option-icon" aria-hidden="true">✉</span>
          <div>
            <span className="shell-option-label">Notificaciones</span>
            <h2>Recordatorios inteligentes</h2>
            <p>
              Aquí podrás elegir cuándo recibir alertas de tareas y resúmenes
              de actividad.
            </p>
            <span className="shell-status-chip">Próxima integración</span>
          </div>
        </article>

        <article className="shell-option-card">
          <span className="shell-option-icon" aria-hidden="true">◐</span>
          <div>
            <span className="shell-option-label">Preferencias</span>
            <h2>Experiencia de navegación</h2>
            <p>
              AgroMind recuerda automáticamente si prefieres la barra lateral
              abierta o contraída.
            </p>
            <span className="shell-status-chip shell-status-chip-ready">Activo</span>
          </div>
        </article>
      </div>
    </section>
  );
}

function SupportPanel() {
  return (
    <section className="shell-panel" aria-labelledby="support-title">
      <div className="shell-panel-heading">
        <span className="shell-panel-eyebrow">ESTAMOS CONTIGO</span>
        <h1 id="support-title">Soporte AgroMind</h1>
        <p>
          Cuando la operación no puede esperar, encuentra aquí nuestros canales
          oficiales de contacto.
        </p>
      </div>

      <div className="shell-support-grid">
        {SUPPORT_WHATSAPP && (
          <a
            className="shell-support-card"
            href={`https://wa.me/${SUPPORT_WHATSAPP}`}
            target="_blank"
            rel="noreferrer"
          >
            <span className="shell-option-icon" aria-hidden="true">W</span>
            <span><strong>WhatsApp</strong><small>Hablar con soporte</small></span>
            <b aria-hidden="true">↗</b>
          </a>
        )}

        {SUPPORT_EMAIL && (
          <a className="shell-support-card" href={`mailto:${SUPPORT_EMAIL}`}>
            <span className="shell-option-icon" aria-hidden="true">@</span>
            <span><strong>Correo</strong><small>{SUPPORT_EMAIL}</small></span>
            <b aria-hidden="true">↗</b>
          </a>
        )}

        <a
          className="shell-support-card"
          href={SUPPORT_WEBSITE}
          target="_blank"
          rel="noreferrer"
        >
          <span className="shell-option-icon" aria-hidden="true">◎</span>
          <span><strong>Centro web</strong><small>Visitar agromindcr.es</small></span>
          <b aria-hidden="true">↗</b>
        </a>
      </div>

      {!SUPPORT_EMAIL && !SUPPORT_WHATSAPP && (
        <p className="shell-support-note">
          El correo y WhatsApp de soporte aparecerán aquí al configurar sus
          variables oficiales.
        </p>
      )}
    </section>
  );
}

export default function FarmShell({ user, onLogout }) {
  const { isAdmin, isConsultant } = useFarm();
  const [activeTab, setActiveTab] = useState(() => (isConsultant ? "mapa" : "dashboard"));
  const [focusZoneRequest, setFocusZoneRequest] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [token, setToken] = useState(() => getAuthToken());
  const [farmId, setFarmId] = useState(() => getActiveFarmId());
  const [zonesFromMap, setZonesFromMap] = useState([]);
  const zonesFetchKeyRef = useRef("");
  const zonesLastFarmRef = useRef("");

  const [farmLocation, setFarmLocation] = useState({
    lat: null,
    lon: null,
    zoom: null,
    farmId: getActiveFarmId() || null,
    source: null,
    updatedAt: null,
  });

  const mainTabs = useMemo(() => (isAdmin ? [
    ["dashboard", "Dashboard"],
    ["mapa", "Mapa de la finca"],
    ["tareas", "Tareas"],
    ["finanzas", "Finanzas"],
    ["clima", "Clima"],
    ["bitacora", "Bitácora"],
    ["team", "Equipo y acceso"],
  ] : [
    ["mapa", "Mapa de la finca"],
    ["tareas", "Mis tareas"],
    ["clima", "Clima"],
    ["bitacora", "Mi bitácora"],
  ]), [isAdmin]);

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

  const fetchZonesFromMap = useCallback(
    async ({ force = false } = {}) => {
      const activeFarmId = farmId ? String(farmId) : "";
      const activeToken = token ? String(token) : "";
      const fetchKey = `${activeFarmId}:${activeToken ? "auth" : "anon"}`;

      if (!activeFarmId) {
        zonesFetchKeyRef.current = "";
        zonesLastFarmRef.current = "";
        setZonesFromMap((prev) => (prev.length ? [] : prev));
        return;
      }

      if (!force && zonesFetchKeyRef.current === fetchKey) return;

      zonesFetchKeyRef.current = fetchKey;
      zonesLastFarmRef.current = activeFarmId;

      const collected = [...readStoredZones(activeFarmId)];

      if (activeToken) {
        const ts = Date.now();

        try {
          const res = await fetch(
            `${API_BASE}/api/farms/${activeFarmId}/map?ts=${ts}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${activeToken}`,
              },
              cache: "no-store",
            }
          );

          if (res.ok) {
            const data = await res.json().catch(() => null);
            collected.push(...extractZoneNames(data));
          }
        } catch {}
      }

      const cleanZones = cleanZoneList(collected);

      setZonesFromMap((prev) =>
        areSameStringList(prev, cleanZones) ? prev : cleanZones
      );
    },
    [cleanZoneList, farmId, token]
  );

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
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    fetchZonesFromMap();
  }, [fetchZonesFromMap]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeTab]);

  useEffect(() => {
    function onMapRefresh(e) {
      const targetFarmId = e?.detail?.farmId ? String(e.detail.farmId) : "";
      if (targetFarmId && farmId && String(farmId) !== targetFarmId) return;
      fetchZonesFromMap({ force: true });
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


  useEffect(() => {
    const defaultTab = isConsultant ? "mapa" : "dashboard";
    const allowed = new Set(
      mainTabs.map(([k]) => k).concat(["settings", "support"])
    );
    if (!allowed.has(activeTab)) {
      setActiveTab(defaultTab);
    }
  }, [isAdmin, isConsultant, mainTabs, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
    if (tab === "tareas") fetchZonesFromMap({ force: true });
  };

  useEffect(() => {
    if (!mobileSidebarOpen) return undefined;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileSidebarOpen]);

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

    setActiveTab(isConsultant ? "mapa" : "dashboard");
    setFocusZoneRequest(null);

    if (onLogout) onLogout();
  };

  return (
    <div className="farm-shell">
      <header className="farm-shell-header">
        <button
          type="button"
          className="farm-mobile-menu"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={mobileSidebarOpen}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <div className="farm-shell-brand">
          <div className="brand-logo-circle">AG</div>
          <div className="brand-text">
            <div className="brand-name">AgroMind CR</div>
            <div className="brand-tagline">La finca que piensa.</div>
          </div>
        </div>

        <div className="farm-shell-right">
          <button
            type="button"
            className="nav-tab"
            onClick={() => {
              window.location.href = "/select-farm";
            }}
          >
            Cambiar finca
          </button>

        </div>
      </header>

      {mobileSidebarOpen && (
        <button
          type="button"
          className="farm-sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <aside
        className={
          mobileSidebarOpen
            ? "farm-sidebar farm-sidebar-mobile-open"
            : "farm-sidebar"
        }
        aria-label="Navegación de AgroMind"
      >
        <div className="farm-sidebar-top">
          <div className="farm-sidebar-cinematic">
            <div className="farm-sidebar-cinematic-glow" aria-hidden="true" />
            <div className="farm-sidebar-cinematic-copy">
              <span>AgroMind CR</span>
              <strong>Somos Agro<br />Inteligencia</strong>
              <small>La finca que piensa.</small>
            </div>
          </div>

          <button
            type="button"
            className="farm-sidebar-mobile-close"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>

        <nav className="farm-sidebar-nav">
          <span className="farm-sidebar-section-label">OPERACIÓN</span>
          {mainTabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={
                activeTab === key
                  ? "farm-sidebar-item farm-sidebar-item-active"
                  : "farm-sidebar-item"
              }
              onClick={() => handleTabChange(key)}
            >
              <span className="farm-sidebar-icon" aria-hidden="true">
                <NavIcon name={key} />
              </span>
              <span className="farm-sidebar-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="farm-sidebar-footer">
          <button
            type="button"
            className={activeTab === "settings" ? "farm-sidebar-item farm-sidebar-item-active" : "farm-sidebar-item"}
            onClick={() => handleTabChange("settings")}
          >
            <span className="farm-sidebar-icon" aria-hidden="true"><NavIcon name="settings" /></span>
            <span className="farm-sidebar-label">Configuración</span>
          </button>

          <button
            type="button"
            className={activeTab === "support" ? "farm-sidebar-item farm-sidebar-item-support farm-sidebar-item-active" : "farm-sidebar-item farm-sidebar-item-support"}
            onClick={() => handleTabChange("support")}
          >
            <span className="farm-sidebar-icon" aria-hidden="true"><NavIcon name="support" /></span>
            <span className="farm-sidebar-label">Soporte AgroMind</span>
          </button>

          <div className="farm-sidebar-profile">
            <span className="farm-profile-avatar" aria-hidden="true">
              {String(user?.name || user?.nombre || "U").trim().charAt(0).toUpperCase()}
            </span>
            <span className="farm-sidebar-profile-copy">
              <strong>{user?.name || user?.nombre || "Usuario"}</strong>
              <small>{isAdmin ? "Administrador" : "Consultor"}</small>
            </span>
          </div>

          {onLogout && (
            <button type="button" className="farm-sidebar-logout" onClick={handleLogoutClick}>
              <span className="farm-sidebar-icon" aria-hidden="true"><NavIcon name="logout" /></span>
              <span className="farm-sidebar-label">Cerrar sesión</span>
            </button>
          )}
        </div>
      </aside>

      <main className="farm-shell-main">
        <section className="farm-shell-map-card">
          <Suspense fallback={<ModuleLoader text="Cargando tu finca..." />}>
            {isAdmin && activeTab === "dashboard" && (
              <DashboardPage user={user} token={token} farmId={farmId} />
            )}

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

            {isAdmin && activeTab === "finanzas" && (
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
              <BitacoraPage
                token={token}
                farmId={farmId}
                onOpenTasks={() => handleTabChange("tareas")}
                onOpenFinance={() => handleTabChange("finanzas")}
              />
            )}

            {isAdmin && activeTab === "team" && (
              <TeamAccessPage token={token} farmId={farmId} />
            )}

            {activeTab === "settings" && (
              <SettingsPanel user={user} isAdmin={isAdmin} />
            )}

            {activeTab === "support" && <SupportPanel />}
          </Suspense>
        </section>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}
