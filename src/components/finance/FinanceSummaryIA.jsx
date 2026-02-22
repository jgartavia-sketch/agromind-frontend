import { useMemo, useState } from "react";
import "./finance-summary-ia.css";

/**
 * Sugerencias (ejemplo de forma esperada):
 * [{ id, title, message, actionLabel, onAddPayload }]
 *
 * - id: string
 * - title: string
 * - message: string
 * - onAddPayload: cualquier objeto que quieras mandar a tareas/finanzas
 */
export default function FinanceSummaryIA({
  suggestions = [],
  onAddSuggestion = null,
  onIgnoreSuggestion = null,
}) {
  const [activeTab, setActiveTab] = useState("ingresos");
  const [activeFarm, setActiveFarm] = useState("finca1");

  /* =====================================================
     FINCAS + MOVIMIENTOS (si aún los usás aquí)
     Nota: No toco tu estructura para no "cambiarte todo".
  ===================================================== */

  const farms = {
    finca1: {
      nombre: "Finca El Roble",
      movimientos: [
        { tipo: "ingreso", monto: 140000 },
        { tipo: "ingreso", monto: 90000 },
        { tipo: "gasto", monto: 60000 },
        { tipo: "gasto", monto: 50000 },
      ],
    },
    finca2: {
      nombre: "Finca La Esperanza",
      movimientos: [
        { tipo: "ingreso", monto: 220000 },
        { tipo: "ingreso", monto: 80000 },
        { tipo: "gasto", monto: 110000 },
        { tipo: "gasto", monto: 45000 },
      ],
    },
  };

  const currentFarm = farms[activeFarm];

  /* =====================================================
     CÁLCULOS FINANCIEROS POR FINCA
  ===================================================== */

  const financeSummary = useMemo(() => {
    const ingresos = currentFarm.movimientos
      .filter((m) => m.tipo === "ingreso")
      .reduce((sum, m) => sum + m.monto, 0);

    const costos = currentFarm.movimientos
      .filter((m) => m.tipo === "gasto")
      .reduce((sum, m) => sum + m.monto, 0);

    const margen =
      ingresos > 0 ? Math.round(((ingresos - costos) / ingresos) * 100) : 0;

    return { ingresos, costos, margen };
  }, [activeFarm, currentFarm]);

  /* =====================================================
     DATOS POR TAB
  ===================================================== */

  const financeData = {
    ingresos: {
      title: "Ingresos mensuales",
      description:
        "Ingresos calculados a partir de ventas, producción y actividades registradas.",
      value: `₡${financeSummary.ingresos.toLocaleString("es-CR")}`,
      note: currentFarm.nombre,
      tone: "positive",
    },
    costos: {
      title: "Costos operativos",
      description: "Gastos asociados a insumos, mantenimiento y operación.",
      value: `₡${financeSummary.costos.toLocaleString("es-CR")}`,
      note: currentFarm.nombre,
      tone: "negative",
    },
    margen: {
      title: "Margen operativo",
      description: "Indicador clave de rentabilidad de la finca seleccionada.",
      value: `${financeSummary.margen}%`,
      note: currentFarm.nombre,
      tone: "neutral",
    },
  };

  const current = financeData[activeTab];

  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];

  return (
    <section className="finance-ia-shell">
      {/* HEADER */}
      <header className="finance-ia-header">
        <span className="finance-ia-badge">🚀 IA ACTIVA</span>
        <h3>Resumen financiero</h3>
        <p className="finance-ia-sub">Insights y recomendaciones</p>
      </header>

      {/* SELECTOR DE FINCA */}
      <div className="finance-farm-selector">
        {Object.keys(farms).map((key) => (
          <button
            key={key}
            className={`tab ${activeFarm === key ? "active" : ""}`}
            onClick={() => setActiveFarm(key)}
            type="button"
          >
            {farms[key].nombre}
          </button>
        ))}
      </div>

      {/* TABS */}
      <nav className="finance-ia-tabs">
        {Object.keys(financeData).map((key) => (
          <button
            key={key}
            className={`tab ${activeTab === key ? "active" : ""}`}
            onClick={() => setActiveTab(key)}
            type="button"
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </nav>

      {/* CONTENT */}
      <div className="finance-ia-content">
        <h4>{current.title}</h4>
        <p>{current.description}</p>

        <p className={`finance-ia-highlight ${current.tone}`}>
          {current.value}
          <span className="finance-ia-note"> · {current.note}</span>
        </p>
      </div>

      {/* ✅ SUGERENCIAS EN HORIZONTAL (scroll izquierda→derecha) */}
      <div style={{ marginTop: "0.85rem" }}>
        <h4 style={{ margin: "0 0 0.55rem" }}>Sugerencias</h4>

        {safeSuggestions.length === 0 ? (
          <p style={{ margin: 0, opacity: 0.75, fontSize: "0.85rem" }}>
            No hay sugerencias disponibles por ahora.
          </p>
        ) : (
          <div className="finance-ia-suggestions">
            {safeSuggestions.map((s) => (
              <div key={s.id} className="finance-ia-suggestion-card">
                <div className="finance-ia-suggestion-title">
                  {s.title || "Sugerencia"}
                </div>

                <div className="finance-ia-suggestion-text">
                  {s.message || ""}
                </div>

                <div className="finance-ia-suggestion-actions">
                  <button
                    type="button"
                    className="small-btn"
                    onClick={() => onAddSuggestion && onAddSuggestion(s)}
                    disabled={!onAddSuggestion}
                    title={!onAddSuggestion ? "Acción no configurada" : ""}
                  >
                    Agregar
                  </button>
                  <button
                    type="button"
                    className="small-btn small-btn-danger"
                    onClick={() => onIgnoreSuggestion && onIgnoreSuggestion(s)}
                    disabled={!onIgnoreSuggestion}
                    title={!onIgnoreSuggestion ? "Acción no configurada" : ""}
                  >
                    Ignorar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}