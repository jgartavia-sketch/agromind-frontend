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

// -------------------------
// Helpers Activos (UI <-> Backend)
// -------------------------
function withQtyInName(name, qty) {
  const base = String(name || "").trim();
  const q = Number(qty || 1);
  if (!base) return "";
  if (!Number.isFinite(q) || q <= 1) return base;
  // Evita duplicar si ya trae (xN)
  if (/\(x\d+\)\s*$/.test(base)) return base;
  return `${base} (x${Math.trunc(q)})`;
}

function extractQtyFromName(name) {
  const s = String(name || "");
  const m = /\(x(\d+)\)\s*$/.exec(s);
  if (!m) return { cleanName: s.trim(), qty: 1 };
  const qty = Number(m[1] || 1);
  const cleanName = s.replace(/\(x\d+\)\s*$/, "").trim();
  return {
    cleanName: cleanName || s.trim(),
    qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
  };
}

export default function FinanzasPage({ farmId: farmIdProp, token: tokenProp }) {
  const [movements, setMovements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // =========================
  // ACTIVOS (PERSISTENTES)
  // =========================
  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsSaving, setAssetsSaving] = useState(false);
  const [assetsError, setAssetsError] = useState("");

  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("Equipo"); // mapea a category en backend
  const [assetQty, setAssetQty] = useState(1);
  const [assetUnitValue, setAssetUnitValue] = useState("");

  const totalAssetsValue = useMemo(() => {
    return assets.reduce((acc, a) => acc + Number(a.totalValue || 0), 0);
  }, [assets]);

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
  // LOAD MOVEMENTS (REAL) AL ENTRAR
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

        // Normalizamos la fecha + invoiceNumber para el UI
        const normalized = list.map((m) => ({
          ...m,
          date: toYYYYMMDD(m.date),
          invoiceNumber:
            typeof m.invoiceNumber === "string" && m.invoiceNumber.trim()
              ? m.invoiceNumber.trim()
              : "",
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

  // =========================
  // LOAD ASSETS (REAL) AL ENTRAR
  // =========================
  useEffect(() => {
    let cancelled = false;

    async function loadAssets() {
      setAssetsError("");

      if (!farmId) {
        setAssets([]);
        setAssetsError("No se detectó una finca activa para cargar activos.");
        return;
      }
      if (!token) {
        setAssets([]);
        setAssetsError("No hay token. Inicia sesión nuevamente.");
        return;
      }

      try {
        setAssetsLoading(true);
        const data = await apiFetch(`/api/farms/${farmId}/finance/assets`);
        if (cancelled) return;

        const list = Array.isArray(data?.assets) ? data.assets : [];

        // Mapeo backend -> UI
        const normalized = list.map((a) => {
          const { cleanName, qty } = extractQtyFromName(a?.name);
          const unit = Number(a?.purchaseValue || 0);
          const total = Math.max(0, qty) * Math.max(0, unit);

          return {
            id: a.id,
            name: cleanName || a?.name || "",
            type: a?.category || "Equipo",
            qty,
            unitValue: unit,
            totalValue: total,
            // extras por si luego hacemos edición avanzada:
            purchaseDate: a?.purchaseDate,
            usefulLifeYears: a?.usefulLifeYears,
            residualValue: a?.residualValue,
          };
        });

        setAssets(normalized);
      } catch (err) {
        if (cancelled) return;
        setAssetsError(err?.message || "No se pudieron cargar los activos.");
        setAssets([]);
      } finally {
        if (!cancelled) setAssetsLoading(false);
      }
    }

    loadAssets();
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

  // Chart real
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
            invoiceNumber: "—",
          },
          {
            id: "placeholder-2",
            date: "—",
            concept: "Ej: Compra de insumos",
            category: "—",
            type: "Gasto",
            amount: 0,
            note: "—",
            invoiceNumber: "—",
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
          updated.invoiceNumber =
            typeof updated.invoiceNumber === "string" &&
            updated.invoiceNumber.trim()
              ? updated.invoiceNumber.trim()
              : "";

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
          created.invoiceNumber =
            typeof created.invoiceNumber === "string" &&
            created.invoiceNumber.trim()
              ? created.invoiceNumber.trim()
              : "";

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
  // DELETE MOVEMENT (REAL) DESDE LA TABLA
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

      await apiFetch(`/api/farms/${farmId}/finance/movements/${movementId}`, {
        method: "DELETE",
      });

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
      invoiceNumber:
        typeof mov.invoiceNumber === "string" && mov.invoiceNumber.trim()
          ? mov.invoiceNumber.trim()
          : "",
    });
    setShowModal(true);
  };

  // =========================
  // CREATE ASSET (REAL)
  // =========================
  const handleAddAsset = async () => {
    setAssetsError("");

    if (!farmId) {
      setAssetsError("No hay finca activa. Selecciona/crea una finca primero.");
      return;
    }
    if (!token) {
      setAssetsError("No hay token. Inicia sesión nuevamente.");
      return;
    }

    const name = String(assetName || "").trim();
    const qty = Number(assetQty || 0);
    const unit = Number(assetUnitValue || 0);

    if (!name) {
      setAssetsError("Escribe un nombre para el activo.");
      return;
    }

    const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const safeUnit = Number.isFinite(unit) && unit >= 0 ? unit : 0;

    const payload = {
      name: withQtyInName(name, safeQty),
      category: assetType || "Equipo",
      purchaseValue: Math.trunc(safeUnit),
      // Mantenerlo simple por ahora:
      purchaseDate: new Date().toISOString(),
      usefulLifeYears: 5,
      residualValue: 0,
    };

    try {
      setAssetsSaving(true);
      const data = await apiFetch(`/api/farms/${farmId}/finance/assets`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const created = data?.asset || null;
      if (created) {
        const parsed = extractQtyFromName(created.name);
        const total = parsed.qty * Number(created.purchaseValue || 0);

        const uiAsset = {
          id: created.id,
          name: parsed.cleanName,
          type: created.category || "Equipo",
          qty: parsed.qty,
          unitValue: Number(created.purchaseValue || 0),
          totalValue: total,
          purchaseDate: created.purchaseDate,
          usefulLifeYears: created.usefulLifeYears,
          residualValue: created.residualValue,
        };

        setAssets((prev) => [uiAsset, ...prev]);

        setAssetName("");
        setAssetType("Equipo");
        setAssetQty(1);
        setAssetUnitValue("");
      }
    } catch (err) {
      setAssetsError(err?.message || "No se pudo guardar el activo.");
    } finally {
      setAssetsSaving(false);
    }
  };

  // =========================
  // DELETE ASSET (REAL)
  // =========================
  const handleDeleteAsset = async (assetId) => {
    const ok = window.confirm("¿Eliminar este activo?");
    if (!ok) return;

    setAssetsError("");

    if (!farmId) {
      setAssetsError("No hay finca activa.");
      return;
    }
    if (!token) {
      setAssetsError("No hay token. Inicia sesión nuevamente.");
      return;
    }

    try {
      setAssetsSaving(true);
      await apiFetch(`/api/farms/${farmId}/finance/assets/${assetId}`, {
        method: "DELETE",
      });

      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (err) {
      setAssetsError(err?.message || "No se pudo eliminar el activo.");
    } finally {
      setAssetsSaving(false);
    }
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

          {/* Chart real */}
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
            <FinanceCard label="Margen" value={`${summary.margin.toFixed(1)}%`} />
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
                  <th>Factura</th>
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
                      <td>{mov.invoiceNumber || "—"}</td>
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

          {/* =========================
              ACTIVOS (ABAJO DE FINANZAS) - PERSISTENTES
             ========================= */}
          <section className="finance-assets card" style={{ marginTop: "1rem" }}>
            <header className="page-header page-header-actions">
              <div>
                <h2>Activos</h2>
                <p className="page-subtitle">
                  Equipos, infraestructura y recursos con valor económico
                </p>
              </div>

              <button
                className="btn-secondary"
                type="button"
                onClick={handleAddAsset}
                disabled={assetsSaving || !assetName.trim()}
                title={!assetName.trim() ? "Escribe un nombre para el activo" : ""}
              >
                {assetsSaving ? "Guardando…" : "+ Agregar activo"}
              </button>
            </header>

            {(assetsError || assetsLoading) && (
              <div style={{ marginBottom: "0.75rem", opacity: 0.85 }}>
                {assetsLoading ? "Cargando activos…" : assetsError}
              </div>
            )}

            <div className="asset-form" style={{ display: "grid", gap: "0.75rem" }}>
              <div
                style={{
                  display: "grid",
                  gap: "0.5rem",
                  gridTemplateColumns: "2fr 1fr",
                }}
              >
                <input
                  className="input"
                  type="text"
                  placeholder="Nombre (Ej: Tractor, Bomba, Invernadero)"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                />

                <select
                  className="input"
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                >
                  <option value="Equipo">Equipo</option>
                  <option value="Infraestructura">Infraestructura</option>
                  <option value="Herramienta">Herramienta</option>
                  <option value="Animal">Animal</option>
                  <option value="Vehículo">Vehículo</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "0.5rem",
                  gridTemplateColumns: "1fr 1fr 1fr",
                }}
              >
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Cantidad"
                  value={assetQty}
                  onChange={(e) => setAssetQty(e.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Valor unitario (₡)"
                  value={assetUnitValue}
                  onChange={(e) => setAssetUnitValue(e.target.value)}
                />
                <div
                  className="input"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.6rem 0.75rem",
                    opacity: 0.9,
                  }}
                >
                  <span>Total activos</span>
                  <strong>{formatMoneyCRC(totalAssetsValue)}</strong>
                </div>
              </div>
            </div>

            <div className="finance-table" style={{ marginTop: "0.75rem" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Activo</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: "right" }}>Cantidad</th>
                    <th style={{ textAlign: "right" }}>Valor unitario</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.length === 0 ? (
                    <tr className="row-placeholder">
                      <td colSpan="6" style={{ opacity: 0.7 }}>
                        No hay activos registrados todavía.
                      </td>
                    </tr>
                  ) : (
                    assets.map((a) => (
                      <tr key={a.id}>
                        <td>{a.name}</td>
                        <td>{a.type}</td>
                        <td style={{ textAlign: "right" }}>{Number(a.qty || 0)}</td>
                        <td style={{ textAlign: "right" }}>
                          {formatMoneyCRC(a.unitValue)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {formatMoneyCRC(a.totalValue)}
                        </td>
                        <td>
                          <div className="task-actions">
                            <button
                              type="button"
                              className="small-btn small-btn-danger"
                              disabled={assetsSaving}
                              onClick={() => handleDeleteAsset(a.id)}
                            >
                              Borrar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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