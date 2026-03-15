// src/pages/ClimaPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/clima.css";

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

function parseFarmLocation() {
  try {
    const raw = localStorage.getItem("farmLocation");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const lat = Number(parsed?.lat);
    const lon = Number(parsed?.lon);

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return {
        latitude: lat,
        longitude: lon,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export default function ClimaPage() {
  const [query, setQuery] = useState("");
  const [locationName, setLocationName] = useState("Ubicación de la finca no definida");
  const [coords, setCoords] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [error, setError] = useState("");
  const [hasFarmLocation, setHasFarmLocation] = useState(false);

  const timezone = weather?.timezone || "America/Costa_Rica";

  const resolveLocationByName = useCallback(async (searchText) => {
    const clean = String(searchText || "").trim();
    if (!clean) return;

    setLoadingLocation(true);
    setError("");

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        clean
      )}&count=1&language=es&format=json`;

      const geoResp = await fetch(geoUrl);
      if (!geoResp.ok) {
        throw new Error("No se pudo consultar la ubicación.");
      }

      const geoData = await geoResp.json();
      const first = geoData?.results?.[0];

      if (!first) {
        throw new Error("No encontré esa ubicación.");
      }

      const prettyName = [first.name, first.admin1, first.country]
        .filter(Boolean)
        .join(", ");

      setLocationName(prettyName);
      setCoords({
        latitude: first.latitude,
        longitude: first.longitude,
      });
    } catch (err) {
      setError(err.message || "No se pudo resolver la ubicación.");
      setWeather(null);
    } finally {
      setLoadingLocation(false);
    }
  }, []);

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
      // silencio elegante: si no resuelve nombre, igual sirven las coordenadas
    }
  }, []);

  const resolveLocationByBrowser = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización.");
      return;
    }

    setLoadingLocation(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setCoords({
          latitude,
          longitude,
        });
        setHasFarmLocation(false);
        setLocationName("Mi ubicación actual");
        setLoadingLocation(false);

        resolveLocationNameByCoords(latitude, longitude);
      },
      () => {
        setError("No pude acceder a tu ubicación. Puedes buscarla manualmente.");
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, [resolveLocationNameByCoords]);

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
    const farmLocation = parseFarmLocation();

    if (farmLocation) {
      setCoords(farmLocation);
      setHasFarmLocation(true);
      setLocationName("Ubicación de mi finca");
      resolveLocationNameByCoords(farmLocation.latitude, farmLocation.longitude);
      return;
    }

    setCoords(null);
    setWeather(null);
    setHasFarmLocation(false);
    setLocationName("Ubicación de la finca no definida");
  }, [resolveLocationNameByCoords]);

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

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    await resolveLocationByName(query);
  };

  const showEmptyState = !coords && !loadingLocation && !loadingWeather;

  return (
    <div className="clima-page">
      <section className="clima-hero">
        <div className="clima-hero-copy">
          <span className="clima-badge">
            {hasFarmLocation ? "Clima real de la finca" : "Clima listo para conectarse a la finca"}
          </span>

          <h1 className="clima-title">El tiempo también manda en la finca.</h1>

          <p className="clima-subtitle">
            {hasFarmLocation
              ? "Esta página ya está leyendo la ubicación real de tu finca para mostrar condiciones actuales, pronóstico por horas y panorama semanal."
              : "Cuando la finca tenga coordenadas guardadas, AgroMind traerá el clima real automáticamente. Mientras tanto, puedes buscar una ubicación o usar tu posición actual."}
          </p>

          <form className="clima-search-bar" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              className="clima-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca una ubicación, por ejemplo: Ciudad Quesada"
            />
            <button
              type="submit"
              className="clima-search-btn"
              disabled={loadingLocation || loadingWeather}
            >
              {loadingLocation ? "Buscando..." : "Buscar"}
            </button>
            <button
              type="button"
              className="clima-location-btn"
              onClick={resolveLocationByBrowser}
              disabled={loadingLocation || loadingWeather}
            >
              Usar mi ubicación
            </button>
          </form>

          <div className="clima-location-meta">
            <span>
              <strong>Fuente:</strong>{" "}
              {hasFarmLocation ? "Coordenadas guardadas de la finca" : "Sin coordenadas de finca"}
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
        </div>

        <div className="clima-current-card">
          {showEmptyState ? (
            <div className="clima-empty-box">
              <p style={{ marginBottom: 8, fontWeight: 700 }}>
                Aún no hay ubicación definida para esta finca.
              </p>
              <p style={{ margin: 0 }}>
                Cuando el mapa guarde <strong>farmLocation.lat</strong> y{" "}
                <strong>farmLocation.lon</strong>, esta tarjeta se llenará sola con clima real.
              </p>
            </div>
          ) : (
            <>
              <div className="clima-current-top">
                <div>
                  <p className="clima-current-label">
                    {hasFarmLocation ? "Condición actual de la finca" : "Condición actual"}
                  </p>
                  <h2 className="clima-current-location">{locationName}</h2>
                </div>
                <span className="clima-current-status">
                  {current ? weatherLabel(current.weather_code) : "Cargando clima..."}
                </span>
              </div>

              <div className="clima-current-main">
                <div className="clima-current-temp">
                  {loadingWeather ? "..." : formatTemp(current?.temperature_2m)}
                </div>

                <div className="clima-current-details">
                  <div>
                    Sensación térmica:{" "}
                    {loadingWeather ? "..." : formatTemp(current?.apparent_temperature)}
                  </div>
                  <div>
                    Humedad:{" "}
                    {loadingWeather ? "..." : formatPercent(current?.relative_humidity_2m)}
                  </div>
                  <div>
                    Viento: {loadingWeather ? "..." : formatWind(current?.wind_speed_10m)}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="clima-metrics-grid">
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
          <span className="clima-metric-label">Precipitación actual</span>
          <strong className="clima-metric-value">
            {loadingWeather ? "..." : formatRain(current?.precipitation)}
          </strong>
          <p className="clima-metric-note">
            Agua cayendo en este momento, útil para decisiones inmediatas.
          </p>
        </article>

        <article className="clima-metric-card">
          <span className="clima-metric-label">Humedad</span>
          <strong className="clima-metric-value">
            {loadingWeather ? "..." : formatPercent(current?.relative_humidity_2m)}
          </strong>
          <p className="clima-metric-note">
            Clave para secado, confort y presión de enfermedades.
          </p>
        </article>

        <article className="clima-metric-card">
          <span className="clima-metric-label">Viento</span>
          <strong className="clima-metric-value">
            {loadingWeather ? "..." : formatWind(current?.wind_speed_10m)}
          </strong>
          <p className="clima-metric-note">
            Variable crítica para aspersiones, estructuras y operación en campo.
          </p>
        </article>

        <article className="clima-metric-card">
          <span className="clima-metric-label">Nubosidad</span>
          <strong className="clima-metric-value">
            {loadingWeather ? "..." : formatPercent(current?.cloud_cover)}
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
              : current?.uv_index !== undefined && current?.uv_index !== null
              ? Math.round(Number(current.uv_index))
              : "--"}
          </strong>
          <p className="clima-metric-note">
            Sirve para proteger jornadas largas y planear labores pesadas.
          </p>
        </article>
      </section>

      <section className="clima-sections-grid">
        <article className="clima-panel">
          <div className="clima-panel-head">
            <h3>Pronóstico por horas</h3>
            <p>Próximas 12 horas para planear la jornada con más cabeza y menos fe.</p>
          </div>

          <div className="clima-hourly-list">
            {hourlyForecast.length ? (
              hourlyForecast.map((item) => (
                <div key={item.time} className="clima-hourly-item">
                  <span className="clima-hour">{item.hour}</span>
                  <span className="clima-hour-temp">{item.temp}</span>
                  <span className="clima-hour-rain">Lluvia: {item.rain}</span>
                  <span className="clima-hour-wind">Viento: {item.wind}</span>
                </div>
              ))
            ) : (
              <div className="clima-empty-box">
                {showEmptyState
                  ? "No hay pronóstico porque la finca todavía no tiene coordenadas."
                  : "Cargando pronóstico horario..."}
              </div>
            )}
          </div>
        </article>

        <article className="clima-panel">
          <div className="clima-panel-head">
            <h3>Alertas útiles</h3>
            <p>Lectura operativa generada por AgroMind con base en el clima recibido.</p>
          </div>

          <div className="clima-alerts-list">
            {alerts.length ? (
              alerts.map((alert, index) => (
                <div key={`${alert}-${index}`} className="clima-alert-item">
                  {alert}
                </div>
              ))
            ) : (
              <div className="clima-empty-box">
                {showEmptyState
                  ? "Aquí aparecerán alertas cuando la finca tenga clima activo."
                  : "Cargando alertas..."}
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="clima-panel clima-daily-panel">
        <div className="clima-panel-head">
          <h3>Pronóstico de 7 días</h3>
          <p>Panorama general para organizar procesos, tareas y ventanas operativas.</p>
        </div>

        <div className="clima-daily-list">
          {dailyForecast.length ? (
            dailyForecast.map((item) => (
              <div key={item.date} className="clima-daily-item">
                <div className="clima-daily-day">{item.day}</div>
                <div className="clima-daily-summary">{item.summary}</div>
                <div className="clima-daily-temps">
                  <span>Máx: {item.max}</span>
                  <span>Mín: {item.min}</span>
                </div>
                <div className="clima-daily-rain">Lluvia: {item.rain}</div>
              </div>
            ))
          ) : (
            <div className="clima-empty-box">
              {showEmptyState
                ? "Cuando la finca tenga ubicación, aquí verás el panorama semanal."
                : "Cargando pronóstico diario..."}
            </div>
          )}
        </div>
      </section>

      <section className="clima-panel clima-future-panel">
        <div className="clima-panel-head">
          <h3>Clima conectado al negocio</h3>
          <p>La joya no es ver el clima; la joya es usarlo para decidir mejor.</p>
        </div>

        <div className="clima-future-points">
          <div className="clima-future-item">
            Cruzar clima con tareas para alertar si una labor conviene, se retrasa o se
            vuelve riesgosa.
          </div>
          <div className="clima-future-item">
            Leer automáticamente la ubicación real de la finca desde el mapa para no
            depender de búsquedas manuales.
          </div>
          <div className="clima-future-item">
            Generar recomendaciones por proceso agrícola, zona y prioridad operativa.
          </div>
        </div>
      </section>
    </div>
  );
}