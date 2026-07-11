// src/pages/ClimaPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/clima.css";
import { useFarm } from "../context/FarmContext";

const API_BASE =
  import.meta.env.VITE_API_URL || "https://agromind-backend-slem.onrender.com";

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
    const message =
      data && typeof data === "object" && data.error
        ? data.error
        : typeof data === "string" && data.trim()
        ? data
        : "Error en request.";
    throw new Error(message);
  }

  return data;
}


const WEATHER_CODE_LABELS = {
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
  82: "Chubascos fuertes",
  85: "Nevadas ligeras",
  86: "Nevadas fuertes",
  95: "Tormenta",
  96: "Tormenta con granizo ligero",
  99: "Tormenta con granizo fuerte",
};

function weatherLabel(code) {
  return WEATHER_CODE_LABELS[code] || "Condición variable";
}

function formatTemp(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  return `${Math.round(Number(value))}°C`;
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  return `${Math.round(Number(value))}%`;
}

function formatWind(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  return `${Math.round(Number(value))} km/h`;
}

function formatRain(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  return `${Math.round(Number(value))} mm`;
}

function formatHour(dateIso, timezone) {
  try {
    return new Intl.DateTimeFormat("es-CR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone || "America/Costa_Rica",
    }).format(new Date(dateIso));
  } catch {
    return dateIso;
  }
}

function formatDayLabel(dateIso, timezone) {
  try {
    const date = new Date(dateIso);
    const today = new Date();

    const fmtDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "America/Costa_Rica",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const todayStr = fmtDate.format(today);
    const itemStr = fmtDate.format(date);

    if (todayStr === itemStr) return "Hoy";

    return new Intl.DateTimeFormat("es-CR", {
      weekday: "long",
      timeZone: timezone || "America/Costa_Rica",
    }).format(date);
  } catch {
    return dateIso;
  }
}

function buildAlerts(weather) {
  if (!weather) return [];

  const alerts = [];
  const current = weather.current || {};
  const hourly = weather.hourly || {};
  const daily = weather.daily || {};

  const nextSixRain =
    (hourly.precipitation_probability || [])
      .slice(0, 6)
      .filter((v) => Number(v) >= 60).length > 0;

  const highHumiditySoon =
    (hourly.relative_humidity_2m || []).slice(0, 6).some((v) => Number(v) >= 85);

  const strongWindSoon =
    (hourly.wind_speed_10m || []).slice(0, 6).some((v) => Number(v) >= 20);

  const uv = Number(current.uv_index ?? 0);
  const currentRain = Number(current.precipitation ?? 0);
  const dailyRain = Number((daily.precipitation_probability_max || [])[0] ?? 0);

  if (nextSixRain || dailyRain >= 60 || currentRain > 0) {
    alerts.push(
      "Riesgo de lluvia relevante hoy. Revise aplicaciones, secado, cosecha y movimientos sensibles al agua."
    );
  }

  if (highHumiditySoon) {
    alerts.push(
      "Humedad alta detectada. Conviene vigilar hongos, secado de materiales y ventilación en áreas críticas."
    );
  }

  if (strongWindSoon) {
    alerts.push(
      "Se esperan ráfagas moderadas o fuertes. Ojo con aspersiones, plásticos, estructuras livianas y trabajo en altura."
    );
  }

  if (uv >= 8) {
    alerts.push(
      "Índice UV alto. Mejor programar labores pesadas temprano y proteger al personal en las horas más fuertes."
    );
  }

  if (!alerts.length) {
    alerts.push(
      "Condiciones relativamente estables en el corto plazo. Buena ventana para monitoreo, recorridos y labores generales."
    );
  }

  return alerts.slice(0, 3);
}

function parseFarmLocation(expectedFarmId) {
  try {
    const raw = localStorage.getItem("farmLocation");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const lat = Number(parsed?.lat);
    const lon = Number(parsed?.lon);
    const zoom = Number(parsed?.zoom);
    const locationFarmId = parsed?.farmId || null;

    if (expectedFarmId && locationFarmId && locationFarmId !== expectedFarmId) {
      return null;
    }

    if (expectedFarmId && !locationFarmId) {
      return null;
    }

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return {
        latitude: lat,
        longitude: lon,
        zoom: Number.isFinite(zoom) ? zoom : null,
        farmId: locationFarmId,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function getCoordsFromFarmContext(activeFarm) {
  const view = activeFarm?.view || null;
  const center = Array.isArray(view?.center)
    ? view.center
    : Array.isArray(activeFarm?.preferredCenter)
    ? activeFarm.preferredCenter
    : null;

  if (!Array.isArray(center) || center.length !== 2) return null;

  const lon = Number(center[0]);
  const lat = Number(center[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    latitude: lat,
    longitude: lon,
    zoom: typeof view?.zoom === "number" ? view.zoom : null,
    farmId: activeFarm?.id || null,
  };
}


function AccordionSection({
  title,
  subtitle,
  icon,
  children,
  defaultOpen = false,
  className = "",
}) {
  return (
    <details
      className={`clima-accordion ${className}`.trim()}
      open={defaultOpen}
    >
      <summary className="clima-accordion-summary">
        <span className="clima-accordion-heading">
          <span className="clima-accordion-icon" aria-hidden="true">
            {icon}
          </span>

          <span className="clima-accordion-copy">
            <strong>{title}</strong>
            {subtitle ? <span>{subtitle}</span> : null}
          </span>
        </span>

        <span className="clima-accordion-toggle" aria-hidden="true">
          <span>⌄</span>
        </span>
      </summary>

      <div className="clima-accordion-content">{children}</div>
    </details>
  );
}

export default function ClimaPage() {
  const [locationName, setLocationName] = useState("Ubicación de la finca no definida");
  const [coords, setCoords] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [error, setError] = useState("");
  const [hasFarmLocation, setHasFarmLocation] = useState(false);
  const { activeFarm, farmId, farmName } = useFarm();

  const timezone = weather?.timezone || "America/Costa_Rica";
  const activeFarmLabel =
    farmName || activeFarm?.name || (farmId ? "Finca activa" : "Sin finca activa");

  const resolveLocationNameByCoords = useCallback(async (latitude, longitude) => {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${encodeURIComponent(
        latitude
      )}&longitude=${encodeURIComponent(longitude)}&language=es&format=json`;

      const resp = await fetch(url);
      if (!resp.ok) return;

      const data = await resp.json();
      const first = data?.results?.[0];

      if (!first) return;

      const prettyName = [first.name, first.admin1, first.country]
        .filter(Boolean)
        .join(", ");

      if (prettyName) {
        setLocationName(prettyName);
      }
    } catch {
      // no-op
    }
  }, []);

  const fetchWeather = useCallback(async (latitude, longitude) => {
    if (
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined
    ) {
      return;
    }

    setLoadingWeather(true);
    setError("");

    try {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current:
          "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,cloud_cover,weather_code,uv_index,is_day",
        hourly:
          "temperature_2m,precipitation_probability,wind_speed_10m,relative_humidity_2m,weather_code",
        daily:
          "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
        forecast_days: "7",
        timezone: "auto",
      });

      const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
      const resp = await fetch(url);

      if (!resp.ok) {
        throw new Error("No se pudo consultar el clima.");
      }

      const data = await resp.json();
      setWeather(data);
    } catch (err) {
      setError(err.message || "No se pudo cargar el clima.");
      setWeather(null);
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncFarmWeatherContext = () => {
      if (!farmId) {
        setCoords(null);
        setWeather(null);
        setHasFarmLocation(false);
        setLocationName("Ubicación de la finca no definida");
        return;
      }

      const farmLocation = parseFarmLocation(farmId) || getCoordsFromFarmContext(activeFarm);

      if (cancelled) return;

      if (farmLocation) {
        setCoords({
          latitude: farmLocation.latitude,
          longitude: farmLocation.longitude,
        });
        setHasFarmLocation(true);
        setLocationName("Ubicación de la finca activa");
        resolveLocationNameByCoords(farmLocation.latitude, farmLocation.longitude);
        return;
      }

      setCoords(null);
      setWeather(null);
      setHasFarmLocation(false);
      setLocationName("Ubicación de la finca no definida");
    };

    syncFarmWeatherContext();

    const handleFarmLocationChange = () => {
      syncFarmWeatherContext();
    };

    window.addEventListener("agromind:farm:changed", handleFarmLocationChange);
    window.addEventListener("agromind:farm-location:changed", handleFarmLocationChange);
    window.addEventListener("storage", handleFarmLocationChange);

    return () => {
      cancelled = true;
      window.removeEventListener("agromind:farm:changed", handleFarmLocationChange);
      window.removeEventListener("agromind:farm-location:changed", handleFarmLocationChange);
      window.removeEventListener("storage", handleFarmLocationChange);
    };
  }, [activeFarm, farmId, resolveLocationNameByCoords]);

  useEffect(() => {
    if (!coords) return;
    fetchWeather(coords.latitude, coords.longitude);
  }, [coords, fetchWeather]);

  const current = weather?.current || null;

  const hourlyForecast = useMemo(() => {
    if (!weather?.hourly?.time) return [];

    return weather.hourly.time.slice(0, 12).map((time, index) => ({
      time,
      hour: formatHour(time, timezone),
      temp: formatTemp(weather.hourly.temperature_2m?.[index]),
      rain: formatPercent(weather.hourly.precipitation_probability?.[index]),
      humidity: formatPercent(weather.hourly.relative_humidity_2m?.[index]),
      wind: formatWind(weather.hourly.wind_speed_10m?.[index]),
      code: weather.hourly.weather_code?.[index],
    }));
  }, [weather, timezone]);

  const dailyForecast = useMemo(() => {
    if (!weather?.daily?.time) return [];

    return weather.daily.time.slice(0, 7).map((time, index) => ({
      date: time,
      day: formatDayLabel(time, timezone),
      summary: weatherLabel(weather.daily.weather_code?.[index]),
      max: formatTemp(weather.daily.temperature_2m_max?.[index]),
      min: formatTemp(weather.daily.temperature_2m_min?.[index]),
      rain: formatPercent(weather.daily.precipitation_probability_max?.[index]),
      sunrise: weather.daily.sunrise?.[index],
      sunset: weather.daily.sunset?.[index],
    }));
  }, [weather, timezone]);

  const alerts = useMemo(() => buildAlerts(weather), [weather]);

  const showEmptyState = !coords && !loadingLocation && !loadingWeather;

  return (
    <div className="clima-page">
      <style>{`
        .clima-page {
          --clima-green: #16a34a;
          --clima-green-dark: #166534;
          --clima-ink: #0f172a;
          --clima-muted: #64748b;
          --clima-line: rgba(15, 23, 42, 0.1);
        }

        .clima-page .clima-active-farm-card,
        .clima-page .clima-location-summary,
        .clima-page .clima-current-card,
        .clima-page .clima-accordion {
          color: var(--clima-ink);
        }

        .clima-page .clima-accordion-stack {
          width: 100%;
        }

        .clima-page .clima-accordion {
          overflow: hidden;
          border: 1px solid rgba(22, 163, 74, 0.15);
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
          transition: border-color 180ms ease, box-shadow 180ms ease,
            transform 180ms ease;
        }

        .clima-page .clima-accordion:hover {
          border-color: rgba(22, 163, 74, 0.28);
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.11);
        }

        .clima-page .clima-accordion[open] {
          border-color: rgba(22, 163, 74, 0.3);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12);
        }

        .clima-page .clima-accordion-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          min-height: 82px;
          padding: 1rem 1.15rem;
          cursor: pointer;
          list-style: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          background: linear-gradient(135deg, #ffffff 0%, #f7fff9 100%);
        }

        .clima-page .clima-accordion-summary::-webkit-details-marker {
          display: none;
        }

        .clima-page .clima-accordion-heading {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          min-width: 0;
        }

        .clima-page .clima-accordion-icon {
          flex: 0 0 2.65rem;
          width: 2.65rem;
          height: 2.65rem;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          color: var(--clima-green-dark);
          font-size: 1.25rem;
          box-shadow: inset 0 0 0 1px rgba(22, 163, 74, 0.12);
        }

        .clima-page .clima-accordion-copy {
          min-width: 0;
        }

        .clima-page .clima-accordion-copy strong {
          display: block;
          color: var(--clima-ink);
          font-size: 1rem;
          line-height: 1.25;
        }

        .clima-page .clima-accordion-copy > span {
          display: block;
          margin-top: 0.22rem;
          color: var(--clima-muted);
          font-size: 0.84rem;
          line-height: 1.4;
        }

        .clima-page .clima-accordion-toggle {
          flex: 0 0 2.35rem;
          width: 2.35rem;
          height: 2.35rem;
          display: grid;
          place-items: center;
          border: 1px solid rgba(22, 163, 74, 0.2);
          border-radius: 999px;
          background: #f0fdf4;
          color: var(--clima-green-dark);
        }

        .clima-page .clima-accordion-toggle span {
          display: block;
          font-size: 1.35rem;
          font-weight: 900;
          line-height: 1;
          transform: translateY(-2px);
          transition: transform 220ms ease;
        }

        .clima-page .clima-accordion[open] .clima-accordion-toggle span {
          transform: translateY(2px) rotate(180deg);
        }

        .clima-page .clima-accordion-content {
          padding: 0 1.15rem 1.15rem;
          border-top: 1px solid var(--clima-line);
          background: #ffffff;
          animation: climaAccordionReveal 220ms ease;
        }

        .clima-page .clima-metric-card,
        .clima-page .clima-hourly-item,
        .clima-page .clima-alert-item,
        .clima-page .clima-daily-item,
        .clima-page .clima-empty-box {
          border-color: rgba(15, 23, 42, 0.09) !important;
          background: #ffffff !important;
          color: var(--clima-ink) !important;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
        }

        .clima-page .clima-metric-card {
          position: relative;
          overflow: hidden;
        }

        .clima-page .clima-metric-card::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          background: linear-gradient(180deg, #22c55e, #16a34a);
        }

        .clima-page .clima-metric-label,
        .clima-page .clima-metric-value,
        .clima-page .clima-metric-note,
        .clima-page .clima-hour,
        .clima-page .clima-hour-temp,
        .clima-page .clima-hour-rain,
        .clima-page .clima-hour-wind,
        .clima-page .clima-daily-day,
        .clima-page .clima-daily-summary,
        .clima-page .clima-daily-temps,
        .clima-page .clima-daily-rain {
          color: inherit;
        }

        .clima-page .clima-metric-note,
        .clima-page .clima-hour-rain,
        .clima-page .clima-hour-wind,
        .clima-page .clima-daily-summary,
        .clima-page .clima-daily-temps,
        .clima-page .clima-daily-rain {
          color: var(--clima-muted) !important;
        }

        .clima-page .clima-current-card {
          border: 1px solid rgba(22, 163, 74, 0.16);
          background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.09);
        }

        @keyframes climaAccordionReveal {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 640px) {
          .clima-page .clima-accordion-summary {
            min-height: 76px;
            padding: 0.9rem;
          }

          .clima-page .clima-accordion-content {
            padding: 0 0.9rem 0.9rem;
          }

          .clima-page .clima-accordion-icon {
            flex-basis: 2.4rem;
            width: 2.4rem;
            height: 2.4rem;
            border-radius: 13px;
          }

          .clima-page .clima-accordion-copy > span {
            font-size: 0.78rem;
          }
        }
      `}</style>
      <section
        className="clima-active-farm-card"
        style={{
          marginBottom: "1rem",
          padding: "1rem 1.15rem",
          borderRadius: "18px",
          border: "1px solid rgba(22, 163, 74, 0.18)",
          background:
            "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
          boxShadow: "0 14px 34px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#15803d",
                fontSize: "0.78rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "0.25rem",
              }}
            >
              🌱 Finca activa
            </div>
            <strong
              style={{
                display: "block",
                color: "#0f172a",
                fontSize: "1.15rem",
                lineHeight: 1.2,
              }}
            >
              {activeFarmLabel}
            </strong>
          </div>

          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "0.9rem",
              maxWidth: "680px",
            }}
          >
            El pronóstico, las alertas y la lectura operativa usan la ubicación
            guardada de esta finca. Para trabajar otra ubicación, cambiá la finca
            activa desde el mapa.
          </p>
        </div>
      </section>

      <section
        className="clima-location-summary"
        style={{
          marginBottom: "1rem",
          padding: "1rem 1.15rem",
          borderRadius: "18px",
          border: "1px solid rgba(22, 163, 74, 0.14)",
          background: "#ffffff",
          color: "#0f172a",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.07)",
        }}
      >
        <span className="clima-badge">
          {hasFarmLocation
            ? `Clima real · ${activeFarmLabel}`
            : "Clima pendiente de ubicación"}
        </span>

        <div
          className="clima-location-meta"
          style={{
            marginTop: "0.8rem",
            display: "grid",
            gap: "0.45rem",
          }}
        >
          <span>
            <strong>Fuente:</strong>{" "}
            {hasFarmLocation
              ? `Coordenadas guardadas de ${activeFarmLabel}`
              : "Sin coordenadas de finca"}
          </span>

          <span>
            <strong>Ubicación:</strong> {locationName}
          </span>

          {coords && (
            <span>
              <strong>Coordenadas:</strong> {coords.latitude.toFixed(4)},{" "}
              {coords.longitude.toFixed(4)}
            </span>
          )}
        </div>

        {error ? <div className="clima-error-box">{error}</div> : null}
      </section>

      <section className="clima-current-card" style={{ marginBottom: "1rem" }}>
        {showEmptyState ? (
          <div className="clima-empty-box">
            <p style={{ marginBottom: 8, fontWeight: 700 }}>
              Aún no hay ubicación definida para esta finca.
            </p>
            <p style={{ margin: 0 }}>
              Guardá la ubicación desde el mapa para cargar el clima real.
            </p>
          </div>
        ) : (
          <>
            <div className="clima-current-top">
              <div>
                <p className="clima-current-label">
                  {hasFarmLocation
                    ? `Condición actual · ${activeFarmLabel}`
                    : "Condición actual"}
                </p>
                <h2 className="clima-current-location">{locationName}</h2>
              </div>

              <span className="clima-current-status">
                {current
                  ? weatherLabel(current.weather_code)
                  : "Cargando clima..."}
              </span>
            </div>

            <div className="clima-current-main">
              <div className="clima-current-temp">
                {loadingWeather ? "..." : formatTemp(current?.temperature_2m)}
              </div>

              <div className="clima-current-details">
                <div>
                  Sensación térmica:{" "}
                  {loadingWeather
                    ? "..."
                    : formatTemp(current?.apparent_temperature)}
                </div>
                <div>
                  Humedad:{" "}
                  {loadingWeather
                    ? "..."
                    : formatPercent(current?.relative_humidity_2m)}
                </div>
                <div>
                  Viento:{" "}
                  {loadingWeather
                    ? "..."
                    : formatWind(current?.wind_speed_10m)}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <div
        className="clima-accordion-stack"
        style={{
          display: "grid",
          gap: "0.85rem",
        }}
      >
        <AccordionSection
          title="Resumen climático"
          subtitle="Temperatura, lluvia, humedad, viento, nubosidad e índice UV."
          icon="☀️"
          defaultOpen
        >
          <section
            className="clima-metrics-grid"
            style={{ marginTop: "1rem", marginBottom: 0 }}
          >
            <article className="clima-metric-card">
              <span className="clima-metric-label">Temperatura</span>
              <strong className="clima-metric-value">
                {loadingWeather ? "..." : formatTemp(current?.temperature_2m)}
              </strong>
              <p className="clima-metric-note">
                Lectura actual del ambiente en la ubicación activa.
              </p>
            </article>

            <article className="clima-metric-card">
              <span className="clima-metric-label">
                Precipitación actual
              </span>
              <strong className="clima-metric-value">
                {loadingWeather ? "..." : formatRain(current?.precipitation)}
              </strong>
              <p className="clima-metric-note">
                Agua cayendo en este momento para decisiones inmediatas.
              </p>
            </article>

            <article className="clima-metric-card">
              <span className="clima-metric-label">Humedad</span>
              <strong className="clima-metric-value">
                {loadingWeather
                  ? "..."
                  : formatPercent(current?.relative_humidity_2m)}
              </strong>
              <p className="clima-metric-note">
                Clave para secado, confort y presión de enfermedades.
              </p>
            </article>

            <article className="clima-metric-card">
              <span className="clima-metric-label">Viento</span>
              <strong className="clima-metric-value">
                {loadingWeather
                  ? "..."
                  : formatWind(current?.wind_speed_10m)}
              </strong>
              <p className="clima-metric-note">
                Variable crítica para aspersiones y operación en campo.
              </p>
            </article>

            <article className="clima-metric-card">
              <span className="clima-metric-label">Nubosidad</span>
              <strong className="clima-metric-value">
                {loadingWeather
                  ? "..."
                  : formatPercent(current?.cloud_cover)}
              </strong>
              <p className="clima-metric-note">
                Ayuda a leer radiación, insolación y estabilidad del día.
              </p>
            </article>

            <article className="clima-metric-card">
              <span className="clima-metric-label">Índice UV</span>
              <strong className="clima-metric-value">
                {loadingWeather
                  ? "..."
                  : current?.uv_index !== undefined &&
                    current?.uv_index !== null
                  ? Math.round(Number(current.uv_index))
                  : "--"}
              </strong>
              <p className="clima-metric-note">
                Sirve para proteger jornadas largas y planear labores pesadas.
              </p>
            </article>
          </section>
        </AccordionSection>

        <AccordionSection
          title="Pronóstico por horas"
          subtitle="Próximas 12 horas para organizar la jornada."
          icon="🕐"
        >
          <div className="clima-hourly-list" style={{ marginTop: "1rem" }}>
            {hourlyForecast.length ? (
              hourlyForecast.map((item) => (
                <div key={item.time} className="clima-hourly-item">
                  <span className="clima-hour">{item.hour}</span>
                  <span className="clima-hour-temp">{item.temp}</span>
                  <span className="clima-hour-rain">
                    Lluvia: {item.rain}
                  </span>
                  <span className="clima-hour-wind">
                    Viento: {item.wind}
                  </span>
                </div>
              ))
            ) : (
              <div className="clima-empty-box" style={{ marginTop: "1rem" }}>
                {showEmptyState
                  ? "No hay pronóstico porque la finca todavía no tiene coordenadas."
                  : "Cargando pronóstico horario..."}
              </div>
            )}
          </div>
        </AccordionSection>

        <AccordionSection
          title="Alertas útiles"
          subtitle="Lectura operativa basada en el clima recibido."
          icon="⚠️"
        >
          <div className="clima-alerts-list" style={{ marginTop: "1rem" }}>
            {alerts.length ? (
              alerts.map((alert, index) => (
                <div key={`${alert}-${index}`} className="clima-alert-item">
                  {alert}
                </div>
              ))
            ) : (
              <div className="clima-empty-box" style={{ marginTop: "1rem" }}>
                {showEmptyState
                  ? "Aquí aparecerán alertas cuando la finca tenga clima activo."
                  : "Cargando alertas..."}
              </div>
            )}
          </div>
        </AccordionSection>

        <AccordionSection
          title="Pronóstico de 7 días"
          subtitle="Panorama semanal para procesos, tareas y ventanas operativas."
          icon="📅"
        >
          <div className="clima-daily-list" style={{ marginTop: "1rem" }}>
            {dailyForecast.length ? (
              dailyForecast.map((item) => (
                <div key={item.date} className="clima-daily-item">
                  <div className="clima-daily-day">{item.day}</div>
                  <div className="clima-daily-summary">{item.summary}</div>
                  <div className="clima-daily-temps">
                    <span>Máx: {item.max}</span>
                    <span>Mín: {item.min}</span>
                  </div>
                  <div className="clima-daily-rain">
                    Lluvia: {item.rain}
                  </div>
                </div>
              ))
            ) : (
              <div className="clima-empty-box" style={{ marginTop: "1rem" }}>
                {showEmptyState
                  ? "Cuando la finca tenga ubicación, aquí verás el panorama semanal."
                  : "Cargando pronóstico diario..."}
              </div>
            )}
          </div>
        </AccordionSection>
      </div>
    </div>
  );
}