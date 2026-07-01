// src/components/map/useFarmMapController.js

import { useEffect, useMemo, useRef, useState } from "react";
import "ol/ol.css";

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

import { apiFetch, getAuthToken } from "./api";
import {
  VIEW_KEY,
  DRAWINGS_KEY,
  ACTIVE_FARM_KEY,
  ZONE_TYPES,
  ZONE_STATUSES,
  COMPONENT_TYPES,
} from "./constants";
import { pickColor, generateName, safeReadLocalDrawings } from "./helpers";

function nowISO() {
  return new Date().toISOString();
}

function withComponentTimestamps(c = {}, fallbackId) {
  const createdAt = c.createdAt || nowISO();
  const updatedAt = c.updatedAt || createdAt;

  return {
    id: c.id || fallbackId,
    name: c.name || "",
    note: c.note || "",
    type: c.type || "Otro",
    createdAt,
    updatedAt,
  };
}


function normalizeFarmName(value, fallback = "Finca #1") {
  const text = String(value || "").trim();
  return text.length > 0 ? text : fallback;
}

function getFarmNumber(farms = []) {
  return Array.isArray(farms) ? farms.length + 1 : 1;
}

export default function useFarmMapController({ focusZoneRequest }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const vectorSourceRef = useRef(null);
  const drawInteractionRef = useRef(null);

  const featuresMapRef = useRef({}); // id -> Feature

  const [featuresList, setFeaturesList] = useState([]);
  const latestFeaturesListRef = useRef([]);
  useEffect(() => {
    latestFeaturesListRef.current = featuresList;
  }, [featuresList]);

  const [drawMode, setDrawMode] = useState("move");
  const [selectedId, setSelectedId] = useState(null);

  const [hoveredId, setHoveredId] = useState(null);

  const countersRef = useRef({ point: 0, line: 0, polygon: 0 });
  const colorIndexRef = useRef({ point: 0, line: 0, polygon: 0 });

  const apiKey = import.meta.env.VITE_MAPTILER_KEY;

  // Backend state
  const [mapReady, setMapReady] = useState(false);
  const [farms, setFarms] = useState([]);
  const [activeFarmId, setActiveFarmId] = useState(null);
  const [activeFarm, setActiveFarm] = useState(null);
  const [farmsLoading, setFarmsLoading] = useState(false);
  const [farmActionLoading, setFarmActionLoading] = useState(false);
  const [farmsError, setFarmsError] = useState("");
  const [backendOnline, setBackendOnline] = useState(true);

  // Debounce autosave
  const autosaveTimerRef = useRef(null);

  // Anti-wipe
  const loadedOnceRef = useRef(false);
  const dirtyRef = useRef(false);
  const markDirty = () => {
    dirtyRef.current = true;
  };

  // =========================
  // 🔎 BUSCADOR (Geocoding)
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
  // ✅ MODAL COMPONENTES
  // =========================
  const [componentsModalOpen, setComponentsModalOpen] = useState(false);
  const [componentsModalZoneId, setComponentsModalZoneId] = useState(null);
  const [componentsDraft, setComponentsDraft] = useState([]);
  const [editingNotesMap, setEditingNotesMap] = useState({});

  const modalZone =
    componentsModalZoneId && zonesOnly.find((z) => z.id === componentsModalZoneId);

  const openComponentsModal = (zoneId) => {
    const zone = zonesOnly.find((z) => z.id === zoneId);
    if (!zone) return;

    const safe = Array.isArray(zone.components) ? zone.components : [];
    const cloned = safe.map((c, idx) =>
      withComponentTimestamps(
        c,
        c.id ||
          `comp-${idx}-${Date.now().toString(36)}${Math.random()
            .toString(36)
            .slice(2, 6)}`
      )
    );

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

        const components = (componentsDraft || []).map((c, idx) =>
          withComponentTimestamps(
            c,
            c.id ||
              `comp-${idx}-${Date.now().toString(36)}${Math.random()
                .toString(36)
                .slice(2, 6)}`
          )
        );

        const feature = featuresMapRef.current[componentsModalZoneId];
        if (feature) feature.set("components", components);

        return { ...item, components };
      });

      scheduleAutosave(updated);
      return updated;
    });

    closeComponentsModal();
  };

  const draftAddComponent = () => {
    const id = `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const stamp = nowISO();

    const newComp = {
      id,
      name: "",
      note: "",
      type: "Otro",
      createdAt: stamp,
      updatedAt: stamp,
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
    const touch =
      patch &&
      (Object.prototype.hasOwnProperty.call(patch, "name") ||
        Object.prototype.hasOwnProperty.call(patch, "note") ||
        Object.prototype.hasOwnProperty.call(patch, "type"));

    setComponentsDraft((prev) =>
      (prev || []).map((c) =>
        c.id === compId
          ? {
              ...c,
              ...patch,
              ...(touch ? { updatedAt: nowISO() } : {}),
              createdAt: c.createdAt || nowISO(),
              updatedAt: (touch ? nowISO() : c.updatedAt) || c.createdAt || nowISO(),
            }
          : c
      )
    );
  };

  const toggleEditNote = (compId) => {
    setEditingNotesMap((prev) => ({ ...(prev || {}), [compId]: !prev?.[compId] }));
  };

  // =========================
  // ✅ MODAL CREAR TAREA (premium)
  // =========================
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [createTaskDraft, setCreateTaskDraft] = useState({
    title: "",
    zoneName: "",
    zoneId: "",
    componentId: "",
  });

  const openCreateTaskModal = (zone, comp) => {
    const title = `Revisión: ${comp?.name || "Componente"} (${zone?.name || "Zona"})`;
    setCreateTaskDraft({
      title,
      zoneName: zone?.name || "",
      zoneId: zone?.id || "",
      componentId: comp?.id || "",
    });
    setCreateTaskModalOpen(true);
  };

  const closeCreateTaskModal = () => {
    setCreateTaskModalOpen(false);
    setTimeout(
      () => setCreateTaskDraft({ title: "", zoneName: "", zoneId: "", componentId: "" }),
      0
    );
  };

  const updateCreateTaskDraft = (patch) => {
    setCreateTaskDraft((prev) => ({ ...(prev || {}), ...(patch || {}) }));
  };

  const confirmCreateTask = () => {
    closeCreateTaskModal();
  };

  // ESC cierra modales
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (componentsModalOpen) closeComponentsModal();
      if (createTaskModalOpen) closeCreateTaskModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentsModalOpen, createTaskModalOpen]);

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
          // ✅ garantizamos timestamps en componentes al guardar
          components: Array.isArray(item.components)
            ? item.components.map((c, idx) =>
                withComponentTimestamps(
                  c,
                  c.id ||
                    `comp-${idx}-${Date.now().toString(36)}${Math.random()
                      .toString(36)
                      .slice(2, 6)}`
                )
              )
            : [],
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

    const addFeature = ({ kind, name, geometry, meta, components }) => {
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
          ? components.map((c, idx) =>
              withComponentTimestamps(
                c,
                c.id ||
                  `comp-${idx}-${Date.now().toString(36)}${Math.random()
                    .toString(36)
                    .slice(2, 6)}`
              )
            )
          : [];

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
      });
    });

    countersRef.current = counters;
    setFeaturesList(newList);
    forceMapResize();

    loadedOnceRef.current = true;
    dirtyRef.current = false;
  };

  const getCurrentViewPayload = () => {
    const map = mapInstanceRef.current;
    if (!map) return null;

    const view = map.getView();
    const center = view.getCenter();
    const zoom = view.getZoom();
    if (!center || typeof zoom !== "number") return null;

    const [lon, lat] = toLonLat(center);
    return { center: [lon, lat], zoom };
  };

  const saveMapNow = async (farmId, list = latestFeaturesListRef.current || [], options = {}) => {
    if (!farmId) return false;
    const token = getAuthToken();
    if (!token) return false;

    const payload = buildBackendPayloadFromList(list, options);
    if (!payload) return false;

    await apiFetch(`/api/farms/${farmId}/map`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    setBackendOnline(true);
    dirtyRef.current = false;
    return true;
  };

  const updateFarmInState = (farm) => {
    if (!farm?.id) return;

    setFarms((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      const exists = current.some((item) => item.id === farm.id);
      const next = exists
        ? current.map((item) => (item.id === farm.id ? { ...item, ...farm } : item))
        : [...current, farm];
      return next;
    });

    setActiveFarm((prev) => (prev?.id === farm.id || activeFarmId === farm.id ? { ...(prev || {}), ...farm } : prev));
  };

  const setActiveFarmFromList = (farmId, list = farms) => {
    const safeList = Array.isArray(list) ? list : [];
    const farm = safeList.find((item) => item.id === farmId) || null;
    setActiveFarm(farm);
  };

  const loadFarmMap = async (farmId, list = farms) => {
    if (!farmId) return false;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const mapRes = await apiFetch(`/api/farms/${farmId}/map`, { method: "GET" });

    setActiveFarmId(farmId);
    localStorage.setItem(ACTIVE_FARM_KEY, farmId);
    setActiveFarmFromList(farmId, list);

    applyBackendMapToUI(mapRes);
    setBackendOnline(true);
    return true;
  };

  const refreshFarms = async () => {
    const farmsRes = await apiFetch("/api/farms", { method: "GET" });
    const nextFarms = Array.isArray(farmsRes?.farms) ? farmsRes.farms : [];
    setFarms(nextFarms);
    return nextFarms;
  };

  // =========================
  // BACKEND LOAD / SAVE
  // =========================
  const scheduleAutosave = (list, options = {}) => {
    const force = options?.force === true;

    // Cache local mínimo
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
        await saveMapNow(activeFarmId, list, options);
      } catch (err) {
        console.warn("Autosave backend falló:", err?.message || err);
        setBackendOnline(false);
      }
    }, 900);
  };

  const ensureFarmAndLoad = async () => {
    setFarmsLoading(true);
    setFarmsError("");

    try {
      const token = getAuthToken();
      if (!token) {
        setBackendOnline(false);
        setFarms([]);
        setActiveFarmId(null);
        setActiveFarm(null);
        return;
      }

      let nextFarms = await refreshFarms();
      const savedActive = localStorage.getItem(ACTIVE_FARM_KEY);
      const picked =
        (savedActive && nextFarms.find((f) => f.id === savedActive)) ||
        nextFarms.find((f) => f.isPrimary) ||
        nextFarms[0];

      let farmId = picked?.id || null;

      if (!farmId) {
        const created = await apiFetch("/api/farms", {
          method: "POST",
          body: JSON.stringify({ name: "Finca #1", view: null }),
        });

        const createdFarm = created?.farm || null;
        farmId = createdFarm?.id || null;
        nextFarms = createdFarm ? [createdFarm] : await refreshFarms();
        setFarms(nextFarms);
      }

      if (!farmId) {
        setBackendOnline(false);
        setFarmsError("No se pudo cargar o crear la finca inicial.");
        return;
      }

      const mapRes = await apiFetch(`/api/farms/${farmId}/map`, { method: "GET" });

      setActiveFarmId(farmId);
      localStorage.setItem(ACTIVE_FARM_KEY, farmId);
      setActiveFarmFromList(farmId, nextFarms);

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
            if (latest.length > 0) scheduleAutosave(latest, { force: true });
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
      setFarmsError(err?.message || "No se pudieron cargar las fincas.");
    } finally {
      setFarmsLoading(false);
    }
  };

  const handleSwitchFarm = async (farmId) => {
    if (!farmId || farmId === activeFarmId) return;

    setFarmActionLoading(true);
    setFarmsError("");

    try {
      const previousFarmId = activeFarmId;
      const latest = latestFeaturesListRef.current || [];

      if (previousFarmId && dirtyRef.current === true) {
        await saveMapNow(previousFarmId, latest, { view: getCurrentViewPayload() });
      }

      await loadFarmMap(farmId, farms);
    } catch (err) {
      console.warn("Cambio de finca falló:", err?.message || err);
      setBackendOnline(false);
      setFarmsError(err?.message || "No se pudo cambiar de finca.");
    } finally {
      setFarmActionLoading(false);
    }
  };

  const handleCreateFarmFromCurrentView = async (name) => {
    setFarmActionLoading(true);
    setFarmsError("");

    try {
      const currentView = getCurrentViewPayload();
      const nextName = normalizeFarmName(name, `Finca #${getFarmNumber(farms)}`);

      if (activeFarmId && dirtyRef.current === true) {
        await saveMapNow(activeFarmId, latestFeaturesListRef.current || [], { view: currentView });
      }

      const created = await apiFetch("/api/farms", {
        method: "POST",
        body: JSON.stringify({ name: nextName, view: currentView }),
      });

      const createdFarm = created?.farm || null;
      if (!createdFarm?.id) throw new Error("No se pudo crear la nueva finca.");

      const nextFarms = [...(Array.isArray(farms) ? farms : []), createdFarm];
      setFarms(nextFarms);

      setActiveFarmId(createdFarm.id);
      setActiveFarm(createdFarm);
      localStorage.setItem(ACTIVE_FARM_KEY, createdFarm.id);

      const vectorSource = vectorSourceRef.current;
      if (vectorSource) vectorSource.clear();
      featuresMapRef.current = {};
      countersRef.current = { point: 0, line: 0, polygon: 0 };
      setFeaturesList([]);
      setSelectedId(null);
      setHoveredId(null);
      loadedOnceRef.current = true;
      dirtyRef.current = false;

      return createdFarm;
    } catch (err) {
      console.warn("Crear finca falló:", err?.message || err);
      setBackendOnline(false);
      setFarmsError(err?.message || "No se pudo crear la finca.");
      return null;
    } finally {
      setFarmActionLoading(false);
    }
  };

  const handleRenameFarm = async (farmId, name) => {
    const nextName = normalizeFarmName(name, "Finca sin nombre");
    if (!farmId || !nextName) return null;

    setFarmActionLoading(true);
    setFarmsError("");

    try {
      let updated = null;

      try {
        const res = await apiFetch(`/api/farms/${farmId}`, {
          method: "PATCH",
          body: JSON.stringify({ name: nextName }),
        });
        updated = res?.farm || null;
      } catch (patchErr) {
        const res = await apiFetch(`/api/farms/${farmId}`, {
          method: "PUT",
          body: JSON.stringify({ name: nextName }),
        });
        updated = res?.farm || null;
      }

      const finalFarm = updated || { id: farmId, name: nextName };
      updateFarmInState(finalFarm);
      if (farmId === activeFarmId) setActiveFarm((prev) => ({ ...(prev || {}), ...finalFarm }));
      return finalFarm;
    } catch (err) {
      console.warn("Renombrar finca falló:", err?.message || err);
      setBackendOnline(false);
      setFarmsError(err?.message || "No se pudo renombrar la finca.");
      return null;
    } finally {
      setFarmActionLoading(false);
    }
  };

  const handleRenameActiveFarm = async (name) => handleRenameFarm(activeFarmId, name);


  // =========================
  // 🔎 Geocoding (MapTiler)
  // =========================
  const geocodeSearch = async (q, signal) => {
    if (!apiKey || apiKey === "TU_API_KEY_AQUI")
      throw new Error("Falta VITE_MAPTILER_KEY para buscar lugares.");

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
          id: f?.id || `${center[0]}-${center[1]}-${Math.random().toString(36).slice(2, 6)}`,
          place_name: f?.place_name || f?.text || "Ubicación",
          center,
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

  const goToLocation = (lon, lat, zoom = 16, options = {}) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.getView().setCenter(fromLonLat([lon, lat]));
    map.getView().setZoom(zoom);

    if (options?.saveView === true) {
      markDirty();
      scheduleAutosave(latestFeaturesListRef.current || [], { view: { center: [lon, lat], zoom } });
    }
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

  // Click afuera cierra dropdown
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
          if (parsed && typeof parsed.lon === "number" && typeof parsed.lat === "number")
            centerLonLat = [parsed.lon, parsed.lat];
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
              stroke: new Stroke({ color, width: active ? 5 : 3 }),
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

          return new Style({ stroke: new Stroke({ color, width: active ? 4 : 2 }) });
        },
      });

      const map = new Map({
        target: mapRef.current,
        layers: [baseLayer, vectorLayer],
        view: new View({ center: fromLonLat(centerLonLat), zoom }),
      });

      mapInstanceRef.current = map;
      forceMapResize();

      // Fallback local drawings
      try {
        const savedDrawings = localStorage.getItem(DRAWINGS_KEY);
        if (savedDrawings) {
          const parsed = JSON.parse(savedDrawings);
          if (Array.isArray(parsed)) {
            const newList = [];
            const counters = { point: 0, line: 0, polygon: 0 };

            parsed.forEach((item) => {
              const { id, kind, color, name, note, zoneType, status, components, geomType, coordinates } = item;
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
                  ? components.map((c, idx) =>
                      withComponentTimestamps(
                        c,
                        c.id ||
                          `comp-${idx}-${Date.now().toString(36)}${Math.random()
                            .toString(36)
                            .slice(2, 6)}`
                      )
                    )
                  : [];

              feature.setProperties({
                id,
                kind: safeKind,
                color: finalColor,
                name: finalName,
                note: note || "",
                zoneType: finalZoneType,
                status: finalStatus,
                components: finalComponents,
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

        if (foundId) handleSelectFeature(foundId);
        else {
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

  // Draw interaction
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

    feature.setProperties({
      id,
      kind,
      color,
      name,
      note,
      zoneType,
      status,
      components,
      geomType: mode === "point" ? "Point" : mode === "line" ? "LineString" : "Polygon",
      selected: false,
      hovered: false,
    });

    featuresMapRef.current[id] = feature;

    setFeaturesList((prev) => {
      const updated = [...prev, { id, kind, color, name, note, zoneType, status, components }];
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

    draw.on("drawend", (evt) => handleDrawEnd(evt.feature, drawMode));

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
      map.getView().fit(geometry, { maxZoom: 19, duration: 400, padding: [40, 40, 40, 40] });
    }

    setSelectedId(id);
  };

  const handleNameChange = (id, value) => {
    markDirty();
    const feature = featuresMapRef.current[id];
    if (feature) feature.set("name", value);

    setFeaturesList((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, name: value } : item));
      scheduleAutosave(updated);
      return updated;
    });
  };

  const handleZoneTypeChange = (id, value) => {
    markDirty();
    const feature = featuresMapRef.current[id];
    if (feature) feature.set("zoneType", value);

    setFeaturesList((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, zoneType: value } : item));
      scheduleAutosave(updated);
      return updated;
    });
  };

  const handleZoneStatusChange = (id, value) => {
    markDirty();
    const feature = featuresMapRef.current[id];
    if (feature) feature.set("status", value);

    setFeaturesList((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, status: value } : item));
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

  // Focus external request
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

  // Counts
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

  return {
    apiKey,
    mapRef,

    ZONE_TYPES,
    ZONE_STATUSES,
    COMPONENT_TYPES,

    featuresList,
    setFeaturesList,

    drawMode,
    setDrawMode,
    selectedId,
    hoveredId,
    setHoveredId,

    searchQuery,
    setSearchQuery,
    searchLoading,
    searchError,
    searchResults,
    showResults,
    setShowResults,
    handlePickSearchResult,
    handleSearchSubmit,

    backendOnline,
    farms,
    activeFarmId,
    activeFarm,
    farmsLoading,
    farmActionLoading,
    farmsError,
    refreshFarms,
    handleSwitchFarm,
    handleCreateFarmFromCurrentView,
    handleRenameFarm,
    handleRenameActiveFarm,

    pointCount,
    lineCount,
    zoneCount,
    zonesOnly,
    statusCounts,

    componentsModalOpen,
    componentsDraft,
    editingNotesMap,
    modalZone,
    openComponentsModal,
    closeComponentsModal,
    saveComponentsModal,
    draftAddComponent,
    draftDeleteComponent,
    draftUpdate,
    toggleEditNote,

    createTaskModalOpen,
    createTaskDraft,
    openCreateTaskModal,
    closeCreateTaskModal,
    updateCreateTaskDraft,
    confirmCreateTask,

    handleSelectFeature,
    handleNameChange,
    handleZoneTypeChange,
    handleZoneStatusChange,
    handleDeleteFeature,
    handleSaveViewClick,
  };
}