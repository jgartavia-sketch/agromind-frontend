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

export default function FinanceSummaryIA() {
  const [tab, setTab] = useState("estado"); // estado | alertas | auditor
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [insights, setInsights] = useState(null);
  const [ignored, setIgnored] = useState(() => new Set());

  const API_BASE =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "";

  const token = getAuthToken();
  const farmId = getActiveFarmId();

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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErrorMsg("");
      setInsights(null);

      if (!farmId) {
        setErrorMsg("No se detectó una finca activa.");
        return;
      }
      if (!token) {
        setErrorMsg("No hay token. Inicia sesión nuevamente.");
        return;
      }

      try {
        setLoading(true);
        const data = await apiFetch(`/api/farms/${farmId}/finance/insights`);
        if (cancelled) return;
        setInsights(data || null);
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err?.message || "No se pudieron cargar los insights.");
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

  const suggestions = useMemo(() => {
    const list = Array.isArray(insights?.suggestions) ? insights.suggestions : [];
    return list.filter((s) => s?.id && !ignored.has(s.id));
  }, [insights, ignored]);

  const summaryCards = useMemo(() => {
    const s = insights?.summary;
    if (!s) return [];
    return [
      { label: "Ingresos", value: formatMoneyCRC(s.ingresos), meta: s.month, cls: "success" },
      { label: "Gastos", value: formatMoneyCRC(s.gastos), meta: s.month, cls: "warning" },
      { label: "Balance", value: formatMoneyCRC(s.balance), meta: `Margen ${Number(s.margen || 0).toFixed(1)}%`, cls: "" },
      { label: "Score", value: `${insights?.healthScore ?? 0}/100`, meta: "Salud financiera", cls: "" },
    ];
  }, [insights]);

  const handleIgnore = (s) => {
    if (!s?.id) return;
    setIgnored((prev) => {
      const next = new Set(prev);
      next.add(s.id);
      return next;
    });
  };

  const handleAddToTasks = async (s) => {
    try {
      setErrorMsg("");

      if (!farmId) return setErrorMsg("No hay finca activa.");
      if (!token) return setErrorMsg("No hay token.");

      if (!s?.actionPayload) return;

      setSaving(true);
      await apiFetch(`/api/farms/${farmId}/tasks`, {
        method: "POST",
        body: JSON.stringify(s.actionPayload),
      });

      // si se creó, la escondemos del carrusel
      handleIgnore(s);
    } catch (err) {
      setErrorMsg(err?.message || "No se pudo crear la tarea desde la sugerencia.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="finance-ia-shell">
      <header className="finance-ia-header">
        <h3>Estado financiero del mes</h3>
        <p className="finance-ia-sub">
          {loading ? "Cargando…" : errorMsg ? errorMsg : "Resumen, alertas y sugerencias"}
        </p>
      </header>

      {/* Cards superiores */}
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

      {/* Tabs */}
      <nav className="finance-ia-tabs">
        <button type="button" className={`tab ${tab === "estado" ? "active" : ""}`} onClick={() => setTab("estado")}>
          Estado
        </button>
        <button type="button" className={`tab ${tab === "alertas" ? "active" : ""}`} onClick={() => setTab("alertas")}>
          Alertas
        </button>
        <button type="button" className={`tab ${tab === "auditor" ? "active" : ""}`} onClick={() => setTab("auditor")}>
          Auditor
        </button>
      </nav>

      {/* Contenido */}
      <div className="finance-ia-content">
        {tab === "estado" && (
          <>
            <p style={{ marginTop: 0, opacity: 0.9 }}>
              Proyección: <b>{formatMoneyCRC(insights?.projection30 || 0)}</b> (30 días) ·{" "}
              <b>{formatMoneyCRC(insights?.projection90 || 0)}</b> (90 días)
            </p>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", opacity: 0.9 }}>
              {(insights?.topCategories || []).map((c) => (
                <span key={c.category} style={{ fontSize: "0.85rem" }}>
                  <b>{c.category}</b>: {formatMoneyCRC(c.total)}
                </span>
              ))}
            </div>
          </>
        )}

        {tab === "alertas" && (
          <>
            {(insights?.anomalies || []).length === 0 ? (
              <p style={{ margin: 0, opacity: 0.85 }}>Sin alertas detectadas este mes.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {insights.anomalies.map((a, i) => (
                  <li key={i} style={{ marginBottom: "0.35rem" }}>
                    <b>{a.title}</b> — {a.message}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "auditor" && (
          <>
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              <li>Sin categoría: <b>{insights?.audit?.missingCategory ?? 0}</b></li>
              <li>“General”: <b>{insights?.audit?.tooGeneralCategory ?? 0}</b></li>
              <li>Concepto genérico: <b>{insights?.audit?.genericConcept ?? 0}</b></li>
              <li>Posibles duplicados: <b>{insights?.audit?.possibleDuplicates ?? 0}</b></li>
              <li>Gastos sin factura: <b>{insights?.audit?.invoiceMissing ?? 0}</b></li>
            </ul>
          </>
        )}
      </div>

      {/* ✅ Sugerencias horizontales */}
      <div style={{ marginTop: "0.9rem" }}>
        <h4 style={{ margin: "0 0 0.55rem" }}>Sugerencias</h4>

        {suggestions.length === 0 ? (
          <p style={{ margin: 0, opacity: 0.75, fontSize: "0.85rem" }}>
            No hay sugerencias disponibles.
          </p>
        ) : (
          <div className="finance-ia-suggestions">
            {suggestions.map((s) => (
              <div key={s.id} className="finance-ia-suggestion-card">
                <div className="finance-ia-suggestion-title">{s.title || "Sugerencia"}</div>
                <div className="finance-ia-suggestion-text">{s.message || ""}</div>

                <div className="finance-ia-suggestion-actions">
                  <button
                    type="button"
                    className="small-btn"
                    disabled={saving || !s.actionPayload}
                    onClick={() => handleAddToTasks(s)}
                  >
                    {saving ? "…" : "Agregar"}
                  </button>
                  <button
                    type="button"
                    className="small-btn small-btn-danger"
                    disabled={saving}
                    onClick={() => handleIgnore(s)}
                  >
                    Ignorar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}