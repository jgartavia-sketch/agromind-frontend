// src/pages/DispositivosPage.jsx
import { useMemo, useState } from "react";
import "../styles/devices.css";

/* ===== DATOS DEMO ===== */
const DEFAULT_DEVICES = [
  {
    id: 1,
    name: "Sensor humedad suelo #1",
    type: "Sensor",
    zone: "Zona de vivero",
    status: "Activo",
    lastValue: "68%",
    battery: 82,
    iaReady: true,
  },
  {
    id: 2,
    name: "Estación climática",
    type: "Clima",
    zone: "Lote A",
    status: "Activo",
    lastValue: "31°C · 74% HR",
    battery: 45,
    iaReady: true,
  },
  {
    id: 3,
    name: "Bomba riego norte",
    type: "Actuador",
    zone: "Calle 1",
    status: "Inactivo",
    lastValue: "OFF",
    battery: null,
    iaReady: false,
  },
  {
    id: 4,
    name: "Sensor nivel tanque",
    type: "Sensor",
    zone: "Área de tanques",
    status: "Alerta",
    lastValue: "22%",
    battery: 18,
    iaReady: true,
  },
];

/* ===== HELPERS ===== */
function getStatusClass(status) {
  switch (status) {
    case "Activo":
      return "device-status device-ok";
    case "Inactivo":
      return "device-status device-off";
    case "Alerta":
      return "device-status device-alert";
    default:
      return "device-status";
  }
}

export default function DispositivosPage() {
  const [devices] = useState(DEFAULT_DEVICES);

  /* ===== KPIs ===== */
  const summary = useMemo(() => {
    const total = devices.length;
    const active = devices.filter((d) => d.status === "Activo").length;
    const alerts = devices.filter((d) => d.status === "Alerta").length;
    const ia = devices.filter((d) => d.iaReady).length;

    return { total, active, alerts, ia };
  }, [devices]);

  return (
    <div className="page">
      {/* ENCABEZADO */}
      <header className="page-header">
        <h1>Dispositivos vinculados</h1>
        <p className="page-subtitle">
          Sensores, actuadores y equipos conectados a la finca.
          <br />
          Datos simulados · Modo demostración.
        </p>
      </header>

      {/* DASHBOARD */}
      <section className="devices-summary">
        <div className="summary-card">
          <span className="summary-label">Dispositivos totales</span>
          <span className="summary-value">{summary.total}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Activos</span>
          <span className="summary-value summary-value-ok">
            {summary.active}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Alertas</span>
          <span className="summary-value summary-value-warning">
            {summary.alerts}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Compatibles con IA</span>
          <span className="summary-value summary-value-info">
            {summary.ia}
          </span>
        </div>
      </section>

      {/* IA PLACEHOLDER */}
      <section className="card ia-placeholder">
        <h3>IA de monitoreo</h3>
        <p>
          Próximamente la inteligencia artificial analizará lecturas,
          patrones y estados para generar alertas y tareas automáticas.
        </p>
      </section>

      {/* GRID DE DISPOSITIVOS */}
      <section className="devices-grid">
        {devices.map((device) => (
          <div key={device.id} className="device-card">
            <div className="device-card-header">
              <h4>{device.name}</h4>
              <span className={getStatusClass(device.status)}>
                {device.status}
              </span>
            </div>

            <div className="device-info">
              <p><strong>Tipo:</strong> {device.type}</p>
              <p><strong>Zona:</strong> {device.zone}</p>
              <p><strong>Última lectura:</strong> {device.lastValue}</p>

              {device.battery !== null && (
                <p>
                  <strong>Batería:</strong> {device.battery}%
                </p>
              )}

              <p>
                <strong>IA:</strong>{" "}
                {device.iaReady ? "Compatible" : "No compatible"}
              </p>
            </div>

            <div className="device-actions">
              <button
                className="small-btn"
                onClick={() => alert("Historial disponible próximamente")}
              >
                Ver historial
              </button>
              <button
                className="small-btn"
                onClick={() => alert("Función demo")}
              >
                Simular lectura
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
