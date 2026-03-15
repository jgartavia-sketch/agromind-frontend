// src/pages/ClimaPage.jsx
import "../styles/clima.css";

const hourlyForecast = [
  { hour: "06:00", temp: "22°C", rain: "10%", wind: "6 km/h" },
  { hour: "09:00", temp: "25°C", rain: "20%", wind: "9 km/h" },
  { hour: "12:00", temp: "28°C", rain: "35%", wind: "12 km/h" },
  { hour: "15:00", temp: "27°C", rain: "55%", wind: "14 km/h" },
  { hour: "18:00", temp: "24°C", rain: "40%", wind: "8 km/h" },
  { hour: "21:00", temp: "22°C", rain: "20%", wind: "5 km/h" },
];

const dailyForecast = [
  {
    day: "Hoy",
    summary: "Soleado en la mañana, lluvias dispersas en la tarde",
    max: "29°C",
    min: "21°C",
    rain: "55%",
  },
  {
    day: "Mañana",
    summary: "Nubosidad parcial con probabilidad de lluvia",
    max: "28°C",
    min: "20°C",
    rain: "45%",
  },
  {
    day: "Miércoles",
    summary: "Lluvias moderadas en la tarde",
    max: "27°C",
    min: "20°C",
    rain: "70%",
  },
  {
    day: "Jueves",
    summary: "Mañana fresca, tarde húmeda",
    max: "26°C",
    min: "19°C",
    rain: "60%",
  },
  {
    day: "Viernes",
    summary: "Más estable, con sol entre nubes",
    max: "28°C",
    min: "20°C",
    rain: "30%",
  },
];

const alerts = [
  "Buena ventana operativa para labores tempranas entre 6:00 y 10:00 a.m.",
  "Mayor riesgo de lluvia después del mediodía: revisar tareas de aplicación, secado o cosecha.",
  "El viento se mantiene moderado: condiciones aceptables para trabajo general en campo.",
];

export default function ClimaPage() {
  return (
    <div className="clima-page">
      <section className="clima-hero">
        <div className="clima-hero-copy">
          <span className="clima-badge">Clima inteligente para la finca</span>
          <h1 className="clima-title">El tiempo también es parte del proceso.</h1>
          <p className="clima-subtitle">
            Visualiza condiciones actuales, pronóstico y señales útiles para tomar
            mejores decisiones en campo. Esta sección será la base para conectar
            clima, tareas, procesos agrícolas y finanzas dentro de AgroMind CR.
          </p>
        </div>

        <div className="clima-current-card">
          <div className="clima-current-top">
            <div>
              <p className="clima-current-label">Condición actual</p>
              <h2 className="clima-current-location">Mi finca</h2>
            </div>
            <span className="clima-current-status">Parcialmente nublado</span>
          </div>

          <div className="clima-current-main">
            <div className="clima-current-temp">27°C</div>
            <div className="clima-current-details">
              <div>Sensación térmica: 29°C</div>
              <div>Humedad: 78%</div>
              <div>Viento: 11 km/h</div>
            </div>
          </div>
        </div>
      </section>

      <section className="clima-metrics-grid">
        <article className="clima-metric-card">
          <span className="clima-metric-label">Temperatura</span>
          <strong className="clima-metric-value">27°C</strong>
          <p className="clima-metric-note">Condición adecuada para monitoreo y recorridos.</p>
        </article>

        <article className="clima-metric-card">
          <span className="clima-metric-label">Lluvia</span>
          <strong className="clima-metric-value">55%</strong>
          <p className="clima-metric-note">Posibles lluvias en la tarde. Ojo con aplicaciones.</p>
        </article>

        <article className="clima-metric-card">
          <span className="clima-metric-label">Humedad</span>
          <strong className="clima-metric-value">78%</strong>
          <p className="clima-metric-note">Ambiente húmedo. Vigilar hongos y secado.</p>
        </article>

        <article className="clima-metric-card">
          <span className="clima-metric-label">Viento</span>
          <strong className="clima-metric-value">11 km/h</strong>
          <p className="clima-metric-note">Viento moderado y manejable para operación general.</p>
        </article>

        <article className="clima-metric-card">
          <span className="clima-metric-label">Nubosidad</span>
          <strong className="clima-metric-value">48%</strong>
          <p className="clima-metric-note">Cobertura media con entrada de sol parcial.</p>
        </article>

        <article className="clima-metric-card">
          <span className="clima-metric-label">Índice UV</span>
          <strong className="clima-metric-value">8</strong>
          <p className="clima-metric-note">Alta radiación al mediodía. Mejor proteger jornadas largas.</p>
        </article>
      </section>

      <section className="clima-sections-grid">
        <article className="clima-panel">
          <div className="clima-panel-head">
            <h3>Pronóstico por horas</h3>
            <p>Lectura rápida para planear la jornada.</p>
          </div>

          <div className="clima-hourly-list">
            {hourlyForecast.map((item) => (
              <div key={item.hour} className="clima-hourly-item">
                <span className="clima-hour">{item.hour}</span>
                <span className="clima-hour-temp">{item.temp}</span>
                <span className="clima-hour-rain">Lluvia: {item.rain}</span>
                <span className="clima-hour-wind">Viento: {item.wind}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="clima-panel">
          <div className="clima-panel-head">
            <h3>Alertas útiles</h3>
            <p>Lectura operativa para decisiones de campo.</p>
          </div>

          <div className="clima-alerts-list">
            {alerts.map((alert, index) => (
              <div key={`${alert}-${index}`} className="clima-alert-item">
                {alert}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="clima-panel clima-daily-panel">
        <div className="clima-panel-head">
          <h3>Pronóstico de los próximos días</h3>
          <p>Panorama general para organizar procesos, tareas y movimiento operativo.</p>
        </div>

        <div className="clima-daily-list">
          {dailyForecast.map((item) => (
            <div key={item.day} className="clima-daily-item">
              <div className="clima-daily-day">{item.day}</div>
              <div className="clima-daily-summary">{item.summary}</div>
              <div className="clima-daily-temps">
                <span>Máx: {item.max}</span>
                <span>Mín: {item.min}</span>
              </div>
              <div className="clima-daily-rain">Lluvia: {item.rain}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="clima-panel clima-future-panel">
        <div className="clima-panel-head">
          <h3>Visión AgroMind</h3>
          <p>Hacia dónde debe crecer esta sección.</p>
        </div>

        <div className="clima-future-points">
          <div className="clima-future-item">
            Cruzar el clima con tareas programadas para advertir si una labor conviene o no.
          </div>
          <div className="clima-future-item">
            Generar alertas por lluvia, calor, humedad o viento según procesos de cada zona.
          </div>
          <div className="clima-future-item">
            Integrar recomendaciones inteligentes para riego, cosecha, aplicación y monitoreo.
          </div>
        </div>
      </section>
    </div>
  );
}