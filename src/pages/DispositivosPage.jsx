// src/pages/DispositivosPage.jsx
import "../styles/devices.css";

export default function DispositivosPage() {
  return (
    <div className="page">
      {/* ENCABEZADO */}
      <header className="page-header">
        <h1>Dispositivos</h1>
        <p className="page-subtitle">
          Integración de sensores, actuadores y equipos conectados a tu finca.
        </p>
      </header>

      {/* MENSAJE SERIO (sin mock) */}
      <section className="card ia-placeholder">
        <h3>En desarrollo</h3>
        <p>
          Estamos construyendo esta sección para conectar dispositivos reales
          (riego, clima, humedad de suelo, niveles, alimentación y otros).
        </p>
        <p style={{ opacity: 0.75, marginTop: "0.5rem" }}>
          Próximamente podrás registrar equipos, visualizar lecturas e integrar
          alertas y tareas automáticas.
        </p>
      </section>
    </div>
  );
}