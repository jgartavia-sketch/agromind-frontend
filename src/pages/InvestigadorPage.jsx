// src/pages/InvestigadorPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/investigador.css";

function looksLikeJwt(v) {
  if (!v || typeof v !== "string") return false;
  const s = v.trim();
  if (!s) return false;
  if (s.startsWith("eyJ") && s.split(".").length === 3) return true;
  const jwtLike = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;
  return jwtLike.test(s);
}

function findJwtInStorage(storage) {
  try {
    const keys = Object.keys(storage);
    for (const k of keys) {
      const v = storage.getItem(k);
      if (looksLikeJwt(v)) return v;
    }
  } catch (_) {}
  return "";
}

export default function InvestigadorPage() {
  const fileInputRef = useRef(null);

  const [imageDataUrl, setImageDataUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [zoneName, setZoneName] = useState("Zona 1");

  const [farmId, setFarmId] = useState(() => {
    return (
      localStorage.getItem("activeFarmId") ||
      localStorage.getItem("farmId") ||
      ""
    );
  });

  const [loading, setLoading] = useState(false);
  const [loadingFarm, setLoadingFarm] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const apiBase = useMemo(() => {
    return (import.meta?.env?.VITE_API_URL || "http://localhost:3001").replace(
      /\/$/,
      ""
    );
  }, []);

  // =========================
  // JWT helper (auto-detect)
  // =========================
  function getAuthToken() {
    const direct =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("authToken") ||
      sessionStorage.getItem("jwt") ||
      sessionStorage.getItem("accessToken") ||
      "";

    if (looksLikeJwt(direct)) return direct;

    const foundLocal = findJwtInStorage(localStorage);
    if (foundLocal) return foundLocal;

    const foundSession = findJwtInStorage(sessionStorage);
    if (foundSession) return foundSession;

    return "";
  }

  function authHeaders() {
    const t = getAuthToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  const hasToken = useMemo(() => !!getAuthToken(), []); // snapshot para UI

  // =========================
  // Auto-detect finca activa
  // =========================
  useEffect(() => {
    if (farmId) return;
    autoDetectFarm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function autoDetectFarm() {
    setLoadingFarm(true);
    setError("");

    const token = getAuthToken();
    if (!token) {
      setError(
        "No encontré tu token de sesión. Cierra sesión y vuelve a iniciar."
      );
      setLoadingFarm(false);
      return;
    }

    try {
      const resp = await fetch(`${apiBase}/api/farms`, {
        method: "GET",
        headers: { ...authHeaders() },
      });

      if (resp.status === 401) {
        setError(
          "Sesión no autorizada (401). Tu token expiró o no es válido. Cierra sesión y vuelve a iniciar."
        );
        return;
      }

      if (!resp.ok) {
        setError("No pude obtener tus fincas desde el backend.");
        return;
      }

      const data = await resp.json().catch(() => null);
      const list = Array.isArray(data) ? data : data?.farms || data?.data || [];

      if (!Array.isArray(list) || !list.length) {
        setError("No se encontró ninguna finca asociada a tu usuario.");
        return;
      }

      const primary = list.find((f) => f?.isPrimary) || list[0];
      const id = primary?.id;

      if (!id) {
        setError("Recibí fincas, pero no traen id.");
        return;
      }

      setFarmId(id);
      localStorage.setItem("activeFarmId", id);
    } catch (_) {
      setError("No pude consultar la finca activa. Revisa conexión al backend.");
    } finally {
      setLoadingFarm(false);
    }
  }

  // =========================
  // Foto (universal)
  // =========================
  function openPicker() {
    setError("");
    setResult(null);
    fileInputRef.current?.click();
  }

  async function handleFilePick(e) {
    setError("");
    setResult(null);

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Ese archivo no parece una imagen.");
      return;
    }

    e.target.value = "";

    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result || ""));
    reader.onerror = () => setError("No se pudo leer la imagen.");
    reader.readAsDataURL(file);
  }

  // =========================
  // Analizar
  // =========================
  async function analyze() {
    setError("");
    setResult(null);

    const token = getAuthToken();
    if (!token) {
      setError(
        "No encontré tu token de sesión. Cierra sesión y vuelve a iniciar."
      );
      return;
    }

    if (!farmId?.trim()) {
      await autoDetectFarm();
    }

    if (!farmId?.trim()) {
      setError("No se detectó tu finca activa.");
      return;
    }

    if (!imageDataUrl) {
      setError("Primero toma o sube una foto.");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${apiBase}/api/investigator/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          farmId: farmId.trim(),
          zoneName: zoneName?.trim() || null,
          imageDataUrl,
          extraContext: notes || "",
        }),
      });

      const data = await resp.json().catch(() => null);

      if (resp.status === 401) {
        setError(
          "No autorizado (401). Token inválido/expirado. Cierra sesión y vuelve a iniciar."
        );
        return;
      }

      if (!resp.ok) {
        setError(data?.error || "Error analizando.");
        return;
      }

      setResult(data);
      localStorage.setItem("activeFarmId", farmId.trim());
    } catch (_) {
      setError("No se pudo conectar al backend.");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // ChatGPT (opcional)
  // =========================
  async function openChatGPTAssist() {
    setError("");
    if (!imageDataUrl) {
      setError("Primero toma o sube una foto para usar esta opción.");
      return;
    }

    const prompt =
      `Actúa como asistente técnico de finca (plantas y animales).\n` +
      `Zona: ${zoneName || "N/A"}\n` +
      (notes ? `Notas: ${notes}\n` : "") +
      `\n1) Analiza la imagen adjunta.\n` +
      `2) Di si es planta/animal/desconocido.\n` +
      `3) Problema probable y severidad (baja/media/alta) con razones.\n` +
      `4) Acciones prácticas y seguras (sin dosis médicas).\n` +
      `5) 3 preguntas para confirmar.\n`;

    try {
      await navigator.clipboard.writeText(prompt);
      window.open("https://chat.openai.com/", "_blank", "noopener,noreferrer");
      alert("Copié instrucciones. En ChatGPT sube la foto y pega el texto.");
    } catch (_) {
      setError("No pude copiar. Abajo te dejo el texto para copiar manual.");
    }
  }

  const chatgptPromptFallback = useMemo(() => {
    return (
      `Actúa como asistente técnico de finca (plantas y animales).\n` +
      `Zona: ${zoneName || "N/A"}\n` +
      (notes ? `Notas: ${notes}\n` : "") +
      `\n1) Analiza la imagen adjunta.\n` +
      `2) Di si es planta/animal/desconocido.\n` +
      `3) Problema probable y severidad (baja/media/alta) con razones.\n` +
      `4) Acciones prácticas y seguras (sin dosis médicas).\n` +
      `5) 3 preguntas para confirmar.\n`
    );
  }, [notes, zoneName]);

  const resultCategory = result?.result?.category || "unknown";
  const resultTitle =
    resultCategory === "plant"
      ? "🌿 Planta"
      : resultCategory === "animal"
      ? "🐄 Animal"
      : "❓ Desconocido";

  return (
    <div className="investigador-page">
      <header className="investigador-header">
        <div className="investigador-title-row">
          <h1>Investigador</h1>
          <span className="investigador-pill">Cámara lista</span>
        </div>
        <p className="investigador-subtitle">
          Captura una imagen y genera recomendaciones prácticas.
        </p>
      </header>

      <section className="card investigador-shell">
        <div className="investigador-grid">
          {/* =======================
              IZQUIERDA: CONTROLES
          ======================= */}
          <aside className="investigador-left">
            <div className="investigador-panel">
              <div className="investigador-panel-head">
                <div className="investigador-panel-title">Entrada</div>
                <div className="investigador-panel-sub">
                  Zona + contexto opcional
                </div>
              </div>

              <div className="investigador-field">
                <label>Zona (opcional)</label>
                <input
                  className="investigador-input"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="Ej: Zona 1"
                />
              </div>

              <div className="investigador-field">
                <label>¿Qué estás viendo? (opcional)</label>
                <textarea
                  className="investigador-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: hojas con manchas, gallina decaída, vaca tosiendo…"
                  rows={4}
                />
                <div className="investigador-help">
                  Esto ayuda cuando la foto no es perfecta.
                </div>
              </div>

              <div className="investigador-health">
                <span className={farmId ? "ok" : "warn"}>
                  {loadingFarm ? "Detectando finca…" : farmId ? "Finca ✅" : "Sin finca"}
                </span>
                <span className={hasToken ? "ok" : "warn"}>
                  {hasToken ? "Sesión ✅" : "Sin sesión"}
                </span>

                {!farmId && (
                  <button
                    type="button"
                    className="investigador-link"
                    onClick={autoDetectFarm}
                    disabled={loadingFarm}
                  >
                    Detectar finca ahora
                  </button>
                )}
              </div>
            </div>

            <div className="investigador-panel">
              <div className="investigador-panel-head">
                <div className="investigador-panel-title">Acciones</div>
                <div className="investigador-panel-sub">
                  Captura → analiza → resultados
                </div>
              </div>

              <div className="investigador-actions">
                <button
                  type="button"
                  className="investigador-btn investigador-btn-primary"
                  onClick={openPicker}
                >
                  📷 Tomar o subir foto
                </button>

                <button
                  type="button"
                  className="investigador-btn investigador-btn-secondary"
                  onClick={analyze}
                  disabled={loading}
                  title={!imageDataUrl ? "Primero selecciona una imagen" : ""}
                >
                  {loading ? "⏳ Analizando…" : "🧠 Analizar"}
                </button>

                <button
                  type="button"
                  className="investigador-btn investigador-btn-ghost"
                  onClick={openChatGPTAssist}
                >
                  ↗ Abrir ChatGPT
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFilePick}
                style={{ display: "none" }}
              />

              <details className="investigador-details">
                <summary>Instrucciones para ChatGPT (manual)</summary>
                <pre className="investigador-pre">{chatgptPromptFallback}</pre>
              </details>

              {error && <div className="investigador-error">{error}</div>}
            </div>
          </aside>

          {/* =======================
              DERECHA: PREVIEW + RESULTADO
          ======================= */}
          <div className="investigador-right">
            <div className="investigador-panel">
              <div className="investigador-panel-head">
                <div className="investigador-panel-title">Imagen</div>
                <div className="investigador-panel-sub">
                  {imageDataUrl ? "Lista para analizar" : "Sin imagen todavía"}
                </div>
              </div>

              <div className="investigador-preview-wrap">
                {imageDataUrl ? (
                  <img className="investigador-preview-img" src={imageDataUrl} alt="captura" />
                ) : (
                  <div className="investigador-preview-empty">
                    <div className="investigador-empty-icon">📷</div>
                    <div className="investigador-empty-title">Sin imagen</div>
                    <div className="investigador-empty-sub">
                      Presiona “Tomar o subir foto” para empezar.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="investigador-panel">
              <div className="investigador-panel-head">
                <div className="investigador-panel-title">Resultado</div>
                <div className="investigador-panel-sub">
                  {result?.ok ? "Análisis recibido" : "Aún no hay análisis"}
                </div>
              </div>

              {!result?.ok ? (
                <div className="investigador-result-empty">
                  <div className="investigador-result-kpi">
                    <span className="kpi-label">Estado</span>
                    <span className="kpi-value">{loading ? "Procesando" : "Listo"}</span>
                  </div>
                  <div className="investigador-result-note">
                    Cuando conectemos IA, aquí verás diagnóstico, severidad y acciones.
                  </div>
                </div>
              ) : (
                <div className="investigador-result-card">
                  <div className="investigador-result-head">
                    <div className="investigador-result-title">{resultTitle}</div>
                    <div className="investigador-result-chip">
                      {String(result?.result?.severity || "N/A").toUpperCase()}
                    </div>
                  </div>

                  <div className="investigador-result-line">
                    <span className="muted">Diagnóstico</span>
                    <strong>{result?.result?.issue || "N/A"}</strong>
                  </div>

                  <div className="investigador-result-block">
                    <div className="muted" style={{ marginBottom: "0.4rem" }}>
                      Acciones recomendadas
                    </div>
                    <ul className="investigador-ul">
                      {(result?.result?.recommended_actions || []).map((a, idx) => (
                        <li key={idx}>{a}</li>
                      ))}
                    </ul>
                  </div>

                  {(result?.result?.questions_to_confirm || []).length > 0 && (
                    <div className="investigador-result-block">
                      <div className="muted" style={{ marginBottom: "0.4rem" }}>
                        Preguntas para confirmar
                      </div>
                      <ul className="investigador-ul">
                        {(result?.result?.questions_to_confirm || []).map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}