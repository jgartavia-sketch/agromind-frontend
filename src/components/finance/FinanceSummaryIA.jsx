import { useMemo, useState } from "react";
import "./finance-summary-ia.css";

export default function FinanceSummaryIA() {
  const [activeTab, setActiveTab] = useState("ingresos");
  const [activeFarm, setActiveFarm] = useState("finca1");

  /* =====================================================
     FINCAS + MOVIMIENTOS SIMULADOS
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
      .filter(m => m.tipo === "ingreso")
      .reduce((sum, m) => sum + m.monto, 0);

    const costos = currentFarm.movimientos
      .filter(m => m.tipo === "gasto")
      .reduce((sum, m) => sum + m.monto, 0);

    const margen = ingresos > 0
      ? Math.round(((ingresos - costos) / ingresos) * 100)
      : 0;

    return { ingresos, costos, margen };
  }, [activeFarm]);

  /* =====================================================
     DATOS POR TAB
  ===================================================== */

  const financeData = {
    ingresos: {
      title: "Ingresos mensuales",
      description:
        "Ingresos calculados a partir de ventas, producción y actividades registradas en esta finca.",
      value: `₡${financeSummary.ingresos.toLocaleString("es-CR")}`,
      note: currentFarm.nombre,
      tone: "positive",
    },
    costos: {
      title: "Costos operativos",
      description:
        "Gastos asociados a insumos, mantenimiento y operación de esta finca.",
      value: `₡${financeSummary.costos.toLocaleString("es-CR")}`,
      note: currentFarm.nombre,
      tone: "negative",
    },
    margen: {
      title: "Margen operativo",
      description:
        "Indicador clave de rentabilidad de la finca seleccionada.",
      value: `${financeSummary.margen}%`,
      note: currentFarm.nombre,
      tone: "neutral",
    },
  };

  const current = financeData[activeTab];

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <section className="finance-ia-shell">
      {/* HEADER */}
      <header className="finance-ia-header">
        <span className="finance-ia-badge">🚀 IA ACTIVA</span>
        <h3>Resumen financiero por finca</h3>
        <p className="finance-ia-sub">
          Análisis inteligente basado en movimientos simulados
        </p>
      </header>

      {/* SELECTOR DE FINCA */}
      <div className="finance-farm-selector">
        {Object.keys(farms).map(key => (
          <button
            key={key}
            className={`tab ${activeFarm === key ? "active" : ""}`}
            onClick={() => setActiveFarm(key)}
          >
            {farms[key].nombre}
          </button>
        ))}
      </div>

      {/* TABS */}
      <nav className="finance-ia-tabs">
        {Object.keys(financeData).map(key => (
          <button
            key={key}
            className={`tab ${activeTab === key ? "active" : ""}`}
            onClick={() => setActiveTab(key)}
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
    </section>
  );
}
