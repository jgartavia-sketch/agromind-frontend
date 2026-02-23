// src/pages/InvestigadorPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/investigador.css";

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
  // Auto-detect finca activa
  // =========================
  useEffect(() => {
    if (farmId) return; // ya tenemos una
    autoDetectFarm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function autoDetectFarm() {
    setLoadingFarm(true);
    setError("");

    try {
      const tryGet = async (path) => {
        const resp = await fetch(`${apiBase}${path}`, {
          method: "GET",
          credentials: "include",
        });
        if (!resp.ok) return null;
        return await resp.json().catch(() => null);
      };

      // 1) primary
      let data = await tryGet("/api/farms/primary");
      let id =
        data?.id ||
        data?.farm?.id ||
        data?.primaryFarm?.id ||
        data?.data?.id ||
        null;

      // 2) list
      if (!id) {
        data = await tryGet("/api/farms");
        const list =
          Array.isArray(data) ? data : data?.farms || data?.data || [];
        if (Array.isArray(list) && list.length) {
          const primary = list.find((f) => f?.isPrimary) || list[0];
          id = primary?.id || null;
        }
      }

      // 3) fallback singular
      if (!id) {
        data = await tryGet("/api/farm");
        id = data?.id || data?.farm?.id || data?.data?.id || null;
      }

      if (!id) {
        setError(
          "No pude detectar tu finca automáticamente. (Tu sesión está bien, solo falta exponer una finca desde el API)."
        );
        return;
      }

      setFarmId(id);
      localStorage.setItem("activeFarmId", id);
    } catch (_) {
      setError("No pude consultar la finca activa. Revisa el backend.");
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

    // permitir escoger la misma foto de nuevo
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

    // Si todavía no cargó farmId, lo intentamos una vez más
    if (!farmId?.trim()) {
      await autoDetectFarm();
    }

    if (!farmId?.trim()) {
      setError(
        "No se detectó tu finca activa. (Hoy lo resolvemos: el API debe devolver la finca primaria del usuario)."
      );
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
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          farmId: farmId.trim(),
          zoneName: zoneName?.trim() || null,
          imageDataUrl,
          extraContext: notes || "",
        }),
      });

      const data = await resp.json().catch(() => null);
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

  return (
    <div className="investigador-page">
      <header className="investigador-header">
        <h1>Investigador</h1>
        <p className="investigador-subtitle">
          Toma o sube una foto y recibe recomendaciones prácticas.
        </p>
      </header>

      <section className="investigador-action card">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div style={{ display: "grid", gap: "0.35rem" }}>
            <label style={{ opacity: 0.9, fontSize: "0.9rem" }}>
              Zona (opcional)
            </label>
            <input
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="Ej: Zona 1"
              style={{
                width: "100%",
                padding: "0.65rem 0.8rem",
                borderRadius: "0.8rem",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(2, 6, 23, 0.6)",
                color: "white",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "grid", gap: "0.35rem" }}>
            <label style={{ opacity: 0.9, fontSize: "0.9rem" }}>
              ¿Qué estás viendo? (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: hojas con manchas, gallina decaída, vaca tosiendo..."
              rows={3}
              style={{
                width: "100%",
                padding: "0.65rem 0.8rem",
                borderRadius: "0.8rem",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(2, 6, 23, 0.6)",
                color: "white",
                outline: "none",
                resize: "vertical",
              }}
            />
            <div style={{ opacity: 0.75, fontSize: "0.85rem" }}>
              Esto ayuda cuando la foto no es perfecta.
            </div>
          </div>

          {/* Estado finca (silencioso y profesional) */}
          <div style={{ opacity: 0.8, fontSize: "0.85rem" }}>
            {loadingFarm
              ? "Detectando tu finca…"
              : farmId
              ? "Finca detectada ✅"
              : "Finca no detectada todavía"}
          </div>
        </div>
      </section>

      <section className="investigador-action card">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="investigador-camera-btn"
              onClick={openPicker}
            >
              📷 Tomar o subir foto
            </button>

            <button
              type="button"
              className="investigador-camera-btn"
              onClick={analyze}
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "⏳ Analizando..." : "🧠 Analizar"}
            </button>

            <button
              type="button"
              className="investigador-camera-btn"
              onClick={openChatGPTAssist}
              style={{ opacity: 0.95 }}
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

          {imageDataUrl && (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <div style={{ opacity: 0.9, fontSize: "0.9rem" }}>
                Imagen lista:
              </div>
              <img
                src={imageDataUrl}
                alt="captura"
                style={{
                  width: "100%",
                  borderRadius: "1rem",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "0.9rem",
                border: "1px solid rgba(239,68,68,0.35)",
                background: "rgba(239,68,68,0.10)",
              }}
            >
              {error}
            </div>
          )}
        </div>
      </section>

      <section className="investigador-results">
        {result?.ok ? (
          <div className="investigador-card card">
            <span className="investigador-type">Resultado</span>

            <h3>
              {result?.result?.category === "plant"
                ? "🌿 Planta"
                : result?.result?.category === "animal"
                ? "🐄 Animal"
                : "❓ Desconocido"}
            </h3>

            <p className="investigador-status">
              Diagnóstico: <strong>{result?.result?.issue || "N/A"}</strong>
            </p>

            <p className="investigador-note">
              Severidad:{" "}
              <strong>{result?.result?.severity || "low"}</strong> · Confianza:{" "}
              <strong>
                {typeof result?.result?.confidence === "number"
                  ? `${Math.round(result.result.confidence * 100)}%`
                  : "N/A"}
              </strong>
            </p>

            <div style={{ marginTop: "0.75rem" }}>
              <p style={{ marginBottom: "0.35rem", opacity: 0.9 }}>
                Acciones recomendadas:
              </p>
              <ul style={{ marginTop: 0 }}>
                {(result?.result?.recommended_actions || []).map((a, idx) => (
                  <li key={idx}>{a}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="investigador-card card" style={{ opacity: 0.9 }}>
            <span className="investigador-type">Estado</span>
            <h3>Listo para analizar</h3>
            <p className="investigador-note">
              Presiona “Tomar o subir foto”, luego “Analizar”.
            </p>

            <details style={{ marginTop: "0.75rem" }}>
              <summary style={{ cursor: "pointer" }}>
                Ver instrucciones para ChatGPT (manual)
              </summary>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  marginTop: "0.5rem",
                  padding: "0.75rem",
                  borderRadius: "0.9rem",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(2, 6, 23, 0.6)",
                }}
              >
                {chatgptPromptFallback}
              </pre>
            </details>
          </div>
        )}
      </section>
    </div>
  );
}