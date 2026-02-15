// src/pages/InvestigadorPage.jsx
import "../styles/investigador.css";

const DEMO_RESULTS = [
  {
    id: 1,
    type: "Planta",
    name: "Tomate (Solanum lycopersicum)",
    status: "Saludable",
    note: "Sin signos visibles de plagas.",
  },
  {
    id: 2,
    type: "Animal",
    name: "Ave insectívora",
    status: "Beneficioso",
    note: "Ayuda al control biológico de plagas.",
  },
];

export default function InvestigadorPage() {
  return (
    <div className="investigador-page">
      <header className="investigador-header">
        <h1>Investigador IA</h1>
        <p className="investigador-subtitle">
          Identificación inteligente de plantas y animales a partir de imágenes.
        </p>
        <p className="investigador-env">
          Módulo demo · IA y cámara próximamente
        </p>
      </header>

      {/* Acción principal (placeholder) */}
      <section className="investigador-action card">
        <button className="investigador-camera-btn" disabled>
          📷 Tomar foto (próximamente)
        </button>
        <p className="investigador-hint">
          En el futuro podrás usar la cámara del dispositivo para analizar
          plantas, animales y condiciones del entorno.
        </p>
      </section>

      {/* Resultados demo */}
      <section className="investigador-results">
        {DEMO_RESULTS.map((item) => (
          <div key={item.id} className="investigador-card card">
            <span className="investigador-type">{item.type}</span>
            <h3>{item.name}</h3>
            <p className="investigador-status">
              Estado: <strong>{item.status}</strong>
            </p>
            <p className="investigador-note">{item.note}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
