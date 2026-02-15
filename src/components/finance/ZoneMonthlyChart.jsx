import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function ZoneMonthlyChart({ data = [] }) {
  const hasData = data.length > 0;

  return (
    <div className="card finance-chart">
      <h4>Evolución mensual de la zona</h4>

      {!hasData && (
        <p className="chart-placeholder">
          Aún no hay datos financieros registrados.  
          Agrega movimientos para visualizar ingresos, gastos y balance.
        </p>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip
            formatter={(value) =>
              value.toLocaleString("es-CR", {
                style: "currency",
                currency: "CRC",
                maximumFractionDigits: 0,
              })
            }
          />

          <Line
            type="monotone"
            dataKey="Ingresos"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Gastos"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Balance"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
