// src/components/finance/FinanceSummaryIA.jsx
import { useEffect, useMemo, useState } from "react";
import "./finance-summary-ia.css";

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

function formatMoneyCRC(value) {
  const n = Number(value || 0);
  return n.toLocaleString("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  });
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

function getMonthKey(dateStr) {
  const d = toYYYYMMDD(dateStr);
  if (!d || d.includes("—")) return "";
  return d.slice(0, 7); // YYYY-MM
}

function safeNum(x) {
  const n = Number(x || 0);
  return Number.isFinite(n) ? n : 0;
}

// =========================
// Normalizador de payload para Tasks (backend exige start/due YYYY-MM-DD)
// Soporta legacy: dueDate / description
// =========================
function toYYYYMMDDSafe(v) {
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function normalizeTaskPayload(raw) {
  const p = raw && typeof raw === "object" ? raw : {};

  // due: preferir due, luego dueDate, luego start, luego hoy
  const due =
    toYYYYMMDDSafe(p.due) ||
    toYYYYMMDDSafe(p.dueDate) ||
    toYYYYMMDDSafe(p.start) ||
    toYYYYMMDDSafe(new Date());

  const start = toYYYYMMDDSafe(p.start) || due;

  return {
    title: String(p.title || "Tarea sugerida").slice(0, 120),
    zone: String(p.zone || "").slice(0, 120),
    type: String(p.type || "Mantenimiento").slice(0, 80),
    priority: String(p.priority || "Media").slice(0, 40),
    start,
    due,
    status: String(p.status || "Pendiente").slice(0, 40),
    owner: String(p.owner || "").slice(0, 80),
  };
}

// -------------------------
// Motor local de insights (fallback sin backend)
// -------------------------
function buildLocalInsights({ movements = [], assets = [], summary = null }) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;

  const ingresos = summary
    ? safeNum(summary.ingresos)
    : movements
        .filter((m) => m.type === "Ingreso")
        .reduce((acc, m) => acc + safeNum(m.amount), 0);

  const gastos = summary
    ? safeNum(summary.gastos)
    : movements
        .filter((m) => m.type === "Gasto")
        .reduce((acc, m) => acc + safeNum(m.amount), 0);

  const balance = summary ? safeNum(summary.balance) : ingresos - gastos;
  const margen = ingresos > 0 ? (balance / ingresos) * 100 : 0;

  // categorías top (por total)
  const catMap = new Map();
  for (const m of movements) {
    const cat = String(m.category || "Sin categoría").trim() || "Sin categoría";
    const amt = safeNum(m.amount);
    const prev = catMap.get(cat) || 0;
    catMap.set(cat, prev + amt);
  }
  const topCategories = Array.from(catMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Auditoría simple
  const missingCategory = movements.filter(
    (m) =>
      !String(m.category || "").trim() || String(m.category).trim() === "—"
  ).length;
  const tooGeneralCategory = movements.filter(
    (m) => String(m.category || "").trim().toLowerCase() === "general"
  ).length;
  const genericConcept = movements.filter((m) => {
    const c = String(m.concept || "").trim().toLowerCase();
    return (
      !c ||
      c === "—" ||
      c === "varios" ||
      c === "misc" ||
      c === "compra" ||
      c === "venta"
    );
  }).length;

  const invoiceMissing = movements.filter(
    (m) =>
      m.type === "Gasto" &&
      (!String(m.invoiceNumber || "").trim() ||
        String(m.invoiceNumber).trim() === "—")
  ).length;

  // posibles duplicados: mismo concepto + mismo monto + misma fecha
  const seen = new Set();
  let possibleDuplicates = 0;
  for (const m of movements) {
    const key = `${toYYYYMMDD(m.date)}|${String(m.concept || "")
      .trim()
      .toLowerCase()}|${safeNum(m.amount)}`;
    if (seen.has(key)) possibleDuplicates += 1;
    else seen.add(key);
  }

  // Proyección: promedio neto diario * N (usa mes actual si hay, si no todo)
  const monthMovs = movements.filter((m) => getMonthKey(m.date) === monthKey);
  const basis = monthMovs.length > 0 ? monthMovs : movements;

  const dailyNet = (() => {
    if (basis.length === 0) return 0;

    const dates = basis
      .map((m) => new Date(toYYYYMMDD(m.date)))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a - b);

    if (dates.length === 0) return 0;

    const first = dates[0];
    const last = dates[dates.length - 1];
    const days =
      Math.max(1, Math.round((last - first) / (1000 * 60 * 60 * 24)) + 1) || 1;

    const inc = basis
      .filter((m) => m.type === "Ingreso")
      .reduce((acc, m) => acc + safeNum(m.amount), 0);
    const exp = basis
      .filter((m) => m.type === "Gasto")
      .reduce((acc, m) => acc + safeNum(m.amount), 0);

    return (inc - exp) / days;
  })();

  const projection30 = dailyNet * 30;
  const projection90 = dailyNet * 90;

  // health score simple
  let healthScore = 50;
  if (margen >= 20) healthScore += 20;
  else if (margen >= 10) healthScore += 10;
  else if (margen < 0) healthScore -= 20;

  const total = Math.max(1, movements.length);
  const missingRatio = missingCategory / total;
  if (missingRatio > 0.25) healthScore -= 15;
  else if (missingRatio > 0.1) healthScore -= 8;

  if (invoiceMissing > 0) healthScore -= Math.min(15, invoiceMissing * 2);
  if (possibleDuplicates > 0) healthScore -= Math.min(10, possibleDuplicates);

  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

  // sugerencias (acciones)
  const suggestions = [];

  if (movements.length === 0) {
    suggestions.push({
      id: "local-boot-1",
      title: "Activá tu sistema financiero",
      message:
        "Agregá al menos 5 movimientos (ingresos y gastos) para que el análisis sea más preciso. Sin datos, la IA solo puede adivinar… y aquí no vendemos adivinanzas.",
      actionPayload: {
        title: "Registrar movimientos financieros iniciales",
        description:
          "Ingresar al menos 5 movimientos (ingresos/gastos) con categoría y, si aplica, número de factura.",
        priority: "Alta",
        status: "Pendiente",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  } else {
    if (missingCategory > 0) {
      suggestions.push({
        id: "local-audit-cat",
        title: "Ordená tus categorías",
        message: `Tenés ${missingCategory} movimiento(s) sin categoría. Clasificarlos mejora reportes y decisiones de compra.`,
        actionPayload: {
          title: "Auditar movimientos sin categoría",
          description: `Revisar y asignar categoría a ${missingCategory} movimiento(s) sin categoría en Finanzas.`,
          priority: "Media",
          status: "Pendiente",
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }

    if (invoiceMissing > 0) {
      suggestions.push({
        id: "local-audit-invoice",
        title: "Gastos sin factura",
        message: `Hay ${invoiceMissing} gasto(s) sin número de factura. Eso es una grieta para auditoría y control.`,
        actionPayload: {
          title: "Completar facturas faltantes en gastos",
          description: `Registrar número de factura/recibo en ${invoiceMissing} gasto(s).`,
          priority: "Media",
          status: "Pendiente",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }

    if (margen < 10 && ingresos > 0) {
      suggestions.push({
        id: "local-margin",
        title: "Margen bajo",
        message: `Tu margen está en ${margen.toFixed(
          1
        )}%. Recomendación: revisar gastos “silenciosos” (insumos, transporte, reparaciones) y renegociar costos.`,
        actionPayload: {
          title: "Revisión de costos para mejorar margen",
          description:
            "Analizar categorías de gasto más altas del mes y proponer ajustes para subir margen por encima de 15%.",
          priority: "Alta",
          status: "Pendiente",
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }

    if (topCategories.length > 0) {
      const top = topCategories[0];
      suggestions.push({
        id: "local-topcat",
        title: "Tu categoría dominante",
        message: `La categoría con mayor movimiento es “${top.category}” (${formatMoneyCRC(
          top.total
        )}). Usala como KPI: ¿es inversión estratégica o fuga?`,
        actionPayload: null,
      });
    }

    if (assets.length === 0) {
      suggestions.push({
        id: "local-assets",
        title: "Activos sin registrar",
        message:
          "Tenés movimientos financieros pero cero activos. Registrar equipos/infraestructura mejora patrimonio y decisiones de mantenimiento.",
        actionPayload: {
          title: "Registrar activos principales de la finca",
          description:
            "Agregar equipos, infraestructura y recursos con valor económico (cantidad y valor unitario).",
          priority: "Media",
          status: "Pendiente",
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }
  }

  return {
    source: "local",
    summary: { month: monthKey, ingresos, gastos, balance, margen },
    healthScore,
    projection30,
    projection90,
    topCategories,
    anomalies: [],
    audit: {
      missingCategory,
      tooGeneralCategory,
      genericConcept,
      possibleDuplicates,
      invoiceMissing,
    },
    suggestions,
  };
}

export default function FinanceSummaryIA({
  movements = [],
  assets = [],
  summary = null,
  resumenZona = null,
  loading: parentLoading = false,
  errorMsg: parentError = "",
  farmId: farmIdProp,
  token: tokenProp,
  apiBase: apiBaseProp,
}) {
  const [tab, setTab] = useState("estado");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [insights, setInsights] = useState(null);
  const [ignored, setIgnored] = useState(() => new Set());

  const API_BASE =
    apiBaseProp ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "";

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
      cache: "no-store",
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErrorMsg("");
      setInsights(null);

      if (!farmId) return setErrorMsg("No se detectó una finca activa.");
      if (!token) return setErrorMsg("No hay token. Inicia sesión nuevamente.");

      try {
        setLoading(true);
        const ts = Date.now();
        const data = await apiFetch(
          `/api/farms/${farmId}/finance/insights?ts=${ts}`
        );
        if (cancelled) return;
        setInsights(data || null);
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(
          err?.message ||
            "No se pudieron cargar los insights del servidor. Mostrando análisis local."
        );
        setInsights(null);
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

  // Siempre calculamos local para poder “rellenar” sugerencias si el server no trae
  const localInsights = useMemo(() => {
    return buildLocalInsights({
      movements,
      assets,
      summary: summary || resumenZona,
    });
  }, [movements, assets, summary, resumenZona]);

  // Si hay server insights, los usamos para métricas; si no, usamos local completo
  const effectiveInsights = useMemo(() => {
    if (insights) return { ...insights, source: "server" };
    return localInsights;
  }, [insights, localInsights]);

  // ✅ SUGERENCIAS HÍBRIDAS:
  // - si el server trae sugerencias (>0), usamos esas
  // - si el server trae [] o no trae, usamos las locales (datos reales)
  const suggestionsBase = useMemo(() => {
    const serverList = Array.isArray(insights?.suggestions)
      ? insights.suggestions
      : null;
    if (serverList && serverList.length > 0) return serverList;
    return Array.isArray(localInsights?.suggestions) ? localInsights.suggestions : [];
  }, [insights, localInsights]);

  const suggestions = useMemo(() => {
    return suggestionsBase
      .map((s) => ({
        ...s,
        id: String(s?.id || ""),
      }))
      .filter((s) => s.id && !ignored.has(s.id));
  }, [suggestionsBase, ignored]);

  const summaryCards = useMemo(() => {
    const s = effectiveInsights?.summary;
    if (!s) return [];
    const month = s.month || "—";

    return [
      {
        label: "Ingresos",
        value: formatMoneyCRC(s.ingresos),
        meta: month,
        cls: "success",
      },
      {
        label: "Gastos",
        value: formatMoneyCRC(s.gastos),
        meta: month,
        cls: "warning",
      },
      {
        label: "Balance",
        value: formatMoneyCRC(s.balance),
        meta: `Margen ${Number(s.margen || 0).toFixed(1)}%`,
        cls: "",
      },
      {
        label: "Score",
        value: `${effectiveInsights?.healthScore ?? 0}/100`,
        meta:
          effectiveInsights?.source === "server"
            ? "Salud financiera (IA)"
            : "Salud financiera (local)",
        cls: "",
      },
    ];
  }, [effectiveInsights]);

  const handleIgnore = (s) => {
    const id = String(s?.id || "");
    if (!id) return;

    setIgnored((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const fireTasksRefresh = () => {
    try {
      window.dispatchEvent(
        new CustomEvent("agromind:tasks:refresh", { detail: { farmId } })
      );
      localStorage.setItem("agromind_tasks_refresh", String(Date.now()));
    } catch {
      // no-op
    }
  };

  const handleAddToTasks = async (s) => {
    const id = String(s?.id || "");
    try {
      setErrorMsg("");

      if (!farmId) return setErrorMsg("No hay finca activa.");
      if (!token) return setErrorMsg("No hay token.");

      const payload = s?.actionPayload || null;
      if (!payload) return;

      setSavingId(id || "saving");

      // ✅ Normalizar SIEMPRE al formato que tu backend acepta
      const normalized = normalizeTaskPayload(payload);

      await apiFetch(`/api/farms/${farmId}/tasks`, {
        method: "POST",
        body: JSON.stringify(normalized),
      });

      // ✅ Ocultar sugerencia + refrescar tareas
      handleIgnore(s);
      fireTasksRefresh();
    } catch (err) {
      setErrorMsg(err?.message || "No se pudo crear la tarea desde la sugerencia.");
    } finally {
      setSavingId(null);
    }
  };

  const headerLine = (() => {
    if (parentLoading || loading) return "Cargando…";
    if (parentError) return parentError;
    if (errorMsg) return errorMsg;

    const serverHasSuggestions =
      Array.isArray(insights?.suggestions) && insights.suggestions.length > 0;

    if (effectiveInsights?.source === "server" && serverHasSuggestions) {
      return "Resumen, alertas y sugerencias (IA)";
    }
    if (effectiveInsights?.source === "server" && !serverHasSuggestions) {
      return "IA activa (server) · sugerencias (local) por ahora";
    }
    return "Resumen, alertas y sugerencias (análisis local)";
  })();

  const projection30 = safeNum(effectiveInsights?.projection30);
  const projection90 = safeNum(effectiveInsights?.projection90);
  const topCategories = Array.isArray(effectiveInsights?.topCategories)
    ? effectiveInsights.topCategories
    : [];

  return (
    <section className="finance-ia-shell">
      <header className="finance-ia-header">
        <h3>Estado financiero del mes</h3>
        <p className="finance-ia-sub">{headerLine}</p>
      </header>

      <div className="finance-ia-cards">
        {summaryCards.length === 0 ? (
          <>
            <div className="finance-card">
              <div className="label">Ingresos</div>
              <div className="value">₡0</div>
              <div className="meta">—</div>
            </div>
            <div className="finance-card">
              <div className="label">Gastos</div>
              <div className="value">₡0</div>
              <div className="meta">—</div>
            </div>
            <div className="finance-card">
              <div className="label">Balance</div>
              <div className="value">₡0</div>
              <div className="meta">—</div>
            </div>
            <div className="finance-card">
              <div className="label">Score</div>
              <div className="value">0/100</div>
              <div className="meta">—</div>
            </div>
          </>
        ) : (
          summaryCards.map((c, idx) => (
            <div key={idx} className={`finance-card ${c.cls || ""}`}>
              <div className="label">{c.label}</div>
              <div className="value">{c.value}</div>
              <div className="meta">{c.meta}</div>
            </div>
          ))
        )}
      </div>

      <nav className="finance-ia-tabs">
        <button
          type="button"
          className={`tab ${tab === "estado" ? "active" : ""}`}
          onClick={() => setTab("estado")}
        >
          Estado
        </button>
        <button
          type="button"
          className={`tab ${tab === "alertas" ? "active" : ""}`}
          onClick={() => setTab("alertas")}
        >
          Alertas
        </button>
        <button
          type="button"
          className={`tab ${tab === "auditor" ? "active" : ""}`}
          onClick={() => setTab("auditor")}
        >
          Auditor
        </button>
      </nav>

      <div className="finance-ia-content">
        {tab === "estado" && (
          <>
            <p style={{ marginTop: 0, opacity: 0.9 }}>
              Proyección: <b>{formatMoneyCRC(projection30)}</b> (30 días) ·{" "}
              <b>{formatMoneyCRC(projection90)}</b> (90 días)
            </p>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                flexWrap: "wrap",
                opacity: 0.9,
              }}
            >
              {topCategories.map((c, idx) => (
                <span
                  key={`${c.category || "cat"}-${idx}`}
                  style={{ fontSize: "0.85rem" }}
                >
                  <b>{c.category}</b>: {formatMoneyCRC(c.total)}
                </span>
              ))}
            </div>
          </>
        )}

        {tab === "alertas" && (
          <>
            {(effectiveInsights?.anomalies || []).length === 0 ? (
              <p style={{ margin: 0, opacity: 0.85 }}>
                Sin alertas detectadas este mes.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {(effectiveInsights?.anomalies || []).map((a, i) => (
                  <li key={i} style={{ marginBottom: "0.35rem" }}>
                    <b>{a?.title || "Alerta"}</b> — {a?.message || ""}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "auditor" && (
          <>
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              <li>
                Sin categoría:{" "}
                <b>{effectiveInsights?.audit?.missingCategory ?? 0}</b>
              </li>
              <li>
                “General”:{" "}
                <b>{effectiveInsights?.audit?.tooGeneralCategory ?? 0}</b>
              </li>
              <li>
                Concepto genérico:{" "}
                <b>{effectiveInsights?.audit?.genericConcept ?? 0}</b>
              </li>
              <li>
                Posibles duplicados:{" "}
                <b>{effectiveInsights?.audit?.possibleDuplicates ?? 0}</b>
              </li>
              <li>
                Gastos sin factura:{" "}
                <b>{effectiveInsights?.audit?.invoiceMissing ?? 0}</b>
              </li>
            </ul>
          </>
        )}
      </div>

      <div style={{ marginTop: "0.9rem" }}>
        <h4 style={{ margin: "0 0 0.55rem" }}>Sugerencias</h4>

        {suggestions.length === 0 ? (
          <p style={{ margin: 0, opacity: 0.75, fontSize: "0.85rem" }}>
            No hay sugerencias disponibles.
          </p>
        ) : (
          <div className="finance-ia-suggestions">
            {suggestions.map((s) => {
              const busy = savingId && savingId === s.id;

              return (
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
                      className="primary-btn"
                      disabled={!!savingId || !s.actionPayload}
                      onClick={() => handleAddToTasks(s)}
                      style={{ padding: "0.35rem 0.8rem", fontSize: "0.85rem" }}
                      title={
                        s.actionPayload
                          ? "Crear tarea a partir de esta sugerencia"
                          : "Sugerencia informativa"
                      }
                    >
                      {busy ? "Creando…" : "Agregar"}
                    </button>

                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={!!savingId}
                      onClick={() => handleIgnore(s)}
                      style={{ padding: "0.35rem 0.8rem", fontSize: "0.85rem" }}
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}