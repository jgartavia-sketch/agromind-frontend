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
    case "Pendiente":
      return "status-badge status-pending";
    case "En progreso":
      return "status-badge status-progress";
    case "Completada":
      return "status-badge status-done";
    default:
      return "status-badge";
  }
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
const ESTADOS = ["Pendiente", "En progreso", "Completada"];
const GENERAL_ZONE_OPTION = "Zona general";

const EMPTY_FORM = {
  title: "",
  zone: GENERAL_ZONE_OPTION,
  type: "Mantenimiento",
  priority: "Media",
  start: "",
  due: "",
  status: "Pendiente",
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
      const start = toYYYYMMDD(item?.start || item?.startDate || item?.date);
      const due = toYYYYMMDD(
        item?.due || item?.end || item?.endDate || item?.estimatedEndDate || start
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

  useEffect(() => {
    fetchFarms();
  }, [fetchFarms]);

  const fetchMapZones = useCallback(async () => {
    const localCandidates = [
      contextActiveFarm,
      activeFarm,
      ...(Array.isArray(farms) ? farms : []),
    ];

    const localZones = localCandidates
      .filter(Boolean)
      .filter((farm) => {
        if (!farmId) return true;
        const candidateId = farm?.id || farm?._id || farm?.farmId;
        return !candidateId || String(candidateId) === String(farmId);
      })
      .flatMap((farm) => extractMapZoneNames(farm));

    const storedZones = readStoredMapZones(farmId);
    const collected = [...localZones, ...storedZones];

    if (farmId && token) {
      const ts = Date.now();
      const endpoints = [
        `/api/farms/${farmId}/map?ts=${ts}`,
        `/api/farms/${farmId}/zones?ts=${ts}`,
        `/api/map/${farmId}?ts=${ts}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const data = await apiFetch(endpoint);
          collected.push(...extractMapZoneNames(data));
        } catch {}
      }
    }

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
  }, [farmId, token, contextActiveFarm, activeFarm, farms, API_BASE]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!farmId || !token) {
      setSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const ts = Date.now();
      const data = await apiFetch(
        `/api/farms/${farmId}/tasks/suggestions?ts=${ts}`
      );
      const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
      setSuggestions(list);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [farmId, token, API_BASE]); // eslint-disable-line react-hooks/exhaustive-deps

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
        fetchSuggestions(),
        fetchMapZones(),
      ]);
    } finally {
      setCalendarLoading(false);
    }
  }, [fetchTasks, fetchCalendarItems, fetchSuggestions, fetchMapZones]);

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
        fetchSuggestions(),
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
  }, [fetchFarms, fetchTasks, fetchSuggestions, fetchCalendarItems, fetchMapZones, fetchWeather]);

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
    const pending = tasks.filter((t) => t.status === "Pendiente").length;
    const inProgress = tasks.filter((t) => t.status === "En progreso").length;
    const done = tasks.filter((t) => t.status === "Completada").length;
    const overdue = tasks.filter(isTaskOverdue).length;
    const week = tasks.filter((t) => isWithinNextDays(t.start) || isWithinNextDays(t.due)).length;
    const activeProcesses = calendarItems.filter(
      (p) =>
        p.itemType === "process" &&
        !["Finalizado", "Completado", "Cancelado"].includes(p.status)
    ).length;
    return { total, pending, inProgress, done, overdue, week, activeProcesses };
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
      window.dispatchEvent(
        new CustomEvent("agromind:tasks:refresh", { detail: { farmId } })
      );
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
      status: payload.status || "Pendiente",
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
      status: task.status || "Pendiente",
      owner: task.owner || "",
    });
    scrollToEditor();
  };

  const handleDeleteClick = async (id) => {
    const ok = window.confirm("¿Eliminar esta tarea?");
    if (!ok) return;

    setErrorMsg("");

    if (!farmId) {
      setErrorMsg("No hay finca activa.");
      return;
    }
    if (!token) {
      setErrorMsg("No hay token. Inicia sesión nuevamente.");
      return;
    }

    try {
      setSaving(true);
      await apiFetch(`/api/farms/${farmId}/tasks/${id}`, { method: "DELETE" });

      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) handleResetForm();

      fireTasksRefresh();
    } catch (err) {
      setErrorMsg(err?.message || "No se pudo eliminar la tarea.");
    } finally {
      setSaving(false);
    }
  };

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
      .map((p) => ({
        id: `process-${p.id}`,
        title: `Proceso · ${p.title}`,
        start: p.start,
        end: addDaysYYYYMMDD(p.due || p.start, 1),
        allDay: true,
        classNames: ["calendar-event-process-readonly"],
        extendedProps: {
          ...p,
          itemType: "process",
          editableFromCalendar: false,
        },
      }));

    return [...processEvents, ...taskEvents];
  }, [tasks, calendarItems]);

  const handleCalendarEventClick = (info) => {
    const item = info?.event?.extendedProps || null;
    if (!item) return;

    if (item.itemType === "process") {
      alert(
        "Este proceso se muestra solo como referencia operativa. Para editarlo, abre Process Lab."
      );
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

        .calendar-shell-pro .fc-col-header-cell {
          background: rgba(15,23,42,0.78);
          padding: 0.4rem 0;
        }

        .calendar-shell-pro .fc-daygrid-day,
        .calendar-shell-pro .fc-timegrid-slot,
        .calendar-shell-pro .fc-list-day-cushion,
        .calendar-shell-pro .fc-list-table td {
          background: rgba(2,6,23,0.28) !important;
        }

        .calendar-shell-pro .fc-day-today {
          background: rgba(34,197,94,0.10) !important;
        }

        .calendar-shell-pro .fc-event {
          border: 0 !important;
          border-radius: 10px !important;
          padding: 0.08rem 0.24rem !important;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(0,0,0,0.18);
          transform: none !important;
          transition: border-color .16s ease, background .16s ease, box-shadow .16s ease !important;
        }

        .calendar-shell-pro .fc-event:hover {
          transform: none !important;
          box-shadow: 0 10px 24px rgba(0,0,0,0.18);
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
          background: linear-gradient(135deg, rgba(59,130,246,0.88), rgba(14,165,233,0.72)) !important;
        }

        .calendar-event-progress {
          background: linear-gradient(135deg, rgba(245,158,11,0.9), rgba(217,119,6,0.7)) !important;
        }

        .calendar-event-done {
          background: linear-gradient(135deg, rgba(34,197,94,0.85), rgba(16,185,129,0.72)) !important;
        }

        .calendar-event-high {
          background: linear-gradient(135deg, rgba(239,68,68,0.92), rgba(244,63,94,0.74)) !important;
        }

        .calendar-event-process-readonly {
          background: linear-gradient(135deg, rgba(168,85,247,0.88), rgba(99,102,241,0.68)) !important;
          cursor: help !important;
        }

        .calendar-event-inner-pro {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          min-width: 0;
          font-size: 0.78rem;
          font-weight: 800;
        }

        .calendar-event-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,0.86);
          flex: 0 0 auto;
        }

        .calendar-event-title-pro {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
              events={calendarEvents}
              eventClick={handleCalendarEventClick}
              eventContent={(arg) => {
                const itemType = arg?.event?.extendedProps?.itemType;
                return (
                  <div className="calendar-event-inner-pro">
                    <span className="calendar-event-dot" />
                    <span className="calendar-event-title-pro">
                      {itemType === "process" ? "Proceso · " : ""}
                      {arg.event.title.replace(/^Proceso · /, "")}
                    </span>
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
                <option value="Pendiente">Pendiente</option>
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
    </div>
  );
}