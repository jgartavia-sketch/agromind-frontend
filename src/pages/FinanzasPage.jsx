import { useMemo, useState } from "react";
import "../styles/finanzas.css";

/* ===== Componentes ===== */
import FinanceSummaryIA from "../components/finance/FinanceSummaryIA";
import FinanceCard from "../components/finance/FinanceCard";
import ZoneMonthlyChart from "../components/finance/ZoneMonthlyChart";
import AddMovementModal from "../components/finance/AddMovementModal";

/* ===== Mock ===== */
import { financeMock } from "../mocks/financeMock";
import { summarizeMovements } from "../utils/financeUtils";

/* ========================= */
function formatMoneyCRC(value) {
  return value.toLocaleString("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  });
}

function getTypePillClass(type) {
  return type === "Ingreso"
    ? "type-pill type-pill-income"
    : "type-pill type-pill-expense";
}

export default function FinanzasPage() {
  const [movements, setMovements] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const fincaActiva = financeMock.fincas[0];
  const zonaActiva = fincaActiva.zonas[0];

  const resumenZona = useMemo(
    () => summarizeMovements(movements),
    [movements]
  );

  const summary = useMemo(() => {
    const ingresos = movements
      .filter((m) => m.type === "Ingreso")
      .reduce((acc, m) => acc + m.amount, 0);

    const gastos = movements
      .filter((m) => m.type === "Gasto")
      .reduce((acc, m) => acc + m.amount, 0);

    const balance = ingresos - gastos;
    const margin = ingresos > 0 ? (balance / ingresos) * 100 : 0;

    return { ingresos, gastos, balance, margin };
  }, [movements]);

  const rowsToRender =
    movements.length > 0
      ? movements
      : [
          {
            id: "placeholder-1",
            date: "—",
            concept: "Ej: Venta de productos",
            category: "—",
            type: "Ingreso",
            amount: 0,
            note: "—",
          },
          {
            id: "placeholder-2",
            date: "—",
            concept: "Ej: Compra de insumos",
            category: "—",
            type: "Gasto",
            amount: 0,
            note: "—",
          },
        ];

  return (
    <div className="page finance-page">
      <div className="finance-container">

        {/* IA */}
        <section className="finance-ia-section">
          <FinanceSummaryIA />
        </section>

        {/* RESUMEN FINANCIERO (SIN CABECERA CONTEXTUAL) */}
        <section className="finance-real-section">
          <section className="finance-summary">
            <FinanceCard
              label="Ingresos"
              value={formatMoneyCRC(resumenZona.ingresos)}
              variant="pos"
            />
            <FinanceCard
              label="Gastos"
              value={formatMoneyCRC(resumenZona.gastos)}
              variant="neg"
            />
            <FinanceCard
              label="Balance"
              value={formatMoneyCRC(resumenZona.balance)}
              variant={resumenZona.balance >= 0 ? "pos" : "neg"}
            />
          </section>

          <ZoneMonthlyChart data={[]} />
        </section>

        {/* FINANZAS REALES */}
        <section className="finance-real-section">
          <header className="page-header page-header-actions">
            <div>
              <h2>Finanzas reales</h2>
              <p className="page-subtitle">
                Movimientos financieros ingresados manualmente
              </p>
            </div>

            <button
              className="btn-primary"
              onClick={() => setShowModal(true)}
            >
              + Agregar movimiento
            </button>
          </header>

          <section className="finance-summary">
            <FinanceCard
              label="Ingresos"
              value={formatMoneyCRC(summary.ingresos)}
              variant="pos"
            />
            <FinanceCard
              label="Gastos"
              value={formatMoneyCRC(summary.gastos)}
              variant="neg"
            />
            <FinanceCard
              label="Balance"
              value={formatMoneyCRC(summary.balance)}
              variant={summary.balance >= 0 ? "pos" : "neg"}
            />
            <FinanceCard
              label="Margen"
              value={`${summary.margin.toFixed(1)}%`}
            />
          </section>

          <section className="finance-table card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {rowsToRender.map((mov) => (
                  <tr
                    key={mov.id}
                    className={mov.id.toString().includes("placeholder")
                      ? "row-placeholder"
                      : ""}
                  >
                    <td>{mov.date}</td>
                    <td>{mov.concept}</td>
                    <td>{mov.category}</td>
                    <td>
                      <span className={getTypePillClass(mov.type)}>
                        {mov.type}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {formatMoneyCRC(mov.amount)}
                    </td>
                    <td>{mov.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </section>

        {showModal && (
          <AddMovementModal
            onClose={() => setShowModal(false)}
            onSave={(mov) =>
              setMovements((prev) => [...prev, mov])
            }
          />
        )}
      </div>
    </div>
  );
}
