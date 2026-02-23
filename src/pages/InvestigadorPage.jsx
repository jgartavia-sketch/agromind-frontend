// src/pages/InvestigadorPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/investigador.css";

export default function InvestigadorPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream] = useState(null);

  const [imageDataUrl, setImageDataUrl] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [zoneName, setZoneName] = useState("Zona 1");

  const [farmId, setFarmId] = useState(() => {
    // Intento de autocompletar desde localStorage si tu app ya lo guarda
    return (
      localStorage.getItem("activeFarmId") ||
      localStorage.getItem("farmId") ||
      ""
    );
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const apiBase = useMemo(() => {
    // Si ya usás VITE_API_URL en tu front, lo respeta. Si no, cae al backend local.
    return (import.meta?.env?.VITE_API_URL || "http://localhost:3001").replace(
      /\/$/,
      ""
    );
  }, []);

  useEffect(() => {
    // Limpieza al salir
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setError("");
    setResult(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Este navegador no soporta cámara (getUserMedia).");
        return;
      }

      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      setStream(s);
      setCameraOn(true);

      // enganchar stream al video
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch (e) {
      setError(
        "No se pudo acceder a la cámara. Revisa permisos del navegador."
      );
    }
  }

  function stopCamera() {
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (_) {
      // ignore
    } finally {
      setStream(null);
      setCameraOn(false);
    }
  }

  function takePhoto() {
    setError("");
    setResult(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setError("Cámara no lista todavía.");
      return;
    }

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);

    // JPEG para reducir peso
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setImageDataUrl(dataUrl);
  }

  async function analyzeWithRules() {
    setError("");
    setResult(null);

    if (!farmId?.trim()) {
      setError("Falta farmId. Ponlo una vez y luego lo automatizamos.");
      return;
    }

    if (!imageDataUrl) {
      setError("Primero toma una foto.");
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
          extraContext: extraContext || "",
        }),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        setError(data?.error || "Error analizando (backend).");
        return;
      }

      setResult(data);
      // guardar farmId para no pedirlo de nuevo (si el usuario quiere)
      localStorage.setItem("activeFarmId", farmId.trim());
    } catch (e) {
      setError("No se pudo conectar al backend. ¿Está corriendo?");
    } finally {
      setLoading(false);
    }
  }

  async function openChatGPTAssist() {
    setError("");

    if (!imageDataUrl) {
      setError("Primero toma una foto para que esto tenga sentido.");
      return;
    }

    const prompt =
      `Actúa como asistente técnico de finca (plantas y animales).\n` +
      `Contexto:\n` +
      `- Zona: ${zoneName || "N/A"}\n` +
      (extraContext ? `- Notas: ${extraContext}\n` : "") +
      `\nInstrucciones:\n` +
      `1) Analiza la imagen adjunta.\n` +
      `2) Dime si es planta, animal o desconocido.\n` +
      `3) Indica el problema más probable, severidad (baja/media/alta) y por qué.\n` +
      `4) Recomiéndame acciones seguras y prácticas (sin dosis médicas).\n` +
      `5) Haz 3 preguntas para confirmar.\n`;

    try {
      await navigator.clipboard.writeText(prompt);
      window.open("https://chat.openai.com/", "_blank", "noopener,noreferrer");
      // Nota: no se puede “enviar” la imagen automáticamente a ChatGPT.
      // El usuario sube la foto manualmente y pega el prompt.
      alert(
        "Listo: copié un prompt al portapapeles. Se abrió ChatGPT: sube la foto ahí y pega el prompt."
      );
    } catch (e) {
      setError(
        "No pude copiar al portapapeles. Copia el prompt manualmente (te lo muestro abajo)."
      );
    }
  }

  const chatgptPromptFallback = useMemo(() => {
    return (
      `Actúa como asistente técnico de finca (plantas y animales).\n` +
      `Contexto:\n` +
      `- Zona: ${zoneName || "N/A"}\n` +
      (extraContext ? `- Notas: ${extraContext}\n` : "") +
      `\nInstrucciones:\n` +
      `1) Analiza la imagen adjunta.\n` +
      `2) Dime si es planta, animal o desconocido.\n` +
      `3) Indica el problema más probable, severidad (baja/media/alta) y por qué.\n` +
      `4) Recomiéndame acciones seguras y prácticas (sin dosis médicas).\n` +
      `5) Haz 3 preguntas para confirmar.\n`
    );
  }, [extraContext, zoneName]);

  return (
    <div className="investigador-page">
      <header className="investigador-header">
        <h1>Investigador</h1>
        <p className="investigador-subtitle">
          Cámara + análisis por reglas (IA real se enchufa después).
        </p>
        <p className="investigador-env">Modo: rules-v1 · sin costos de IA</p>
      </header>

      {/* Configuración mínima */}
      <section className="investigador-action card">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div style={{ display: "grid", gap: "0.35rem" }}>
            <label style={{ opacity: 0.9, fontSize: "0.9rem" }}>
              Farm ID (temporal)
            </label>
            <input
              value={farmId}
              onChange={(e) => setFarmId(e.target.value)}
              placeholder="Pega tu farmId (luego lo automatizamos)"
              style={{
                width: "100%",
                padding: "0.65rem 0.8rem",
                borderRadius: "0.8rem",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(2,6,23,0.6)",
                color: "white",
                outline: "none",
              }}
            />
          </div>

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
                background: "rgba(2,6,23,0.6)",
                color: "white",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "grid", gap: "0.35rem" }}>
            <label style={{ opacity: 0.9, fontSize: "0.9rem" }}>
              Contexto (ayuda a las reglas)
            </label>
            <textarea
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              placeholder="Ej: hoja con manchas, gallina decaída, vaca con tos, etc."
              rows={3}
              style={{
                width: "100%",
                padding: "0.65rem 0.8rem",
                borderRadius: "0.8rem",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(2,6,23,0.6)",
                color: "white",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>
        </div>
      </section>

      {/* Cámara */}
      <section className="investigador-action card">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {!cameraOn ? (
              <button className="investigador-camera-btn" onClick={startCamera}>
                📷 Abrir cámara
              </button>
            ) : (
              <>
                <button className="investigador-camera-btn" onClick={takePhoto}>
                  📸 Tomar foto
                </button>
                <button
                  className="investigador-camera-btn"
                  onClick={stopCamera}
                  style={{ opacity: 0.9 }}
                >
                  ✖ Cerrar cámara
                </button>
              </>
            )}

            <button
              className="investigador-camera-btn"
              onClick={analyzeWithRules}
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1 }}
              title="Envía la imagen al backend (rules-v1)"
            >
              {loading ? "⏳ Analizando..." : "🧠 Analizar (rules)"}
            </button>

            <button
              className="investigador-camera-btn"
              onClick={openChatGPTAssist}
              title="Opción manual: abre ChatGPT y copia prompt (sin costo API tuyo)"
              style={{ opacity: 0.95 }}
            >
              ↗ Abrir ChatGPT
            </button>
          </div>

          {cameraOn && (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{
                  width: "100%",
                  borderRadius: "1rem",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(2,6,23,0.6)",
                }}
              />
              <p className="investigador-hint">
                Tip: si estás en celular, acepta permisos y apunta con buena luz.
              </p>
            </div>
          )}

          {/* Canvas oculto para snapshot */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {imageDataUrl && (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <div style={{ opacity: 0.9, fontSize: "0.9rem" }}>
                Foto capturada:
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

      {/* Resultado */}
      <section className="investigador-results">
        {result?.ok ? (
          <div className="investigador-card card">
            <span className="investigador-type">
              Motor: {result.engine || "rules"}
            </span>
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

            <div style={{ marginTop: "0.75rem" }}>
              <p style={{ marginBottom: "0.35rem", opacity: 0.9 }}>
                Preguntas para confirmar:
              </p>
              <ul style={{ marginTop: 0 }}>
                {(result?.result?.questions_to_confirm || []).map((q, idx) => (
                  <li key={idx}>{q}</li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: "0.75rem" }}>
              <p style={{ marginBottom: "0.35rem", opacity: 0.9 }}>
                Pista económica:
              </p>
              <p style={{ marginTop: 0 }}>
                {result?.result?.economic_hint || "N/A"}
              </p>
            </div>
          </div>
        ) : (
          <div className="investigador-card card" style={{ opacity: 0.9 }}>
            <span className="investigador-type">Estado</span>
            <h3>Listo para capturar</h3>
            <p className="investigador-note">
              Abre cámara → toma foto → analiza con reglas. Si te molesta “Abrir
              ChatGPT”, lo quitamos después.
            </p>

            {/* Fallback del prompt si el clipboard falla */}
            <details style={{ marginTop: "0.75rem" }}>
              <summary style={{ cursor: "pointer" }}>
                Ver prompt para ChatGPT (manual)
              </summary>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  marginTop: "0.5rem",
                  padding: "0.75rem",
                  borderRadius: "0.9rem",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(2,6,23,0.6)",
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