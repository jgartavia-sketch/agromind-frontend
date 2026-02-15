// src/components/finance/FinanceSummaryReal.jsx
export default function FinanceSummaryReal({ movements }) {
  const ingresos = movements
    .filter((m) => m.type === "Ingreso")
    .reduce((sum, m) => sum + m.amount, 0);

  const gastos = movements
    .filter((m) => m.type === "Gasto")
    .reduce((sum, m) => sum + m.amount, 0);

  const utilidad = ingresos - gastos;
  const margen =
    ingresos > 0 ? ((utilidad / ingresos) * 100).toFixed(1) : 0;

  return (
    <section className="finance-real-summary">
      <header>
        <h3>📊 Resumen financiero real</h3>
        <p className="subtitle">
          Basado en movimientos registrados · datos reales de la finca
        </p>
      </header>

      <div className="real-summary-grid">
        <div className="real-box positive">
          <span>Ingresos reales</span>
          <strong>₡ {ingresos.toLocaleString()}</strong>
        </div>

        <div className="real-box negative">
          <span>Gastos reales</span>
          <strong>₡ {gastos.toLocaleString()}</strong>
        </div>

        <div className="real-box neutral">
          <span>Utilidad neta</span>
          <strong>₡ {utilidad.toLocaleString()}</strong>
          <small>{margen}% margen operativo</small>
        </div>
      </div>
    </section>
  );
}
