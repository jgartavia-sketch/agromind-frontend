// src/components/finance/ZoneMonthlyChart.jsx
function formatMoneyCRC(value) {
  const n = Number(value || 0);
  return n.toLocaleString("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  });
}

export default function ZoneMonthlyChart({ data = [] }) {
  const safe = Array.isArray(data) ? data : [];

  return (
    <section className="card" style={{ marginTop: "1rem" }}>
      <h3 style={{ marginTop: 0 }}>Resumen mensual</h3>
      <p style={{ marginTop: "0.25rem", opacity: 0.8 }}>
        Ingresos, gastos y balance por mes (datos reales).
      </p>

      {safe.length === 0 ? (
        <div style={{ opacity: 0.75, padding: "0.75rem 0" }}>
          Aún no hay suficientes movimientos para graficar por mes.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ minWidth: 620 }}>
            <thead>
              <tr>
                <th>Mes</th>
                <th style={{ textAlign: "right" }}>Ingresos</th>
                <th style={{ textAlign: "right" }}>Gastos</th>
                <th style={{ textAlign: "right" }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {safe.map((row) => (
                <tr key={row.month}>
                  <td>{row.month}</td>
                  <td style={{ textAlign: "right" }}>
                    {formatMoneyCRC(row.ingresos)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {formatMoneyCRC(row.gastos)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {formatMoneyCRC(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}