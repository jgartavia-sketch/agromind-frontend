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

  const [farmId, setFarmId] = useState(
    localStorage.getItem("activeFarmId") ||
    localStorage.getItem("farmId") ||
    ""
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const apiBase = useMemo(() => {
    return (import.meta?.env?.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");
  }, []);

  function getAuthToken() {
    const direct =
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      sessionStorage.getItem("token") ||
      "";

    if (looksLikeJwt(direct)) return direct;

    return (
      findJwtInStorage(localStorage) ||
      findJwtInStorage(sessionStorage) ||
      ""
    );
  }

  function authHeaders() {
    const t = getAuthToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  function openPicker() {
    setError("");
    setResult(null);
    fileInputRef.current?.click();
  }

  async function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Ese archivo no parece una imagen.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function analyze() {
    setError("");
    setResult(null);

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
          farmId,
          zoneName,
          imageDataUrl,
          extraContext: notes,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data?.error || "Error analizando.");
        return;
      }

      setResult(data);
    } catch (_) {
      setError("No se pudo conectar al backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="investigador-page">
      <header className="investigador-header">
        <h1>Investigador IA</h1>
        <p className="investigador-subtitle">
          Analiza plantas o animales directamente desde tu finca.
        </p>
      </header>

      <section className="card investigador-unified">

        {/* === ENTRADA === */}
        <div className="investigador-block">
          <label>Zona (opcional)</label>
          <input
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            placeholder="Ej: Zona 1"
            className="investigador-input"
          />
        </div>

        <div className="investigador-block">
          <label>Descripción adicional (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ej: hojas con manchas, gallina decaída..."
            className="investigador-textarea"
          />
        </div>

        {/* === BOTONES === */}
        <div className="investigador-buttons">
          <button onClick={openPicker} className="primary-btn">
            📷 Tomar o subir foto
          </button>

          <button
            onClick={analyze}
            disabled={loading}
            className="secondary-btn"
          >
            {loading ? "Analizando..." : "🧠 Analizar"}
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

        {/* === PREVIEW === */}
        {imageDataUrl && (
          <div className="investigador-preview">
            <img src={imageDataUrl} alt="preview" />
          </div>
        )}

        {/* === ERROR === */}
        {error && (
          <div className="investigador-error">
            {error}
          </div>
        )}

        {/* === RESULTADO === */}
        {result?.ok && (
          <div className="investigador-result">
            <h3>
              {result?.result?.category === "plant"
                ? "🌿 Planta"
                : result?.result?.category === "animal"
                ? "🐄 Animal"
                : "❓ Desconocido"}
            </h3>

            <p>
              <strong>Diagnóstico:</strong>{" "}
              {result?.result?.issue || "N/A"}
            </p>

            <ul>
              {(result?.result?.recommended_actions || []).map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}