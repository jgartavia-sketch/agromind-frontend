// src/components/finance/FinanceComparison.jsx
import "./finance-comparison.css";

export default function FinanceComparison() {
  // 🔮 Proyección IA (demo)
  const ia = {
    ingresos: 320000,
    costos: 210000,
  };

  // 📊 Datos reales (demo manual)
  const real = {
    ingresos: 295000,
    costos: 235000,
  };

  const iaBalance = ia.ingresos - ia.costos;
  const realBalance = real.ingresos - real.costos;

  const diffIngresos = real.ingresos - ia.ingresos;
  const diffCostos = real.costos - ia.costos;
  const diffBalance = realBalance - iaBalance;

  const formatCRC = (v) =>
    v.toLocaleString("es-CR", {
      style: "currency",
      currency: "CRC",
      maximumFractionDigits: 0,
    });

  const percentDiff = (real, ia) =>
    ia === 0 ? 0 : ((real - ia) / ia) * 100;

  return (
    <section className="finance-compare-card">
      <header className="finance-compare-header">
        <h3>Comparación: IA vs Real</h3>
        <p>
          Diferencia entre la proyección estimada por la IA y los datos reales
          registrados en la finca.
        </p>
      </header>

      <div className="finance-compare-grid">
        {/* INGRESOS */}
        <div className="compare-row">
          <span className="label">Ingresos</span>
          <span className="ia">{formatCRC(ia.ingresos)}</span>
          <span className="real">{formatCRC(real.ingresos)}</span>
          <span
            className={
              diffIngresos >= 0 ? "diff positive" : "diff negative"
            }
          >
            {formatCRC(diffIngresos)} (
            {percentDiff(real.ingresos, ia.ingresos).toFixed(1)}%)
          </span>
        </div>

        {/* COSTOS */}
        <div className="compare-row">
          <span className="label">Costos</span>
          <span className="ia">{formatCRC(ia.costos)}</span>
          <span className="real">{formatCRC(real.costos)}</span>
          <span
            className={
              diffCostos <= 0 ? "diff positive" : "diff negative"
            }
          >
            {formatCRC(diffCostos)} (
            {percentDiff(real.costos, ia.costos).toFixed(1)}%)
          </span>
        </div>

        {/* BALANCE */}
        <div className="compare-row highlight">
          <span className="label">Resultado</span>
          <span className="ia">{formatCRC(iaBalance)}</span>
          <span className="real">{formatCRC(realBalance)}</span>
          <span
            className={
              diffBalance >= 0 ? "diff positive" : "diff negative"
            }
          >
            {formatCRC(diffBalance)}
          </span>
        </div>
      </div>
    </section>
  );
}
