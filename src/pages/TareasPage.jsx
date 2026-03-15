// src/pages/TareasPage.jsx
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";

import { useEffect, useMemo, useState, useCallback } from "react";
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

const EMPTY_FORM = {
  title: "",
  zone: "",
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

function getActiveFarmId() {
  return pickLocalStorage([
    "agromind_active_farm_id",
    "activeFarmId",
    "farmId",
    "agromind_farm_id",
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

function getWeatherSeverityLevel(risks) {
  if (risks.some((r) => r.level === "alert")) return "alert";
  if (risks.some((r) => r.level === "warning")) return "warning";
  return "info";
}

function buildWeatherRisk(weather) {
  if (!weather) return null;

  const risks = [];
  const recommendations = [];

  const temp = Number(weather.temperature ?? 0);
  const wind = Number(weather.windSpeed ?? 0);
  const humidity = Number(weather.humidity ?? 0);
  const uv = Number(weather.uvIndex ?? 0);
  const precipProb = Number(weather.precipitationProbability ?? 0);
  const precip = Number(weather.precipitation ?? 0);
  const weatherCode = Number(weather.weatherCode ?? -1);

  const rainyCodes = [
    51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
  ];

  const hasRainRisk =
    precipProb >= 55 || precip >= 0.8 || rainyCodes.includes(weatherCode);

  if (hasRainRisk) {
    const strongRain =
      precipProb >= 75 || precip >= 3 || [65, 82, 95, 96, 99].includes(weatherCode);

    risks.push({
      key: "rain",
      label: strongRain ? "Riesgo alto de lluvia" : "Probabilidad de lluvia",
      level: strongRain ? "alert" : "warning",
    });

    recommendations.push(
      strongRain
        ? "Evita programar cosecha, aplicaciones foliares o secado al aire libre."
        : "Revisa tareas de campo sensibles al agua antes de ejecutarlas."
    );
  }

  if (wind >= 30) {
    const strongWind = wind >= 45;
    risks.push({
      key: "wind",
      label: strongWind ? "Viento fuerte" : "Viento elevado",
      level: strongWind ? "alert" : "warning",
    });

    recommendations.push(
      strongWind
        ? "Pausa fumigación, trabajos en altura y manejo liviano de materiales."
        : "Toma precaución con aplicaciones y labores expuestas."
    );
  }

  if (humidity >= 88) {
    risks.push({
      key: "humidity",
      label: "Humedad alta",
      level: humidity >= 94 ? "warning" : "info",
    });

    recommendations.push(
      "La humedad favorece hongos, barro y retrasos operativos; prioriza revisión de drenajes y ventilación."
    );
  }

  if (uv >= 8) {
    risks.push({
      key: "uv",
      label: uv >= 11 ? "UV extremo" : "UV alto",
      level: uv >= 11 ? "alert" : "warning",
    });

    recommendations.push(
      "Programa labores pesadas temprano o al final de la tarde y protege al personal."
    );
  }

  if (temp >= 32) {
    recommendations.push(
      "La temperatura está alta; hidrata al personal y vigila animales, viveros y riegos."
    );
  }

  if (risks.length === 0) {
    recommendations.push(
      "Condiciones relativamente favorables para operación normal, con monitoreo básico."
    );
  }

  const level = getWeatherSeverityLevel(risks);

  let title = "Ventana operativa favorable";
  if (level === "warning") title = "Clima con atención operativa";
  if (level === "alert") title = "Clima con riesgo operativo";

  const summary =
    risks.length > 0
      ? risks.map((r) => r.label).join(" · ")
      : "Sin señales fuertes de riesgo inmediato";

  return {
    level,
    title,
    summary,
    recommendations,
    risks,
  };
}

function getWeatherBannerClass(level) {
  switch (level) {
    case "alert":
      return "weather-banner-alert";
    case "warning":
      return "weather-banner-warning";
    case "info":
      return "weather-banner-info";
    default:
      return "weather-banner-neutral";
  }
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
  farmId: farmIdProp,
  token: tokenProp,
}) {
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(false);
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

  const mapZones = Array.isArray(zonesFromMap) ? zonesFromMap : [];

  const API_BASE =
    import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";

  const token = tokenProp || getAuthToken();
  const farmId = farmIdProp || getActiveFarmId();

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
      return;
    }
    if (!token) {
      setTasks([]);
      setErrorMsg("No hay token. Inicia sesión nuevamente.");
      return;
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
    } catch (err) {
      setErrorMsg(err?.message || "No se pudieron cargar las tareas.");
      setTasks([]);
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

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      if (cancelled) return;
      await fetchTasks();
      if (cancelled) return;
      await fetchSuggestions();
      if (cancelled) return;
      await fetchWeather();
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [fetchTasks, fetchSuggestions, fetchWeather]);

  useEffect(() => {
    function onRefreshEvent(e) {
      const targetFarmId = e?.detail?.farmId ? String(e.detail.farmId) : "";
      if (targetFarmId && farmId && String(farmId) !== targetFarmId) return;
      fetchTasks();
      fetchSuggestions();
    }

    function onStorage(e) {
      if (e?.key !== "agromind_tasks_refresh") return;
      fetchTasks();
      fetchSuggestions();
    }

    window.addEventListener("agromind:tasks:refresh", onRefreshEvent);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("agromind:tasks:refresh", onRefreshEvent);
      window.removeEventListener("storage", onStorage);
    };
  }, [farmId, fetchTasks, fetchSuggestions]);

  const summary = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "Pendiente").length;
    const inProgress = tasks.filter((t) => t.status === "En progreso").length;
    const done = tasks.filter((t) => t.status === "Completada").length;
    return { total, pending, inProgress, done };
  }, [tasks]);

  const zoneOptions = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => t.zone && set.add(t.zone));
    mapZones.forEach((z) => z && set.add(z));
    return Array.from(set);
  }, [tasks, mapZones]);

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
      zone: (payload.zone || "").toString(),
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
      zone: task.zone || "",
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
    return tasks
      .filter((t) => t?.start && t?.due && t?.title)
      .map((t) => ({
        id: t.id,
        title: t.title,
        start: t.start,
        end: addDaysYYYYMMDD(t.due, 1),
        allDay: true,
      }));
  }, [tasks]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Tareas de la finca</h1>
        <p className="page-subtitle">
          Operación diaria, con datos reales desde backend. Si el mapa es el
          territorio, las tareas son la estrategia.
        </p>
      </header>

      {(errorMsg || loading) && (
        <section className="card" style={{ marginBottom: "1rem" }}>
          {loading ? (
            <p style={{ margin: 0, opacity: 0.85 }}>Cargando tareas…</p>
          ) : (
            <p style={{ margin: 0, opacity: 0.85 }}>{errorMsg}</p>
          )}
        </section>
      )}

      <section
        className={`card tasks-weather-card ${
          weatherRisk ? getWeatherBannerClass(weatherRisk.level) : "weather-banner-neutral"
        }`}
      >
        <div className="weather-operational-header">
          <div className="weather-operational-main">
            <h3 className="weather-operational-title">Clima operativo para tareas</h3>

            {weatherLoading ? (
              <p className="weather-operational-summary">
                Leyendo clima actual para afinar la operación…
              </p>
            ) : weatherError ? (
              <p className="weather-operational-summary">{weatherError}</p>
            ) : weatherData && weatherRisk ? (
              <>
                <p className="weather-operational-state">{weatherRisk.title}</p>

                <p className="weather-operational-summary">
                  {weatherRisk.summary}
                </p>

                <p className="weather-operational-location">
                  {weatherData.locationName} · {weatherData.weatherLabel}
                </p>

                <div className="weather-metrics">
                  <span className="status-badge">Temp: {weatherData.temperature}°C</span>
                  <span className="status-badge">Humedad: {weatherData.humidity}%</span>
                  <span className="status-badge">Viento: {weatherData.windSpeed} km/h</span>
                  <span className="status-badge">Lluvia: {weatherData.precipitation} mm</span>
                  <span className="status-badge">
                    Prob. lluvia: {weatherData.precipitationProbability}%
                  </span>
                  <span className="status-badge">UV: {weatherData.uvIndex}</span>
                </div>

                <div className="weather-tips">
                  {weatherRisk.recommendations.map((tip, idx) => (
                    <p key={idx} className="weather-tip">
                      • {tip}
                    </p>
                  ))}
                </div>

                {weatherTaskMatches.length > 0 && (
                  <div className="weather-task-impact">
                    <p className="weather-task-impact-title">
                      Tareas potencialmente afectadas ahora: {weatherTaskMatches.length}
                    </p>

                    <div className="weather-task-tags">
                      {weatherTaskMatches.slice(0, 6).map((task) => (
                        <span key={task.id} className="priority-badge priority-medium">
                          {task.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="weather-operational-summary">
                Sin lectura climática disponible todavía.
              </p>
            )}
          </div>

          <div className="weather-refresh-box">
            <button
              type="button"
              className="secondary-btn"
              onClick={fetchWeather}
              disabled={weatherLoading}
            >
              {weatherLoading ? "Actualizando clima…" : "Actualizar clima"}
            </button>
          </div>
        </div>
      </section>

      <section className="card ia-placeholder">
        <h3>Recomendaciones IA</h3>

        {loadingSuggestions ? (
          <p style={{ margin: 0, opacity: 0.85 }}>Analizando tu operación…</p>
        ) : visibleSuggestions.length === 0 ? (
          <p style={{ margin: 0, opacity: 0.85 }}>
            No hay sugerencias por ahora. (Eso también es una victoria: tu finca
            está en control.)
          </p>
        ) : (
          <div className="ai-suggestions-list ai-suggestions-row">
            {visibleSuggestions.map((s) => {
              const id = String(s?.id || s?._id || Math.random());
              const level = s?.level || "info";
              const title = s?.title || "Sugerencia";
              const message = s?.message || "";
              const canAdd = !!s?.actionPayload;
              const zone = s?.zone ? String(s.zone) : "";

              return (
                <div
                  key={id}
                  className={`ai-suggestion-card ai-suggestion-card-h ${getSuggestionClass(
                    level
                  )}`}
                >
                  <div className="ai-suggestion-head">
                    <div className="ai-suggestion-title">{title}</div>
                    {zone ? (
                      <div className="ai-suggestion-chip">{zone}</div>
                    ) : null}
                  </div>

                  {message ? (
                    <div className="ai-suggestion-message">{message}</div>
                  ) : null}

                  <div className="ai-suggestion-actions">
                    <button
                      type="button"
                      className="ai-suggestion-btn-primary"
                      disabled={!canAdd || saving}
                      onClick={() => applySuggestionToForm(s)}
                      title={
                        canAdd
                          ? "Precarga el formulario para que lo edites y lo guardes como tarea real"
                          : "Esta sugerencia es informativa (no genera tarea)"
                      }
                    >
                      + Agregar a tareas
                    </button>

                    <button
                      type="button"
                      className="ai-suggestion-btn-ghost"
                      disabled={saving}
                      onClick={() => ignoreSuggestion(s)}
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="tasks-summary">
        <div className="summary-card">
          <span className="summary-label">Total de tareas</span>
          <span className="summary-value">{summary.total}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Pendientes</span>
          <span className="summary-value summary-value-warning">
            {summary.pending}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">En progreso</span>
          <span className="summary-value summary-value-info">
            {summary.inProgress}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Completadas</span>
          <span className="summary-value summary-value-ok">{summary.done}</span>
        </div>
      </section>

      <section className="task-editor card">
        <h3>{editingId ? "Editar tarea" : "Nueva tarea"}</h3>

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
              <div className="task-zone-input-row">
                <input
                  type="text"
                  value={formData.zone}
                  onChange={(e) => handleFormChange("zone", e.target.value)}
                  placeholder="Ej: Zona de vivero, Calle 1..."
                  disabled={saving}
                />
                {mapZones.length > 0 && (
                  <select
                    value=""
                    disabled={saving}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) return;
                      handleFormChange("zone", value);
                    }}
                  >
                    <option value="">Zonas del mapa</option>
                    {mapZones.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                )}
              </div>
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

      <section className="filters-bar">
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
      </section>

      <section className="card">
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

      <section className="card tasks-calendar">
        <h3>Calendario de tareas</h3>

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listYear",
          }}
          locale="es"
          height="auto"
          events={calendarEvents}
        />
      </section>
    </div>
  );
}