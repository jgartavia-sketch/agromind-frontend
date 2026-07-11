// Archivo modificado para contexto de finca activa.

// src/pages/FinanzasPage.jsx
import { useEffect, useMemo, useState } from "react";
import "../styles/finanzas.css";

/* ===== Componentes ===== */
import FinanceCard from "../components/finance/FinanceCard";
import ZoneMonthlyChart from "../components/finance/ZoneMonthlyChart";
import AddMovementModal from "../components/finance/AddMovementModal";

import { summarizeMovements } from "../utils/financeUtils";
import { useFarm } from "../context/FarmContext";

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


function toYYYYMMDD(value) {
  if (!value) return "—";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return "—";
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}


function getMonthKey(value) {
  const date = toYYYYMMDD(value);
  return date.includes("—") ? "sin-fecha" : date.slice(0, 7);
}

function getDayKey(value) {
  const date = toYYYYMMDD(value);
  return date.includes("—") ? "sin-fecha" : date;
}

function formatMonthLabel(monthKey) {
  if (!monthKey || monthKey === "sin-fecha") return "Sin fecha";

  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);

  return date.toLocaleDateString("es-CR", {
    month: "long",
    year: "numeric",
  });
}

function formatDayLabel(dayKey) {
  if (!dayKey || dayKey === "sin-fecha") return "Sin fecha";

  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function groupMovementsByMonthAndDay(movements) {
  const monthMap = new Map();

  for (const movement of movements) {
    const monthKey = getMonthKey(movement.date);
    const dayKey = getDayKey(movement.date);

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        key: monthKey,
        label: formatMonthLabel(monthKey),
        movements: [],
        days: new Map(),
        ingresos: 0,
        gastos: 0,
      });
    }

    const month = monthMap.get(monthKey);
    month.movements.push(movement);

    if (!month.days.has(dayKey)) {
      month.days.set(dayKey, {
        key: dayKey,
        label: formatDayLabel(dayKey),
        movements: [],
      });
    }

    month.days.get(dayKey).movements.push(movement);

    const amount = Number(movement.amount || 0);
    if (movement.type === "Ingreso") month.ingresos += amount;
    if (movement.type === "Gasto") month.gastos += amount;
  }

  return Array.from(monthMap.values())
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((month) => ({
      ...month,
      balance: month.ingresos - month.gastos,
      days: Array.from(month.days.values()).sort((a, b) =>
        b.key.localeCompare(a.key)
      ),
    }));
}

function buildMonthlyChartData(movements) {
  const map = new Map();

  for (const m of movements) {
    const month = toYYYYMMDD(m.date).slice(0, 7);
    if (!month || month.includes("—")) continue;

    const prev = map.get(month) || { month, ingresos: 0, gastos: 0, balance: 0 };
    const amount = Number(m.amount || 0);

    if (m.type === "Ingreso") prev.ingresos += amount;
    else if (m.type === "Gasto") prev.gastos += amount;

    prev.balance = prev.ingresos - prev.gastos;
    map.set(month, prev);
  }

  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

function withQtyInName(name, qty) {
  const base = String(name || "").trim();
  const q = Number(qty || 1);
  if (!base) return "";
  if (!Number.isFinite(q) || q <= 1) return base;
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

export default function FinanzasPage({ token: tokenProp } = {}) {
  const [movements, setMovements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [openMonths, setOpenMonths] = useState({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsSaving, setAssetsSaving] = useState(false);
  const [assetsError, setAssetsError] = useState("");

  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("Equipo");
  const [assetQty, setAssetQty] = useState(1);
  const [assetUnitValue, setAssetUnitValue] = useState("");

  const totalAssetsValue = useMemo(() => {
    return assets.reduce((acc, a) => acc + Number(a.totalValue || 0), 0);
  }, [assets]);

  const API_BASE =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "";

  const { activeFarm, farmId, farmName } = useFarm();

  const token = tokenProp || getAuthToken();
  const activeFarmLabel =
    farmName || activeFarm?.name || (farmId ? "Finca activa" : "Sin finca activa");

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
    } catch {}

    if (!res.ok) {
      const msg = data?.error || `Error HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }


  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErrorMsg("");

      if (!farmId) {
        setMovements([]);
        setErrorMsg("No se detectó una finca activa. Selecciona/crea una finca primero.");
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
  }, [farmId, token, API_BASE]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [farmId, token, API_BASE]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const monthlyChartData = useMemo(
    () => buildMonthlyChartData(movements),
    [movements]
  );

  const rowsToRender = movements;

  const groupedMovements = useMemo(
    () => groupMovementsByMonthAndDay(rowsToRender),
    [rowsToRender]
  );

  useEffect(() => {
    if (!groupedMovements.length) return;

    setOpenMonths((previous) => {
      if (Object.keys(previous).length > 0) return previous;
      return { [groupedMovements[0].key]: true };
    });
  }, [groupedMovements]);

  const toggleMonth = (monthKey) => {
    setOpenMonths((previous) => ({
      ...previous,
      [monthKey]: !previous[monthKey],
    }));
  };

  const handleOpenNewMovement = () => {
    setEditingMovement(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowModal(true);
  };

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
            typeof updated.invoiceNumber === "string" && updated.invoiceNumber.trim()
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
            typeof created.invoiceNumber === "string" && created.invoiceNumber.trim()
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
        <section className="card finance-active-farm">
          <div className="finance-active-farm__identity">
            <div className="finance-active-farm__eyebrow">
              🌱 Finca activa
            </div>
            <strong className="finance-active-farm__name">
              {activeFarmLabel}
            </strong>
          </div>

          <p className="finance-active-farm__description">
            Los ingresos, gastos, activos y análisis financiero pertenecen a esta finca.
            Para trabajar en otra, cambiá la finca activa desde el mapa.
          </p>
        </section>

        <section className="finance-top-action card">
          <button
            className="btn-primary"
            type="button"
            onClick={handleOpenNewMovement}
            disabled={saving}
          >
            {saving ? "Procesando…" : "+ Agregar movimiento"}
          </button>
        </section>

        {(errorMsg || loading) && (
          <section className="card" style={{ marginBottom: "1rem" }}>
            {loading ? (
              <p style={{ margin: 0, opacity: 0.85 }}>Cargando finanzas…</p>
            ) : (
              <p style={{ margin: 0, opacity: 0.85 }}>{errorMsg}</p>
            )}
          </section>
        )}

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

          <ZoneMonthlyChart data={monthlyChartData} />
        </section>

        <section className="finance-real-section">
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

          <section
            className="finance-movements card"
            aria-label="Movimientos financieros"
          >
            <header className="finance-movements-header">
              <div>
                <h2>Movimientos</h2>
                <p>Historial organizado por mes y día</p>
              </div>

              <span className="finance-movements-count">
                {rowsToRender.length}{" "}
                {rowsToRender.length === 1 ? "movimiento" : "movimientos"}
              </span>
            </header>

            {groupedMovements.length === 0 ? (
              <div className="finance-empty-state">
                Todavía no hay movimientos registrados.
              </div>
            ) : (
              <div className="finance-month-list">
                {groupedMovements.map((month) => {
                  const isOpen = !!openMonths[month.key];

                  return (
                    <section className="finance-month-folder" key={month.key}>
                      <button
                        type="button"
                        className="finance-month-trigger"
                        onClick={() => toggleMonth(month.key)}
                        aria-expanded={isOpen}
                      >
                        <span
                          className={`finance-month-chevron ${
                            isOpen ? "is-open" : ""
                          }`}
                          aria-hidden="true"
                        >
                          ›
                        </span>

                        <span className="finance-month-title">
                          {month.label}
                        </span>

                        <span className="finance-month-meta">
                          <span>{month.movements.length} movimientos</span>
                          <strong
                            className={
                              month.balance >= 0
                                ? "finance-month-balance is-positive"
                                : "finance-month-balance is-negative"
                            }
                          >
                            {formatMoneyCRC(month.balance)}
                          </strong>
                        </span>
                      </button>

                      {isOpen && (
                        <div className="finance-month-content">
                          {month.days.map((day) => (
                            <section className="finance-day-folder" key={day.key}>
                              <header className="finance-day-header">
                                <div>
                                  <strong>{day.label}</strong>
                                  <span>
                                    {day.movements.length}{" "}
                                    {day.movements.length === 1
                                      ? "movimiento"
                                      : "movimientos"}
                                  </span>
                                </div>
                              </header>

                              <div className="finance-day-movements">
                                {day.movements.map((mov) => {
                                  const isPlaceholder = mov.id
                                    ?.toString()
                                    .includes("placeholder");

                                  return (
                                    <article
                                      className="finance-movement-card"
                                      key={mov.id}
                                    >
                                      <div className="finance-movement-main">
                                        <div className="finance-movement-heading">
                                          <span
                                            className={getTypePillClass(mov.type)}
                                          >
                                            {mov.type}
                                          </span>

                                          <div>
                                            <h3>{mov.concept || "Sin concepto"}</h3>
                                            <p>{mov.category || "Sin categoría"}</p>
                                          </div>
                                        </div>

                                        <strong
                                          className={
                                            mov.type === "Ingreso"
                                              ? "finance-movement-amount is-income"
                                              : "finance-movement-amount is-expense"
                                          }
                                        >
                                          {formatMoneyCRC(mov.amount)}
                                        </strong>
                                      </div>

                                      <div className="finance-movement-details">
                                        <div>
                                          <span>Factura</span>
                                          <strong>
                                            {mov.invoiceNumber || "Sin factura"}
                                          </strong>
                                        </div>

                                        <div>
                                          <span>Nota</span>
                                          <strong title={mov.note || ""}>
                                            {mov.note || "Sin nota"}
                                          </strong>
                                        </div>
                                      </div>

                                      <div className="finance-movement-actions">
                                        <button
                                          type="button"
                                          className="finance-action-btn finance-action-btn-edit"
                                          disabled={saving || isPlaceholder}
                                          onClick={() => handleEditMovement(mov)}
                                        >
                                          Editar
                                        </button>

                                        <button
                                          type="button"
                                          className="finance-action-btn finance-action-btn-delete"
                                          disabled={saving || isPlaceholder}
                                          onClick={() =>
                                            handleDeleteMovement(mov.id)
                                          }
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    </article>
                                  );
                                })}
                              </div>
                            </section>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </section>

          <section className="finance-assets card">
            <header className="page-header page-header-actions">
              <div>
                <h2>Activos</h2>
                <p className="page-subtitle">
                  Equipos, infraestructura y recursos con valor económico
                </p>
              </div>

              <button
                className="btn-secondary finance-add-asset-btn"
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

            <div className="asset-form">
              <div className="asset-form-row asset-form-row-primary">
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

              <div className="asset-form-row asset-form-row-values">
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
                <div className="input asset-total-field">
                  <span>Total activos</span>
                  <strong>{formatMoneyCRC(totalAssetsValue)}</strong>
                </div>
              </div>
            </div>

            <div className="finance-table finance-assets-table">
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
                              className="finance-action-btn finance-action-btn-delete"
                              disabled={assetsSaving}
                              onClick={() => handleDeleteAsset(a.id)}
                              aria-label={`Eliminar activo ${a.name || ""}`}
                            >
                              <span>Eliminar</span>
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
