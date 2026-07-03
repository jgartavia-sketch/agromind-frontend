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
import {
  Style,
  Stroke,
  Fill,
  Circle as CircleStyle,
  Text,
} from "ol/style";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import Polygon from "ol/geom/Polygon";
import { useFarm } from "../../context/FarmContext";
import ProcessModal from "./ProcessModal";
import ComponentModal from "./ComponentModal";

const VIEW_KEY = "agromind_farm_view";
const DRAWINGS_KEY = "agromind_farm_drawings";

const POINT_COLORS = ["#f97316", "#22c55e", "#38bdf8", "#eab308", "#ec4899"];
const LINE_COLORS = ["#22c55e", "#38bdf8", "#f97316", "#a855f7", "#facc15"];
const POLYGON_COLORS = ["#22c55e88", "#38bdf888", "#f9731688", "#a855f788"];

const ZONE_TYPES = ["Zona de animales", "Pasillo", "Cultivo", "Zona libre"];
const ZONE_STATUSES = ["Operativa", "Prioridad alta", "Disponible"];
const PROCESS_PRIORITIES = ["Baja", "Media", "Alta"];
const PROCESS_STATUSES = [
  "Borrador",
  "Activo",
  "Pausado",
  "Bloqueado",
  "Completado",
];
const STEP_STATUSES = ["Pendiente", "En progreso", "Bloqueada", "Completada"];

const COMPONENT_TYPES = [
  "Bebedero",
  "Comedero",
  "Bodega",
  "Lote de cultivo",
  "Pasillo",
  "Área de descanso",
  "Animal",
  "Árbol",
  "Riego",
  "Otro",
];

function getComponentIcon(type = "Otro") {
  const value = String(type || "Otro").toLowerCase();

  if (value.includes("animal") || value.includes("gallina") || value.includes("vaca") || value.includes("cerdo")) return "🐄";
  if (value.includes("cultivo") || value.includes("lote")) return "🌱";
  if (value.includes("bebedero") || value.includes("riego")) return "💧";
  if (value.includes("comedero")) return "🌾";
  if (value.includes("bodega")) return "🏠";
  if (value.includes("pasillo")) return "↔️";
  if (value.includes("descanso")) return "🟢";
  if (value.includes("árbol") || value.includes("arbol")) return "🌳";

  return "📍";
}

function getComponentDisplayName(component, index = 0) {
  const name = String(component?.name || "").trim();
  if (name) return name;

  const type = String(component?.type || "Componente").trim() || "Componente";
  return `${type} #${index + 1}`;
}

function nowIso() {
  return new Date().toISOString();
}

function persistFarmLocation({ lat, lon, zoom, farmId = null, source = "map" }) {
  if (
    typeof lat !== "number" ||
    Number.isNaN(lat) ||
    typeof lon !== "number" ||
    Number.isNaN(lon)
  ) {
    return;
  }

  try {
    localStorage.setItem(
      "farmLocation",
      JSON.stringify({
        lat,
        lon,
        zoom: typeof zoom === "number" && !Number.isNaN(zoom) ? zoom : null,
        farmId,
        source,
        updatedAt: nowIso(),
      })
    );
  } catch {
    // no-op
  }
}

function toYYYYMMDD(d = new Date()) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function addDaysToYYYYMMDD(startDate, durationDays) {
  if (!startDate) return "";
  const days = Number(durationDays);
  if (!Number.isFinite(days) || days < 0) return "";

  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  date.setDate(date.getDate() + days);
  return toYYYYMMDD(date);
}

function getDurationDays(startDate, dueDate) {
  if (!startDate || !dueDate) return "—";

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${dueDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";

  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return diff >= 0 ? String(diff) : "—";
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

const API_BASE =
  import.meta.env.VITE_API_URL || "https://agromind-backend-slem.onrender.com";

const FARM_MAP_DEBUG = true;

function debugTimeStart(label) {
  if (!FARM_MAP_DEBUG) return null;
  const safeLabel = `[FarmMap] ${label}`;
  console.time(safeLabel);
  return safeLabel;
}

function debugTimeEnd(label) {
  if (!FARM_MAP_DEBUG || !label) return;
  console.timeEnd(label);
}

function looksLikeHtml(text) {
  return typeof text === "string" && /<(!doctype|html|body|pre)/i.test(text);
}

function normalizeApiErrorMessage(status, data) {
  if (typeof data === "string") {
    if (
      data.includes("Cannot GET /api/processes") ||
      data.includes("Cannot POST /api/processes") ||
      data.includes("Cannot DELETE /api/processes") ||
      data.includes("Cannot PUT /api/processes") ||
      data.includes("Cannot GET /api/processes/") ||
      data.includes("Cannot POST /api/processes/step") ||
      data.includes("Cannot PUT /api/processes/step") ||
      data.includes("Cannot DELETE /api/processes/step")
    ) {
      return "El backend desplegado todavía no tiene activas las rutas del gestor de procesos.";
    }

    if (looksLikeHtml(data)) {
      return `Error ${status || 500} del servidor.`;
    }

    return data;
  }

  if (data && typeof data === "object" && data.error) {
    return data.error;
  }

  return "Error en request.";
}

async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const method = options.method || "GET";
  const apiTimer = debugTimeStart(`API ${method} ${path}`);

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

  debugTimeEnd(apiTimer);

  if (!res.ok) {
    const err = new Error(normalizeApiErrorMessage(res.status, data));
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

function formatProcessDate(date) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("es-CR");
  } catch {
    return "—";
  }
}

function getEmptyStepDraft() {
  return {
    name: "",
    startDate: "",
    durationDays: "",
    notes: "",
  };
}

function getProgressFromSteps(steps = []) {
  const total = Array.isArray(steps) ? steps.length : 0;
  if (total === 0) return 0;
  const completed = steps.filter((s) => s?.status === "Completada").length;
  return Math.round((completed / total) * 100);
}

function getPriorityPillStyle(priority) {
  const v = String(priority || "Media").toLowerCase();
  if (v === "alta") {
    return {
      border: "1px solid rgba(248,113,113,0.28)",
      background: "rgba(248,113,113,0.10)",
      color: "#fecaca",
    };
  }
  if (v === "baja") {
    return {
      border: "1px solid rgba(96,165,250,0.28)",
      background: "rgba(96,165,250,0.10)",
      color: "#bfdbfe",
    };
  }
  return {
    border: "1px solid rgba(250,204,21,0.28)",
    background: "rgba(250,204,21,0.10)",
    color: "#fde68a",
  };
}

function getStatusPillStyle(status) {
  const v = String(status || "").toLowerCase();
  if (v === "completado" || v === "completada") {
    return {
      border: "1px solid rgba(34,197,94,0.28)",
      background: "rgba(34,197,94,0.10)",
      color: "#bbf7d0",
    };
  }
  if (v === "bloqueado" || v === "bloqueada") {
    return {
      border: "1px solid rgba(248,113,113,0.28)",
      background: "rgba(248,113,113,0.10)",
      color: "#fecaca",
    };
  }
  if (v === "en progreso" || v === "activo") {
    return {
      border: "1px solid rgba(56,189,248,0.28)",
      background: "rgba(56,189,248,0.10)",
      color: "#bae6fd",
    };
  }
  if (v === "pausado") {
    return {
      border: "1px solid rgba(148,163,184,0.28)",
      background: "rgba(148,163,184,0.10)",
      color: "#cbd5e1",
    };
  }
  return {
    border: "1px solid rgba(250,204,21,0.28)",
    background: "rgba(250,204,21,0.10)",
    color: "#fde68a",
  };
}

export default function FarmMap({ focusZoneRequest, onFarmLocationChange }) {
  const {
    activeFarm: globalActiveFarm,
    farmId: contextFarmId,
    farmName: contextFarmName,
    setActiveFarm,
  } = useFarm();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const vectorSourceRef = useRef(null);
  const drawInteractionRef = useRef(null);
  const vectorLayerRef = useRef(null);

  const featuresMapRef = useRef({});
  const rowRefs = useRef({});
  const latestLocationSentRef = useRef("");

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

  const [mapReady, setMapReady] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);

  const [farms, setFarms] = useState([]);
  const [farmsLoading, setFarmsLoading] = useState(false);
  const [farmActionLoading, setFarmActionLoading] = useState(false);
  const [farmMenuOpen, setFarmMenuOpen] = useState(false);
  const [farmError, setFarmError] = useState("");
  const [farmSavedNotice, setFarmSavedNotice] = useState("");
  const [farmViewPinned, setFarmViewPinned] = useState(false);
  const [editingFarmId, setEditingFarmId] = useState(null);
  const [editingFarmName, setEditingFarmName] = useState("");

  const autosaveTimerRef = useRef(null);
  const loadedOnceRef = useRef(false);
  const loadedFarmIdRef = useRef(null);
  const dirtyRef = useRef(false);

  const markDirty = () => {
    dirtyRef.current = true;
  };

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

  const emitFarmLocationChange = (source = "map") => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const view = map.getView();
    const center = view.getCenter();
    const zoom = view.getZoom();

    if (!center || typeof zoom !== "number") return;

    const [lon, lat] = toLonLat(center);

    if (
      typeof lon !== "number" ||
      Number.isNaN(lon) ||
      typeof lat !== "number" ||
      Number.isNaN(lat)
    ) {
      return;
    }

    const payload = {
      lat,
      lon,
      zoom,
      farmId: contextFarmId || null,
      source,
    };

    persistFarmLocation(payload);

    const signature = JSON.stringify({
      lat: Number(lat.toFixed(8)),
      lon: Number(lon.toFixed(8)),
      zoom: Number(zoom.toFixed(2)),
      farmId: payload.farmId,
      source,
    });

    if (latestLocationSentRef.current === signature) return;
    latestLocationSentRef.current = signature;

    if (typeof onFarmLocationChange === "function") {
      onFarmLocationChange(payload);
    }
  };

  const activeFarm = useMemo(
    () =>
      farms.find((farm) => farm.id === contextFarmId) || globalActiveFarm || null,
    [farms, contextFarmId, globalActiveFarm]
  );

  const activeFarmName = contextFarmName || activeFarm?.name || "Finca #1";

  const zonesOnly = featuresList.filter((f) => f.kind === "polygon");

  const [listFilter, setListFilter] = useState({ kind: "all", status: null });

  const isActiveFilter = (kind, status = null) => {
    if (status !== null) {
      return listFilter.kind === "polygon" && listFilter.status === status;
    }
    return listFilter.kind === kind && listFilter.status === null;
  };

  const filteredList = useMemo(() => {
    const { kind, status } = listFilter;
    let list = featuresList;

    if (kind && kind !== "all") {
      list = list.filter((f) => f.kind === kind);
    }

    if (status) {
      list = list.filter(
        (f) => f.kind === "polygon" && (f.status || "Disponible") === status
      );
    }

    return list;
  }, [featuresList, listFilter]);

  const handleSummaryFilter = (mode) => {
    if (mode === "point") {
      setListFilter((prev) =>
        prev.kind === "point" && prev.status === null
          ? { kind: "all", status: null }
          : { kind: "point", status: null }
      );
      return;
    }

    if (mode === "line") {
      setListFilter((prev) =>
        prev.kind === "line" && prev.status === null
          ? { kind: "all", status: null }
          : { kind: "line", status: null }
      );
      return;
    }

    if (mode === "polygon") {
      setListFilter((prev) =>
        prev.kind === "polygon" && prev.status === null
          ? { kind: "all", status: null }
          : { kind: "polygon", status: null }
      );
      return;
    }

    if (mode === "operative") {
      setListFilter((prev) =>
        prev.kind === "polygon" && prev.status === "Operativa"
          ? { kind: "all", status: null }
          : { kind: "polygon", status: "Operativa" }
      );
      return;
    }

    if (mode === "priority") {
      setListFilter((prev) =>
        prev.kind === "polygon" && prev.status === "Prioridad alta"
          ? { kind: "all", status: null }
          : { kind: "polygon", status: "Prioridad alta" }
      );
    }
  };

  const [componentsModalOpen, setComponentsModalOpen] = useState(false);
  const [componentsModalZoneId, setComponentsModalZoneId] = useState(null);
  const [componentsModalView, setComponentsModalView] = useState("components");
  const [componentsDraft, setComponentsDraft] = useState([]);
  const [editingNotesMap, setEditingNotesMap] = useState({});

  const [zoneProcessesMap, setZoneProcessesMap] = useState({});
  const [processesLoading, setProcessesLoading] = useState(false);
  const [processesError, setProcessesError] = useState("");
  const [processActionLoading, setProcessActionLoading] = useState(false);

  const [showCreateProcessForm, setShowCreateProcessForm] = useState(false);
  const [newProcessName, setNewProcessName] = useState("");
  const [newProcessDescription, setNewProcessDescription] = useState("");
  const [newProcessOwner, setNewProcessOwner] = useState("");
  const [newProcessPriority, setNewProcessPriority] = useState("Media");
  const [newProcessStartDate, setNewProcessStartDate] = useState("");
  const [newProcessTargetDate, setNewProcessTargetDate] = useState("");

  const [newStepByProcess, setNewStepByProcess] = useState({});
  const [openStepFormByProcess, setOpenStepFormByProcess] = useState({});

  const modalZone =
    componentsModalZoneId && zonesOnly.find((z) => z.id === componentsModalZoneId);

  const modalZoneProcesses = useMemo(() => {
    if (!componentsModalZoneId) return [];
    return zoneProcessesMap[componentsModalZoneId] || [];
  }, [componentsModalZoneId, zoneProcessesMap]);

  const updateStepDraftField = (processId, field, value) => {
    setNewStepByProcess((prev) => ({
      ...prev,
      [processId]: {
        ...getEmptyStepDraft(),
        ...(prev[processId] || {}),
        [field]: value,
      },
    }));
  };

  const loadZoneProcesses = async (zoneId) => {
    if (!zoneId) return;
    try {
      setProcessesLoading(true);
      setProcessesError("");

      const data = await apiFetch(`/api/processes/zone/${zoneId}`, {
        method: "GET",
      });

      setZoneProcessesMap((prev) => ({
        ...prev,
        [zoneId]: Array.isArray(data) ? data : [],
      }));
    } catch (err) {
      setProcessesError(err?.message || "No se pudieron cargar los procesos.");
      setZoneProcessesMap((prev) => ({
        ...prev,
        [zoneId]: [],
      }));
    } finally {
      setProcessesLoading(false);
    }
  };

  const createProcessForZone = async (processOverride = null, initialSteps = []) => {
    if (!componentsModalZoneId || !modalZone) return null;

    const source = processOverride || {};
    const safeName = String(source.name ?? newProcessName).trim();
    const safeDescription = String(source.description ?? newProcessDescription).trim();
    const safeOwner = String(source.owner ?? newProcessOwner).trim();
    const safePriority = source.priority || newProcessPriority || "Media";
    const safeType = source.type || "General";
    const safeStatus = source.status || "Borrador";

    if (!safeName) {
      setProcessesError("Escribe el nombre del proceso.");
      return null;
    }

    try {
      setProcessActionLoading(true);
      setProcessesError("");

      try {
        await saveMapNow(latestFeaturesListRef.current || []);
      } catch (err) {
        console.warn("No se pudo sincronizar la zona antes de crear el proceso:", err);
        setProcessesError("No se pudo sincronizar la zona antes de crear el proceso.");
        setProcessActionLoading(false);
        return null;
      }

      const createdProcess = await apiFetch("/api/processes", {
        method: "POST",
        body: JSON.stringify({
          zoneId: componentsModalZoneId,
          name: safeName,
          description: safeDescription,
          owner: safeOwner,
          priority: safePriority,
          startDate: null,
          targetDate: null,
          type: safeType,
          status: safeStatus,
        }),
      });

      const processId = createdProcess?.id;
      const stepsToCreate = Array.isArray(initialSteps) ? initialSteps : [];

      if (processId && stepsToCreate.length > 0) {
        for (const [index, step] of stepsToCreate.entries()) {
          const stepName = String(step?.name || `Etapa ${index + 1}`).trim();
          const durationNumber = Number(step?.durationDays);
          const calculatedDueDate =
            step?.dueDate || addDaysToYYYYMMDD(step?.startDate, step?.durationDays);

          if (!step?.startDate) {
            throw new Error(`Selecciona la fecha de inicio de la etapa ${index + 1}.`);
          }

          if (!Number.isFinite(durationNumber) || durationNumber < 0) {
            throw new Error(`Escribe una duración válida para la etapa ${index + 1}.`);
          }

          if (!calculatedDueDate) {
            throw new Error(`No se pudo calcular la fecha final de la etapa ${index + 1}.`);
          }

          await apiFetch("/api/processes/step", {
            method: "POST",
            body: JSON.stringify({
              processId,
              name: stepName,
              owner: safeOwner,
              priority: safePriority,
              startDate: step.startDate || null,
              dueDate: calculatedDueDate || null,
              notes: step.notes || "",
              status: "Pendiente",
            }),
          });
        }
      }

      setNewProcessName("");
      setNewProcessDescription("");
      setNewProcessOwner("");
      setNewProcessPriority("Media");
      setNewProcessStartDate("");
      setNewProcessTargetDate("");
      setShowCreateProcessForm(false);
      await loadZoneProcesses(componentsModalZoneId);
      return createdProcess;
    } catch (err) {
      setProcessesError(err?.message || "No se pudo crear el proceso.");
      return null;
    } finally {
      setProcessActionLoading(false);
    }
  };

  const createStepForProcess = async (process) => {
    if (!process?.id || !componentsModalZoneId) return;

    const existingSteps = Array.isArray(process.steps) ? process.steps : [];
    const nextStepNumber = existingSteps.length + 1;

    const draft = {
      ...getEmptyStepDraft(),
      ...(newStepByProcess[process.id] || {}),
    };

    const stepName = draft.name.trim() || `Etapa ${nextStepNumber}`;
    const durationNumber = Number(draft.durationDays);
    const calculatedDueDate = addDaysToYYYYMMDD(
      draft.startDate,
      draft.durationDays
    );

    if (!draft.startDate) {
      setProcessesError("Selecciona la fecha de inicio de la etapa.");
      return;
    }

    if (!Number.isFinite(durationNumber) || durationNumber < 0) {
      setProcessesError("Escribe la duración de la etapa en días.");
      return;
    }

    if (!calculatedDueDate) {
      setProcessesError("No se pudo calcular la fecha final de la etapa.");
      return;
    }

    try {
      setProcessActionLoading(true);
      setProcessesError("");

      await apiFetch("/api/processes/step", {
        method: "POST",
        body: JSON.stringify({
          processId: process.id,
          name: stepName,
          owner: process.owner || "",
          priority: process.priority || "Media",
          startDate: draft.startDate || null,
          dueDate: calculatedDueDate || null,
          notes: draft.notes || "",
          status: "Pendiente",
        }),
      });

      setNewStepByProcess((prev) => ({
        ...prev,
        [process.id]: getEmptyStepDraft(),
      }));

      setOpenStepFormByProcess((prev) => ({
        ...prev,
        [process.id]: true,
      }));

      await loadZoneProcesses(componentsModalZoneId);
    } catch (err) {
      setProcessesError(err?.message || "No se pudo crear la etapa.");
    } finally {
      setProcessActionLoading(false);
    }
  };

  const toggleStepCompletion = async (step) => {
    if (!step?.id || !componentsModalZoneId) return;

    const isCompleted = step.status === "Completada";

    try {
      setProcessActionLoading(true);
      setProcessesError("");

      await apiFetch(`/api/processes/step/${step.id}`, {
        method: "PUT",
        body: JSON.stringify(
          isCompleted
            ? {
                status: "Pendiente",
                completedAt: null,
              }
            : {
                status: "Completada",
                completedAt: nowIso(),
              }
        ),
      });

      await loadZoneProcesses(componentsModalZoneId);
    } catch (err) {
      setProcessesError(
        err?.message ||
          (isCompleted
            ? "No se pudo reabrir la etapa."
            : "No se pudo completar la etapa.")
      );
    } finally {
      setProcessActionLoading(false);
    }
  };

  const updateProcessStatus = async (process, status) => {
    if (!process?.id || !componentsModalZoneId) return;

    const currentStatus = process.status === "Completado" ? "Completado" : "Activo";
    const nextStatus =
      status || (currentStatus === "Completado" ? "Activo" : "Completado");

    try {
      setProcessActionLoading(true);
      setProcessesError("");

      const payload =
        nextStatus === "Completado"
          ? {
              status: "Completado",
              completedAt: nowIso(),
            }
          : {
              status: "Activo",
              completedAt: null,
            };

      await apiFetch(`/api/processes/${process.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setZoneProcessesMap((prev) => {
        const currentList = Array.isArray(prev[componentsModalZoneId])
          ? prev[componentsModalZoneId]
          : [];

        return {
          ...prev,
          [componentsModalZoneId]: currentList.map((item) =>
            item.id === process.id
              ? {
                  ...item,
                  status: nextStatus,
                  completedAt:
                    nextStatus === "Completado" ? payload.completedAt : null,
                }
              : item
          ),
        };
      });

      await loadZoneProcesses(componentsModalZoneId);
    } catch (err) {
      setProcessesError(
        err?.message ||
          (nextStatus === "Completado"
            ? "No se pudo completar el proceso."
            : "No se pudo reabrir el proceso.")
      );
    } finally {
      setProcessActionLoading(false);
    }
  };

  const deleteProcess = async (process) => {
    if (!process?.id || !componentsModalZoneId) return;

    const ok = window.confirm(
      `¿Borrar el proceso "${process.name}"?\n\nTambién se eliminarán sus etapas.`
    );
    if (!ok) return;

    try {
      setProcessActionLoading(true);
      setProcessesError("");

      await apiFetch(`/api/processes/${process.id}`, {
        method: "DELETE",
      });

      await loadZoneProcesses(componentsModalZoneId);
    } catch (err) {
      setProcessesError(err?.message || "No se pudo borrar el proceso.");
    } finally {
      setProcessActionLoading(false);
    }
  };

  const openComponentsModal = async (zoneId, view = "components") => {
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
    setComponentsModalView(view === "processes" ? "processes" : "components");
    setComponentsDraft(cloned);
    setEditingNotesMap({});
    setComponentsModalOpen(true);
    setProcessesError("");
    setShowCreateProcessForm(false);
    setNewProcessName("");
    setNewProcessDescription("");
    setNewProcessOwner("");
    setNewProcessPriority("Media");
    setNewProcessStartDate("");
    setNewProcessTargetDate("");
    setNewStepByProcess({});
    setOpenStepFormByProcess({});

    setTimeout(() => forceMapResize(), 0);

    try {
      await saveMapNow(latestFeaturesListRef.current || []);
    } catch (err) {
      console.warn("No se pudo sincronizar la zona antes de cargar procesos:", err);
    }

    await loadZoneProcesses(zoneId);
  };

  const closeComponentsModal = () => {
    setComponentsModalOpen(false);
    setProcessesError("");
    setComponentsModalView("components");
    setShowCreateProcessForm(false);
    setNewProcessName("");
    setNewProcessDescription("");
    setNewProcessOwner("");
    setNewProcessPriority("Media");
    setNewProcessStartDate("");
    setNewProcessTargetDate("");
    setNewStepByProcess({});
    setOpenStepFormByProcess({});
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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (componentsModalOpen) closeComponentsModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [componentsModalOpen]);

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
          id: item.id,
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
          id: item.id,
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
          id: item.id,
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
    const applyTimer = debugTimeStart("applyBackendMapToUI / reconstruir features");
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

    const addFeature = ({
      serverId,
      kind,
      name,
      geometry,
      meta,
      components,
      createdAt,
      updatedAt,
    }) => {
      const id =
        serverId ||
        `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
        serverId: p?.id,
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
        serverId: l?.id,
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
        serverId: z?.id,
        kind: "polygon",
        name: z?.name,
        geometry: new Polygon(
          d.coordinates.map((ring) => ring.map((c) => fromLonLat(c)))
        ),
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

    setTimeout(() => emitFarmLocationChange("backend-load"), 0);
    debugTimeEnd(applyTimer);
  };

  const scheduleAutosave = (list, options = {}) => {
    const force = options?.force === true;

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

          persistFarmLocation({
            lat,
            lon,
            zoom,
            farmId: contextFarmId || null,
            source: "schedule-autosave",
          });
        }
      }
    } catch {
      // no-op
    }

    if (!force && !loadedOnceRef.current) return;
    if (!force && dirtyRef.current !== true) return;

    if (!contextFarmId) return;
    const token = getAuthToken();
    if (!token) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const payload = buildBackendPayloadFromList(list, options);
        if (!payload) return;

        await apiFetch(`/api/farms/${contextFarmId}/map`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setBackendOnline(true);
        dirtyRef.current = false;
        emitFarmLocationChange("autosave");
      } catch (err) {
        console.warn("Autosave backend falló:", err?.message || err);
        setBackendOnline(false);
      }
    }, 900);
  };

  const saveMapNow = async (list = latestFeaturesListRef.current || [], options = {}) => {
    if (!contextFarmId) return false;

    const token = getAuthToken();
    if (!token) return false;

    const payload = buildBackendPayloadFromList(list, options);
    if (!payload) return false;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    await apiFetch(`/api/farms/${contextFarmId}/map`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    setBackendOnline(true);
    dirtyRef.current = false;
    emitFarmLocationChange("manual-sync");
    return true;
  };

  const getCurrentMapView = () => {
    const map = mapInstanceRef.current;
    if (!map) return null;

    const view = map.getView();
    const center = view.getCenter();
    const zoom = view.getZoom();

    if (!center || typeof zoom !== "number") return null;

    const [lon, lat] = toLonLat(center);
    if (
      typeof lon !== "number" ||
      Number.isNaN(lon) ||
      typeof lat !== "number" ||
      Number.isNaN(lat)
    ) {
      return null;
    }

    return { center: [lon, lat], zoom };
  };

  const getNextFarmName = (currentFarms = []) => {
    const usedNames = new Set(
      (Array.isArray(currentFarms) ? currentFarms : [])
        .map((farm) => String(farm?.name || "").trim().toLowerCase())
        .filter(Boolean)
    );

    let next = (Array.isArray(currentFarms) ? currentFarms.length : 0) + 1;
    let candidate = `Finca #${next}`;

    while (usedNames.has(candidate.toLowerCase())) {
      next += 1;
      candidate = `Finca #${next}`;
    }

    return candidate;
  };

  const loadFarmsList = async () => {
    const farmsRes = await apiFetch("/api/farms", { method: "GET" });
    const nextFarms = Array.isArray(farmsRes?.farms) ? farmsRes.farms : [];
    setFarms(nextFarms);
    return nextFarms;
  };

  const loadFarmMap = async (farmId, options = {}) => {
    if (!farmId) return;

    loadedFarmIdRef.current = farmId;

    const { allowLocalFallback = false, farmsCount = 0 } = options;

    const mapTimer = debugTimeStart(`loadFarmMap GET /api/farms/${farmId}/map`);
    const mapRes = await apiFetch(`/api/farms/${farmId}/map`, { method: "GET" });
    debugTimeEnd(mapTimer);

    const serverHasData =
      (Array.isArray(mapRes?.points) && mapRes.points.length > 0) ||
      (Array.isArray(mapRes?.lines) && mapRes.lines.length > 0) ||
      (Array.isArray(mapRes?.zones) && mapRes.zones.length > 0);

    const localHasData = safeReadLocalDrawings().length > 0;

    if (!serverHasData && localHasData && allowLocalFallback && farmsCount <= 1) {
      setBackendOnline(true);
      loadedOnceRef.current = true;

      setTimeout(() => {
        try {
          const latest = latestFeaturesListRef.current || [];
          if (latest.length > 0) {
            scheduleAutosave(latest, { force: true });
          } else {
            emitFarmLocationChange("local-view");
          }
        } catch {
          // no-op
        }
      }, 250);

      return;
    }

    applyBackendMapToUI(mapRes);
    setBackendOnline(true);
    setTimeout(() => emitFarmLocationChange("farm-load"), 0);
  };

  const ensureFarmAndLoad = async () => {
    const totalTimer = debugTimeStart("ensureFarmAndLoad total");

    try {
      const token = getAuthToken();
      if (!token) {
        setBackendOnline(false);
        return;
      }

      setFarmsLoading(true);
      setFarmError("");

      const farmsTimer = debugTimeStart("ensureFarmAndLoad GET /api/farms");
      let nextFarms = await loadFarmsList();
      debugTimeEnd(farmsTimer);

      const savedActive = contextFarmId;
      const picked =
        (savedActive && nextFarms.find((f) => f.id === savedActive)) || nextFarms[0];

      let farmId = picked?.id || null;

      if (!farmId) {
        const createFarmTimer = debugTimeStart("ensureFarmAndLoad POST /api/farms");
        const created = await apiFetch("/api/farms", {
          method: "POST",
          body: JSON.stringify({ name: "Finca #1", view: getCurrentMapView() }),
        });
        debugTimeEnd(createFarmTimer);
        farmId = created?.farm?.id || null;
        nextFarms = created?.farm ? [created.farm] : [];
        setFarms(nextFarms);
      }

      if (!farmId) {
        setBackendOnline(false);
        setFarmError("No se pudo preparar la finca activa.");
        return;
      }

      const farmForContext =
        nextFarms.find((farm) => farm.id === farmId) ||
        picked ||
        (nextFarms.length > 0 ? nextFarms[0] : null);

      setActiveFarm(farmForContext || { id: farmId, name: "Finca activa" });

      await loadFarmMap(farmId, {
        allowLocalFallback: true,
        farmsCount: nextFarms.length,
      });
    } catch (err) {
      console.warn("Backend load falló:", err?.message || err);
      setBackendOnline(false);
      setFarmError(err?.message || "No se pudieron cargar las fincas.");
    } finally {
      setFarmsLoading(false);
      debugTimeEnd(totalTimer);
    }
  };

  const handleSelectFarm = async (farmId) => {
    if (!farmId || farmId === contextFarmId || farmActionLoading) {
      setFarmMenuOpen(false);
      return;
    }

    try {
      setFarmActionLoading(true);
      setFarmError("");

      try {
        await saveMapNow(latestFeaturesListRef.current || []);
      } catch (err) {
        console.warn("No se pudo sincronizar antes de cambiar de finca:", err);
      }

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }

      const selectedFarm = farms.find((farm) => farm.id === farmId) || {
        id: farmId,
        name: "Finca activa",
      };

      setActiveFarm(selectedFarm);
      setFarmMenuOpen(false);
      setFarmViewPinned(false);
      setFarmSavedNotice("");
      setEditingFarmId(null);
      setEditingFarmName("");
      setListFilter({ kind: "all", status: null });
      setZoneProcessesMap({});
      closeComponentsModal();

      await loadFarmMap(farmId, { allowLocalFallback: false, farmsCount: farms.length });
    } catch (err) {
      console.warn("SELECT_FARM_ERROR:", err?.message || err);
      setBackendOnline(false);
      setFarmError(err?.message || "No se pudo cambiar de finca.");
    } finally {
      setFarmActionLoading(false);
    }
  };

  const handleCreateFarmFromCurrentView = async () => {
    if (farmActionLoading) return;

    try {
      setFarmActionLoading(true);
      setFarmError("");

      try {
        await saveMapNow(latestFeaturesListRef.current || []);
      } catch (err) {
        console.warn("No se pudo sincronizar antes de crear finca:", err);
      }

      const currentView = getCurrentMapView();
      const name = getNextFarmName(farms);

      const created = await apiFetch("/api/farms", {
        method: "POST",
        body: JSON.stringify({ name, view: currentView }),
      });

      const newFarm = created?.farm;
      if (!newFarm?.id) {
        throw new Error("El servidor no devolvió la finca creada.");
      }

      const nextFarms = [newFarm, ...farms.filter((farm) => farm.id !== newFarm.id)];
      setFarms(nextFarms);
      setActiveFarm(newFarm);
      setFarmMenuOpen(false);
      setFarmViewPinned(true);
      setFarmSavedNotice(`✓ Vista establecida para ${newFarm.name || name}`);
      setTimeout(() => setFarmSavedNotice(""), 4500);
      setEditingFarmId(newFarm.id);
      setEditingFarmName(newFarm.name || name);
      setListFilter({ kind: "all", status: null });
      setZoneProcessesMap({});
      closeComponentsModal();

      await loadFarmMap(newFarm.id, {
        allowLocalFallback: false,
        farmsCount: nextFarms.length,
      });
    } catch (err) {
      console.warn("CREATE_FARM_ERROR:", err?.message || err);
      setBackendOnline(false);
      setFarmError(err?.message || "No se pudo crear la nueva finca.");
    } finally {
      setFarmActionLoading(false);
    }
  };


  const startRenameFarm = (event, farm) => {
    event.stopPropagation();
    if (!farm?.id || farmActionLoading) return;
    setFarmError("");
    setFarmSavedNotice("");
    setEditingFarmId(farm.id);
    setEditingFarmName(farm.name || "");
  };

  const cancelRenameFarm = (event) => {
    event.stopPropagation();
    setEditingFarmId(null);
    setEditingFarmName("");
  };

  const saveFarmName = async (event, farm) => {
    event.stopPropagation();
    if (!farm?.id || farmActionLoading) return;

    const nextName = editingFarmName.trim();
    if (!nextName) {
      setFarmError("Escribe un nombre para la finca.");
      return;
    }

    if (nextName === farm.name) {
      setEditingFarmId(null);
      setEditingFarmName("");
      return;
    }

    try {
      setFarmActionLoading(true);
      setFarmError("");
      setFarmSavedNotice("");

      const updated = await apiFetch(`/api/farms/${farm.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: nextName }),
      });

      const updatedFarm = updated?.farm || { ...farm, name: nextName, updatedAt: nowIso() };

      setFarms((prev) =>
        prev.map((item) => (item.id === farm.id ? { ...item, ...updatedFarm } : item))
      );

      if (farm.id === contextFarmId) {
        setActiveFarm({ ...farm, ...updatedFarm });
      }

      setEditingFarmId(null);
      setEditingFarmName("");
      setFarmSavedNotice(`✓ Nombre actualizado: ${updatedFarm.name || nextName}`);
      setTimeout(() => setFarmSavedNotice(""), 3500);
    } catch (err) {
      console.warn("RENAME_FARM_ERROR:", err?.message || err);
      setBackendOnline(false);
      setFarmError(err?.message || "No se pudo renombrar la finca.");
    } finally {
      setFarmActionLoading(false);
    }
  };


  const geocodeSearch = async (q, signal) => {
    const handleLabLauncherMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--lab-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--lab-y", `${e.clientY - rect.top}px`);
  };

  const handleLabLauncherEnter = (e, variant = "components") => {
    const isProcess = variant === "processes";
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.borderColor = isProcess
      ? "rgba(56,189,248,0.48)"
      : "rgba(34,197,94,0.48)";
    e.currentTarget.style.boxShadow = isProcess
      ? "0 0 0 1px rgba(56,189,248,0.18), 0 16px 34px rgba(56,189,248,0.12)"
      : "0 0 0 1px rgba(34,197,94,0.18), 0 16px 34px rgba(34,197,94,0.12)";

    const arrow = e.currentTarget.querySelector("[data-lab-arrow]");
    const icon = e.currentTarget.querySelector("[data-lab-icon]");

    if (arrow) arrow.style.transform = "translateX(3px)";
    if (icon) icon.style.transform = "scale(1.08)";
  };

  const handleLabLauncherLeave = (e, variant = "components") => {
    const isProcess = variant === "processes";
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.borderColor = isProcess
      ? "rgba(56,189,248,0.22)"
      : "rgba(34,197,94,0.22)";
    e.currentTarget.style.boxShadow = "0 10px 26px rgba(0,0,0,0.16)";

    const arrow = e.currentTarget.querySelector("[data-lab-arrow]");
    const icon = e.currentTarget.querySelector("[data-lab-icon]");

    if (arrow) arrow.style.transform = "translateX(0)";
    if (icon) icon.style.transform = "scale(1)";
  };

  const getLabLauncherStyle = (variant = "components") => {
    const isProcess = variant === "processes";

    return {
      width: "142px",
      minWidth: "142px",
      height: "46px",
      padding: "0.45rem 0.55rem",
      borderRadius: "14px",
      border: isProcess
        ? "1px solid rgba(56,189,248,0.22)"
        : "1px solid rgba(34,197,94,0.22)",
      background: isProcess
        ? "radial-gradient(220px circle at var(--lab-x, 50%) var(--lab-y, 50%), rgba(56,189,248,0.18), transparent 42%), linear-gradient(135deg, rgba(15,23,42,0.92), rgba(14,116,144,0.13))"
        : "radial-gradient(220px circle at var(--lab-x, 50%) var(--lab-y, 50%), rgba(34,197,94,0.20), transparent 42%), linear-gradient(135deg, rgba(15,23,42,0.92), rgba(6,78,59,0.18))",
      color: "#e5e7eb",
      boxShadow: "0 10px 26px rgba(0,0,0,0.16)",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.45rem",
      overflow: "hidden",
      position: "relative",
      transition:
        "transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease",
      outline: "none",
    };
  };

  const getLabIconStyle = (variant = "components") => {
    const isProcess = variant === "processes";

    return {
      width: "26px",
      height: "26px",
      borderRadius: "999px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border: isProcess
        ? "1px solid rgba(56,189,248,0.24)"
        : "1px solid rgba(34,197,94,0.26)",
      background: isProcess ? "rgba(56,189,248,0.10)" : "rgba(34,197,94,0.12)",
      color: isProcess ? "#bae6fd" : "#bbf7d0",
      fontSize: "0.9rem",
      flex: "0 0 auto",
      transition: "transform 160ms ease",
    };
  };


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

    setTimeout(() => emitFarmLocationChange("search"), 0);
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
  }, []);

  useEffect(() => {
    if (!apiKey || apiKey === "TU_API_KEY_AQUI") return;

    if (mapRef.current && !mapInstanceRef.current) {
      const mapInitTimer = debugTimeStart("OpenLayers init total");
      let centerLonLat = [-84.433, 10.34];
      let zoom = 15;

      try {
        const savedView = localStorage.getItem(VIEW_KEY);
        if (savedView) {
          const parsed = JSON.parse(savedView);
          if (
            parsed &&
            typeof parsed.lon === "number" &&
            typeof parsed.lat === "number"
          ) {
            centerLonLat = [parsed.lon, parsed.lat];
          }
          if (parsed && typeof parsed.zoom === "number") zoom = parsed.zoom;
        }
      } catch {
        // no-op
      }

      const layersTimer = debugTimeStart("OpenLayers crear layers");

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

          const textStyle =
            selected && feature.get("name")
              ? new Text({
                  text: String(feature.get("name")),
                  offsetY: -18,
                  font: "700 12px system-ui, sans-serif",
                  fill: new Fill({ color: "#f9fafb" }),
                  stroke: new Stroke({ color: "rgba(2,6,23,0.95)", width: 4 }),
                  padding: [4, 8, 4, 8],
                })
              : undefined;

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
              text: textStyle,
            });
          }

          if (kind === "line") {
            return new Style({
              stroke: new Stroke({
                color,
                width: active ? 5 : 3,
              }),
              text: textStyle,
            });
          }

          if (kind === "polygon") {
            return new Style({
              fill: new Fill({ color }),
              stroke: new Stroke({
                color: active ? "#f9fafb" : "#e5e7eb",
                width: active ? 3 : 1.5,
              }),
              text: textStyle,
            });
          }

          return new Style({
            stroke: new Stroke({
              color,
              width: active ? 4 : 2,
            }),
            text: textStyle,
          });
        },
      });

      vectorLayerRef.current = vectorLayer;

      debugTimeEnd(layersTimer);

      const mapConstructorTimer = debugTimeStart("OpenLayers Map constructor");

      const map = new Map({
        target: mapRef.current,
        layers: [baseLayer, vectorLayer],
        view: new View({
          center: fromLonLat(centerLonLat),
          zoom,
        }),
      });

      mapInstanceRef.current = map;
      debugTimeEnd(mapConstructorTimer);
      forceMapResize();

      const localDrawingsTimer = debugTimeStart("Cargar dibujos desde localStorage");

      try {
        const savedDrawings = localStorage.getItem(DRAWINGS_KEY);
        if (savedDrawings) {
          const parsed = JSON.parse(savedDrawings);
          if (Array.isArray(parsed)) {
            const newList = [];
            const counters = { point: 0, line: 0, polygon: 0 };

            parsed.forEach((item) => {
              const {
                id,
                kind,
                color,
                name,
                note,
                zoneType,
                status,
                components,
                geomType,
                coordinates,
                createdAt,
                updatedAt,
              } = item;
              if (!id || !kind || !geomType || !coordinates) return;

              let geometry = null;

              if (geomType === "Point") geometry = new Point(fromLonLat(coordinates));
              else if (geomType === "LineString")
                geometry = new LineString(coordinates.map((c) => fromLonLat(c)));
              else if (geomType === "Polygon")
                geometry = new Polygon(
                  coordinates.map((ring) => ring.map((c) => fromLonLat(c)))
                );

              if (!geometry) return;

              const feature = new Feature(geometry);
              const safeKind =
                kind === "point" || kind === "line" || kind === "polygon"
                  ? kind
                  : "point";

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
              const finalZoneType =
                safeKind === "polygon" ? zoneType || "Zona libre" : null;
              const finalStatus =
                safeKind === "polygon" ? status || "Disponible" : null;

              const finalComponents =
                safeKind === "polygon" && Array.isArray(components)
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
      } finally {
        debugTimeEnd(localDrawingsTimer);
      }

      const eventsTimer = debugTimeStart("Registrar eventos OpenLayers");

      const handlePointerMove = (evt) => {
        const mapInstance = mapInstanceRef.current;
        if (!mapInstance) return;

        const pixel = mapInstance.getEventPixel(evt.originalEvent);
        let foundId = null;

        mapInstance.forEachFeatureAtPixel(pixel, (featureAtPixel) => {
          const fid = featureAtPixel.get("id");
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

        mapInstance.forEachFeatureAtPixel(pixel, (featureAtPixel) => {
          const fid = featureAtPixel.get("id");
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
          if (vectorSourceLocal) {
            vectorSourceLocal.getFeatures().forEach((f) => f.set("selected", false));
          }
          setSelectedId(null);
        }
      };

      const handleMoveEnd = () => {
        emitFarmLocationChange("moveend");
      };

      map.on("pointermove", handlePointerMove);
      map.on("singleclick", handleSingleClick);
      map.on("moveend", handleMoveEnd);

      debugTimeEnd(eventsTimer);

      setMapReady(true);
      setTimeout(() => emitFarmLocationChange("init"), 0);
      debugTimeEnd(mapInitTimer);

      return () => {
        map.un("pointermove", handlePointerMove);
        map.un("singleclick", handleSingleClick);
        map.un("moveend", handleMoveEnd);

        if (mapInstanceRef.current) {
          if (drawInteractionRef.current)
            mapInstanceRef.current.removeInteraction(drawInteractionRef.current);
          mapInstanceRef.current.setTarget(null);
          mapInstanceRef.current = null;
        }
      };
    }
  }, [apiKey]);

  useEffect(() => {
    if (!mapReady) return;
    ensureFarmAndLoad();
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady || !contextFarmId) return;

    if (loadedFarmIdRef.current === contextFarmId) {
      emitFarmLocationChange("farm-id-change");
      return;
    }

    const syncMapWithActiveFarm = async () => {
      try {
        setFarmError("");
        setListFilter({ kind: "all", status: null });
        setZoneProcessesMap({});
        closeComponentsModal();

        await loadFarmMap(contextFarmId, {
          allowLocalFallback: false,
          farmsCount: farms.length,
        });
      } catch (err) {
        console.warn("CONTEXT_FARM_SYNC_ERROR:", err?.message || err);
        setBackendOnline(false);
        setFarmError(err?.message || "No se pudo sincronizar el mapa con la finca activa.");
      }
    };

    syncMapWithActiveFarm();
  }, [contextFarmId, mapReady]);

  useEffect(() => {
    const featuresMap = featuresMapRef.current;
    Object.entries(featuresMap).forEach(([id, feature]) => {
      feature.set("hovered", id === hoveredId);
    });
  }, [hoveredId]);

  useEffect(() => {
    const layer = vectorLayerRef.current;
    if (layer) layer.changed();
  }, [selectedId, hoveredId, featuresList]);

  useEffect(() => {
    if (!selectedId) return;
    const row = rowRefs.current[selectedId];
    if (row && typeof row.scrollIntoView === "function") {
      setTimeout(() => {
        row.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 80);
    }
  }, [selectedId, filteredList]);

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
      const updated = [
        ...prev,
        {
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
        },
      ];
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

    const type =
      drawMode === "point"
        ? "Point"
        : drawMode === "line"
        ? "LineString"
        : "Polygon";

    const draw = new Draw({ source: vectorSource, type });

    draw.on("drawend", (evt) => {
      const f = evt.feature;
      handleDrawEnd(f, drawMode);
    });

    map.addInteraction(draw);
    drawInteractionRef.current = draw;

    forceMapResize();
  }, [drawMode]);

  const handleSelectFeature = (id) => {
    const map = mapInstanceRef.current;
    const vectorSource = vectorSourceRef.current;
    const feature = featuresMapRef.current[id];
    if (!map || !vectorSource || !feature) return;

    const visibleInFiltered = filteredList.some((item) => item.id === id);
    if (!visibleInFiltered) {
      setListFilter({ kind: "all", status: null });
    }

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
      const updated = prev.map((item) =>
        item.id === id ? { ...item, name: value, updatedAt: t } : item
      );
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
      const updated = prev.map((item) =>
        item.id === id ? { ...item, zoneType: value, updatedAt: t } : item
      );
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
      const updated = prev.map((item) =>
        item.id === id ? { ...item, status: value, updatedAt: t } : item
      );
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

  const handleSaveViewClick = async () => {
    const currentView = getCurrentMapView();
    if (!currentView || !contextFarmId || farmActionLoading) return;

    try {
      setFarmActionLoading(true);
      setFarmError("");
      setFarmSavedNotice("");
      markDirty();

      await saveMapNow(latestFeaturesListRef.current || [], {
        view: currentView,
      });

      const updatedActiveFarm = activeFarm
        ? {
            ...activeFarm,
            view: currentView,
            preferredCenter: currentView.center,
            updatedAt: nowIso(),
          }
        : null;

      setFarms((prev) =>
        prev.map((farm) =>
          farm.id === contextFarmId
            ? {
                ...farm,
                view: currentView,
                preferredCenter: currentView.center,
                updatedAt: nowIso(),
              }
            : farm
        )
      );

      if (updatedActiveFarm) {
        setActiveFarm(updatedActiveFarm);
      }

      setFarmViewPinned(true);
      setFarmSavedNotice(`✓ Vista establecida para ${activeFarmName}`);
      setTimeout(() => setFarmSavedNotice(""), 4500);
      emitFarmLocationChange("save-view");
    } catch (err) {
      console.warn("SAVE_FARM_VIEW_ERROR:", err?.message || err);
      setBackendOnline(false);
      setFarmError(err?.message || "No se pudo actualizar la vista de la finca.");
    } finally {
      setFarmActionLoading(false);
    }
  };

  const pointCount = featuresList.filter((f) => f.kind === "point").length;
  const lineCount = featuresList.filter((f) => f.kind === "line").length;
  const zoneCount = zonesOnly.length;

  const statusCounts = {
    Operativa: 0,
    "Prioridad alta": 0,
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

    const target = zonesOnly.find(
      (z) => (z.name || "").trim().toLowerCase() === normalized
    );

    if (target) {
      handleSelectFeature(target.id);
      setTimeout(() => forceMapResize(), 0);
    }
  }, [focusZoneRequest, zonesOnly]);

  useEffect(() => {
    const onDocClick = (e) => {
      const el = e.target;
      if (!el) return;
      if (el.closest && el.closest(".agromind-search-wrap")) return;
      if (el.closest && el.closest(".agromind-farm-switcher")) return;
      setShowResults(false);
      setFarmMenuOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const handleLabLauncherMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--lab-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--lab-y", `${e.clientY - rect.top}px`);
  };

  const handleLabLauncherEnter = (e, variant = "components") => {
    const isProcess = variant === "processes";
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.borderColor = isProcess
      ? "rgba(56,189,248,0.48)"
      : "rgba(34,197,94,0.48)";
    e.currentTarget.style.boxShadow = isProcess
      ? "0 0 0 1px rgba(56,189,248,0.18), 0 16px 34px rgba(56,189,248,0.12)"
      : "0 0 0 1px rgba(34,197,94,0.18), 0 16px 34px rgba(34,197,94,0.12)";

    const arrow = e.currentTarget.querySelector("[data-lab-arrow]");
    const icon = e.currentTarget.querySelector("[data-lab-icon]");

    if (arrow) arrow.style.transform = "translateX(3px)";
    if (icon) icon.style.transform = "scale(1.08)";
  };

  const handleLabLauncherLeave = (e, variant = "components") => {
    const isProcess = variant === "processes";
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.borderColor = isProcess
      ? "rgba(56,189,248,0.22)"
      : "rgba(34,197,94,0.22)";
    e.currentTarget.style.boxShadow = "0 10px 26px rgba(0,0,0,0.16)";

    const arrow = e.currentTarget.querySelector("[data-lab-arrow]");
    const icon = e.currentTarget.querySelector("[data-lab-icon]");

    if (arrow) arrow.style.transform = "translateX(0)";
    if (icon) icon.style.transform = "scale(1)";
  };

  const getLabLauncherStyle = (variant = "components") => {
    const isProcess = variant === "processes";

    return {
      width: "142px",
      minWidth: "142px",
      height: "46px",
      padding: "0.45rem 0.55rem",
      borderRadius: "14px",
      border: isProcess
        ? "1px solid rgba(56,189,248,0.22)"
        : "1px solid rgba(34,197,94,0.22)",
      background: isProcess
        ? "radial-gradient(220px circle at var(--lab-x, 50%) var(--lab-y, 50%), rgba(56,189,248,0.18), transparent 42%), linear-gradient(135deg, rgba(15,23,42,0.92), rgba(14,116,144,0.13))"
        : "radial-gradient(220px circle at var(--lab-x, 50%) var(--lab-y, 50%), rgba(34,197,94,0.20), transparent 42%), linear-gradient(135deg, rgba(15,23,42,0.92), rgba(6,78,59,0.18))",
      color: "#e5e7eb",
      boxShadow: "0 10px 26px rgba(0,0,0,0.16)",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.45rem",
      overflow: "hidden",
      position: "relative",
      transition:
        "transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease",
      outline: "none",
    };
  };

  const getLabIconStyle = (variant = "components") => {
    const isProcess = variant === "processes";

    return {
      width: "26px",
      height: "26px",
      borderRadius: "999px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border: isProcess
        ? "1px solid rgba(56,189,248,0.24)"
        : "1px solid rgba(34,197,94,0.26)",
      background: isProcess ? "rgba(56,189,248,0.10)" : "rgba(34,197,94,0.12)",
      color: isProcess ? "#bae6fd" : "#bbf7d0",
      fontSize: "0.9rem",
      flex: "0 0 auto",
      transition: "transform 160ms ease",
    };
  };


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
      <div className="farm-map-toolbar" style={{ gap: "0.75rem" }}>
        <div
          className="agromind-search-wrap"
          style={{ position: "relative", flex: 1, maxWidth: 560 }}
        >
          <form
            onSubmit={handleSearchSubmit}
            style={{ display: "flex", gap: "0.5rem" }}
          >
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
            <div
              style={{
                marginTop: "0.35rem",
                color: "#fca5a5",
                fontSize: "0.9rem",
              }}
            >
              {searchError}
            </div>
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
          <button
            type="button"
            className={drawMode === "move" ? "tool-btn active" : "tool-btn"}
            onClick={() => setDrawMode("move")}
          >
            Mover
          </button>
          <button
            type="button"
            className={drawMode === "point" ? "tool-btn active" : "tool-btn"}
            onClick={() => setDrawMode("point")}
          >
            Punto
          </button>
          <button
            type="button"
            className={drawMode === "line" ? "tool-btn active" : "tool-btn"}
            onClick={() => setDrawMode("line")}
          >
            Línea
          </button>
          <button
            type="button"
            className={drawMode === "polygon" ? "tool-btn active" : "tool-btn"}
            onClick={() => setDrawMode("polygon")}
          >
            Zona
          </button>
        </div>

        <div
          className="agromind-farm-switcher"
          style={{ position: "relative", minWidth: 220 }}
        >
          <button
            type="button"
            className="primary-btn"
            onClick={() => setFarmMenuOpen((prev) => !prev)}
            disabled={farmsLoading || farmActionLoading}
            style={{
              width: "100%",
              justifyContent: "space-between",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              whiteSpace: "nowrap",
            }}
            title="Cambiar o crear finca"
          >
            <span>🌱 {farmsLoading ? "Cargando fincas..." : activeFarmName}</span>
            <span style={{ opacity: 0.75 }}>{farmMenuOpen ? "▲" : "▼"}</span>
          </button>

          {farmMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "min(320px, 90vw)",
                zIndex: 60,
                background: "rgba(2,6,23,0.97)",
                border: "1px solid rgba(148,163,184,0.25)",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 18px 44px rgba(0,0,0,0.42)",
              }}
            >
              <div
                style={{
                  padding: "0.75rem 0.85rem",
                  borderBottom: "1px solid rgba(148,163,184,0.16)",
                }}
              >
                <div style={{ color: "#e5e7eb", fontWeight: 800, fontSize: "0.9rem" }}>
                  Mis fincas
                </div>
                <div
                  style={{
                    marginTop: "0.2rem",
                    color: "rgba(226,232,240,0.62)",
                    fontSize: "0.75rem",
                  }}
                >
                  Cada finca carga su propio mapa, zonas y procesos.
                </div>
              </div>

              <div style={{ maxHeight: 260, overflow: "auto" }}>
                {farms.length === 0 ? (
                  <div
                    style={{
                      padding: "0.8rem 0.85rem",
                      color: "rgba(226,232,240,0.7)",
                      fontSize: "0.86rem",
                    }}
                  >
                    Aún no hay fincas guardadas.
                  </div>
                ) : (
                  farms.map((farm, index) => {
                    const isActiveFarm = farm.id === contextFarmId;
                    const isEditing = editingFarmId === farm.id;
                    const displayName = farm.name || `Finca #${index + 1}`;

                    return (
                      <div
                        key={farm.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (!isEditing) handleSelectFarm(farm.id);
                        }}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && !isEditing) {
                            e.preventDefault();
                            handleSelectFarm(farm.id);
                          }
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                          padding: "0.72rem 0.85rem",
                          background: isActiveFarm
                            ? "rgba(34,197,94,0.14)"
                            : "transparent",
                          color: "#e5e7eb",
                          borderBottom: "1px solid rgba(148,163,184,0.10)",
                          cursor: farmActionLoading || isEditing ? "default" : "pointer",
                          textAlign: "left",
                        }}
                        title={`Abrir ${displayName}`}
                      >
                        <span style={{ minWidth: 0, flex: 1 }}>
                          {isEditing ? (
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                value={editingFarmName}
                                onChange={(e) => setEditingFarmName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveFarmName(e, farm);
                                  if (e.key === "Escape") cancelRenameFarm(e);
                                }}
                                autoFocus
                                style={{
                                  width: "100%",
                                  minWidth: 0,
                                  padding: "0.45rem 0.55rem",
                                  borderRadius: "10px",
                                  border: "1px solid rgba(34,197,94,0.38)",
                                  background: "rgba(2,6,23,0.72)",
                                  color: "#e5e7eb",
                                  outline: "none",
                                  fontWeight: 700,
                                }}
                                placeholder="Nombre de la finca"
                              />
                              <button
                                type="button"
                                className="secondary-btn"
                                onClick={(e) => saveFarmName(e, farm)}
                                disabled={farmActionLoading}
                                style={{ padding: "0.35rem 0.5rem" }}
                                title="Guardar nombre"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                className="danger-link"
                                onClick={cancelRenameFarm}
                                disabled={farmActionLoading}
                                style={{ padding: "0.35rem 0.25rem" }}
                                title="Cancelar"
                              >
                                ✕
                              </button>
                            </span>
                          ) : (
                            <>
                              <span
                                style={{
                                  display: "block",
                                  fontWeight: isActiveFarm ? 800 : 650,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {displayName}
                              </span>
                              <span
                                style={{
                                  display: "block",
                                  marginTop: "0.12rem",
                                  color: "rgba(226,232,240,0.52)",
                                  fontSize: "0.72rem",
                                }}
                              >
                                {isActiveFarm
                                  ? farmViewPinned
                                    ? "Finca activa · vista establecida"
                                    : "Finca activa"
                                  : "Clic para abrir"}
                              </span>
                            </>
                          )}
                        </span>

                        {!isEditing && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.45rem",
                              color: isActiveFarm ? "#86efac" : "#94a3b8",
                            }}
                          >
                            {isActiveFarm && farmViewPinned ? (
                              <span title="Vista establecida">✅</span>
                            ) : null}
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={(e) => startRenameFarm(e, farm)}
                              disabled={farmActionLoading}
                              style={{ padding: "0.28rem 0.45rem" }}
                              title="Renombrar finca"
                            >
                              ✏️
                            </button>
                            <span>{isActiveFarm ? "✓" : "›"}</span>
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div
                style={{
                  padding: "0.75rem 0.85rem",
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  borderTop: "1px solid rgba(148,163,184,0.16)",
                }}
              >
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleCreateFarmFromCurrentView}
                  disabled={farmActionLoading || farmsLoading}
                  style={{ flex: "1 1 150px", justifyContent: "center" }}
                  title="Crear una finca nueva desde la vista actual del mapa"
                >
                  {farmActionLoading ? "Procesando..." : "➕ Nueva finca"}
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleSaveViewClick}
                  disabled={farmActionLoading || !contextFarmId}
                  style={{ flex: "1 1 130px", justifyContent: "center" }}
                  title="Actualizar la ubicación base de la finca activa"
                >
                  {farmViewPinned ? "✅ Vista establecida" : "📌 Establecer vista"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {farmSavedNotice ? (
        <div
          style={{
            margin: "0.75rem 0",
            padding: "0.7rem 0.9rem",
            borderRadius: "12px",
            border: "1px solid rgba(34,197,94,0.26)",
            background: "rgba(34,197,94,0.10)",
            color: "#bbf7d0",
            fontSize: "0.9rem",
            fontWeight: 700,
          }}
        >
          {farmSavedNotice}
        </div>
      ) : null}

      {farmError ? (
        <div
          style={{
            margin: "0.75rem 0",
            padding: "0.7rem 0.9rem",
            borderRadius: "12px",
            border: "1px solid rgba(248,113,113,0.24)",
            background: "rgba(248,113,113,0.10)",
            color: "#fecaca",
            fontSize: "0.88rem",
          }}
        >
          {farmError}
        </div>
      ) : null}

      <div className="farm-map-layout">
        <div ref={mapRef} className="farm-map" />
      </div>

      <div className="farm-map-summary">
        <button
          type="button"
          className={`summary-chip summary-btn${
            isActiveFilter("point") ? " active" : ""
          }`}
          aria-pressed={isActiveFilter("point")}
          onClick={() => handleSummaryFilter("point")}
        >
          <span className="summary-dot dot-point" />
          <span className="summary-label">
            {pointCount} {pointCount === 1 ? "punto" : "puntos"}
          </span>
        </button>

        <button
          type="button"
          className={`summary-chip summary-btn${
            isActiveFilter("line") ? " active" : ""
          }`}
          aria-pressed={isActiveFilter("line")}
          onClick={() => handleSummaryFilter("line")}
        >
          <span className="summary-dot dot-line" />
          <span className="summary-label">
            {lineCount} {lineCount === 1 ? "línea" : "líneas"}
          </span>
        </button>

        <button
          type="button"
          className={`summary-chip summary-btn${
            isActiveFilter("polygon") ? " active" : ""
          }`}
          aria-pressed={isActiveFilter("polygon")}
          onClick={() => handleSummaryFilter("polygon")}
        >
          <span className="summary-dot dot-zone" />
          <span className="summary-label">
            {zoneCount} {zoneCount === 1 ? "zona" : "zonas"}
          </span>
        </button>

        <button
          type="button"
          className={`summary-chip summary-btn summary-chip-status${
            isActiveFilter("polygon", "Operativa") ? " active" : ""
          }`}
          aria-pressed={isActiveFilter("polygon", "Operativa")}
          onClick={() => handleSummaryFilter("operative")}
        >
          <span className="status-pill status-ok" />
          <span className="summary-label">
            {statusCounts["Operativa"]} operativa
            {statusCounts["Operativa"] === 1 ? "" : "s"}
          </span>
        </button>

        <button
          type="button"
          className={`summary-chip summary-btn summary-chip-status${
            isActiveFilter("polygon", "Prioridad alta") ? " active" : ""
          }`}
          aria-pressed={isActiveFilter("polygon", "Prioridad alta")}
          onClick={() => handleSummaryFilter("priority")}
        >
          <span className="status-pill status-warning" />
          <span className="summary-label">
            {statusCounts["Prioridad alta"]} con prioridad
          </span>
        </button>
      </div>

      {filteredList.length > 0 && (
        <div className="farm-zones-table-wrapper">
          <div
            className="farm-zones-header-row"
            style={{
              gridTemplateColumns:
                "minmax(260px, 1fr) minmax(170px, 220px) minmax(360px, auto)",
              alignItems: "center",
            }}
          >
            <span>ZONA / ELEMENTO</span>
            <span>ESTADO</span>
            <span style={{ textAlign: "center" }}>LABS / ACCIONES</span>
          </div>

          {filteredList.map((item) => {
            const isZone = item.kind === "polygon";
            const rowClass =
              "farm-zones-row" +
              (selectedId === item.id ? " selected" : "") +
              (hoveredId === item.id ? " hovered" : "");

            const totalComponents = Array.isArray(item.components)
              ? item.components.length
              : 0;

            return (
              <div
                key={item.id}
                ref={(el) => {
                  if (el) rowRefs.current[item.id] = el;
                }}
                className={rowClass}
                style={{
                  gridTemplateColumns:
                    "minmax(260px, 1fr) minmax(170px, 220px) minmax(360px, auto)",
                  alignItems: "center",
                }}
                onClick={() => handleSelectFeature(item.id)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() =>
                  setHoveredId((prev) => (prev === item.id ? null : prev))
                }
              >
                <div className="zone-col zone-name">
                  <span
                    className="feature-color-pill"
                    style={{ backgroundColor: item.color }}
                  />
                  <input
                    className="zone-name-input"
                    value={item.name}
                    onChange={(e) => handleNameChange(item.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
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
                  style={{
                    justifyContent: "center",
                    gap: "0.5rem",
                    flexWrap: "nowrap",
                    alignItems: "center",
                  }}
                >
                  {isZone ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openComponentsModal(item.id, "components");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            openComponentsModal(item.id, "components");
                          }
                        }}
                        onMouseMove={handleLabLauncherMouseMove}
                        onMouseEnter={(e) => handleLabLauncherEnter(e, "components")}
                        onMouseLeave={(e) => handleLabLauncherLeave(e, "components")}
                        title="Abrir Component Lab"
                        style={getLabLauncherStyle("components")}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.42rem",
                            minWidth: 0,
                          }}
                        >
                          <span data-lab-icon style={getLabIconStyle("components")}>
                            🌿
                          </span>
                          <span
                            style={{
                              minWidth: 0,
                              color: "#f8fafc",
                              fontSize: "0.68rem",
                              fontWeight: 950,
                              letterSpacing: "0.075em",
                              textTransform: "uppercase",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Component
                          </span>
                        </span>

                        <span
                          data-lab-arrow
                          style={{
                            color: "#86efac",
                            fontWeight: 950,
                            transition: "transform 160ms ease",
                            flex: "0 0 auto",
                          }}
                        >
                          →
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openComponentsModal(item.id, "processes");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            openComponentsModal(item.id, "processes");
                          }
                        }}
                        onMouseMove={handleLabLauncherMouseMove}
                        onMouseEnter={(e) => handleLabLauncherEnter(e, "processes")}
                        onMouseLeave={(e) => handleLabLauncherLeave(e, "processes")}
                        title="Abrir Process Lab"
                        style={getLabLauncherStyle("processes")}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.42rem",
                            minWidth: 0,
                          }}
                        >
                          <span data-lab-icon style={getLabIconStyle("processes")}>
                            ⚙️
                          </span>
                          <span
                            style={{
                              minWidth: 0,
                              color: "#f8fafc",
                              fontSize: "0.68rem",
                              fontWeight: 950,
                              letterSpacing: "0.075em",
                              textTransform: "uppercase",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Process
                          </span>
                        </span>

                        <span
                          data-lab-arrow
                          style={{
                            color: "#bae6fd",
                            fontWeight: 950,
                            transition: "transform 160ms ease",
                            flex: "0 0 auto",
                          }}
                        >
                          →
                        </span>
                      </button>
                    </>
                  ) : null}

                  <button
                    type="button"
                    className="danger-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFeature(item.id);
                    }}
                    title={isZone ? "Eliminar zona" : "Borrar elemento"}
                    style={{
                      width: "34px",
                      height: "34px",
                      minWidth: "34px",
                      borderRadius: "999px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                      border: "1px solid rgba(248,113,113,0.22)",
                      background: "rgba(248,113,113,0.06)",
                      color: "#fca5a5",
                      textDecoration: "none",
                      fontSize: "0.9rem",
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {componentsModalOpen && modalZone && componentsModalView === "components" && (
        <ComponentModal
          modalZone={modalZone}
          componentsDraft={componentsDraft}
          COMPONENT_TYPES={COMPONENT_TYPES}
          editingNotesMap={editingNotesMap}
          closeComponentsModal={closeComponentsModal}
          draftAddComponent={draftAddComponent}
          draftDeleteComponent={draftDeleteComponent}
          draftUpdate={draftUpdate}
          toggleEditNote={toggleEditNote}
          saveComponentsModal={saveComponentsModal}
          handleDeleteFeature={handleDeleteFeature}
          getComponentIcon={getComponentIcon}
          getComponentDisplayName={getComponentDisplayName}
        />
      )}

      {componentsModalOpen && modalZone && componentsModalView === "processes" && (
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
          <div
            onClick={closeComponentsModal}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(2px)",
            }}
          />

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "min(1080px, 100%)",
              maxHeight: "min(84vh, 860px)",
              background: "rgba(2,6,23,0.96)",
              border: "1px solid rgba(148,163,184,0.22)",
              borderRadius: "18px",
              boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <h4 style={{ margin: 0, color: "#e5e7eb" }}>Procesos de la zona</h4>
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

            <div style={{ padding: "14px", overflow: "auto" }}>
              <ProcessModal
                componentsModalView={componentsModalView}
                modalZone={modalZone}
                modalZoneProcesses={modalZoneProcesses}
                processesLoading={processesLoading}
                processesError={processesError}
                processActionLoading={processActionLoading}
                showCreateProcessForm={showCreateProcessForm}
                setShowCreateProcessForm={setShowCreateProcessForm}
                newProcessName={newProcessName}
                setNewProcessName={setNewProcessName}
                newProcessDescription={newProcessDescription}
                setNewProcessDescription={setNewProcessDescription}
                newProcessOwner={newProcessOwner}
                setNewProcessOwner={setNewProcessOwner}
                newProcessPriority={newProcessPriority}
                setNewProcessPriority={setNewProcessPriority}
                newProcessStartDate={newProcessStartDate}
                setNewProcessStartDate={setNewProcessStartDate}
                newProcessTargetDate={newProcessTargetDate}
                setNewProcessTargetDate={setNewProcessTargetDate}
                createProcessForZone={createProcessForZone}
                updateProcessStatus={updateProcessStatus}
                deleteProcess={deleteProcess}
                openStepFormByProcess={openStepFormByProcess}
                setOpenStepFormByProcess={setOpenStepFormByProcess}
                newStepByProcess={newStepByProcess}
                updateStepDraftField={updateStepDraftField}
                createStepForProcess={createStepForProcess}
                toggleStepCompletion={toggleStepCompletion}
                PROCESS_PRIORITIES={PROCESS_PRIORITIES}
                getEmptyStepDraft={getEmptyStepDraft}
                getProgressFromSteps={getProgressFromSteps}
                getPriorityPillStyle={getPriorityPillStyle}
                getStatusPillStyle={getStatusPillStyle}
                addDaysToYYYYMMDD={addDaysToYYYYMMDD}
                formatProcessDate={formatProcessDate}
                getDurationDays={getDurationDays}
                nowIso={nowIso}
              />
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderTop: "1px solid rgba(148,163,184,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="secondary-btn"
                onClick={closeComponentsModal}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
