// src/components/FarmMap.jsx

import FarmSummary from "../farm/FarmSummary";

import { useEffect, useRef, useState, useMemo } from "react";
import "ol/ol.css";
import "../../styles/farm-map.css";

import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Draw from "ol/interaction/Draw";
import Feature from "ol/Feature";

import { fromLonLat, toLonLat } from "ol/proj";
import { Style, Stroke, Fill, Circle as CircleStyle } from "ol/style";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import Polygon from "ol/geom/Polygon";

// ✅ NUEVO: modal externo (el que sí estás editando)
import ZoneReportModal from "./map/ZoneReportModal";

// Claves de localStorage (fallback / cache)
const VIEW_KEY = "agromind_farm_view";
const DRAWINGS_KEY = "agromind_farm_drawings";
const ACTIVE_FARM_KEY = "agromind_active_farm_id"; // ✅ finca activa global

// Paletas de colores
const POINT_COLORS = ["#f97316", "#22c55e", "#38bdf8", "#eab308", "#ec4899"];
const LINE_COLORS = ["#22c55e", "#38bdf8", "#f97316", "#a855f7", "#facc15"];
const POLYGON_COLORS = ["#22c55e88", "#38bdf888", "#f9731688", "#a855f788"];

const ZONE_TYPES = ["Zona de animales", "Pasillo", "Cultivo", "Zona libre"];
const ZONE_STATUSES = ["Operativa", "Prioridad alta", "Cosecha próxima", "Disponible"];

const COMPONENT_TYPES = [
  "Bebedero",
  "Comedero",
  "Bodega",
  "Lote de cultivo",
  "Pasillo",
  "Área de descanso",
  "Otro",
];

function nowIso() {
  return new Date().toISOString();
}

function pickColor(kind, colorIndexRef) {
  let palette = POINT_COLORS;
  if (kind === "line") palette = LINE_COLORS;
  if (kind === "polygon") palette = POLYGON_COLORS;

  const idxRef = colorIndexRef.current;
  const current = idxRef[kind] || 0;
  const color = palette[current % palette.length];
  idxRef[kind] = current + 1;
  return color;
}

function generateName(kind, countersRef) {
  const counters = countersRef.current;
  const next = (counters[kind] || 0) + 1;
  counters[kind] = next;

  if (kind === "point") return `Punto ${next}`;
  if (kind === "line") return `Línea ${next}`;
  return `Zona ${next}`;
}

/**
 * 🔐 Token helper
 */
function getAuthToken() {
  return (
    localStorage.getItem("agromind_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("agromind_auth_token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("jwt") ||
    ""
  );
}

/**
 * 🌐 API base
 */
const API_BASE =
  import.meta.env.VITE_API_URL || "https://agromind-backend-slem.onrender.com";

async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && data.error) ||
      (typeof data === "string" ? data : "Error en request.");
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

function safeReadLocalDrawings() {
  try {
    const raw = localStorage.getItem(DRAWINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeShortText(text, max = 140) {
  const t = String(text || "").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export default function FarmMap({ focusZoneRequest }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const vectorSourceRef = useRef(null);
  const drawInteractionRef = useRef(null);

  // id -> Feature del mapa
  const featuresMapRef = useRef({});

  // Lista de negocio: puntos, líneas y zonas
  const [featuresList, setFeaturesList] = useState([]);
  const latestFeaturesListRef = useRef([]);
  useEffect(() => {
    latestFeaturesListRef.current = featuresList;
  }, [featuresList]);

  const [drawMode, setDrawMode] = useState("move");
  const [selectedId, setSelectedId] = useState(null);

  // Para hover bidireccional
  const [hoveredId, setHoveredId] = useState(null);

  const countersRef = useRef({ point: 0, line: 0, polygon: 0 });
  const colorIndexRef = useRef({ point: 0, line: 0, polygon: 0 });

  const apiKey = import.meta.env.VITE_MAPTILER_KEY;

  // Backend state
  const [mapReady, setMapReady] = useState(false);
  const [activeFarmId, setActiveFarmId] = useState(null);
  const [backendOnline, setBackendOnline] = useState(true);

  // Debounce autosave
  const autosaveTimerRef = useRef(null);

  // ✅ Blindaje anti-wipe
  const loadedOnceRef = useRef(false); // backend GET aplicado (o decidido)
  const dirtyRef = useRef(false); // usuario hizo cambios reales

  const markDirty = () => {
    dirtyRef.current = true;
  };

  // =========================
  // 🔎 BUSCADOR MANUAL (Geocoding)
  // =========================
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const debouncedQuery = useMemo(() => searchQuery.trim(), [searchQuery]);

  const forceMapResize = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.updateSize();
    requestAnimationFrame(() => map.updateSize());
  };

  const zonesOnly = featuresList.filter((f) => f.kind === "polygon");

  // =========================
  // ✅ MODAL COMPONENTES (POP-UP)
  // =========================
  const [componentsModalOpen, setComponentsModalOpen] = useState(false);
  const [componentsModalZoneId, setComponentsModalZoneId] = useState(null);
  const [componentsDraft, setComponentsDraft] = useState([]);
  const [editingNotesMap, setEditingNotesMap] = useState({}); // compId -> boolean

  const modalZone =
    componentsModalZoneId && zonesOnly.find((z) => z.id === componentsModalZoneId);

  const openComponentsModal = (zoneId) => {
    const zone = zonesOnly.find((z) => z.id === zoneId);
    if (!zone) return;

    const safe = Array.isArray(zone.components) ? zone.components : [];

    const cloned = safe.map((c, idx) => {
      const createdAt = c?.createdAt || nowIso();
      const updatedAt = c?.updatedAt || createdAt;

      return {
        id:
          c.id ||
          `comp-${idx}-${Date.now().toString(36)}${Math.random()
            .toString(36)
            .slice(2, 6)}`,
        name: c.name || "",
        note: c.note || "",
        type: c.type || "Otro",
        createdAt,
        updatedAt,
      };
    });

    setComponentsModalZoneId(zoneId);
    setComponentsDraft(cloned);
    setEditingNotesMap({});
    setComponentsModalOpen(true);

    setTimeout(() => forceMapResize(), 0);
  };

  const closeComponentsModal = () => {
    setComponentsModalOpen(false);
    setTimeout(() => {
      setComponentsModalZoneId(null);
      setComponentsDraft([]);
      setEditingNotesMap({});
    }, 0);
  };

  const saveComponentsModal = () => {
    if (!componentsModalZoneId) return;

    markDirty();

    setFeaturesList((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== componentsModalZoneId) return item;

        const components = (componentsDraft || []).map((c, idx) => {
          const createdAt = c?.createdAt || nowIso();
          const updatedAt = c?.updatedAt || createdAt;

          return {
            id:
              c.id ||
              `comp-${idx}-${Date.now().toString(36)}${Math.random()
                .toString(36)
                .slice(2, 6)}`,
            name: c.name || "",
            note: c.note || "",
            type: c.type || "Otro",
            createdAt,
            updatedAt,
          };
        });

        const feature = featuresMapRef.current[componentsModalZoneId];
        const nextUpdatedAt = nowIso();

        if (feature) {
          feature.set("components", components);
          feature.set("updatedAt", nextUpdatedAt);
        }

        return { ...item, components, updatedAt: nextUpdatedAt };
      });

      scheduleAutosave(updated);
      return updated;
    });

    closeComponentsModal();
  };

  const draftAddComponent = () => {
    const t = nowIso();
    const newComp = {
      id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: "",
      note: "",
      type: "Otro",
      createdAt: t,
      updatedAt: t,
    };
    setComponentsDraft((prev) => [...(prev || []), newComp]);
    setEditingNotesMap((prev) => ({ ...(prev || {}), [newComp.id]: true }));
  };

  const draftDeleteComponent = (compId) => {
    setComponentsDraft((prev) => (prev || []).filter((c) => c.id !== compId));
    setEditingNotesMap((prev) => {
      const next = { ...(prev || {}) };
      delete next[compId];
      return next;
    });
  };

  const draftUpdate = (compId, patch) => {
    const t = nowIso();
    setComponentsDraft((prev) =>
      (prev || []).map((c) =>
        c.id === compId ? { ...c, ...patch, updatedAt: t } : c
      )
    );
  };

  const toggleEditNote = (compId) => {
    setEditingNotesMap((prev) => ({ ...(prev || {}), [compId]: !prev?.[compId] }));
  };

  // =========================
  // ✅ MODAL REPORTE DE ZONA
  // =========================
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportZoneId, setReportZoneId] = useState(null);

  const reportZone = reportZoneId && zonesOnly.find((z) => z.id === reportZoneId);

  const openReportModal = (zoneId) => {
    const zone = zonesOnly.find((z) => z.id === zoneId);
    if (!zone) return;

    setReportZoneId(zoneId);
    setReportModalOpen(true);
    setTimeout(() => forceMapResize(), 0);
  };

  const closeReportModal = () => {
    setReportModalOpen(false);
    setTimeout(() => setReportZoneId(null), 0);
  };

  const reportComponents = useMemo(() => {
    if (!reportZone) return [];
    const comps = Array.isArray(reportZone.components) ? reportZone.components : [];
    return comps.map((c, idx) => ({
      id: c.id || `comp-${idx}`,
      name: c.name || "(Sin nombre)",
      type: c.type || "Otro",
      note: c.note || "",
      createdAt: c.createdAt || null,
      updatedAt: c.updatedAt || null,
    }));
  }, [reportZone]);

  const reportStats = useMemo(() => {
    if (!reportZone) return null;
    const comps = Array.isArray(reportZone.components) ? reportZone.components : [];
    const countByType = {};
    comps.forEach((c) => {
      const t = (c?.type || "Otro").trim() || "Otro";
      countByType[t] = (countByType[t] || 0) + 1;
    });

    const topTypes = Object.entries(countByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return {
      total: comps.length,
      topTypes,
    };
  }, [reportZone]);

  const createTaskFromComponent = (zone, comp) => {
    const title = `Revisión: ${comp?.name || "Componente"} (${zone?.name || "Zona"})`;
    window.alert(
      `Listo: aquí vamos a crear una tarea.\n\nTítulo sugerido:\n${title}\n\n(Siguiente paso: lo conectamos a Tareas con zona + descripción automática.)`
    );
  };

  // Esc cierra modales
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (componentsModalOpen) closeComponentsModal();
      if (reportModalOpen) closeReportModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentsModalOpen, reportModalOpen]);

  // =========================
  // SERIALIZE / DESERIALIZE
  // =========================
  const buildBackendPayloadFromList = (list, options = {}) => {
    const map = mapInstanceRef.current;
    const featuresMap = featuresMapRef.current;
    if (!map) return null;

    const points = [];
    const lines = [];
    const zones = [];

    list.forEach((item) => {
      const feature = featuresMap[item.id];
      if (!feature) return;

      const geometry = feature.getGeometry();
      if (!geometry) return;

      const geomType = geometry.getType();

      if (geomType === "Point") {
        const coord = toLonLat(geometry.getCoordinates());
        points.push({
          name: item.name,
          data: {
            type: "Point",
            coordinates: coord,
            color: item.color,
            note: item.note || "",
          },
        });
        return;
      }

      if (geomType === "LineString") {
        const coords = geometry.getCoordinates().map((c) => toLonLat(c));
        lines.push({
          name: item.name,
          data: {
            type: "LineString",
            coordinates: coords,
            color: item.color,
            note: item.note || "",
          },
        });
        return;
      }

      if (geomType === "Polygon") {
        const rings = geometry
          .getCoordinates()
          .map((ring) => ring.map((c) => toLonLat(c)));

        zones.push({
          name: item.name,
          data: {
            type: "Polygon",
            coordinates: rings,
            color: item.color,
            note: item.note || "",
            zoneType: item.zoneType || "Zona libre",
            status: item.status || "Disponible",
          },
          components: Array.isArray(item.components) ? item.components : [],
        });
      }
    });

    let viewToSave = options.view || null;
    if (!viewToSave) {
      const view = map.getView();
      const center = view.getCenter();
      const zoom = view.getZoom();
      if (center && typeof zoom === "number") {
        const [lon, lat] = toLonLat(center);
        viewToSave = { center: [lon, lat], zoom };
      }
    }

    return { view: viewToSave, points, lines, zones };
  };

  const applyBackendMapToUI = (data) => {
    const map = mapInstanceRef.current;
    const vectorSource = vectorSourceRef.current;
    if (!map || !vectorSource) return;

    vectorSource.clear();
    featuresMapRef.current = {};
    setSelectedId(null);
    setHoveredId(null);

    const newList = [];
    const counters = { point: 0, line: 0, polygon: 0 };

    const viewFromServer = data?.farm?.view;
    if (
      viewFromServer &&
      Array.isArray(viewFromServer.center) &&
      viewFromServer.center.length === 2 &&
      typeof viewFromServer.zoom === "number"
    ) {
      map.getView().setCenter(fromLonLat(viewFromServer.center));
      map.getView().setZoom(viewFromServer.zoom);
    }

    const addFeature = ({ kind, name, geometry, meta, components, createdAt, updatedAt }) => {
      const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      counters[kind] = (counters[kind] || 0) + 1;

      const finalName =
        name && String(name).trim().length > 0
          ? String(name)
          : kind === "point"
          ? `Punto ${counters[kind]}`
          : kind === "line"
          ? `Línea ${counters[kind]}`
          : `Zona ${counters[kind]}`;

      const color = meta?.color || pickColor(kind, colorIndexRef);
      const note = meta?.note || "";

      const zoneType = kind === "polygon" ? meta?.zoneType || "Zona libre" : null;
      const status = kind === "polygon" ? meta?.status || "Disponible" : null;

      const finalComponents =
        kind === "polygon" && Array.isArray(components)
          ? components.map((c, idx) => {
              const cCreated = c?.createdAt || nowIso();
              const cUpdated = c?.updatedAt || cCreated;
              return {
                id:
                  c.id ||
                  `comp-${idx}-${Date.now().toString(36)}${Math.random()
                    .toString(36)
                    .slice(2, 6)}`,
                name: c.name || "",
                note: c.note || "",
                type: c.type || "Otro",
                createdAt: cCreated,
                updatedAt: cUpdated,
              };
            })
          : [];

      const finalCreatedAt = createdAt || nowIso();
      const finalUpdatedAt = updatedAt || finalCreatedAt;

      const feature = new Feature(geometry);
      feature.setProperties({
        id,
        kind,
        color,
        name: finalName,
        note,
        zoneType,
        status,
        components: finalComponents,
        createdAt: finalCreatedAt,
        updatedAt: finalUpdatedAt,
        geomType: geometry.getType(),
        selected: false,
        hovered: false,
      });

      vectorSource.addFeature(feature);
      featuresMapRef.current[id] = feature;

      newList.push({
        id,
        kind,
        color,
        name: finalName,
        note,
        zoneType,
        status,
        components: finalComponents,
        createdAt: finalCreatedAt,
        updatedAt: finalUpdatedAt,
      });
    };

    (data?.points || []).forEach((p) => {
      const d = p?.data || {};
      if (d?.type !== "Point" || !Array.isArray(d.coordinates)) return;
      addFeature({
        kind: "point",
        name: p?.name,
        geometry: new Point(fromLonLat(d.coordinates)),
        meta: d,
        createdAt: p?.createdAt ? new Date(p.createdAt).toISOString() : null,
        updatedAt: p?.updatedAt ? new Date(p.updatedAt).toISOString() : null,
      });
    });

    (data?.lines || []).forEach((l) => {
      const d = l?.data || {};
      if (d?.type !== "LineString" || !Array.isArray(d.coordinates)) return;
      addFeature({
        kind: "line",
        name: l?.name,
        geometry: new LineString(d.coordinates.map((c) => fromLonLat(c))),
        meta: d,
        createdAt: l?.createdAt ? new Date(l.createdAt).toISOString() : null,
        updatedAt: l?.updatedAt ? new Date(l.updatedAt).toISOString() : null,
      });
    });

    (data?.zones || []).forEach((z) => {
      const d = z?.data || {};
      if (d?.type !== "Polygon" || !Array.isArray(d.coordinates)) return;
      addFeature({
        kind: "polygon",
        name: z?.name,
        geometry: new Polygon(d.coordinates.map((ring) => ring.map((c) => fromLonLat(c)))),
        meta: d,
        components: z?.components,
        createdAt: z?.createdAt ? new Date(z.createdAt).toISOString() : null,
        updatedAt: z?.updatedAt ? new Date(z.updatedAt).toISOString() : null,
      });
    });

    countersRef.current = counters;
    setFeaturesList(newList);
    forceMapResize();

    loadedOnceRef.current = true;
    dirtyRef.current = false;
  };

  // =========================
  // BACKEND LOAD / SAVE
  // =========================
  const scheduleAutosave = (list, options = {}) => {
    const force = options?.force === true;

    // Cache local mínimo (por si cae red)
    try {
      const payload = list
        .map((item) => {
          const feature = featuresMapRef.current[item.id];
          if (!feature) return null;
          const geometry = feature.getGeometry();
          if (!geometry) return null;

          const geomType = geometry.getType();
          let coordinates;

          if (geomType === "Point") {
            coordinates = toLonLat(geometry.getCoordinates());
          } else if (geomType === "LineString") {
            coordinates = geometry.getCoordinates().map((coord) => toLonLat(coord));
          } else if (geomType === "Polygon") {
            coordinates = geometry
              .getCoordinates()
              .map((ring) => ring.map((coord) => toLonLat(coord)));
          } else return null;

          return {
            id: item.id,
            kind: item.kind,
            color: item.color,
            name: item.name,
            note: item.note || "",
            zoneType: item.zoneType || null,
            status: item.status || null,
            components: Array.isArray(item.components) ? item.components : [],
            createdAt: item.createdAt || null,
            updatedAt: item.updatedAt || null,
            geomType,
            coordinates,
          };
        })
        .filter(Boolean);

      localStorage.setItem(DRAWINGS_KEY, JSON.stringify(payload));

      const map = mapInstanceRef.current;
      if (map) {
        const view = map.getView();
        const center = view.getCenter();
        const zoom = view.getZoom();
        if (center && typeof zoom === "number") {
          const [lon, lat] = toLonLat(center);
          localStorage.setItem(VIEW_KEY, JSON.stringify({ lon, lat, zoom }));
        }
      }
    } catch {
      // no-op
    }

    if (!force && !loadedOnceRef.current) return;
    if (!force && dirtyRef.current !== true) return;

    if (!activeFarmId) return;
    const token = getAuthToken();
    if (!token) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const payload = buildBackendPayloadFromList(list, options);
        if (!payload) return;

        await apiFetch(`/api/farms/${activeFarmId}/map`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setBackendOnline(true);
        dirtyRef.current = false;
      } catch (err) {
        console.warn("Autosave backend falló:", err?.message || err);
        setBackendOnline(false);
      }
    }, 900);
  };

  const ensureFarmAndLoad = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setBackendOnline(false);
        return;
      }

      const farmsRes = await apiFetch("/api/farms", { method: "GET" });
      const farms = farmsRes?.farms || [];

      const savedActive = localStorage.getItem(ACTIVE_FARM_KEY);
      const picked =
        (savedActive && farms.find((f) => f.id === savedActive)) || farms[0];

      let farmId = picked?.id || null;

      if (!farmId) {
        const created = await apiFetch("/api/farms", {
          method: "POST",
          body: JSON.stringify({ name: "Mi finca", view: null }),
        });
        farmId = created?.farm?.id || null;
      }

      if (!farmId) {
        setBackendOnline(false);
        return;
      }

      setActiveFarmId(farmId);
      localStorage.setItem(ACTIVE_FARM_KEY, farmId);

      const mapRes = await apiFetch(`/api/farms/${farmId}/map`, { method: "GET" });

      const serverHasData =
        (Array.isArray(mapRes?.points) && mapRes.points.length > 0) ||
        (Array.isArray(mapRes?.lines) && mapRes.lines.length > 0) ||
        (Array.isArray(mapRes?.zones) && mapRes.zones.length > 0);

      const localHasData = safeReadLocalDrawings().length > 0;

      if (!serverHasData && localHasData) {
        setBackendOnline(true);
        loadedOnceRef.current = true;

        setTimeout(() => {
          try {
            const latest = latestFeaturesListRef.current || [];
            if (latest.length > 0) {
              scheduleAutosave(latest, { force: true });
            }
          } catch {
            // no-op
          }
        }, 250);

        return;
      }

      applyBackendMapToUI(mapRes);
      setBackendOnline(true);

      const hasView =
        mapRes?.farm?.view &&
        Array.isArray(mapRes.farm.view.center) &&
        typeof mapRes.farm.view.zoom === "number";

      if (!hasView) {
        try {
          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const lon = pos.coords.longitude;
                const lat = pos.coords.latitude;
                const map = mapInstanceRef.current;
                if (!map) return;

                map.getView().setCenter(fromLonLat([lon, lat]));
                map.getView().setZoom(16);

                markDirty();
                scheduleAutosave(latestFeaturesListRef.current || [], {
                  view: { center: [lon, lat], zoom: 16 },
                });
              },
              () => {},
              { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
            );
          }
        } catch {
          // no-op
        }
      }
    } catch (err) {
      console.warn("Backend load falló:", err?.message || err);
      setBackendOnline(false);
    }
  };

  // =========================
  // 🔎 Geocoding (MapTiler)
  // =========================
  const geocodeSearch = async (q, signal) => {
    if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
      throw new Error("Falta VITE_MAPTILER_KEY para buscar lugares.");
    }

    const query = encodeURIComponent(q.trim());
    const url = `https://api.maptiler.com/geocoding/${query}.json?key=${apiKey}&limit=6&language=es`;

    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error("No se pudo buscar el lugar.");
    const data = await res.json();

    const feats = Array.isArray(data?.features) ? data.features : [];
    return feats
      .map((f) => {
        const center = f?.center;
        if (!Array.isArray(center) || center.length !== 2) return null;
        return {
          id:
            f?.id ||
            `${center[0]}-${center[1]}-${Math.random().toString(36).slice(2, 6)}`,
          place_name: f?.place_name || f?.text || "Ubicación",
          center, // [lon, lat]
        };
      })
      .filter(Boolean);
  };

  useEffect(() => {
    const q = debouncedQuery;

    if (!q || q.length < 3) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError("");

    const t = setTimeout(async () => {
      try {
        const results = await geocodeSearch(q, controller.signal);
        setSearchResults(results);
        setShowResults(true);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setSearchResults([]);
        setSearchError(err?.message || "Error buscando lugar.");
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, apiKey]);

  const goToLocation = (lon, lat, zoom = 16) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.getView().setCenter(fromLonLat([lon, lat]));
    map.getView().setZoom(zoom);

    markDirty();
    scheduleAutosave(latestFeaturesListRef.current || [], {
      view: { center: [lon, lat], zoom },
    });
  };

  const handlePickSearchResult = (item) => {
    if (!item?.center) return;
    const [lon, lat] = item.center;
    goToLocation(lon, lat, 16);
    setShowResults(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const first = searchResults?.[0];
    if (first) handlePickSearchResult(first);
  };

  // =========================
  // MAP INIT + STYLE
  // =========================
  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => forceMapResize());
    ro.observe(container);

    const handleWindowResize = () => forceMapResize();
    window.addEventListener("resize", handleWindowResize);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") forceMapResize();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!apiKey || apiKey === "TU_API_KEY_AQUI") return;

    if (mapRef.current && !mapInstanceRef.current) {
      let centerLonLat = [-84.433, 10.34];
      let zoom = 15;

      try {
        const savedView = localStorage.getItem(VIEW_KEY);
        if (savedView) {
          const parsed = JSON.parse(savedView);
          if (parsed && typeof parsed.lon === "number" && typeof parsed.lat === "number") {
            centerLonLat = [parsed.lon, parsed.lat];
          }
          if (parsed && typeof parsed.zoom === "number") zoom = parsed.zoom;
        }
      } catch {
        // no-op
      }

      const baseLayer = new TileLayer({
        source: new XYZ({
          url: `https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=${apiKey}`,
          attributions: "© MapTiler © OpenStreetMap contributors",
        }),
      });

      const vectorSource = new VectorSource();
      vectorSourceRef.current = vectorSource;

      const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: (feature) => {
          const kind = feature.get("kind");
          const color = feature.get("color") || "#22c55e";

          const selected = feature.get("selected") === true;
          const hovered = feature.get("hovered") === true;
          const active = selected || hovered;

          if (kind === "point") {
            return new Style({
              image: new CircleStyle({
                radius: active ? 8 : 6,
                fill: new Fill({ color }),
                stroke: new Stroke({
                  color: active ? "#f9fafb" : "#020617",
                  width: active ? 2 : 1.5,
                }),
              }),
            });
          }

          if (kind === "line") {
            return new Style({
              stroke: new Stroke({
                color,
                width: active ? 5 : 3,
              }),
            });
          }

          if (kind === "polygon") {
            return new Style({
              fill: new Fill({ color }),
              stroke: new Stroke({
                color: active ? "#f9fafb" : "#e5e7eb",
                width: active ? 3 : 1.5,
              }),
            });
          }

          return new Style({
            stroke: new Stroke({
              color,
              width: active ? 4 : 2,
            }),
          });
        },
      });

      const map = new Map({
        target: mapRef.current,
        layers: [baseLayer, vectorLayer],
        view: new View({
          center: fromLonLat(centerLonLat),
          zoom,
        }),
      });

      mapInstanceRef.current = map;
      forceMapResize();

      // Fallback local drawings (cache)
      try {
        const savedDrawings = localStorage.getItem(DRAWINGS_KEY);
        if (savedDrawings) {
          const parsed = JSON.parse(savedDrawings);
          if (Array.isArray(parsed)) {
            const newList = [];
            const counters = { point: 0, line: 0, polygon: 0 };

            parsed.forEach((item) => {
              const { id, kind, color, name, note, zoneType, status, components, geomType, coordinates, createdAt, updatedAt } = item;
              if (!id || !kind || !geomType || !coordinates) return;

              let geometry = null;

              if (geomType === "Point") geometry = new Point(fromLonLat(coordinates));
              else if (geomType === "LineString") geometry = new LineString(coordinates.map((c) => fromLonLat(c)));
              else if (geomType === "Polygon") geometry = new Polygon(coordinates.map((ring) => ring.map((c) => fromLonLat(c))));

              if (!geometry) return;

              const feature = new Feature(geometry);
              const safeKind = kind === "point" || kind === "line" || kind === "polygon" ? kind : "point";

              counters[safeKind] = (counters[safeKind] || 0) + 1;

              const finalName =
                name && name.trim().length > 0
                  ? name
                  : safeKind === "point"
                  ? `Punto ${counters[safeKind]}`
                  : safeKind === "line"
                  ? `Línea ${counters[safeKind]}`
                  : `Zona ${counters[safeKind]}`;

              const finalColor = color || pickColor(safeKind, colorIndexRef);
              const finalZoneType = safeKind === "polygon" ? zoneType || "Zona libre" : null;
              const finalStatus = safeKind === "polygon" ? status || "Disponible" : null;

              const finalComponents =
                safeKind === "polygon" && Array.isArray(components)
                  ? components.map((c, idx) => {
                      const cCreated = c?.createdAt || nowIso();
                      const cUpdated = c?.updatedAt || cCreated;
                      return {
                        id: c.id || `comp-${idx}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
                        name: c.name || "",
                        note: c.note || "",
                        type: c.type || "Otro",
                        createdAt: cCreated,
                        updatedAt: cUpdated,
                      };
                    })
                  : [];

              const finalCreatedAt = createdAt || nowIso();
              const finalUpdatedAt = updatedAt || finalCreatedAt;

              feature.setProperties({
                id,
                kind: safeKind,
                color: finalColor,
                name: finalName,
                note: note || "",
                zoneType: finalZoneType,
                status: finalStatus,
                components: finalComponents,
                createdAt: finalCreatedAt,
                updatedAt: finalUpdatedAt,
                geomType,
                selected: false,
                hovered: false,
              });

              vectorSource.addFeature(feature);
              featuresMapRef.current[id] = feature;

              newList.push({
                id,
                kind: safeKind,
                color: finalColor,
                name: finalName,
                note: note || "",
                zoneType: finalZoneType,
                status: finalStatus,
                components: finalComponents,
                createdAt: finalCreatedAt,
                updatedAt: finalUpdatedAt,
              });
            });

            countersRef.current = counters;
            setFeaturesList(newList);
            forceMapResize();
          }
        }
      } catch {
        // no-op
      }

      const handlePointerMove = (evt) => {
        const mapInstance = mapInstanceRef.current;
        if (!mapInstance) return;

        const pixel = mapInstance.getEventPixel(evt.originalEvent);
        let foundId = null;

        mapInstance.forEachFeatureAtPixel(pixel, (feature) => {
          const fid = feature.get("id");
          if (fid) {
            foundId = fid;
            return true;
          }
          return false;
        });

        setHoveredId((prev) => (prev === foundId ? prev : foundId || null));
      };

      const handleSingleClick = (evt) => {
        const mapInstance = mapInstanceRef.current;
        if (!mapInstance) return;

        const pixel = mapInstance.getEventPixel(evt.originalEvent);
        let foundId = null;

        mapInstance.forEachFeatureAtPixel(pixel, (feature) => {
          const fid = feature.get("id");
          if (fid) {
            foundId = fid;
            return true;
          }
          return false;
        });

        if (foundId) {
          handleSelectFeature(foundId);
        } else {
          const vectorSourceLocal = vectorSourceRef.current;
          if (vectorSourceLocal) vectorSourceLocal.getFeatures().forEach((f) => f.set("selected", false));
          setSelectedId(null);
        }
      };

      map.on("pointermove", handlePointerMove);
      map.on("singleclick", handleSingleClick);

      setMapReady(true);

      return () => {
        map.un("pointermove", handlePointerMove);
        map.un("singleclick", handleSingleClick);

        if (mapInstanceRef.current) {
          if (drawInteractionRef.current) mapInstanceRef.current.removeInteraction(drawInteractionRef.current);
          mapInstanceRef.current.setTarget(null);
          mapInstanceRef.current = null;
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    if (!mapReady) return;
    ensureFarmAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  useEffect(() => {
    const featuresMap = featuresMapRef.current;
    Object.entries(featuresMap).forEach(([id, feature]) => {
      feature.set("hovered", id === hoveredId);
    });
  }, [hoveredId]);

  const handleDrawEnd = (feature, mode) => {
    markDirty();

    const kind = mode === "point" ? "point" : mode === "line" ? "line" : "polygon";
    const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const color = pickColor(kind, colorIndexRef);
    const name = generateName(kind, countersRef);
    const note = "";

    const zoneType = kind === "polygon" ? "Zona libre" : null;
    const status = kind === "polygon" ? "Disponible" : null;
    const components = kind === "polygon" ? [] : undefined;

    const t = nowIso();

    feature.setProperties({
      id,
      kind,
      color,
      name,
      note,
      zoneType,
      status,
      components,
      createdAt: t,
      updatedAt: t,
      geomType: mode === "point" ? "Point" : mode === "line" ? "LineString" : "Polygon",
      selected: false,
      hovered: false,
    });

    featuresMapRef.current[id] = feature;

    setFeaturesList((prev) => {
      const updated = [...prev, { id, kind, color, name, note, zoneType, status, components, createdAt: t, updatedAt: t }];
      scheduleAutosave(updated);
      return updated;
    });

    forceMapResize();
  };

  useEffect(() => {
    const map = mapInstanceRef.current;
    const vectorSource = vectorSourceRef.current;
    if (!map || !vectorSource) return;

    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }

    if (drawMode === "move") return;

    const type = drawMode === "point" ? "Point" : drawMode === "line" ? "LineString" : "Polygon";
    const draw = new Draw({ source: vectorSource, type });

    draw.on("drawend", (evt) => {
      const f = evt.feature;
      handleDrawEnd(f, drawMode);
    });

    map.addInteraction(draw);
    drawInteractionRef.current = draw;

    forceMapResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawMode]);

  const handleSelectFeature = (id) => {
    const map = mapInstanceRef.current;
    const vectorSource = vectorSourceRef.current;
    const feature = featuresMapRef.current[id];
    if (!map || !vectorSource || !feature) return;

    vectorSource.getFeatures().forEach((f) => f.set("selected", f === feature));

    const geometry = feature.getGeometry();
    if (geometry) {
      map.getView().fit(geometry, {
        maxZoom: 19,
        duration: 400,
        padding: [40, 40, 40, 40],
      });
    }

    setSelectedId(id);
  };

  const handleNameChange = (id, value) => {
    markDirty();

    const feature = featuresMapRef.current[id];
    const t = nowIso();
    if (feature) {
      feature.set("name", value);
      feature.set("updatedAt", t);
    }

    setFeaturesList((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, name: value, updatedAt: t } : item));
      scheduleAutosave(updated);
      return updated;
    });
  };

  const handleZoneTypeChange = (id, value) => {
    markDirty();

    const feature = featuresMapRef.current[id];
    const t = nowIso();
    if (feature) {
      feature.set("zoneType", value);
      feature.set("updatedAt", t);
    }

    setFeaturesList((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, zoneType: value, updatedAt: t } : item));
      scheduleAutosave(updated);
      return updated;
    });
  };

  const handleZoneStatusChange = (id, value) => {
    markDirty();

    const feature = featuresMapRef.current[id];
    const t = nowIso();
    if (feature) {
      feature.set("status", value);
      feature.set("updatedAt", t);
    }

    setFeaturesList((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, status: value, updatedAt: t } : item));
      scheduleAutosave(updated);
      return updated;
    });
  };

  const handleDeleteFeature = (id) => {
    markDirty();

    const vectorSource = vectorSourceRef.current;
    const feature = featuresMapRef.current[id];

    if (vectorSource && feature) vectorSource.removeFeature(feature);
    delete featuresMapRef.current[id];

    setFeaturesList((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      scheduleAutosave(updated);
      return updated;
    });

    if (selectedId === id) setSelectedId(null);
    if (hoveredId === id) setHoveredId(null);

    if (componentsModalZoneId === id) closeComponentsModal();
    if (reportZoneId === id) closeReportModal();

    forceMapResize();
  };

  const handleSaveViewClick = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const view = map.getView();
    const center = view.getCenter();
    const zoom = view.getZoom();

    if (!center || typeof zoom !== "number") return;

    markDirty();

    const [lon, lat] = toLonLat(center);
    scheduleAutosave(latestFeaturesListRef.current || [], { view: { center: [lon, lat], zoom } });
  };

  const pointCount = featuresList.filter((f) => f.kind === "point").length;
  const lineCount = featuresList.filter((f) => f.kind === "line").length;
  const zoneCount = zonesOnly.length;

  const statusCounts = {
    Operativa: 0,
    "Prioridad alta": 0,
    "Cosecha próxima": 0,
    Disponible: 0,
    Otro: 0,
  };

  zonesOnly.forEach((z) => {
    const s = z.status || "Disponible";
    if (statusCounts[s] !== undefined) statusCounts[s]++;
    else statusCounts.Otro++;
  });

  useEffect(() => {
    if (!focusZoneRequest || !focusZoneRequest.name) return;
    const normalized = focusZoneRequest.name.trim().toLowerCase();

    const target = zonesOnly.find((z) => (z.name || "").trim().toLowerCase() === normalized);

    if (target) {
      handleSelectFeature(target.id);
      setTimeout(() => forceMapResize(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusZoneRequest, zonesOnly]);

  useEffect(() => {
    const onDocClick = (e) => {
      const el = e.target;
      if (!el) return;
      if (el.closest && el.closest(".agromind-search-wrap")) return;
      setShowResults(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
    return (
      <div className="farm-map-shell farm-map-error">
        <p>
          Falta configurar la llave de mapas (<code>VITE_MAPTILER_KEY</code>).
        </p>
        <p>
          Creá una cuenta gratis en MapTiler, poné la key en el archivo <code>.env</code> y recargá la página.
        </p>
      </div>
    );
  }

  return (
    <div className="farm-map-shell">
      {/* MINI-DASHBOARD DE RESUMEN */}
      <div className="farm-map-summary">
        <FarmSummary pointCount={pointCount} />

        <div className="summary-chip">
          <span className="summary-dot dot-line" />
          <span className="summary-label">
            {lineCount} {lineCount === 1 ? "línea" : "líneas"}
          </span>
        </div>

        <div className="summary-chip">
          <span className="summary-dot dot-zone" />
          <span className="summary-label">
            {zoneCount} {zoneCount === 1 ? "zona" : "zonas"}
          </span>
        </div>

        <div className="summary-chip summary-chip-status">
          <span className="status-pill status-ok" />
          <span className="summary-label">
            {statusCounts["Operativa"]} operativa{statusCounts["Operativa"] === 1 ? "" : "s"}
          </span>
        </div>

        <div className="summary-chip summary-chip-status">
          <span className="status-pill status-warning" />
          <span className="summary-label">{statusCounts["Prioridad alta"]} con prioridad</span>
        </div>

        <div className="summary-chip summary-chip-status">
          <span className="status-pill status-info" />
          <span className="summary-label">{statusCounts["Cosecha próxima"]} cosecha próxima</span>
        </div>

        <div className="summary-chip" title="Estado del backend">
          <span className="summary-label">{backendOnline ? "Backend: OK" : "Backend: sin conexión"}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="farm-map-toolbar" style={{ gap: "0.75rem" }}>
        <div className="agromind-search-wrap" style={{ position: "relative", flex: 1, maxWidth: 560 }}>
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.5rem" }}>
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Buscar lugar (ej: Ciudad Quesada, Dulce Nombre, San Carlos...)"
              style={{
                flex: 1,
                padding: "0.65rem 0.8rem",
                borderRadius: "999px",
                border: "1px solid rgba(148,163,184,0.25)",
                background: "rgba(2,6,23,0.35)",
                color: "#e5e7eb",
                outline: "none",
              }}
            />
            <button
              type="submit"
              className="secondary-btn"
              style={{ whiteSpace: "nowrap" }}
              disabled={searchLoading || searchQuery.trim().length < 3}
            >
              {searchLoading ? "Buscando..." : "Ir"}
            </button>
          </form>

          {searchError ? (
            <div style={{ marginTop: "0.35rem", color: "#fca5a5", fontSize: "0.9rem" }}>{searchError}</div>
          ) : null}

          {showResults && searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                zIndex: 50,
                background: "rgba(2,6,23,0.96)",
                border: "1px solid rgba(148,163,184,0.25)",
                borderRadius: "14px",
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              }}
            >
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handlePickSearchResult(r)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.7rem 0.85rem",
                    background: "transparent",
                    color: "#e5e7eb",
                    border: "none",
                    cursor: "pointer",
                    display: "block",
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {r.place_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="farm-map-tools-left">
          <button type="button" className={drawMode === "move" ? "tool-btn active" : "tool-btn"} onClick={() => setDrawMode("move")}>
            Mover
          </button>
          <button type="button" className={drawMode === "point" ? "tool-btn active" : "tool-btn"} onClick={() => setDrawMode("point")}>
            Punto
          </button>
          <button type="button" className={drawMode === "line" ? "tool-btn active" : "tool-btn"} onClick={() => setDrawMode("line")}>
            Línea
          </button>
          <button type="button" className={drawMode === "polygon" ? "tool-btn active" : "tool-btn"} onClick={() => setDrawMode("polygon")}>
            Zona
          </button>
        </div>

        <button type="button" className="primary-btn" onClick={handleSaveViewClick}>
          Usar esta vista como mi finca
        </button>
      </div>

      <div className="farm-map-layout">
        <div ref={mapRef} className="farm-map" />
      </div>

      {/* TABLA */}
      {featuresList.length > 0 && (
        <div className="farm-zones-table-wrapper">
          <div className="farm-zones-header-row">
            <span>ZONA / ELEMENTO</span>
            <span>TIPO</span>
            <span>ESTADO</span>
            <span>COMPONENTES / ACCIONES</span>
          </div>

          {featuresList.map((item) => {
            const isZone = item.kind === "polygon";
            const typeLabel = item.kind === "point" ? "Punto" : item.kind === "line" ? "Línea" : "Zona";

            const rowClass =
              "farm-zones-row" +
              (selectedId === item.id ? " selected" : "") +
              (hoveredId === item.id ? " hovered" : "");

            const totalComponents = Array.isArray(item.components) ? item.components.length : 0;

            return (
              <div
                key={item.id}
                className={rowClass}
                onClick={() => handleSelectFeature(item.id)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId((prev) => (prev === item.id ? null : prev))}
              >
                <div className="zone-col zone-name">
                  <span className="feature-color-pill" style={{ backgroundColor: item.color }} />
                  <input
                    className="zone-name-input"
                    value={item.name}
                    onChange={(e) => handleNameChange(item.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="zone-col zone-type">
                  {isZone ? (
                    <select
                      value={item.zoneType || "Zona libre"}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleZoneTypeChange(item.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ZONE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="type-label">{typeLabel}</span>
                  )}
                </div>

                <div className="zone-col zone-status">
                  {isZone ? (
                    <select
                      value={item.status || "Disponible"}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleZoneStatusChange(item.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="status-select"
                    >
                      {ZONE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="status-label">—</span>
                  )}
                </div>

                <div
                  className="zone-col zone-components"
                  style={{ justifyContent: "flex-end", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  {isZone && (
                    <>
                      <span className="components-summary" style={{ whiteSpace: "nowrap" }}>
                        {totalComponents === 0
                          ? "Sin componentes"
                          : totalComponents === 1
                          ? "1 componente"
                          : `${totalComponents} componentes`}
                      </span>

                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openComponentsModal(item.id);
                        }}
                      >
                        Ver componentes
                      </button>

                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openReportModal(item.id);
                        }}
                      >
                        Reporte
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className="danger-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFeature(item.id);
                    }}
                  >
                    Borrar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================
          ✅ MODAL POP-UP COMPONENTES
         ========================= */}
      {componentsModalOpen && modalZone && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          {/* Overlay */}
          <div
            onClick={closeComponentsModal}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(2px)",
            }}
          />

          {/* Modal box */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "min(880px, 100%)",
              maxHeight: "min(78vh, 760px)",
              background: "rgba(2,6,23,0.96)",
              border: "1px solid rgba(148,163,184,0.22)",
              borderRadius: "18px",
              boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 14px",
                borderBottom: "1px solid rgba(148,163,184,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h4 style={{ margin: 0, color: "#e5e7eb" }}>Componentes de la zona</h4>
                <span className="zone-tag">{modalZone.name}</span>
              </div>

              <button
                type="button"
                className="secondary-btn"
                onClick={closeComponentsModal}
                style={{ padding: "0.35rem 0.65rem" }}
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "14px", overflow: "auto" }}>
              {componentsDraft.length === 0 && (
                <p className="farm-zone-components-empty" style={{ marginTop: 0 }}>
                  Aún no has agregado componentes a esta zona. Usa el botón <strong>“Agregar componente”</strong>.
                </p>
              )}

              {componentsDraft.map((comp) => {
                const isEditingNote = editingNotesMap?.[comp.id] === true;
                const noteText = (comp.note || "").trim();

                return (
                  <div key={comp.id} className="farm-zone-component-row">
                    <div className="farm-zone-component-icon">
                      <span className="geom-dot" />
                    </div>

                    <div className="farm-zone-component-body">
                      <div
                        className="farm-zone-component-header"
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                      >
                        <span className="component-kind-badge">{comp.type || "Componente"}</span>

                        <button type="button" className="danger-link" onClick={() => draftDeleteComponent(comp.id)}>
                          Borrar
                        </button>
                      </div>

                      <div className="farm-zone-component-type-row">
                        <label className="component-type-label">Tipo de componente</label>
                        <select
                          className="component-type-select"
                          value={comp.type || "Otro"}
                          onChange={(e) => draftUpdate(comp.id, { type: e.target.value })}
                        >
                          {COMPONENT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <input
                        className="farm-feature-input"
                        value={comp.name}
                        onChange={(e) => draftUpdate(comp.id, { name: e.target.value })}
                        placeholder="Nombre del componente (ej: Gallinero, Bebedero, Bodega)"
                      />

                      {/* NOTA con ícono editable */}
                      <div style={{ marginTop: "10px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                          }}
                        >
                          <span style={{ fontSize: "0.85rem", color: "rgba(226,232,240,0.85)" }}>
                            Nota / comentario
                          </span>

                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => toggleEditNote(comp.id)}
                            style={{ padding: "0.25rem 0.55rem" }}
                            title={isEditingNote ? "Cerrar edición" : "Editar nota"}
                          >
                            ✏️ {isEditingNote ? "Listo" : "Editar"}
                          </button>
                        </div>

                        {isEditingNote ? (
                          <textarea
                            className="farm-feature-textarea"
                            value={comp.note}
                            onChange={(e) => draftUpdate(comp.id, { note: e.target.value })}
                            placeholder="Notas / detalles (ej: revisar techo, cambiar malla, etc.)"
                            rows={3}
                          />
                        ) : (
                          <div
                            style={{
                              marginTop: "8px",
                              padding: "10px 12px",
                              borderRadius: "12px",
                              border: "1px solid rgba(148,163,184,0.18)",
                              background: "rgba(2,6,23,0.35)",
                              color: noteText ? "#e5e7eb" : "rgba(226,232,240,0.55)",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {noteText ? noteText : "Sin nota. Tocá ✏️ para agregar una."}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 14px",
                borderTop: "1px solid rgba(148,163,184,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" className="primary-btn" onClick={draftAddComponent}>
                  Agregar componente
                </button>

                <button type="button" className="danger-link" onClick={() => handleDeleteFeature(modalZone.id)}>
                  Borrar zona
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" className="secondary-btn" onClick={closeComponentsModal}>
                  Cancelar
                </button>
                <button type="button" className="primary-btn" onClick={saveComponentsModal}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          ✅ REPORTE: ahora usa ZoneReportModal (YA NO inline)
         ========================= */}
      <ZoneReportModal
        open={reportModalOpen && !!reportZone}
        zone={reportZone}
        reportStats={reportStats}
        reportComponents={reportComponents}
        onClose={closeReportModal}
        onEditComponents={() => {
          if (!reportZone) return;
          closeReportModal();
          openComponentsModal(reportZone.id);
        }}
        onDeleteZone={() => {
          if (!reportZone) return;
          closeReportModal();
          handleDeleteFeature(reportZone.id);
        }}
        onCreateTask={(zone, comp) => createTaskFromComponent(zone, comp)}
      />
    </div>
  );
}