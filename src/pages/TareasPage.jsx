// src/pages/TareasPage.jsx
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useFarm } from "../context/FarmContext";
import { loadCalendarItems } from "../services/calendarService";
import "../styles/tasks.css";

function getPriorityClass(priority) {
  switch (priority) {
    case "Alta":
      return "priority-badge priority-high";
    case "Media":
      return "priority-badge priority-medium";
    case "Baja":
      return "priority-badge priority-low";
    default:
      return "priority-badge";
  }
}

function getStatusClass(status) {
  switch (status) {
    case "En progreso":
      return "status-badge status-progress";
    case "Completada":
      return "status-badge status-done";
    default:
      return "status-badge status-progress";
  }
}

function normalizeTaskStatus(status) {
  return status === "Completada" ? "Completada" : "En progreso";
}

function getSuggestionClass(level) {
  switch (level) {
    case "alert":
      return "ia-suggestion ia-alert";
    case "warning":
      return "ia-suggestion ia-warning";
    case "info":
      return "ia-suggestion ia-info";
    default:
      return "ia-suggestion";
  }
}

const PRIORIDADES = ["Alta", "Media", "Baja"];
const TIPOS = ["Riego", "Alimentación", "Mantenimiento", "Cosecha"];
const ESTADOS = ["En progreso", "Completada"];
const GENERAL_ZONE_OPTION = "Zona general";

const EMPTY_FORM = {
  title: "",
  zone: GENERAL_ZONE_OPTION,
  type: "Mantenimiento",
  priority: "Media",
  start: "",
  due: "",
  status: "En progreso",
  owner: "",
};

const DEFAULT_WEATHER_LOCATION = {
  name: "Ciudad Quesada, Costa Rica",
  latitude: 10.3238,
  longitude: -84.4271,
};

function pickLocalStorage(keys) {
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

function getAuthToken() {
  return pickLocalStorage([
    "agromind_token",
    "agromind_jwt",
    "token",
    "jwt",
    "access_token",
  ]);
}

function toYYYYMMDD(value) {
  if (!value) return "";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return "";
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function addDaysYYYYMMDD(dateStr, days) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatCalendarDate(dateStr) {
  if (!dateStr) return "—";
  const normalized = toYYYYMMDD(dateStr);
  if (!normalized) return "—";

  try {
    return new Date(`${normalized}T12:00:00`).toLocaleDateString("es-CR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return normalized;
  }
}

const PROCESS_START_DATE_KEYS = [
  "start",
  "startDate",
  "startedAt",
  "plannedStartDate",
  "estimatedStartDate",
  "initialDate",
  "from",
  "fromDate",
  "date",
  "fechaInicio",
  "inicio",
  "start_date",
];

const PROCESS_END_DATE_KEYS = [
  "due",
  "dueDate",
  "end",
  "endDate",
  "targetDate",
  "estimatedEndDate",
  "plannedEndDate",
  "plannedDueDate",
  "completedAt",
  "deadline",
  "finishDate",
  "finishedAt",
  "until",
  "to",
  "toDate",
  "fechaFin",
  "fin",
  "end_date",
];

function pickDateFromObject(obj, keys = []) {
  if (!obj || typeof obj !== "object") return "";

  for (const key of keys) {
    const date = toYYYYMMDD(obj?.[key]);
    if (date) return date;
  }

  return "";
}

function getProcessStageList(process) {
  const candidates = [
    process?.stages,
    process?.steps,
    process?.phases,
    process?.etapas,
    process?.timeline,
    process?.calendarStages,
  ];

  for (const value of candidates) {
    if (Array.isArray(value) && value.length) return value;
  }

  return [];
}

function getStageIdentity(stage, fallbackIndex = null) {
  if (!stage || typeof stage !== "object") return String(fallbackIndex ?? "");

  return String(
    stage?.id ||
      stage?._id ||
      stage?.stageId ||
      stage?.stepId ||
      stage?.key ||
      stage?.name ||
      stage?.title ||
      stage?.label ||
      fallbackIndex ||
      ""
  );
}

function findMatchingStageIndex(process, stage, explicitStageId) {
  const stages = getProcessStageList(process);
  if (!stages.length) return -1;

  const targetId = String(
    explicitStageId ||
      stage?.id ||
      stage?._id ||
      stage?.stageId ||
      stage?.stepId ||
      stage?.key ||
      ""
  );

  if (targetId) {
    const byId = stages.findIndex((candidate, index) => {
      return getStageIdentity(candidate, index) === targetId;
    });

    if (byId >= 0) return byId;
  }

  const targetName = String(
    stage?.name ||
      stage?.title ||
      stage?.label ||
      stage?.stageName ||
      stage?.etapa ||
      ""
  )
    .trim()
    .toLowerCase();

  if (targetName) {
    const byName = stages.findIndex((candidate) => {
      const candidateName = String(
        candidate?.name ||
          candidate?.title ||
          candidate?.label ||
          candidate?.stageName ||
          candidate?.etapa ||
          ""
      )
        .trim()
        .toLowerCase();

      return candidateName && candidateName === targetName;
    });

    if (byName >= 0) return byName;
  }

  return -1;
}

function resolveProcessCalendarStart(item) {
  return (
    pickDateFromObject(item, PROCESS_START_DATE_KEYS) ||
    pickDateFromObject(item?.stage, PROCESS_START_DATE_KEYS) ||
    pickDateFromObject(item?.process, PROCESS_START_DATE_KEYS) ||
    ""
  );
}

function resolveProcessCalendarDue(item, fallbackStart = "") {
  const explicitEnd =
    pickDateFromObject(item, PROCESS_END_DATE_KEYS) ||
    pickDateFromObject(item?.stage, PROCESS_END_DATE_KEYS);

  if (explicitEnd) return explicitEnd;

  const process = item?.process;
  const stage = item?.stage;
  const stages = getProcessStageList(process);
  const stageId = item?.stageId || item?.extendedProps?.stageId;
  const currentIndex = findMatchingStageIndex(process, stage, stageId);

  if (currentIndex >= 0) {
    const currentStage = stages[currentIndex];
    const currentStageEnd = pickDateFromObject(currentStage, PROCESS_END_DATE_KEYS);
    if (currentStageEnd) return currentStageEnd;

    const nextStage = stages[currentIndex + 1];
    const nextStageStart = pickDateFromObject(nextStage, PROCESS_START_DATE_KEYS);

    if (nextStageStart) {
      const inferredEnd = addDaysYYYYMMDD(nextStageStart, -1);
      if (inferredEnd && (!fallbackStart || inferredEnd >= fallbackStart)) {
        return inferredEnd;
      }
    }
  }

  const processEnd = pickDateFromObject(process, PROCESS_END_DATE_KEYS);
  if (processEnd) return processEnd;

  return fallbackStart;
}


function normalizeCalendarServiceItems(payload) {
  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.calendarItems)
    ? payload.calendarItems
    : Array.isArray(payload?.data)
    ? payload.data
    : [];

  return rawItems
    .map((item, index) => {
      const itemType = item?.itemType || item?.type || item?.source || "event";

      const start =
        itemType === "process"
          ? resolveProcessCalendarStart(item)
          : toYYYYMMDD(item?.start || item?.startDate || item?.date);

      const due =
        itemType === "process"
          ? resolveProcessCalendarDue(item, start)
          : toYYYYMMDD(
              item?.due ||
                item?.end ||
                item?.endDate ||
                item?.estimatedEndDate ||
                start
            );

      if (!start || !item?.title) return null;

      return {
        ...item,
        id: item?.id || item?._id || `${itemType}-${index}`,
        itemType,
        title: item.title,
        start,
        due: due || start,
        status: item?.status || item?.state || "Activo",
        editableFromCalendar: itemType === "task",
      };
    })
    .filter(Boolean);
}

function getTodayYYYYMMDD() {
  return new Date().toISOString().slice(0, 10);
}

function isTaskOverdue(task) {
  if (!task?.due || task.status === "Completada") return false;
  return task.due < getTodayYYYYMMDD();
}

function isWithinNextDays(dateStr, days = 7) {
  if (!dateStr) return false;
  const today = new Date(`${getTodayYYYYMMDD()}T00:00:00`);
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return false;
  const diff = (target - today) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

function getStrategicEventClass(item) {
  if (!item) return "calendar-event-default";
  if (item.itemType === "process") return "calendar-event-process-readonly";
  if (item.priority === "Alta") return "calendar-event-high";
  if (item.status === "Completada") return "calendar-event-done";
  if (item.status === "En progreso") return "calendar-event-progress";
  return "calendar-event-task";
}

function getWeatherCodeLabel(code) {
  const map = {
    0: "Despejado",
    1: "Mayormente despejado",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Neblina",
    48: "Neblina con escarcha",
    51: "Llovizna ligera",
    53: "Llovizna moderada",
    55: "Llovizna intensa",
    56: "Llovizna helada ligera",
    57: "Llovizna helada intensa",
    61: "Lluvia ligera",
    63: "Lluvia moderada",
    65: "Lluvia fuerte",
    66: "Lluvia helada ligera",
    67: "Lluvia helada fuerte",
    71: "Nieve ligera",
    73: "Nieve moderada",
    75: "Nieve fuerte",
    77: "Granos de nieve",
    80: "Chubascos ligeros",
    81: "Chubascos moderados",
    82: "Chubascos violentos",
    85: "Nevadas ligeras",
    86: "Nevadas fuertes",
    95: "Tormenta",
    96: "Tormenta con granizo ligero",
    99: "Tormenta con granizo fuerte",
  };
  return map[code] || "Condición variable";
}

function normalizeZoneName(value) {
  return String(value || "").trim().toLowerCase();
}

function getZoneLabelFromMapItem(item) {
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

  const looksLikeZone =
    typeText.includes("zone") ||
    typeText.includes("zona") ||
    item.isZone === true ||
    Array.isArray(item.points) ||
    Array.isArray(item.polygon) ||
    Array.isArray(item.coordinates);

  if (!looksLikeZone) return "";

  return String(
    item.name ||
      item.title ||
      item.label ||
      item.zoneName ||
      item.zone ||
      item.area ||
      ""
  ).trim();
}

function getAnyZoneLabel(item, force = false) {
  if (!item || typeof item !== "object") return "";

  const directName = String(
    item.name ||
      item.title ||
      item.label ||
      item.zoneName ||
      item.zone ||
      item.area ||
      item.zoneLabel ||
      ""
  ).trim();

  if (force && directName) return directName;

  const mapLabel = getZoneLabelFromMapItem(item);
  if (mapLabel) return mapLabel;

  const hasGeometry =
    Array.isArray(item.points) ||
    Array.isArray(item.polygon) ||
    Array.isArray(item.coordinates) ||
    Array.isArray(item.paths) ||
    Array.isArray(item.vertices) ||
    item.geometry ||
    item.geojson ||
    item.geoJson;

  if (hasGeometry && directName) return directName;

  return "";
}

function collectZoneNames(source, bucket = [], force = false, depth = 0) {
  if (!source || depth > 6) return bucket;

  if (typeof source === "string") {
    const clean = source.trim();
    if (clean) bucket.push(clean);
    return bucket;
  }

  if (Array.isArray(source)) {
    source.forEach((item) => collectZoneNames(item, bucket, force, depth + 1));
    return bucket;
  }

  if (typeof source !== "object") return bucket;

  const label = getAnyZoneLabel(source, force);
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
    if (source[key]) {
      collectZoneNames(source[key], bucket, true, depth + 1);
    }
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
    if (source[key]) {
      collectZoneNames(source[key], bucket, force, depth + 1);
    }
  });

  return bucket;
}

function extractMapZoneNames(payload) {
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

function readStoredMapZones(farmId) {
  if (typeof window === "undefined" || !window.localStorage) return [];

  const candidates = [];
  const activeFarmKeys = [
    "agromind_active_farm",
    "activeFarm",
    "selectedFarm",
    "farm",
  ];

  activeFarmKeys.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!farmId || String(parsed?.id || parsed?._id || parsed?.farmId || "") === String(farmId)) {
        candidates.push(parsed);
      }
    } catch {}
  });

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i) || "";
    const lowerKey = key.toLowerCase();
    if (!lowerKey.includes("agromind") && !lowerKey.includes("farm") && !lowerKey.includes("map")) {
      continue;
    }

    const raw = localStorage.getItem(key);
    if (!raw || raw.length > 700000) continue;

    try {
      const parsed = JSON.parse(raw);
      candidates.push(parsed);
    } catch {}
  }

  const seen = new Set();
  return candidates
    .flatMap((candidate) => extractMapZoneNames(candidate))
    .filter((name) => {
      const clean = normalizeZoneName(name);
      if (!clean || seen.has(clean)) return false;
      seen.add(clean);
      return true;
    });
}


async function reverseGeocodeName(latitude, longitude) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=es&format=json`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    const item = Array.isArray(data?.results) ? data.results[0] : null;
    if (!item) return "";
    const parts = [item.name, item.admin2, item.admin1, item.country].filter(Boolean);
    return parts.join(", ");
  } catch {
    return "";
  }
}

async function resolveBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) {
      resolve(DEFAULT_WEATHER_LOCATION);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position?.coords?.latitude;
        const longitude = position?.coords?.longitude;

        if (
          typeof latitude !== "number" ||
          Number.isNaN(latitude) ||
          typeof longitude !== "number" ||
          Number.isNaN(longitude)
        ) {
          resolve(DEFAULT_WEATHER_LOCATION);
          return;
        }

        const name =
          (await reverseGeocodeName(latitude, longitude)) ||
          "Ubicación actual";

        resolve({
          name,
          latitude,
          longitude,
        });
      },
      () => resolve(DEFAULT_WEATHER_LOCATION),
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 1000 * 60 * 15,
      }
    );
  });
}

export default function TareasPage({
  onOpenZoneInMap,
  zonesFromMap = [],
  token: tokenProp,
}) {
  const [tasks, setTasks] = useState([]);
  const [calendarItems, setCalendarItems] = useState([]);

  const [loading, setLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [weatherRisk, setWeatherRisk] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [ignoredSuggestions, setIgnoredSuggestions] = useState(() => new Set());

  const [statusFilter, setStatusFilter] = useState("Todas");
  const [typeFilter, setTypeFilter] = useState("Todas");
  const [zoneFilter, setZoneFilter] = useState("Todas");
  const [searchText, setSearchText] = useState("");

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [fetchedMapZones, setFetchedMapZones] = useState([]);
  const [selectedProcessNotice, setSelectedProcessNotice] = useState(null);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState(null);

  const mapZones = useMemo(() => {
    const seen = new Set();
    return [...(Array.isArray(zonesFromMap) ? zonesFromMap : []), ...fetchedMapZones]
      .map((zone) => String(zone || "").trim())
      .filter(Boolean)
      .filter((zone) => {
        const key = normalizeZoneName(zone);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [zonesFromMap, fetchedMapZones]);

  const API_BASE =
    import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";

  const token = tokenProp || getAuthToken();

  const {
    activeFarm: contextActiveFarm,
    farmId: contextFarmId,
    farmName: contextFarmName,
    setActiveFarm,
  } = useFarm();

  const [farms, setFarms] = useState([]);
  const [farmsLoading, setFarmsLoading] = useState(false);

  const farmId = contextFarmId || "";

  const activeFarm = useMemo(() => {
    if (contextActiveFarm?.id && String(contextActiveFarm.id) === String(farmId)) {
      return contextActiveFarm;
    }

    if (!farmId || !Array.isArray(farms)) return contextActiveFarm || null;
    return (
      farms.find((farm) => String(farm.id) === String(farmId)) ||
      contextActiveFarm ||
      null
    );
  }, [farms, farmId, contextActiveFarm]);

  const activeFarmName =
    contextFarmName || activeFarm?.name || (farmId ? "Finca activa" : "Sin finca activa");

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options.headers || {}),
      },
      cache: "no-store",
    });

    let data = null;
    try {
      data = await res.json();
    } catch {}

    if (!res.ok) {
      const msg = data?.error || `Error HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  const fetchFarms = useCallback(async () => {
    if (!token) {
      setFarms([]);
      return [];
    }

    setFarmsLoading(true);

    try {
      const ts = Date.now();
      const data = await apiFetch(`/api/farms?ts=${ts}`);
      const list = Array.isArray(data?.farms)
        ? data.farms
        : Array.isArray(data)
        ? data
        : [];

      setFarms(list);

      if (!contextFarmId && !contextActiveFarm?.id && list[0]?.id) {
        setActiveFarm(list[0]);
      }

      return list;
    } catch {
      setFarms([]);
      return [];
    } finally {
      setFarmsLoading(false);
    }
  }, [token, API_BASE, contextFarmId, contextActiveFarm?.id, setActiveFarm]); // eslint-disable-line react-hooks/exhaustive-deps


  const fetchMapZones = useCallback(async () => {
    /*
      Fuente única para el selector de zonas dentro de Tareas:
      - zonas recibidas desde FarmShell/FarmMap;
      - zonas persistidas en localStorage;
      - datos disponibles en FarmContext.

      IMPORTANTE:
      TareasPage NO consulta endpoints de zonas ni rutas legacy del mapa.
      No se hacen llamadas fallback a endpoints legacy del mapa.
      Eso evita 404 repetidos y parpadeo del calendario.
    */
    const collected = [
      ...(Array.isArray(zonesFromMap) ? zonesFromMap : []),
      ...extractMapZoneNames(contextActiveFarm),
      ...readStoredMapZones(farmId),
    ];

    const seen = new Set();
    const cleanZones = collected
      .map((zone) => String(zone || "").trim())
      .filter(Boolean)
      .filter((zone) => {
        const key = normalizeZoneName(zone);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    setFetchedMapZones(cleanZones);
  }, [farmId, zonesFromMap, contextActiveFarm]);

  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError("");

    try {
      const location = await resolveBrowserLocation();

      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}` +
        `&longitude=${location.longitude}` +
        `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m` +
        `&hourly=uv_index,precipitation_probability` +
        `&forecast_days=1&timezone=auto`;

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      const current = data?.current || {};
      const hourly = data?.hourly || {};
      const currentTime = current?.time || "";
      const hourlyTimes = Array.isArray(hourly?.time) ? hourly.time : [];

      let hourlyIndex = hourlyTimes.findIndex((t) => t === currentTime);
      if (hourlyIndex < 0) hourlyIndex = 0;

      const uvIndex = Array.isArray(hourly?.uv_index)
        ? Number(hourly.uv_index[hourlyIndex] ?? 0)
        : 0;

      const precipitationProbability = Array.isArray(
        hourly?.precipitation_probability
      )
        ? Number(hourly.precipitation_probability[hourlyIndex] ?? 0)
        : 0;

      const normalized = {
        locationName: location.name || DEFAULT_WEATHER_LOCATION.name,
        latitude: location.latitude,
        longitude: location.longitude,
        temperature: Number(current?.temperature_2m ?? 0),
        humidity: Number(current?.relative_humidity_2m ?? 0),
        precipitation: Number(current?.precipitation ?? 0),
        precipitationProbability,
        weatherCode: Number(current?.weather_code ?? -1),
        weatherLabel: getWeatherCodeLabel(Number(current?.weather_code ?? -1)),
        windSpeed: Number(current?.wind_speed_10m ?? 0),
        uvIndex,
        time: currentTime,
      };

      setWeatherData(normalized);
      setWeatherRisk(buildWeatherRisk(normalized));
    } catch {
      setWeatherError("No se pudo cargar el clima actual para tareas.");
      setWeatherData(null);
      setWeatherRisk(null);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setErrorMsg("");

    if (!farmId) {
      setTasks([]);
      setErrorMsg(
        "No se detectó una finca activa. Selecciona/crea una finca primero."
      );
      return [];
    }
    if (!token) {
      setTasks([]);
      setErrorMsg("No hay token. Inicia sesión nuevamente.");
      return [];
    }

    setLoading(true);
    try {
      const ts = Date.now();
      const data = await apiFetch(`/api/farms/${farmId}/tasks?ts=${ts}`);
      const list = Array.isArray(data?.tasks) ? data.tasks : [];
      const normalized = list.map((t) => ({
        ...t,
        start: toYYYYMMDD(t.start),
        due: toYYYYMMDD(t.due),
        status: normalizeTaskStatus(t.status),
      }));
      setTasks(normalized);
      return normalized;
    } catch (err) {
      setErrorMsg(err?.message || "No se pudieron cargar las tareas.");
      setTasks([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [farmId, token, API_BASE]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSuggestions = useCallback(async () => {
    // El backend actual no expone /tasks/suggestions.
    // Mantener esta función sin llamar endpoints evita 404 repetidos y ciclos visuales.
    setLoadingSuggestions(false);
    setSuggestions([]);
    return [];
  }, []);

  const fetchCalendarItems = useCallback(async () => {
    if (!farmId) {
      setCalendarItems([]);
      setCalendarLoading(false);
      return [];
    }

    setCalendarLoading(true);

    try {
      const payload = await loadCalendarItems(farmId);
      const normalized = normalizeCalendarServiceItems(payload);
      setCalendarItems(normalized);
      return normalized;
    } catch {
      setCalendarItems([]);
      return [];
    } finally {
      setCalendarLoading(false);
    }
  }, [farmId]);

  const refreshCalendarBundle = useCallback(async () => {
    setCalendarLoading(true);

    try {
      await Promise.all([
        fetchTasks(),
        fetchCalendarItems(),
        fetchMapZones(),
      ]);
    } finally {
      setCalendarLoading(false);
    }
  }, [fetchTasks, fetchCalendarItems, fetchMapZones]);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      if (cancelled) return;
        setCalendarLoading(true);

      await fetchFarms();
      if (cancelled) return;

      await Promise.all([
        fetchTasks(),
        fetchCalendarItems(),
        fetchMapZones(),
      ]);

      if (cancelled) return;
      setCalendarLoading(false);

      fetchWeather();
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [fetchFarms, fetchTasks, fetchCalendarItems, fetchMapZones, fetchWeather]);

  useEffect(() => {
    function onRefreshEvent(e) {
      const targetFarmId = e?.detail?.farmId ? String(e.detail.farmId) : "";
      if (targetFarmId && farmId && String(farmId) !== targetFarmId) return;
      refreshCalendarBundle();
    }

    function onStorage(e) {
      if (e?.key !== "agromind_tasks_refresh") return;
      refreshCalendarBundle();
    }

    window.addEventListener("agromind:tasks:refresh", onRefreshEvent);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("agromind:tasks:refresh", onRefreshEvent);
      window.removeEventListener("storage", onStorage);
    };
  }, [farmId, refreshCalendarBundle]);

  useEffect(() => {
    setStatusFilter("Todas");
    setTypeFilter("Todas");
    setZoneFilter("Todas");
    setSearchText("");
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIgnoredSuggestions(new Set());
  }, [farmId]);

  const summary = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === "En progreso").length;
    const done = tasks.filter((t) => t.status === "Completada").length;
    const overdue = tasks.filter(isTaskOverdue).length;
    const week = tasks.filter((t) => isWithinNextDays(t.start) || isWithinNextDays(t.due)).length;
    const activeProcesses = calendarItems.filter(
      (p) =>
        p.itemType === "process" &&
        !["Finalizado", "Completado", "Cancelado"].includes(p.status)
    ).length;
    return { total, inProgress, done, overdue, week, activeProcesses };
  }, [tasks, calendarItems]);

  const zoneOptions = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => t.zone && set.add(t.zone));
    mapZones.forEach((z) => z && set.add(z));
    return Array.from(set);
  }, [tasks, mapZones]);

  const taskZoneOptions = useMemo(() => {
    const seen = new Set([normalizeZoneName(GENERAL_ZONE_OPTION)]);
    const currentZone = String(formData.zone || "").trim();
    const list = [GENERAL_ZONE_OPTION];

    if (currentZone && normalizeZoneName(currentZone) !== normalizeZoneName(GENERAL_ZONE_OPTION)) {
      list.push(currentZone);
      seen.add(normalizeZoneName(currentZone));
    }

    mapZones.forEach((zone) => {
      const clean = String(zone || "").trim();
      const key = normalizeZoneName(clean);
      if (!clean || seen.has(key)) return;
      seen.add(key);
      list.push(clean);
    });

    return list;
  }, [formData.zone, mapZones]);

  const filteredTasks = tasks.filter((task) => {
    const matchStatus =
      statusFilter === "Todas" || task.status === statusFilter;
    const matchType = typeFilter === "Todas" || task.type === typeFilter;
    const matchZone = zoneFilter === "Todas" || task.zone === zoneFilter;

    const query = searchText.trim().toLowerCase();
    const matchSearch =
      query === "" ||
      (task.title || "").toLowerCase().includes(query) ||
      (task.zone || "").toLowerCase().includes(query) ||
      (task.type || "").toLowerCase().includes(query) ||
      (task.owner || "").toLowerCase().includes(query);

    return matchStatus && matchType && matchZone && matchSearch;
  });

  const visibleSuggestions = useMemo(() => {
    const list = Array.isArray(suggestions) ? suggestions : [];
    return list.filter((s) => {
      const id = s?.id || s?._id || "";
      return id ? !ignoredSuggestions.has(String(id)) : true;
    });
  }, [suggestions, ignoredSuggestions]);

  const weatherTaskMatches = useMemo(() => {
    if (!weatherRisk || !Array.isArray(filteredTasks) || filteredTasks.length === 0) {
      return [];
    }

    const riskKeys = new Set((weatherRisk.risks || []).map((r) => r.key));

    return filteredTasks.filter((task) => {
      const title = String(task?.title || "").toLowerCase();
      const type = String(task?.type || "").toLowerCase();
      const zone = normalizeZoneName(task?.zone);

      if (
        riskKeys.has("rain") &&
        (
          title.includes("cosecha") ||
          title.includes("fumig") ||
          title.includes("secado") ||
          type.includes("cosecha")
        )
      ) {
        return true;
      }

      if (
        riskKeys.has("wind") &&
        (
          title.includes("fumig") ||
          title.includes("aspers") ||
          title.includes("altura")
        )
      ) {
        return true;
      }

      if (
        riskKeys.has("humidity") &&
        (
          title.includes("hong") ||
          title.includes("dren") ||
          zone.includes("vivero") ||
          zone.includes("invernadero")
        )
      ) {
        return true;
      }

      if (
        riskKeys.has("uv") &&
        (
          type.includes("mantenimiento") ||
          type.includes("cosecha") ||
          title.includes("campo")
        )
      ) {
        return true;
      }

      return false;
    });
  }, [filteredTasks, weatherRisk]);

  const weatherContextSuggestions = useMemo(() => {
    if (weatherError) {
      return [
        {
          id: "weather-unavailable",
          level: "info",
          title: "Clima no disponible para cruzar con tareas",
          zone: "Clima",
          message: "Las tareas siguen funcionando normal. Revisa la sección Clima o actualiza la ubicación de la finca cuando esté disponible.",
          actionPayload: null,
          source: "weather",
        },
      ];
    }

    if (!weatherRisk || !weatherData) return [];

    const level = weatherRisk.level === "alert" ? "alert" : weatherRisk.level === "warning" ? "warning" : "info";

    const matched = weatherTaskMatches.slice(0, 4).map((task) => ({
      id: `weather-${task.id}`,
      level,
      title: `Clima puede afectar: ${task.title}`,
      zone: task.zone || GENERAL_ZONE_OPTION,
      message: `${weatherRisk.summary}. ${weatherRisk.recommendations?.[0] || "Revisa si conviene ajustar la fecha o preparar condiciones de protección."}`,
      actionPayload: null,
      source: "weather",
    }));

    if (matched.length > 0) return matched;

    if (weatherRisk.level === "alert" || weatherRisk.level === "warning") {
      return [
        {
          id: `weather-general-${weatherRisk.level}`,
          level,
          title: "Clima con impacto operativo",
          zone: weatherData.locationName || "Finca",
          message: `${weatherRisk.summary}. ${weatherRisk.recommendations?.[0] || "Antes de ejecutar labores sensibles, revisa la sección Clima."}`,
          actionPayload: null,
          source: "weather",
        },
      ];
    }

    return [];
  }, [weatherRisk, weatherData, weatherTaskMatches, weatherError]);

  const combinedSuggestions = useMemo(() => {
    return [...weatherContextSuggestions, ...visibleSuggestions];
  }, [weatherContextSuggestions, visibleSuggestions]);

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
  };

  const scrollToEditor = () => {
    const el = document.querySelector(".task-editor");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const ignoreSuggestion = (sug) => {
    const id = sug?.id || sug?._id;
    if (!id) return;
    setIgnoredSuggestions((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      return next;
    });
  };

  const fireTasksRefresh = () => {
    try {
      // No disparamos el evento en esta misma pestaña: la tarea ya se actualiza en estado local.
      // El storage queda solo como señal para otras pestañas abiertas.
      localStorage.setItem("agromind_tasks_refresh", String(Date.now()));
    } catch {
      // no-op
    }
  };

  const applySuggestionToForm = (sug) => {
    const payload = sug?.actionPayload || null;
    if (!payload) return;

    const next = {
      ...EMPTY_FORM,
      title: (payload.title || "").toString(),
      zone: (payload.zone || GENERAL_ZONE_OPTION).toString(),
      type: payload.type || "Mantenimiento",
      priority: payload.priority || "Media",
      start: toYYYYMMDD(payload.start),
      due: toYYYYMMDD(payload.due),
      status: normalizeTaskStatus(payload.status),
      owner: (payload.owner || "").toString(),
    };

    setEditingId(null);
    setFormData(next);

    ignoreSuggestion(sug);
    scrollToEditor();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!farmId) {
      setErrorMsg("No hay finca activa. Selecciona/crea una finca primero.");
      return;
    }
    if (!token) {
      setErrorMsg("No hay token. Inicia sesión nuevamente.");
      return;
    }

    const trimmed = {
      ...formData,
      title: formData.title.trim(),
      zone: formData.zone.trim(),
      owner: formData.owner.trim(),
    };

    if (!trimmed.title) {
      alert("La tarea necesita al menos un título.");
      return;
    }

    if (!trimmed.start) {
      alert("Define una fecha de inicio.");
      return;
    }

    if (!trimmed.due) {
      alert("Define una fecha de vencimiento.");
      return;
    }

    if (trimmed.start > trimmed.due) {
      alert("Inicio no puede ser posterior a Vence.");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const data = await apiFetch(`/api/farms/${farmId}/tasks/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(trimmed),
        });

        const updated = data?.task
          ? {
              ...data.task,
              start: toYYYYMMDD(data.task.start),
              due: toYYYYMMDD(data.task.due),
            }
          : null;

        if (updated) {
          setTasks((prev) =>
            prev.map((t) => (t.id === editingId ? updated : t))
          );
        }
      } else {
        const data = await apiFetch(`/api/farms/${farmId}/tasks`, {
          method: "POST",
          body: JSON.stringify(trimmed),
        });

        const created = data?.task
          ? {
              ...data.task,
              start: toYYYYMMDD(data.task.start),
              due: toYYYYMMDD(data.task.due),
            }
          : null;

        if (created) {
          setTasks((prev) => [created, ...prev]);
        }
      }

      handleResetForm();
      fireTasksRefresh();
    } catch (err) {
      setErrorMsg(err?.message || "No se pudo guardar la tarea.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (task) => {
    setEditingId(task.id);
    setFormData({
      title: task.title || "",
      zone: task.zone || GENERAL_ZONE_OPTION,
      type: task.type || "Mantenimiento",
      priority: task.priority || "Media",
      start: task.start || "",
      due: task.due || "",
      status: normalizeTaskStatus(task.status),
      owner: task.owner || "",
    });
    scrollToEditor();
  };

  const handleDeleteClick = (id) => {
    setPendingDeleteTaskId(id);
  };

  const closeDeleteModal = () => {
    if (saving) return;
    setPendingDeleteTaskId(null);
  };

  const confirmDeleteTask = async () => {
    const id = pendingDeleteTaskId;
    if (!id) return;

    setErrorMsg("");

    if (!farmId) {
      setErrorMsg("No hay finca activa.");
      setPendingDeleteTaskId(null);
      return;
    }
    if (!token) {
      setErrorMsg("No hay token. Inicia sesión nuevamente.");
      setPendingDeleteTaskId(null);
      return;
    }

    try {
      setSaving(true);
      await apiFetch(`/api/farms/${farmId}/tasks/${id}`, { method: "DELETE" });

      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) handleResetForm();

      setPendingDeleteTaskId(null);
      fireTasksRefresh();
    } catch (err) {
      setErrorMsg(err?.message || "No se pudo eliminar la tarea.");
    } finally {
      setSaving(false);
    }
  };

  const pendingDeleteTask = useMemo(() => {
    if (!pendingDeleteTaskId) return null;
    return tasks.find((task) => String(task.id) === String(pendingDeleteTaskId)) || null;
  }, [pendingDeleteTaskId, tasks]);

  const calendarEvents = useMemo(() => {
    const taskEvents = tasks
      .filter((t) => t?.start && t?.due && t?.title)
      .map((t) => ({
        id: `task-${t.id}`,
        title: t.title,
        start: t.start,
        end: addDaysYYYYMMDD(t.due, 1),
        allDay: true,
        classNames: [getStrategicEventClass({ ...t, itemType: "task" })],
        extendedProps: {
          ...t,
          itemType: "task",
          editableFromCalendar: true,
        },
      }));

    const processEvents = calendarItems
      .filter((p) => p?.itemType === "process" && p?.start && p?.title)
      .map((p) => {
        const processStart = resolveProcessCalendarStart(p) || p.start;
        const processDue = resolveProcessCalendarDue(p, processStart) || p.due || processStart;

        return {
          id: `process-${p.id}`,
          title: `Proceso · ${p.title}`,
          start: processStart,
          end: addDaysYYYYMMDD(processDue, 1),
          allDay: true,
          display: "block",
          editable: false,
          startEditable: false,
          durationEditable: false,
          classNames: ["calendar-event-process-readonly"],
          extendedProps: {
            ...p,
            start: processStart,
            due: processDue,
            itemType: "process",
            editableFromCalendar: false,
          },
        };
      });

    return [...processEvents, ...taskEvents];
  }, [tasks, calendarItems]);

  const handleCalendarEventClick = (info) => {
    const item = info?.event?.extendedProps || null;
    if (!item) return;

    if (item.itemType === "process") {
      setSelectedProcessNotice(item);
      return;
    }

    if (item.itemType === "task") {
      handleEditClick(item);
    }
  };

  return (
    <div className="page tareas-master-page">
      <style>{`
        .tareas-master-page {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .tasks-command-hero {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          padding: 1.25rem;
          border: 1px solid rgba(34, 197, 94, 0.18);
          background:
            radial-gradient(circle at 12% 12%, rgba(34,197,94,0.22), transparent 34%),
            radial-gradient(circle at 82% 18%, rgba(20,184,166,0.16), transparent 28%),
            linear-gradient(135deg, rgba(15,23,42,0.96), rgba(3,7,18,0.94));
          box-shadow: 0 24px 70px rgba(0,0,0,0.32);
        }

        .tasks-command-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent, rgba(255,255,255,0.06), transparent);
          transform: translateX(-80%);
          pointer-events: none;
        }

        .tasks-command-hero:hover::before {
          animation: taskHeroSweep 1.4s ease;
        }

        @keyframes taskHeroSweep {
          to { transform: translateX(80%); }
        }

        .tasks-command-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }

        .tasks-page-title {
          margin: 0;
          font-size: clamp(1.7rem, 3vw, 2.35rem);
          color: #f8fafc;
          letter-spacing: -0.04em;
        }

        .tasks-farm-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(15,23,42,0.68);
          color: rgba(226,232,240,0.9);
          padding: 0.6rem 0.8rem;
          border-radius: 999px;
          font-size: 0.86rem;
          backdrop-filter: blur(14px);
        }

        .control-center-panel {
          position: relative;
          z-index: 1;
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(2,6,23,0.46);
          backdrop-filter: blur(18px);
        }

        .control-center-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .control-center-title {
          margin: 0;
          font-size: 1.05rem;
          color: #e2e8f0;
          letter-spacing: 0.01em;
        }

        .control-center-actions {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          flex-wrap: wrap;
        }

        .master-btn {
          border: 1px solid rgba(34,197,94,0.26);
          background: linear-gradient(135deg, rgba(22,163,74,0.95), rgba(20,184,166,0.78));
          color: #f8fafc;
          border-radius: 14px;
          padding: 0.72rem 1rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 14px 34px rgba(34,197,94,0.18);
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
        }

        .master-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.06);
          box-shadow: 0 18px 44px rgba(34,197,94,0.28);
        }

        .master-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .master-ghost-btn {
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(15,23,42,0.65);
          color: rgba(226,232,240,0.9);
          border-radius: 14px;
          padding: 0.72rem 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform .18s ease, border-color .18s ease, background .18s ease;
        }

        .master-ghost-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(34,197,94,0.34);
          background: rgba(15,23,42,0.86);
        }

        .master-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.8rem;
          margin-bottom: 1rem;
        }

        .master-stat-card {
          min-height: 96px;
          border-radius: 20px;
          padding: 0.95rem;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(15,23,42,0.62);
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
        }

        .master-stat-card:hover {
          transform: translateY(-2px);
          border-color: rgba(34,197,94,0.24);
          box-shadow: 0 18px 38px rgba(0,0,0,0.26);
        }

        .master-stat-label {
          display: block;
          color: rgba(203,213,225,0.76);
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .master-stat-value {
          display: block;
          margin-top: 0.5rem;
          color: #f8fafc;
          font-size: 2rem;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.05em;
        }

        .master-stat-note {
          display: block;
          margin-top: 0.45rem;
          color: rgba(148,163,184,0.84);
          font-size: 0.82rem;
        }

        .calendar-shell-pro {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(148,163,184,0.14);
          background: rgba(15,23,42,0.54);
          padding: 0.85rem;
          min-height: 760px;
          contain: layout paint;
        }

        .calendar-shell-pro .fc {
          color: #e5e7eb;
          min-height: 720px;
        }

        .calendar-shell-pro .fc-toolbar-title {
          color: #f8fafc;
          font-size: clamp(1rem, 2vw, 1.35rem);
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .calendar-shell-pro .fc-button {
          border: 1px solid rgba(148,163,184,0.18) !important;
          background: rgba(15,23,42,0.88) !important;
          color: #e2e8f0 !important;
          border-radius: 12px !important;
          box-shadow: none !important;
          text-transform: capitalize !important;
          font-weight: 700 !important;
          transition: transform .16s ease, border-color .16s ease, background .16s ease !important;
        }

        .calendar-shell-pro .fc-button:hover,
        .calendar-shell-pro .fc-button-active {
          border-color: rgba(34,197,94,0.36) !important;
          background: rgba(22,163,74,0.24) !important;
        }

        .calendar-shell-pro .fc-theme-standard td,
        .calendar-shell-pro .fc-theme-standard th,
        .calendar-shell-pro .fc-scrollgrid {
          border-color: rgba(148,163,184,0.12) !important;
        }

        .calendar-shell-pro .fc-scrollgrid {
          border-radius: 22px;
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(15,23,42,0.92), rgba(2,6,23,0.86));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .calendar-shell-pro .fc-col-header-cell {
          position: relative;
          overflow: hidden;
          padding: 0 !important;
          background:
            radial-gradient(circle at 50% 0%, rgba(34,197,94,0.18), transparent 58%),
            linear-gradient(180deg, rgba(30,41,59,0.96), rgba(15,23,42,0.92)) !important;
          border-bottom: 1px solid rgba(34,197,94,0.20) !important;
        }

        .calendar-shell-pro .fc-col-header-cell::after {
          content: "";
          position: absolute;
          left: 14%;
          right: 14%;
          bottom: 0;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(34,197,94,0.64), transparent);
          opacity: 0.55;
        }

        .calendar-shell-pro .fc-col-header-cell-cushion {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          padding: 0.85rem 0.75rem !important;
          color: rgba(248,250,252,0.92) !important;
          font-size: clamp(0.9rem, 1.4vw, 1.05rem);
          font-weight: 900;
          letter-spacing: -0.02em;
          text-decoration: none !important;
          text-transform: lowercase;
          text-shadow: 0 1px 16px rgba(0,0,0,0.34);
        }

        .calendar-shell-pro .fc-day-today .fc-col-header-cell-cushion,
        .calendar-shell-pro .fc-col-header-cell.fc-day-today .fc-col-header-cell-cushion {
          color: #bbf7d0 !important;
          text-shadow: 0 0 22px rgba(34,197,94,0.48);
        }

        .calendar-shell-pro .fc-daygrid-day,
        .calendar-shell-pro .fc-timegrid-slot,
        .calendar-shell-pro .fc-list-day-cushion,
        .calendar-shell-pro .fc-list-table td {
          background: rgba(2,6,23,0.30) !important;
        }

        .calendar-shell-pro .fc-daygrid-day-frame {
          padding: 0.18rem;
        }

        .calendar-shell-pro .fc-day-today {
          background:
            linear-gradient(180deg, rgba(34,197,94,0.13), rgba(20,184,166,0.06)) !important;
        }

        .calendar-shell-pro .fc-daygrid-day-number {
          color: rgba(226,232,240,0.86) !important;
          font-weight: 900;
          padding: 0.55rem 0.65rem !important;
          text-decoration: none !important;
        }

        .calendar-shell-pro .fc-event {
          border: 1px solid rgba(255,255,255,0.12) !important;
          border-radius: 999px !important;
          padding: 0 !important;
          cursor: pointer;
          overflow: hidden;
          box-shadow:
            0 10px 26px rgba(0,0,0,0.26),
            inset 0 1px 0 rgba(255,255,255,0.14);
          transform: none !important;
          transition: transform .16s ease, filter .16s ease, border-color .16s ease, box-shadow .16s ease !important;
        }

        .calendar-shell-pro .fc-event:hover {
          transform: translateY(-1px) !important;
          filter: brightness(1.08) saturate(1.06);
          border-color: rgba(255,255,255,0.22) !important;
          box-shadow:
            0 14px 32px rgba(0,0,0,0.32),
            0 0 24px rgba(34,197,94,0.12),
            inset 0 1px 0 rgba(255,255,255,0.18) !important;
        }

        .calendar-shell-pro .fc-daygrid-event,
        .calendar-shell-pro .fc-timegrid-event {
          min-height: 31px;
          margin: 0.16rem 0.35rem;
        }

        .calendar-shell-pro .fc-daygrid-block-event .fc-event-main,
        .calendar-shell-pro .fc-timegrid-event .fc-event-main {
          display: flex;
          align-items: center;
          min-width: 0;
          height: 100%;
          color: #f8fafc !important;
        }

        .calendar-loading-layer {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: grid;
          place-items: center;
          background: linear-gradient(180deg, rgba(2,6,23,0.74), rgba(15,23,42,0.66));
          backdrop-filter: blur(8px);
          pointer-events: none;
        }

        .calendar-loading-card {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.75rem 0.95rem;
          border-radius: 999px;
          border: 1px solid rgba(34,197,94,0.22);
          background: rgba(15,23,42,0.88);
          color: #e5e7eb;
          font-weight: 800;
          box-shadow: 0 18px 48px rgba(0,0,0,0.28);
        }

        .calendar-event-task {
          background:
            linear-gradient(90deg, rgba(37,99,235,0.96), rgba(14,165,233,0.78)) !important;
        }

        .calendar-event-progress {
          background:
            linear-gradient(90deg, rgba(217,119,6,0.98), rgba(245,158,11,0.80)) !important;
        }

        .calendar-event-done {
          background:
            linear-gradient(90deg, rgba(21,128,61,0.96), rgba(16,185,129,0.78)) !important;
        }

        .calendar-event-high {
          background:
            linear-gradient(90deg, rgba(220,38,38,0.96), rgba(244,63,94,0.80)) !important;
        }

        .calendar-event-process-readonly {
          background:
            linear-gradient(90deg, rgba(126,34,206,0.98), rgba(79,70,229,0.82)) !important;
          cursor: help !important;
        }

        .calendar-event-inner-pro {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.52rem;
          width: 100%;
          min-width: 0;
          min-height: 31px;
          padding: 0.32rem 0.72rem 0.32rem 0.48rem;
          font-size: clamp(0.76rem, 1vw, 0.86rem);
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: -0.015em;
        }

        .calendar-event-inner-pro::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.18), transparent 48%),
            radial-gradient(circle at 0% 50%, rgba(255,255,255,0.14), transparent 38%);
          opacity: 0.75;
          pointer-events: none;
        }

        .calendar-event-kind {
          position: relative;
          z-index: 1;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          color: #f8fafc;
          font-size: 0.72rem;
          font-weight: 1000;
          background: rgba(15,23,42,0.28);
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), 0 6px 18px rgba(0,0,0,0.24);
        }

        .calendar-event-dot {
          position: relative;
          z-index: 1;
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(255,255,255,0.92);
          box-shadow: 0 0 12px rgba(255,255,255,0.34);
          flex: 0 0 auto;
        }

        .calendar-event-title-pro {
          position: relative;
          z-index: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-shadow: 0 1px 12px rgba(0,0,0,0.42);
        }

        .calendar-event-stage-pro {
          position: relative;
          z-index: 1;
          flex: 0 0 auto;
          opacity: 0.78;
          font-weight: 800;
          white-space: nowrap;
        }

        .calendar-event-stage-pro::before {
          content: "•";
          margin-right: 0.45rem;
          opacity: 0.72;
        }

        .master-lower-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(320px, 0.55fr);
          gap: 1rem;
          align-items: start;
        }

        .task-editor-pro.card,
        .filters-pro.card,
        .table-pro.card {
          border-radius: 24px;
          border: 1px solid rgba(148,163,184,0.14);
          background:
            radial-gradient(circle at 8% 0%, rgba(34,197,94,0.10), transparent 32%),
            rgba(15,23,42,0.58);
          box-shadow: 0 18px 50px rgba(0,0,0,0.18);
        }

        .compact-section-title {
          margin: 0 0 0.75rem;
          color: #f8fafc;
          font-size: 1rem;
          letter-spacing: -0.02em;
        }

        .operation-note {
          margin: -0.35rem 0 1rem;
          opacity: 0.72;
          font-size: 0.88rem;
        }

        .readonly-chip {
          display: inline-flex;
          align-items: center;
          padding: 0.35rem 0.55rem;
          border-radius: 999px;
          border: 1px solid rgba(168,85,247,0.28);
          background: rgba(168,85,247,0.12);
          color: rgba(233,213,255,0.95);
          font-size: 0.78rem;
          font-weight: 800;
        }

        .fc .fc-list-event.calendar-event-process-readonly td {
          background: rgba(88,28,135,0.22) !important;
        }

        .fc .fc-list-event.calendar-event-high td {
          background: rgba(127,29,29,0.22) !important;
        }

        .tareas-master-page,
        .calendar-shell-pro,
        .calendar-shell-pro .fc-scroller,
        .table-pro,
        .filters-pro,
        .task-editor-pro {
          scrollbar-width: thin;
          scrollbar-color: rgba(34,197,94,0.55) rgba(15,23,42,0.26);
        }

        .tareas-master-page ::-webkit-scrollbar,
        .calendar-shell-pro ::-webkit-scrollbar,
        .table-pro ::-webkit-scrollbar,
        .filters-pro ::-webkit-scrollbar,
        .task-editor-pro ::-webkit-scrollbar {
          width: 9px;
          height: 9px;
        }

        .tareas-master-page ::-webkit-scrollbar-track,
        .calendar-shell-pro ::-webkit-scrollbar-track,
        .table-pro ::-webkit-scrollbar-track,
        .filters-pro ::-webkit-scrollbar-track,
        .task-editor-pro ::-webkit-scrollbar-track {
          background: rgba(15,23,42,0.22);
          border-radius: 999px;
        }

        .tareas-master-page ::-webkit-scrollbar-thumb,
        .calendar-shell-pro ::-webkit-scrollbar-thumb,
        .table-pro ::-webkit-scrollbar-thumb,
        .filters-pro ::-webkit-scrollbar-thumb,
        .task-editor-pro ::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(34,197,94,0.78), rgba(20,184,166,0.64));
          border: 2px solid rgba(15,23,42,0.55);
          box-shadow: 0 0 14px rgba(34,197,94,0.12);
        }

        .tareas-master-page ::-webkit-scrollbar-thumb:hover,
        .calendar-shell-pro ::-webkit-scrollbar-thumb:hover,
        .table-pro ::-webkit-scrollbar-thumb:hover,
        .filters-pro ::-webkit-scrollbar-thumb:hover,
        .task-editor-pro ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(34,197,94,0.96), rgba(20,184,166,0.84));
          box-shadow: 0 0 20px rgba(34,197,94,0.22);
        }

        .calendar-shell-pro .fc-event.calendar-event-process-readonly {
          transition: transform .16s ease, box-shadow .16s ease, filter .16s ease !important;
        }

        .calendar-shell-pro .fc-event.calendar-event-process-readonly:hover {
          transform: translateY(-1px) !important;
          filter: brightness(1.08);
          box-shadow: 0 14px 30px rgba(88,28,135,0.30), 0 0 22px rgba(168,85,247,0.20) !important;
        }

        .agro-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 1rem;
          background:
            radial-gradient(circle at 50% 18%, rgba(34,197,94,0.16), transparent 26%),
            rgba(2,6,23,0.72);
          backdrop-filter: blur(12px);
          animation: agroModalFade .16s ease both;
        }

        .agro-modal-card {
          width: min(520px, 100%);
          border-radius: 26px;
          border: 1px solid rgba(34,197,94,0.24);
          background:
            radial-gradient(circle at 12% 0%, rgba(34,197,94,0.18), transparent 32%),
            radial-gradient(circle at 90% 12%, rgba(168,85,247,0.14), transparent 28%),
            linear-gradient(160deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98));
          box-shadow: 0 28px 84px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.04);
          overflow: hidden;
          animation: agroModalPop .18s ease both;
        }

        .agro-modal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.15rem 1.15rem 0.85rem;
        }

        .agro-modal-title-row {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          min-width: 0;
        }

        .agro-modal-icon {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(34,197,94,0.26);
          background: rgba(34,197,94,0.13);
          color: #bbf7d0;
          font-weight: 900;
          box-shadow: 0 0 28px rgba(34,197,94,0.12);
          flex: 0 0 auto;
        }

        .agro-modal-title {
          margin: 0;
          color: #f8fafc;
          font-size: 1.05rem;
          letter-spacing: -0.03em;
        }

        .agro-modal-subtitle {
          margin: 0.25rem 0 0;
          color: rgba(203,213,225,0.76);
          font-size: 0.84rem;
          line-height: 1.35;
        }

        .agro-modal-close {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(15,23,42,0.72);
          color: rgba(226,232,240,0.85);
          cursor: pointer;
          transition: transform .16s ease, border-color .16s ease, background .16s ease;
        }

        .agro-modal-close:hover {
          transform: translateY(-1px);
          border-color: rgba(34,197,94,0.34);
          background: rgba(34,197,94,0.12);
        }

        .agro-modal-body {
          padding: 0 1.15rem 1rem;
        }

        .agro-modal-metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.7rem;
          margin-top: 0.8rem;
        }

        .agro-modal-metric {
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.14);
          background: rgba(15,23,42,0.62);
          padding: 0.78rem;
        }

        .agro-modal-metric span {
          display: block;
          color: rgba(148,163,184,0.84);
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .agro-modal-metric strong {
          display: block;
          margin-top: 0.36rem;
          color: #f8fafc;
          font-size: 0.96rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .agro-modal-progress {
          margin-top: 1rem;
          padding: 0.85rem;
          border-radius: 18px;
          border: 1px solid rgba(34,197,94,0.16);
          background: rgba(2,6,23,0.42);
        }

        .agro-modal-progress-head {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          color: rgba(226,232,240,0.84);
          font-size: 0.78rem;
          font-weight: 800;
          margin-bottom: 0.48rem;
        }

        .agro-modal-progress-track {
          height: 9px;
          border-radius: 999px;
          background: rgba(148,163,184,0.16);
          overflow: hidden;
        }

        .agro-modal-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, rgba(34,197,94,0.96), rgba(20,184,166,0.86));
          box-shadow: 0 0 18px rgba(34,197,94,0.24);
        }

        .agro-modal-note {
          margin: 0.9rem 0 0;
          color: rgba(226,232,240,0.72);
          line-height: 1.5;
          font-size: 0.88rem;
        }

        .agro-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.65rem;
          flex-wrap: wrap;
          padding: 0 1.15rem 1.15rem;
        }

        .agro-modal-danger {
          border-color: rgba(248,113,113,0.35) !important;
          background: linear-gradient(135deg, rgba(220,38,38,0.95), rgba(244,63,94,0.75)) !important;
        }

        @keyframes agroModalFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes agroModalPop {
          from { opacity: 0; transform: translateY(10px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 980px) {
          .master-stats-grid,
          .master-lower-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 720px) {
          .tasks-command-hero,
          .control-center-panel,
          .calendar-shell-pro {
            border-radius: 20px;
          }

          .master-stats-grid,
          .master-lower-grid {
            grid-template-columns: 1fr;
          }

          .calendar-shell-pro {
            min-height: 680px;
          }

          .calendar-shell-pro .fc {
            min-height: 640px;
          }

          .calendar-shell-pro .fc-header-toolbar {
            display: grid;
            grid-template-columns: 1fr;
            gap: 0.7rem;
          }

          .calendar-shell-pro .fc-toolbar-chunk {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
          }
        }
      `}</style>

      {(errorMsg || loading) && (
        <section className="card" style={{ marginBottom: "0.25rem" }}>
          {loading ? (
            <p style={{ margin: 0, opacity: 0.85 }}>Cargando tareas…</p>
          ) : (
            <p style={{ margin: 0, opacity: 0.85 }}>{errorMsg}</p>
          )}
        </section>
      )}

      <section className="tasks-command-hero">
        <div className="tasks-command-topline">
          <h1 className="tasks-page-title">Tareas</h1>

          <div className="tasks-farm-pill">
            <span>🌱</span>
            <strong>{farmsLoading ? "Cargando finca…" : activeFarmName}</strong>
          </div>
        </div>

        <div className="control-center-panel">
          <div className="control-center-head">
            <h2 className="control-center-title">Centro de Control</h2>

            <div className="control-center-actions">
              <span className="readonly-chip">Procesos: solo vista</span>
              <button
                type="button"
                className="master-ghost-btn"
                onClick={() => {
                  fetchTasks();
                  fetchSuggestions();
                  fetchCalendarItems();
                }}
                disabled={loading || saving}
              >
                Actualizar
              </button>
              <button
                type="button"
                className="master-btn"
                onClick={() => {
                  handleResetForm();
                  scrollToEditor();
                }}
                disabled={saving}
              >
                + Nueva tarea
              </button>
            </div>
          </div>

          <div className="master-stats-grid">
            <div className="master-stat-card">
              <span className="master-stat-label">Hoy / semana</span>
              <span className="master-stat-value">{summary.week}</span>
              <span className="master-stat-note">Movimientos próximos</span>
            </div>

            <div className="master-stat-card">
              <span className="master-stat-label">Vencidas</span>
              <span className="master-stat-value">{summary.overdue}</span>
              <span className="master-stat-note">Requieren atención</span>
            </div>

            <div className="master-stat-card">
              <span className="master-stat-label">En progreso</span>
              <span className="master-stat-value">{summary.inProgress}</span>
              <span className="master-stat-note">Tareas activas</span>
            </div>

            <div className="master-stat-card">
              <span className="master-stat-label">Procesos visibles</span>
              <span className="master-stat-value">{summary.activeProcesses}</span>
              <span className="master-stat-note">Lectura desde Process Lab</span>
            </div>
          </div>

          <div className="calendar-shell-pro">
            <FullCalendar
              key={`calendar-${farmId || "no-farm"}`}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
              }}
              buttonText={{
                today: "Hoy",
                month: "Mes",
                week: "Semana",
                day: "Día",
                list: "Agenda",
              }}
              locale="es"
              height={720}
              contentHeight={650}
              expandRows={true}
              handleWindowResize={false}
              stickyHeaderDates={true}
              allDaySlot={true}
              allDayText="Todo el día"
              eventDisplay="block"
              displayEventTime={false}
              events={calendarEvents}
              eventClick={handleCalendarEventClick}
              eventContent={(arg) => {
                const itemType = arg?.event?.extendedProps?.itemType;
                const cleanTitle = arg.event.title.replace(/^Proceso · /, "");
                const titleParts = cleanTitle.split(" · ");
                const mainTitle = titleParts[0] || cleanTitle;
                const stageTitle = titleParts.slice(1).join(" · ");

                return (
                  <div className="calendar-event-inner-pro" title={cleanTitle}>
                    <span className="calendar-event-kind">
                      {itemType === "process" ? "PL" : "T"}
                    </span>
                    <span className="calendar-event-title-pro">
                      {mainTitle}
                    </span>
                    {stageTitle && (
                      <span className="calendar-event-stage-pro">
                        {stageTitle}
                      </span>
                    )}
                  </div>
                );
              }}
            />

            {calendarLoading && (
              <div className="calendar-loading-layer" aria-live="polite">
                <div className="calendar-loading-card">
                  <span>Sincronizando calendario...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="master-lower-grid">
        <section className="task-editor task-editor-pro card">
          <h3 className="compact-section-title">
            {editingId ? "Editar tarea" : "Nueva tarea"}
          </h3>
          <p className="operation-note">
            Las tareas creadas aquí sí se editan desde el calendario. Los procesos solo se consultan.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="task-editor-grid">
              <div className="task-field">
                <label>Título</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFormChange("title", e.target.value)}
                  placeholder="Ej: Revisar cerca norte"
                  disabled={saving}
                />
              </div>

              <div className="task-field">
                <label>Zona / elemento</label>
                <select
                  value={formData.zone || GENERAL_ZONE_OPTION}
                  onChange={(e) => handleFormChange("zone", e.target.value)}
                  disabled={saving}
                >
                  {taskZoneOptions.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="task-field">
                <label>Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => handleFormChange("type", e.target.value)}
                  disabled={saving}
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="task-field">
                <label>Prioridad</label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleFormChange("priority", e.target.value)}
                  disabled={saving}
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="task-field">
                <label>Inicio</label>
                <input
                  type="date"
                  value={formData.start}
                  onChange={(e) => handleFormChange("start", e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="task-field">
                <label>Vence</label>
                <input
                  type="date"
                  value={formData.due}
                  onChange={(e) => handleFormChange("due", e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="task-field">
                <label>Estado</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleFormChange("status", e.target.value)}
                  disabled={saving}
                >
                  {ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="task-field">
                <label>Responsable</label>
                <input
                  type="text"
                  value={formData.owner}
                  onChange={(e) => handleFormChange("owner", e.target.value)}
                  placeholder="Ej: José, Personal..."
                  disabled={saving}
                />
              </div>
            </div>

            <div className="task-editor-actions">
              <button type="submit" className="primary-btn" disabled={saving}>
                {saving
                  ? "Guardando…"
                  : editingId
                  ? "Guardar cambios"
                  : "Crear tarea"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleResetForm}
                  disabled={saving}
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="filters-pro card">
          <h3 className="compact-section-title">Vista operativa</h3>

          <div className="filters-bar" style={{ margin: 0 }}>
            <div className="filter-group">
              <label>Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={saving}
              >
                <option value="Todas">Todas</option>
                <option value="En progreso">En progreso</option>
                <option value="Completada">Completada</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Tipo</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                disabled={saving}
              >
                <option value="Todas">Todas</option>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Zona</label>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                disabled={saving}
              >
                <option value="Todas">Todas</option>
                {zoneOptions.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group filter-group-wide">
              <label>Buscar</label>
              <input
                type="text"
                placeholder="Buscar por tarea, zona o responsable..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
        </section>
      </div>

      <section className="table-pro card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Prioridad</th>
              <th>Tarea</th>
              <th>Zona / elemento</th>
              <th>Tipo</th>
              <th>Inicio</th>
              <th>Vence</th>
              <th>Estado</th>
              <th>Responsable</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <span className={getPriorityClass(task.priority)}>
                    {task.priority}
                  </span>
                </td>
                <td>{task.title}</td>
                <td>
                  <div className="task-zone-cell">
                    <span>{task.zone}</span>
                    <div className="task-zone-actions">
                      {onOpenZoneInMap && task.zone && (
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => onOpenZoneInMap(task.zone)}
                          disabled={saving}
                        >
                          Ver en mapa
                        </button>
                      )}
                    </div>
                  </div>
                </td>
                <td>{task.type}</td>
                <td>{task.start}</td>
                <td>{task.due}</td>
                <td>
                  <span className={getStatusClass(task.status)}>
                    {task.status}
                  </span>
                </td>
                <td>{task.owner}</td>
                <td>
                  <div className="task-actions">
                    <button
                      type="button"
                      className="small-btn"
                      onClick={() => handleEditClick(task)}
                      disabled={saving}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="small-btn small-btn-danger"
                      onClick={() => handleDeleteClick(task.id)}
                      disabled={saving}
                    >
                      Borrar
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", opacity: 0.7 }}>
                  {loading ? "Cargando…" : "No hay tareas todavía. Creá la primera."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {selectedProcessNotice && (
        <div className="agro-modal-backdrop" role="dialog" aria-modal="true">
          <div className="agro-modal-card">
            <div className="agro-modal-head">
              <div className="agro-modal-title-row">
                <span className="agro-modal-icon">PL</span>
                <div>
                  <h3 className="agro-modal-title">Proceso de solo lectura</h3>
                  <p className="agro-modal-subtitle">
                    Este evento viene desde Process Lab y se muestra aquí como referencia estratégica.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="agro-modal-close"
                onClick={() => setSelectedProcessNotice(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="agro-modal-body">
              <div className="agro-modal-metrics">
                <div className="agro-modal-metric">
                  <span>Proceso</span>
                  <strong>{selectedProcessNotice.title?.replace(/^Proceso · /, "") || "Proceso"}</strong>
                </div>
                <div className="agro-modal-metric">
                  <span>Zona</span>
                  <strong>{selectedProcessNotice.zoneName || selectedProcessNotice.zone || "—"}</strong>
                </div>
                <div className="agro-modal-metric">
                  <span>Inicio</span>
                  <strong>{formatCalendarDate(selectedProcessNotice.start)}</strong>
                </div>
                <div className="agro-modal-metric">
                  <span>Final</span>
                  <strong>{formatCalendarDate(selectedProcessNotice.due)}</strong>
                </div>
              </div>

              <div className="agro-modal-progress">
                <div className="agro-modal-progress-head">
                  <span>Estado operativo</span>
                  <span>{selectedProcessNotice.status || "Activo"}</span>
                </div>
                <div className="agro-modal-progress-track">
                  <div
                    className="agro-modal-progress-fill"
                    style={{ width: selectedProcessNotice.status === "Completado" ? "100%" : "64%" }}
                  />
                </div>
              </div>

              <p className="agro-modal-note">
                Para editar etapas, fechas o avance, abrí el proceso desde Process Lab.
                El Calendario Maestro mantiene esta información como lectura segura para evitar cambios accidentales.
              </p>
            </div>

            <div className="agro-modal-actions">
              {onOpenZoneInMap && selectedProcessNotice.zoneName && (
                <button
                  type="button"
                  className="master-ghost-btn"
                  onClick={() => {
                    onOpenZoneInMap(selectedProcessNotice.zoneName);
                    setSelectedProcessNotice(null);
                  }}
                >
                  Abrir zona
                </button>
              )}
              <button
                type="button"
                className="master-btn"
                onClick={() => setSelectedProcessNotice(null)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteTaskId && (
        <div className="agro-modal-backdrop" role="dialog" aria-modal="true">
          <div className="agro-modal-card">
            <div className="agro-modal-head">
              <div className="agro-modal-title-row">
                <span className="agro-modal-icon">!</span>
                <div>
                  <h3 className="agro-modal-title">Eliminar tarea</h3>
                  <p className="agro-modal-subtitle">
                    Esta acción quitará la tarea del Calendario Maestro. No vamos a hacer magia negra: si se elimina, se elimina.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="agro-modal-close"
                onClick={closeDeleteModal}
                aria-label="Cerrar"
                disabled={saving}
              >
                ×
              </button>
            </div>

            <div className="agro-modal-body">
              <div className="agro-modal-metrics">
                <div className="agro-modal-metric">
                  <span>Tarea</span>
                  <strong>{pendingDeleteTask?.title || "Tarea"}</strong>
                </div>
                <div className="agro-modal-metric">
                  <span>Vence</span>
                  <strong>{formatCalendarDate(pendingDeleteTask?.due)}</strong>
                </div>
              </div>
            </div>

            <div className="agro-modal-actions">
              <button type="button" className="master-ghost-btn" onClick={closeDeleteModal} disabled={saving}>
                Cancelar
              </button>
              <button type="button" className="master-btn agro-modal-danger" onClick={confirmDeleteTask} disabled={saving}>
                {saving ? "Eliminando…" : "Eliminar tarea"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}