// src/pages/FinanzasPage.jsx
import { useEffect, useMemo, useState } from "react";
import "../styles/finanzas.css";

/* ===== Componentes ===== */
import FinanceSummaryIA from "../components/finance/FinanceSummaryIA";
import FinanceCard from "../components/finance/FinanceCard";
import ZoneMonthlyChart from "../components/finance/ZoneMonthlyChart";
import AddMovementModal from "../components/finance/AddMovementModal";

import { summarizeMovements } from "../utils/financeUtils";

/* ========================= */
function formatMoneyCRC(value) {
  const n = Number(value || 0);
  return n.toLocaleString("es-CR", {
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

function pickLocalStorage(keys) {
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

function getAuthToken() {
  return pickLocalStorage([
    "agromind_token",
    "agromind_jwt",
    "token",
    "jwt",
    "access_token",
  ]);
}

function getActiveFarmId() {
  return pickLocalStorage([
    "agromind_active_farm_id",
    "activeFarmId",
    "farmId",
    "agromind_farm_id",
  ]);
}

function toYYYYMMDD(value) {
  if (!value) return "—";
  if (typeof value === "string") {
    // ISO o YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return "—";
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function buildMonthlyChartData(movements) {
  // Devuelve [{ month: "2026-02", ingresos: 150000, gastos: 25000, balance: 125000 }, ...]
  const map = new Map();

  for (const m of movements) {
    const month = toYYYYMMDD(m.date).slice(0, 7); // YYYY-MM
    if (!month || month.includes("—")) continue;

    const prev = map.get(month) || { month, ingresos: 0, gastos: 0, balance: 0 };
    const amount = Number(m.amount || 0);

    if (m.type === "Ingreso") prev.ingresos += amount;
    else if (m.type === "Gasto") prev.gastos += amount;

    prev.balance = prev.ingresos - prev.gastos;
    map.set(month, prev);
  }

  // Orden ascendente por mes
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export default function FinanzasPage({ farmId: farmIdProp, token: tokenProp }) {
  const [movements, setMovements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Config API
  const API_BASE =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ""; // si está vacío, usa mismo origen

  const token = tokenProp || getAuthToken();
  const farmId = farmIdProp || getActiveFarmId();

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      // no-op
    }

    if (!res.ok) {
      const msg = data?.error || `Error HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  // =========================
  // (2) LOAD MOVEMENTS (REAL) AL ENTRAR
  // =========================
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErrorMsg("");

      if (!farmId) {
        setMovements([]);
        setErrorMsg(
          "No se detectó una finca activa. Selecciona/crea una finca primero."
        );
        return;
      }
      if (!token) {
        setMovements([]);
        setErrorMsg("No hay token. Inicia sesión nuevamente.");
        return;
      }

      try {
        setLoading(true);
        const data = await apiFetch(`/api/farms/${farmId}/finance/movements`);
        if (cancelled) return;

        const list = Array.isArray(data?.movements) ? data.movements : [];

        // Normalizamos la fecha para el UI (si viene ISO)
        const normalized = list.map((m) => ({
          ...m,
          date: toYYYYMMDD(m.date),
        }));

        setMovements(normalized);
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err?.message || "No se pudieron cargar los movimientos.");
        setMovements([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId, token, API_BASE]);

  // Resumen (para tarjetas superiores)
  const resumenZona = useMemo(() => summarizeMovements(movements), [movements]);

  const summary = useMemo(() => {
    const ingresos = movements
      .filter((m) => m.type === "Ingreso")
      .reduce((acc, m) => acc + Number(m.amount || 0), 0);

    const gastos = movements
      .filter((m) => m.type === "Gasto")
      .reduce((acc, m) => acc + Number(m.amount || 0), 0);

    const balance = ingresos - gastos;
    const margin = ingresos > 0 ? (balance / ingresos) * 100 : 0;

    return { ingresos, gastos, balance, margin };
  }, [movements]);

  // (3) Chart real
  const monthlyChartData = useMemo(
    () => buildMonthlyChartData(movements),
    [movements]
  );

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

  // =========================
  // CREATE / UPDATE MOVEMENT (REAL)
  // =========================
  const handleSaveMovement = async (mov) => {
    setErrorMsg("");

    if (!farmId) {
      setErrorMsg("No hay finca activa. Selecciona/crea una finca primero.");
      return;
    }
    if (!token) {
      setErrorMsg("No hay token. Inicia sesión nuevamente.");
      return;
    }

    try {
      setSaving(true);

      // Si viene id => edit (PUT). Si no => create (POST)
      if (mov?.id) {
        const data = await apiFetch(
          `/api/farms/${farmId}/finance/movements/${mov.id}`,
          {
            method: "PUT",
            body: JSON.stringify(mov),
          }
        );

        const updated = data?.movement ? { ...data.movement } : null;

        if (updated) {
          updated.date = toYYYYMMDD(updated.date);
          setMovements((prev) =>
            prev.map((x) => (x.id === updated.id ? updated : x))
          );
        }
      } else {
        const data = await apiFetch(`/api/farms/${farmId}/finance/movements`, {
          method: "POST",
          body: JSON.stringify(mov),
        });

        const created = data?.movement || null;
        if (created) {
          created.date = toYYYYMMDD(created.date);
          setMovements((prev) => [created, ...prev]);
        }
      }

      setEditingMovement(null);
      setShowModal(false);
    } catch (err) {
      setErrorMsg(err?.message || "No se pudo guardar el movimiento.");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // (1) DELETE MOVEMENT (REAL) DESDE LA TABLA
  // =========================
  const handleDeleteMovement = async (movementId) => {
    const ok = window.confirm("¿Eliminar este movimiento?");
    if (!ok) return;

    setErrorMsg("");

    if (!farmId) {
      setErrorMsg("No hay finca activa.");
      return;
    }
    if (!token) {
      setErrorMsg("No hay token. Inicia sesión nuevamente.");
      return;
    }

    try {
      setSaving(true);

      await apiFetch(
        `/api/farms/${farmId}/finance/movements/${movementId}`,
        {
          method: "DELETE",
        }
      );

      setMovements((prev) => prev.filter((m) => m.id !== movementId));
    } catch (err) {
      setErrorMsg(err?.message || "No se pudo eliminar el movimiento.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditMovement = (mov) => {
    // no editar placeholders
    if (mov?.id?.toString().includes("placeholder")) return;

    setEditingMovement({
      ...mov,
      date: toYYYYMMDD(mov.date),
    });
    setShowModal(true);
  };

  return (
    <div className="page finance-page">
      <div className="finance-container">
        {/* Mensajes */}
        {(errorMsg || loading) && (
          <section className="card" style={{ marginBottom: "1rem" }}>
            {loading ? (
              <p style={{ margin: 0, opacity: 0.85 }}>Cargando finanzas…</p>
            ) : (
              <p style={{ margin: 0, opacity: 0.85 }}>{errorMsg}</p>
            )}
          </section>
        )}

        {/* IA */}
        <section className="finance-ia-section">
          <FinanceSummaryIA />
        </section>

        {/* RESUMEN FINANCIERO */}
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

          {/* (3) Chart real */}
          <ZoneMonthlyChart data={monthlyChartData} />
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
              onClick={() => {
                setEditingMovement(null);
                setShowModal(true);
              }}
              disabled={saving}
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
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rowsToRender.map((mov) => {
                  const isPlaceholder =
                    mov.id?.toString().includes("placeholder");

                  return (
                    <tr
                      key={mov.id}
                      className={isPlaceholder ? "row-placeholder" : ""}
                    >
                      <td>{toYYYYMMDD(mov.date)}</td>
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
                      <td>
                        <div className="task-actions">
                          <button
                            type="button"
                            className="small-btn"
                            disabled={saving || isPlaceholder}
                            onClick={() => handleEditMovement(mov)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="small-btn small-btn-danger"
                            disabled={saving || isPlaceholder}
                            onClick={() => handleDeleteMovement(mov.id)}
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </section>

        {showModal && (
          <AddMovementModal
            onClose={() => {
              setEditingMovement(null);
              setShowModal(false);
            }}
            onSave={handleSaveMovement}
            saving={saving}
            initialMovement={editingMovement}
          />
        )}
      </div>
    </div>
  );
}