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

import ZoneReportModal from "./ZoneReportModal";

const VIEW_KEY = "agromind_farm_view";
const DRAWINGS_KEY = "agromind_farm_drawings";
const ACTIVE_FARM_KEY = "agromind_active_farm_id";

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
  "Otro",
];

function nowIso() {
  return new Date().toISOString();
}

function toYYYYMMDD(d = new Date()) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
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
    owner: "",
    priority: "Media",
    startDate: "",
    dueDate: "",
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
  const [activeFarmId, setActiveFarmId] = useState(null);
  const [backendOnline, setBackendOnline] = useState(true);

  const autosaveTimerRef = useRef(null);
  const loadedOnceRef = useRef(false);
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
    if (typeof onFarmLocationChange !== "function") return;

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
      farmId: activeFarmId || localStorage.getItem(ACTIVE_FARM_KEY) || null,
      source,
    };

    const signature = JSON.stringify({
      lat: Number(lat.toFixed(8)),
      lon: Number(lon.toFixed(8)),
      zoom: Number(zoom.toFixed(2)),
      farmId: payload.farmId,
      source,
    });

    if (latestLocationSentRef.current === signature) return;
    latestLocationSentRef.current = signature;

    onFarmLocationChange(payload);
  };

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

  const createProcessForZone = async () => {
    if (!componentsModalZoneId || !modalZone) return;

    const safeName = newProcessName.trim();
    const safeDescription = newProcessDescription.trim();

    if (!safeName) {
      setProcessesError("Escribe el nombre del proceso.");
      return;
    }

    try {
      setProcessActionLoading(true);
      setProcessesError("");

      await apiFetch("/api/processes", {
        method: "POST",
        body: JSON.stringify({
          zoneId: componentsModalZoneId,
          name: safeName,
          description: safeDescription,
          owner: newProcessOwner.trim(),
          priority: newProcessPriority,
          startDate: newProcessStartDate || null,
          targetDate: newProcessTargetDate || null,
          type: "General",
          status: "Borrador",
        }),
      });

      setNewProcessName("");
      setNewProcessDescription("");
      setNewProcessOwner("");
      setNewProcessPriority("Media");
      setNewProcessStartDate("");
      setNewProcessTargetDate("");
      setShowCreateProcessForm(false);
      await loadZoneProcesses(componentsModalZoneId);
    } catch (err) {
      setProcessesError(err?.message || "No se pudo crear el proceso.");
    } finally {
      setProcessActionLoading(false);
    }
  };

  const createStepForProcess = async (process) => {
    if (!process?.id || !componentsModalZoneId) return;

    const draft = {
      ...getEmptyStepDraft(),
      ...(newStepByProcess[process.id] || {}),
    };

    const stepName = draft.name.trim();

    if (!stepName) {
      setProcessesError("Escribe el nombre de la etapa.");
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
          owner: draft.owner.trim(),
          priority: draft.priority || "Media",
          startDate: draft.startDate || null,
          dueDate: draft.dueDate || null,
          notes: draft.notes || "",
          status: "Pendiente",
        }),
      });

      setNewStepByProcess((prev) => ({
        ...prev,
        [process.id]: getEmptyStepDraft(),
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

    try {
      setProcessActionLoading(true);
      setProcessesError("");

      await apiFetch(`/api/processes/${process.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status,
          completedAt: status === "Completado" ? nowIso() : null,
        }),
      });

      await loadZoneProcesses(componentsModalZoneId);
    } catch (err) {
      setProcessesError(err?.message || "No se pudo actualizar el proceso.");
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

  const openComponentsModal = async (zoneId) => {
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
    setProcessesError("");
    setShowCreateProcessForm(false);
    setNewProcessName("");
    setNewProcessDescription("");
    setNewProcessOwner("");
    setNewProcessPriority("Media");
    setNewProcessStartDate("");
    setNewProcessTargetDate("");
    setNewStepByProcess({});

    setTimeout(() => forceMapResize(), 0);
    await loadZoneProcesses(zoneId);
  };

  const closeComponentsModal = () => {
    setComponentsModalOpen(false);
    setProcessesError("");
    setShowCreateProcessForm(false);
    setNewProcessName("");
    setNewProcessDescription("");
    setNewProcessOwner("");
    setNewProcessPriority("Media");
    setNewProcessStartDate("");
    setNewProcessTargetDate("");
    setNewStepByProcess({});
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

  const fireTasksRefresh = () => {
    try {
      window.dispatchEvent(
        new CustomEvent("agromind:tasks:refresh", { detail: { farmId: activeFarmId } })
      );
      localStorage.setItem("agromind_tasks_refresh", String(Date.now()));
    } catch {
      // no-op
    }
  };

  const createTaskFromComponent = async (zone, comp) => {
    try {
      const farmId = activeFarmId || localStorage.getItem(ACTIVE_FARM_KEY);
      const token = getAuthToken();

      if (!farmId) {
        window.alert("No hay finca activa. Recargá la app e iniciá sesión otra vez.");
        return;
      }
      if (!token) {
        window.alert("No hay token. Iniciá sesión nuevamente.");
        return;
      }

      const zoneName = (zone?.name || "").trim();
      const compName = (comp?.name || "Componente").trim();
      const compType = (comp?.type || "Otro").trim();

      const today = toYYYYMMDD(new Date());

      const title = zoneName
        ? `Revisión: ${compName} (${zoneName})`
        : `Revisión: ${compName}`;

      const typeGuess =
        compType.toLowerCase().includes("bebedero") ||
        compType.toLowerCase().includes("comedero")
          ? "Alimentación"
          : "Mantenimiento";

      const payload = {
        title,
        zone: zoneName || "",
        type: typeGuess,
        priority: "Media",
        start: today,
        due: today,
        status: "Pendiente",
        owner: "",
      };

      const data = await apiFetch(`/api/farms/${farmId}/tasks`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!data?.task?.id) {
        window.alert("La tarea no se pudo crear (respuesta inesperada).");
        return;
      }

      closeReportModal();
      fireTasksRefresh();

      window.alert(`Tarea creada ✅\n\n"${data.task.title}"`);
    } catch (err) {
      window.alert(err?.message || "Error creando la tarea.");
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (componentsModalOpen) closeComponentsModal();
      if (reportModalOpen) closeReportModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [componentsModalOpen, reportModalOpen]);

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
        emitFarmLocationChange("autosave");
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
    } catch (err) {
      console.warn("Backend load falló:", err?.message || err);
      setBackendOnline(false);
    }
  };

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
      }

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

      setMapReady(true);
      setTimeout(() => emitFarmLocationChange("init"), 0);

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
    if (!mapReady) return;
    emitFarmLocationChange("farm-id-change");
  }, [activeFarmId, mapReady]);

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
    scheduleAutosave(latestFeaturesListRef.current || [], {
      view: { center: [lon, lat], zoom },
    });

    emitFarmLocationChange("save-view");
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

        <button
          type="button"
          className="primary-btn"
          onClick={handleSaveViewClick}
        >
          Usar esta vista como mi finca
        </button>
      </div>

      <div className="farm-map-layout">
        <div ref={mapRef} className="farm-map" />
      </div>

      {filteredList.length > 0 && (
        <div className="farm-zones-table-wrapper">
          <div className="farm-zones-header-row">
            <span>ZONA / ELEMENTO</span>
            <span>TIPO</span>
            <span>ESTADO</span>
            <span>COMPONENTES / ACCIONES</span>
          </div>

          {filteredList.map((item) => {
            const isZone = item.kind === "polygon";
            const typeLabel =
              item.kind === "point"
                ? "Punto"
                : item.kind === "line"
                ? "Línea"
                : "Zona";

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
                  style={{
                    justifyContent: "flex-end",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  {isZone && (
                    <>
                      <span
                        className="components-summary"
                        style={{ whiteSpace: "nowrap" }}
                      >
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
                <h4 style={{ margin: 0, color: "#e5e7eb" }}>
                  Componentes de la zona
                </h4>
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
              <div
                style={{
                  marginBottom: "16px",
                  padding: "14px",
                  borderRadius: "16px",
                  border: "1px solid rgba(56,189,248,0.18)",
                  background:
                    "linear-gradient(160deg, rgba(9,18,39,0.9), rgba(2,6,23,0.98))",
                  boxShadow: "0 12px 26px rgba(0,0,0,0.22)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginBottom: "10px",
                  }}
                >
                  <div>
                    <h4
                      style={{
                        margin: 0,
                        color: "#e5e7eb",
                        fontSize: "1rem",
                      }}
                    >
                      Procesos de la zona
                    </h4>
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "rgba(226,232,240,0.72)",
                        fontSize: "0.84rem",
                      }}
                    >
                      Aquí vive el gestor de procesos productivos y operativos de esta zona.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => {
                      setShowCreateProcessForm((prev) => !prev);
                      setProcessesError("");
                    }}
                    disabled={processActionLoading}
                  >
                    {showCreateProcessForm ? "Cancelar" : "Nuevo proceso"}
                  </button>
                </div>

                {showCreateProcessForm && (
                  <div
                    style={{
                      marginBottom: "12px",
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(148,163,184,0.16)",
                      background: "rgba(2,6,23,0.42)",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "#cbd5e1",
                          fontSize: "0.82rem",
                        }}
                      >
                        Nombre del proceso
                      </label>
                      <input
                        className="farm-feature-input"
                        value={newProcessName}
                        onChange={(e) => setNewProcessName(e.target.value)}
                        placeholder="Ej: Producción de tierra abonada"
                      />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "#cbd5e1",
                          fontSize: "0.82rem",
                        }}
                      >
                        Descripción breve
                      </label>
                      <textarea
                        className="farm-feature-textarea"
                        value={newProcessDescription}
                        onChange={(e) => setNewProcessDescription(e.target.value)}
                        placeholder="Qué se busca lograr en esta zona"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "#cbd5e1",
                          fontSize: "0.82rem",
                        }}
                      >
                        Responsable
                      </label>
                      <input
                        className="farm-feature-input"
                        value={newProcessOwner}
                        onChange={(e) => setNewProcessOwner(e.target.value)}
                        placeholder="Ej: José"
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "#cbd5e1",
                          fontSize: "0.82rem",
                        }}
                      >
                        Prioridad
                      </label>
                      <select
                        className="component-type-select"
                        value={newProcessPriority}
                        onChange={(e) => setNewProcessPriority(e.target.value)}
                      >
                        {PROCESS_PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "#cbd5e1",
                          fontSize: "0.82rem",
                        }}
                      >
                        Fecha inicio
                      </label>
                      <input
                        className="farm-feature-input"
                        type="date"
                        value={newProcessStartDate}
                        onChange={(e) => setNewProcessStartDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "#cbd5e1",
                          fontSize: "0.82rem",
                        }}
                      >
                        Fecha meta
                      </label>
                      <input
                        className="farm-feature-input"
                        type="date"
                        value={newProcessTargetDate}
                        onChange={(e) => setNewProcessTargetDate(e.target.value)}
                      />
                    </div>

                    <div
                      style={{
                        gridColumn: "1 / -1",
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                        marginTop: "4px",
                      }}
                    >
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          setShowCreateProcessForm(false);
                          setNewProcessName("");
                          setNewProcessDescription("");
                          setNewProcessOwner("");
                          setNewProcessPriority("Media");
                          setNewProcessStartDate("");
                          setNewProcessTargetDate("");
                          setProcessesError("");
                        }}
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        className="primary-btn"
                        onClick={createProcessForZone}
                        disabled={processActionLoading}
                      >
                        {processActionLoading ? "Guardando..." : "Guardar proceso"}
                      </button>
                    </div>
                  </div>
                )}

                {processesError ? (
                  <div
                    style={{
                      marginBottom: "10px",
                      color: "#fca5a5",
                      fontSize: "0.88rem",
                    }}
                  >
                    {processesError}
                  </div>
                ) : null}

                {processesLoading ? (
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(148,163,184,0.16)",
                      background: "rgba(2,6,23,0.45)",
                      color: "#cbd5e1",
                      fontSize: "0.9rem",
                    }}
                  >
                    Cargando procesos...
                  </div>
                ) : modalZoneProcesses.length === 0 ? (
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px dashed rgba(148,163,184,0.22)",
                      background: "rgba(2,6,23,0.35)",
                      color: "rgba(226,232,240,0.72)",
                      fontSize: "0.9rem",
                    }}
                  >
                    Esta zona aún no tiene procesos. Crea el primero y aquí comenzará el motor operativo de AgroMind.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {modalZoneProcesses.map((process) => {
                      const steps = Array.isArray(process.steps) ? process.steps : [];
                      const progress = getProgressFromSteps(steps);
                      const draft = {
                        ...getEmptyStepDraft(),
                        ...(newStepByProcess[process.id] || {}),
                      };

                      return (
                        <div
                          key={process.id}
                          style={{
                            borderRadius: "14px",
                            border: "1px solid rgba(148,163,184,0.16)",
                            background:
                              "linear-gradient(180deg, rgba(15,23,42,0.82), rgba(5,10,22,0.95))",
                            padding: "12px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: "12px",
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  flexWrap: "wrap",
                                  marginBottom: "6px",
                                }}
                              >
                                <strong style={{ color: "#e5e7eb", fontSize: "0.98rem" }}>
                                  {process.name}
                                </strong>

                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "0.18rem 0.55rem",
                                    borderRadius: "999px",
                                    fontSize: "0.72rem",
                                    ...getStatusPillStyle(process.status || "Borrador"),
                                  }}
                                >
                                  {process.status || "Borrador"}
                                </span>

                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "0.18rem 0.55rem",
                                    borderRadius: "999px",
                                    fontSize: "0.72rem",
                                    ...getPriorityPillStyle(process.priority || "Media"),
                                  }}
                                >
                                  Prioridad {process.priority || "Media"}
                                </span>

                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "0.18rem 0.55rem",
                                    borderRadius: "999px",
                                    border: "1px solid rgba(148,163,184,0.18)",
                                    background: "rgba(15,23,42,0.6)",
                                    color: "#cbd5e1",
                                    fontSize: "0.72rem",
                                  }}
                                >
                                  {steps.length} etapa{steps.length === 1 ? "" : "s"}
                                </span>
                              </div>

                              {process.description ? (
                                <p
                                  style={{
                                    margin: "0 0 8px",
                                    color: "rgba(226,232,240,0.78)",
                                    fontSize: "0.85rem",
                                  }}
                                >
                                  {process.description}
                                </p>
                              ) : null}

                              <div
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  flexWrap: "wrap",
                                  color: "rgba(148,163,184,0.9)",
                                  fontSize: "0.76rem",
                                  marginBottom: "10px",
                                }}
                              >
                                <span>Tipo: {process.type || "General"}</span>
                                <span>Responsable: {process.owner || "—"}</span>
                                <span>Inicio: {formatProcessDate(process.startDate)}</span>
                                <span>Meta: {formatProcessDate(process.targetDate)}</span>
                              </div>

                              <div style={{ marginBottom: "12px" }}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "6px",
                                    fontSize: "0.76rem",
                                    color: "#cbd5e1",
                                  }}
                                >
                                  <span>Avance</span>
                                  <span>{progress}%</span>
                                </div>
                                <div
                                  style={{
                                    width: "100%",
                                    height: "8px",
                                    borderRadius: "999px",
                                    background: "rgba(148,163,184,0.18)",
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${progress}%`,
                                      height: "100%",
                                      background:
                                        "linear-gradient(90deg, rgba(34,197,94,0.9), rgba(56,189,248,0.9))",
                                    }}
                                  />
                                </div>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                  marginBottom: "10px",
                                }}
                              >
                                <button
                                  type="button"
                                  className="secondary-btn"
                                  disabled={processActionLoading || process.status === "Activo"}
                                  onClick={() => updateProcessStatus(process, "Activo")}
                                >
                                  Activar
                                </button>

                                <button
                                  type="button"
                                  className="secondary-btn"
                                  disabled={processActionLoading || process.status === "Completado"}
                                  onClick={() => updateProcessStatus(process, "Completado")}
                                >
                                  Completar
                                </button>

                                <button
                                  type="button"
                                  className="danger-link"
                                  onClick={() => deleteProcess(process)}
                                  disabled={processActionLoading}
                                >
                                  Borrar proceso
                                </button>
                              </div>

                              <div
                                style={{
                                  padding: "12px",
                                  borderRadius: "12px",
                                  border: "1px solid rgba(148,163,184,0.16)",
                                  background: "rgba(2,6,23,0.34)",
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                  gap: "10px",
                                  marginBottom: steps.length > 0 ? "12px" : "10px",
                                }}
                              >
                                <div style={{ gridColumn: "1 / -1" }}>
                                  <label
                                    style={{
                                      display: "block",
                                      marginBottom: "6px",
                                      color: "#cbd5e1",
                                      fontSize: "0.82rem",
                                    }}
                                  >
                                    Nueva etapa
                                  </label>
                                  <input
                                    className="farm-feature-input"
                                    value={draft.name}
                                    onChange={(e) =>
                                      updateStepDraftField(process.id, "name", e.target.value)
                                    }
                                    placeholder="Ej: Recolección de material"
                                  />
                                </div>

                                <div>
                                  <label
                                    style={{
                                      display: "block",
                                      marginBottom: "6px",
                                      color: "#cbd5e1",
                                      fontSize: "0.82rem",
                                    }}
                                  >
                                    Responsable
                                  </label>
                                  <input
                                    className="farm-feature-input"
                                    value={draft.owner}
                                    onChange={(e) =>
                                      updateStepDraftField(process.id, "owner", e.target.value)
                                    }
                                    placeholder="Ej: José"
                                  />
                                </div>

                                <div>
                                  <label
                                    style={{
                                      display: "block",
                                      marginBottom: "6px",
                                      color: "#cbd5e1",
                                      fontSize: "0.82rem",
                                    }}
                                  >
                                    Prioridad
                                  </label>
                                  <select
                                    className="component-type-select"
                                    value={draft.priority}
                                    onChange={(e) =>
                                      updateStepDraftField(process.id, "priority", e.target.value)
                                    }
                                  >
                                    {PROCESS_PRIORITIES.map((p) => (
                                      <option key={p} value={p}>
                                        {p}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label
                                    style={{
                                      display: "block",
                                      marginBottom: "6px",
                                      color: "#cbd5e1",
                                      fontSize: "0.82rem",
                                    }}
                                  >
                                    Fecha inicio
                                  </label>
                                  <input
                                    className="farm-feature-input"
                                    type="date"
                                    value={draft.startDate}
                                    onChange={(e) =>
                                      updateStepDraftField(process.id, "startDate", e.target.value)
                                    }
                                  />
                                </div>

                                <div>
                                  <label
                                    style={{
                                      display: "block",
                                      marginBottom: "6px",
                                      color: "#cbd5e1",
                                      fontSize: "0.82rem",
                                    }}
                                  >
                                    Fecha meta
                                  </label>
                                  <input
                                    className="farm-feature-input"
                                    type="date"
                                    value={draft.dueDate}
                                    onChange={(e) =>
                                      updateStepDraftField(process.id, "dueDate", e.target.value)
                                    }
                                  />
                                </div>

                                <div style={{ gridColumn: "1 / -1" }}>
                                  <label
                                    style={{
                                      display: "block",
                                      marginBottom: "6px",
                                      color: "#cbd5e1",
                                      fontSize: "0.82rem",
                                    }}
                                  >
                                    Notas
                                  </label>
                                  <textarea
                                    className="farm-feature-textarea"
                                    value={draft.notes}
                                    onChange={(e) =>
                                      updateStepDraftField(process.id, "notes", e.target.value)
                                    }
                                    placeholder="Bitácora corta, observaciones o instrucciones"
                                    rows={3}
                                  />
                                </div>

                                <div
                                  style={{
                                    gridColumn: "1 / -1",
                                    display: "flex",
                                    justifyContent: "flex-end",
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() => createStepForProcess(process)}
                                    disabled={processActionLoading}
                                  >
                                    + Crear etapa
                                  </button>
                                </div>
                              </div>

                              {steps.length > 0 && (
                                <div
                                  style={{
                                    marginTop: "4px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                  }}
                                >
                                  {steps.map((step) => {
                                    const isCompleted = step.status === "Completada";

                                    return (
                                      <div
                                        key={step.id}
                                        style={{
                                          padding: "10px",
                                          borderRadius: "10px",
                                          background: "rgba(2,6,23,0.4)",
                                          border: "1px solid rgba(148,163,184,0.12)",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            justifyContent: "space-between",
                                            gap: "10px",
                                            flexWrap: "wrap",
                                          }}
                                        >
                                          <div
                                            style={{
                                              display: "flex",
                                              gap: "12px",
                                              alignItems: "flex-start",
                                              minWidth: 0,
                                              flex: 1,
                                            }}
                                          >
                                            <button
                                              type="button"
                                              onClick={() => toggleStepCompletion(step)}
                                              disabled={processActionLoading}
                                              title={
                                                isCompleted
                                                  ? "Reabrir etapa"
                                                  : "Marcar como completada"
                                              }
                                              style={{
                                                width: "28px",
                                                height: "28px",
                                                minWidth: "28px",
                                                borderRadius: "999px",
                                                border: isCompleted
                                                  ? "1px solid rgba(34,197,94,0.38)"
                                                  : "1px solid rgba(148,163,184,0.28)",
                                                background: isCompleted
                                                  ? "rgba(34,197,94,0.16)"
                                                  : "rgba(15,23,42,0.9)",
                                                color: isCompleted ? "#bbf7d0" : "#94a3b8",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: processActionLoading
                                                  ? "not-allowed"
                                                  : "pointer",
                                                fontSize: "0.95rem",
                                                fontWeight: 700,
                                                lineHeight: 1,
                                                marginTop: "2px",
                                              }}
                                            >
                                              {isCompleted ? "✓" : ""}
                                            </button>

                                            <div style={{ minWidth: 0, flex: 1 }}>
                                              <div
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "8px",
                                                  flexWrap: "wrap",
                                                  marginBottom: "4px",
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    minWidth: "24px",
                                                    height: "24px",
                                                    borderRadius: "999px",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    background: "rgba(34,197,94,0.14)",
                                                    color: "#bbf7d0",
                                                    fontSize: "0.72rem",
                                                    fontWeight: 700,
                                                  }}
                                                >
                                                  {step.stepOrder}
                                                </span>

                                                <div
                                                  style={{
                                                    color: isCompleted
                                                      ? "rgba(226,232,240,0.72)"
                                                      : "#e5e7eb",
                                                    fontSize: "0.84rem",
                                                    fontWeight: 600,
                                                    textDecoration: isCompleted
                                                      ? "line-through"
                                                      : "none",
                                                  }}
                                                >
                                                  {step.name}
                                                </div>

                                                <span
                                                  style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    padding: "0.18rem 0.55rem",
                                                    borderRadius: "999px",
                                                    fontSize: "0.72rem",
                                                    ...getStatusPillStyle(
                                                      step.status || "Pendiente"
                                                    ),
                                                  }}
                                                >
                                                  {step.status || "Pendiente"}
                                                </span>

                                                <span
                                                  style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    padding: "0.18rem 0.55rem",
                                                    borderRadius: "999px",
                                                    fontSize: "0.72rem",
                                                    ...getPriorityPillStyle(
                                                      step.priority || "Media"
                                                    ),
                                                  }}
                                                >
                                                  {step.priority || "Media"}
                                                </span>
                                              </div>

                                              <div
                                                style={{
                                                  display: "flex",
                                                  gap: "10px",
                                                  flexWrap: "wrap",
                                                  color: "rgba(148,163,184,0.88)",
                                                  fontSize: "0.74rem",
                                                  marginBottom: step.notes ? "6px" : "0",
                                                }}
                                              >
                                                <span>Responsable: {step.owner || "—"}</span>
                                                <span>
                                                  Inicio: {formatProcessDate(step.startDate)}
                                                </span>
                                                <span>
                                                  Meta: {formatProcessDate(step.dueDate)}
                                                </span>
                                                <span>
                                                  Completada: {formatProcessDate(step.completedAt)}
                                                </span>
                                              </div>

                                              {step.notes ? (
                                                <div
                                                  style={{
                                                    marginTop: "6px",
                                                    color: "rgba(226,232,240,0.78)",
                                                    fontSize: "0.78rem",
                                                    whiteSpace: "pre-wrap",
                                                  }}
                                                >
                                                  {step.notes}
                                                </div>
                                              ) : null}
                                            </div>
                                          </div>

                                          <div
                                            style={{
                                              display: "flex",
                                              gap: "8px",
                                              flexWrap: "wrap",
                                              alignItems: "center",
                                            }}
                                          >
                                            <button
                                              type="button"
                                              className="secondary-btn"
                                              onClick={() => toggleStepCompletion(step)}
                                              disabled={processActionLoading}
                                            >
                                              {isCompleted ? "Reabrir" : "Completar"}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {componentsDraft.length === 0 && (
                <p className="farm-zone-components-empty" style={{ marginTop: 0 }}>
                  Aún no has agregado componentes a esta zona. Usa el botón{" "}
                  <strong>“Agregar componente”</strong>.
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
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          type="button"
                          className="danger-link"
                          onClick={() => draftDeleteComponent(comp.id)}
                        >
                          Borrar
                        </button>
                      </div>

                      <div className="farm-zone-component-type-row">
                        <label className="component-type-label">
                          Tipo de componente
                        </label>
                        <select
                          className="component-type-select"
                          value={comp.type || "Otro"}
                          onChange={(e) =>
                            draftUpdate(comp.id, { type: e.target.value })
                          }
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
                        onChange={(e) =>
                          draftUpdate(comp.id, { name: e.target.value })
                        }
                        placeholder="Nombre del componente (ej: Gallinero, Bebedero, Bodega)"
                      />

                      <div style={{ marginTop: "10px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.85rem",
                              color: "rgba(226,232,240,0.85)",
                            }}
                          >
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
                            onChange={(e) =>
                              draftUpdate(comp.id, { note: e.target.value })
                            }
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
                              color: noteText
                                ? "#e5e7eb"
                                : "rgba(226,232,240,0.55)",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {noteText
                              ? noteText
                              : "Sin nota. Tocá ✏️ para agregar una."}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

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
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="primary-btn"
                  onClick={draftAddComponent}
                >
                  Agregar componente
                </button>

                <button
                  type="button"
                  className="danger-link"
                  onClick={() => handleDeleteFeature(modalZone.id)}
                >
                  Borrar zona
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeComponentsModal}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={saveComponentsModal}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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