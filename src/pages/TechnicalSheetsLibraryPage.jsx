import { useEffect, useMemo, useState } from "react";
import "../styles/technical-sheets-beta.css";

const PRIVATE_BETA_EMAIL = "memo@gmail.com";
const API_BASE = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "https://agromind-backend-slem.onrender.com"
).replace(/\/+$/, "");

const TOKEN_KEYS = ["agromind_token", "agromind_jwt", "token", "jwt", "access_token"];

function pickToken() {
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key);
    if (value && String(value).trim()) return String(value).trim();
  }
  return "";
}

function uid(prefix = "x") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyApplication() {
  return {
    id: uid("app"),
    name: "",
    product: "",
    dose: "",
    doseUnit: "kg/ha",
    method: "",
    dayOffset: 0,
    taskTitle: "",
    owner: "",
    priority: "Media",
    notes: "",
  };
}

function emptyStage(index = 0) {
  return {
    id: uid("stage"),
    name: `Etapa ${index + 1}`,
    startDay: 0,
    durationDays: 0,
    description: "",
    applications: [],
  };
}

function emptyEditor() {
  return {
    sheetId: null,
    revisionId: null,
    version: null,
    name: "",
    crop: "",
    variety: "",
    durationDays: 0,
    description: "",
    notes: "",
    sourceType: "MANUAL",
    sourceFileName: null,
    stages: [emptyStage(0)],
  };
}

function hydrateRevision(sheetId, revision) {
  const stages = Array.isArray(revision?.data?.stages) ? revision.data.stages : [];
  return {
    sheetId,
    revisionId: revision?.id || null,
    version: revision?.version || null,
    name: revision?.name || "",
    crop: revision?.crop || "",
    variety: revision?.variety || "",
    durationDays: revision?.durationDays || 0,
    description: revision?.data?.description || "",
    notes: revision?.data?.notes || "",
    sourceType: revision?.sourceType || "MANUAL",
    sourceFileName: revision?.sourceFileName || null,
    stages: stages.length
      ? stages.map((stage, index) => ({
          ...emptyStage(index),
          ...stage,
          applications: Array.isArray(stage?.applications)
            ? stage.applications.map((app) => ({ ...emptyApplication(), ...app }))
            : [],
        }))
      : [emptyStage(0)],
  };
}

function normalizeEditor(editor) {
  return {
    name: String(editor.name || "").trim(),
    crop: String(editor.crop || "").trim(),
    variety: String(editor.variety || "").trim(),
    durationDays: Number(editor.durationDays || 0),
    description: editor.description || "",
    notes: editor.notes || "",
    sourceType: editor.sourceType || "MANUAL",
    sourceFileName: editor.sourceFileName || null,
    stages: (editor.stages || []).map((stage, stageIndex) => ({
      id: stage.id || `stage-${stageIndex + 1}`,
      name: stage.name || `Etapa ${stageIndex + 1}`,
      startDay: Number(stage.startDay || 0),
      durationDays: Number(stage.durationDays || 0),
      description: stage.description || "",
      applications: (stage.applications || []).map((app, appIndex) => ({
        id: app.id || `app-${stageIndex + 1}-${appIndex + 1}`,
        name: app.name || "",
        product: app.product || "",
        dose: app.dose === "" || app.dose === null ? null : Number(app.dose),
        doseUnit: app.doseUnit || "",
        method: app.method || "",
        dayOffset: Number(app.dayOffset || 0),
        taskTitle: app.taskTitle || "",
        owner: app.owner || "",
        priority: app.priority || "Media",
        notes: app.notes || "",
      })),
    })),
  };
}

async function readPdfAsBase64(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return dataUrl.split(",")[1] || "";
}

export default function TechnicalSheetsLibraryPage({ user, onClose }) {
  const betaEnabled = String(user?.email || "").trim().toLowerCase() === PRIVATE_BETA_EMAIL;
  const [token] = useState(() => pickToken());
  const [sheets, setSheets] = useState([]);
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [selectedRevisionId, setSelectedRevisionId] = useState("");
  const [editor, setEditor] = useState(() => emptyEditor());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedSheet = useMemo(
    () => sheets.find((item) => item.id === selectedSheetId) || null,
    [sheets, selectedSheetId]
  );

  const headers = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Error HTTP ${response.status}`);
    return data;
  }

  async function loadSheets({ keepSelection = true } = {}) {
    if (!betaEnabled || !token) return;
    setLoading(true);
    setError("");
    try {
      const data = await api(`/api/technical-sheets?ts=${Date.now()}`);
      const list = Array.isArray(data?.sheets) ? data.sheets : [];
      setSheets(list);

      if (!keepSelection || !selectedSheetId) {
        const first = list[0] || null;
        if (first?.id && first?.latestRevision) {
          setSelectedSheetId(first.id);
          setSelectedRevisionId(first.latestRevision.id);
          setEditor(hydrateRevision(first.id, first.latestRevision));
        }
      } else {
        const current = list.find((item) => item.id === selectedSheetId);
        if (current) {
          const revision =
            current.revisions?.find((item) => item.id === selectedRevisionId) ||
            current.latestRevision ||
            current.revisions?.[0];
          if (revision) {
            setSelectedRevisionId(revision.id);
            setEditor(hydrateRevision(current.id, revision));
          }
        }
      }
    } catch (e) {
      setError(e?.message || "No se pudieron cargar las fichas técnicas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSheets({ keepSelection: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [betaEnabled, token]);

  function chooseRevision(sheet, revision) {
    if (!sheet?.id || !revision?.id) return;
    setSelectedSheetId(sheet.id);
    setSelectedRevisionId(revision.id);
    setEditor(hydrateRevision(sheet.id, revision));
    setMessage("");
    setError("");
  }

  function newSheet() {
    setSelectedSheetId("");
    setSelectedRevisionId("");
    setEditor(emptyEditor());
    setMessage("Nueva ficha. Cuando la guardes se creará la versión 1.");
    setError("");
  }

  function updateStage(stageIndex, field, value) {
    setEditor((prev) => ({
      ...prev,
      stages: prev.stages.map((stage, index) =>
        index === stageIndex ? { ...stage, [field]: value } : stage
      ),
    }));
  }

  function updateApplication(stageIndex, appIndex, field, value) {
    setEditor((prev) => ({
      ...prev,
      stages: prev.stages.map((stage, index) =>
        index !== stageIndex
          ? stage
          : {
              ...stage,
              applications: stage.applications.map((app, ai) =>
                ai === appIndex ? { ...app, [field]: value } : app
              ),
            }
      ),
    }));
  }

  function addStage() {
    setEditor((prev) => ({ ...prev, stages: [...prev.stages, emptyStage(prev.stages.length)] }));
  }

  function addApplication(stageIndex) {
    setEditor((prev) => ({
      ...prev,
      stages: prev.stages.map((stage, index) =>
        index === stageIndex
          ? { ...stage, applications: [...stage.applications, emptyApplication()] }
          : stage
      ),
    }));
  }

  async function saveEditor() {
    const payload = normalizeEditor(editor);
    if (!payload.name || !payload.crop) {
      setError("Nombre de la ficha y cultivo son obligatorios.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    try {
      const data = await api(
        editor.sheetId ? `/api/technical-sheets/${editor.sheetId}` : "/api/technical-sheets",
        {
          method: editor.sheetId ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );
      const saved = data?.sheet;
      const latest = saved?.latestRevision || saved?.revisions?.[0] || data?.revision;
      if (saved?.id && latest) {
        setSelectedSheetId(saved.id);
        setSelectedRevisionId(latest.id);
        setEditor(hydrateRevision(saved.id, latest));
        setMessage(
          editor.sheetId
            ? `Nueva versión ${latest.version} creada. Las versiones anteriores quedan intactas.`
            : "Ficha técnica creada."
        );
      }
      await loadSheets({ keepSelection: true });
    } catch (e) {
      setError(e?.message || "No se pudo guardar la ficha técnica.");
    } finally {
      setLoading(false);
    }
  }

  async function importPdf(file) {
    if (!file) return;
    setLoading(true);
    setError("");
    setMessage("AgroMind está leyendo el PDF. El resultado será solo un borrador para revisar.");
    try {
      const fileBase64 = await readPdfAsBase64(file);
      const data = await api("/api/technical-sheets/import-pdf", {
        method: "POST",
        body: JSON.stringify({ fileBase64, fileName: file.name }),
      });
      const draft = data?.draft || {};
      setSelectedSheetId("");
      setSelectedRevisionId("");
      setEditor({
        ...emptyEditor(),
        name: draft.name || "",
        crop: draft.crop || "",
        variety: draft.variety || "",
        durationDays: draft.durationDays || 0,
        description: draft.description || "",
        notes: draft.notes || "",
        sourceType: "PDF_AI",
        sourceFileName: file.name,
        stages: Array.isArray(draft.stages) && draft.stages.length
          ? draft.stages.map((stage, index) => ({
              ...emptyStage(index),
              ...stage,
              applications: Array.isArray(stage?.applications)
                ? stage.applications.map((app) => ({ ...emptyApplication(), ...app }))
                : [],
            }))
          : [emptyStage(0)],
      });
      setMessage("PDF interpretado. Revisa especialmente productos, dosis, unidades y fechas antes de guardar.");
    } catch (e) {
      setError(e?.message || "No se pudo interpretar el PDF.");
      setMessage("");
    } finally {
      setLoading(false);
    }
  }

  async function duplicateSelected() {
    if (!selectedSheet?.id || !selectedRevisionId) return;
    setLoading(true);
    setError("");
    try {
      const currentRevision = selectedSheet.revisions?.find((r) => r.id === selectedRevisionId);
      const data = await api(`/api/technical-sheets/${selectedSheet.id}/duplicate`, {
        method: "POST",
        body: JSON.stringify({
          revisionId: selectedRevisionId,
          name: `${currentRevision?.name || "Ficha"} · copia`,
        }),
      });
      setMessage("Ficha duplicada. Ya puedes adaptarla sin tocar la original.");
      const newId = data?.sheet?.id;
      await loadSheets({ keepSelection: false });
      if (newId) {
        const fresh = data.sheet;
        const latest = fresh.latestRevision || fresh.revisions?.[0];
        if (latest) chooseRevision(fresh, latest);
      }
    } catch (e) {
      setError(e?.message || "No se pudo duplicar la ficha.");
    } finally {
      setLoading(false);
    }
  }

  async function archiveSelected() {
    if (!selectedSheet?.id) return;
    if (!window.confirm("¿Archivar esta ficha? Los procesos y ciclos ya creados conservarán su snapshot.")) return;
    setLoading(true);
    setError("");
    try {
      await api(`/api/technical-sheets/${selectedSheet.id}`, { method: "DELETE" });
      newSheet();
      setMessage("Ficha archivada. Los históricos no se modificaron.");
      await loadSheets({ keepSelection: false });
    } catch (e) {
      setError(e?.message || "No se pudo archivar la ficha.");
    } finally {
      setLoading(false);
    }
  }

  if (!betaEnabled) {
    return (
      <div className="agts-root agts-restricted">
        <div>
          <span className="agts-kicker">Beta privada</span>
          <h2>Fichas técnicas aún no están habilitadas para esta cuenta.</h2>
          <p>La versión estable de AgroMind continúa funcionando sin cambios.</p>
          {onClose && <button className="agts-btn" onClick={onClose}>Volver</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="agts-root">
      <div className="agts-shell">
        <header className="agts-header">
          <div>
            <span className="agts-kicker">AgroMind · Biblioteca técnica privada</span>
            <h1>Fichas técnicas</h1>
            <p>
              Crea una ficha general reutilizable para tus fincas. Cada finca podrá vincular una versión,
              ajustar detalles propios del proceso y conservar la ficha original sin alterarla.
            </p>
          </div>
          <div className="agts-actions">
            <button className="agts-btn agts-btn-light" onClick={newSheet}>+ Nueva ficha</button>
            {onClose && <button className="agts-btn" onClick={onClose}>Volver a mis fincas</button>}
          </div>
        </header>

        {loading && <div className="agts-loading">Procesando…</div>}
        {message && <div className="agts-alert ok">{message}</div>}
        {error && <div className="agts-alert error">{error}</div>}

        <div className="agts-layout">
          <aside className="agts-panel agts-list">
            <label className="agts-upload">
              Leer una ficha desde PDF
              <input
                type="file"
                accept="application/pdf"
                disabled={loading}
                onChange={(event) => importPdf(event.target.files?.[0])}
              />
            </label>

            <div className="agts-panel-title">
              <div>
                <span className="agts-kicker">Biblioteca</span>
                <h2>{sheets.length} fichas</h2>
              </div>
            </div>

            {sheets.length === 0 ? (
              <p>No hay fichas todavía. Crea una manualmente o carga un PDF.</p>
            ) : (
              sheets.map((item) => {
                const latest = item.latestRevision || item.revisions?.[0];
                return (
                  <div
                    key={item.id}
                    className={`agts-sheet-card ${selectedSheetId === item.id ? "selected" : ""}`}
                  >
                    <button
                      className="agts-card-main"
                      onClick={() => latest && chooseRevision(item, latest)}
                    >
                      <strong>{latest?.name || "Ficha sin nombre"}</strong>
                      <span>
                        {latest?.crop || "Cultivo"}
                        {latest?.variety ? ` · ${latest.variety}` : ""}
                      </span>
                      <small>
                        v{latest?.version || 1} · {latest?.durationDays || 0} días · {latest?.data?.stages?.length || 0} etapas
                      </small>
                    </button>
                    <div className="agts-version-row">
                      {(item.revisions || []).map((revision) => (
                        <button
                          key={revision.id}
                          className={`agts-version ${selectedRevisionId === revision.id ? "active" : ""}`}
                          onClick={() => chooseRevision(item, revision)}
                        >
                          v{revision.version}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </aside>

          <section className="agts-panel">
            <div className="agts-panel-title">
              <div>
                <span className="agts-kicker">
                  {editor.sheetId ? `Edición desde versión ${editor.version}` : "Nueva ficha"}
                </span>
                <h2>{editor.name || "Ficha técnica"}</h2>
                {editor.sheetId && (
                  <p>
                    Guardar cambios crea una nueva versión. La versión {editor.version} queda disponible para trazabilidad.
                  </p>
                )}
              </div>
              {editor.sheetId && (
                <div className="agts-actions-inline">
                  <button className="agts-btn agts-btn-light" onClick={duplicateSelected}>Duplicar</button>
                  <button className="agts-btn agts-btn-danger" onClick={archiveSelected}>Archivar</button>
                </div>
              )}
            </div>

            <div className="agts-grid cols-4">
              <label>Nombre de ficha<input value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} placeholder="Ej: Piña MD2 estándar" /></label>
              <label>Cultivo<input value={editor.crop} onChange={(e) => setEditor({ ...editor, crop: e.target.value })} placeholder="Ej: Piña" /></label>
              <label>Variedad<input value={editor.variety} onChange={(e) => setEditor({ ...editor, variety: e.target.value })} placeholder="Ej: MD2" /></label>
              <label>Duración total (días)<input type="number" min="0" value={editor.durationDays} onChange={(e) => setEditor({ ...editor, durationDays: e.target.value })} /></label>
            </div>
            <label>Descripción<textarea value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} placeholder="Objetivo, alcance y condiciones generales de esta ficha." /></label>
            <label>Notas técnicas<textarea value={editor.notes} onChange={(e) => setEditor({ ...editor, notes: e.target.value })} placeholder="Observaciones generales que deban conservarse en todas las fincas." /></label>

            <div className="agts-panel-title">
              <div><span className="agts-kicker">Cronograma base</span><h2>Etapas</h2></div>
              <button className="agts-btn agts-btn-light" onClick={addStage}>+ Etapa</button>
            </div>

            {editor.stages.map((stage, stageIndex) => (
              <div className="agts-stage" key={stage.id || stageIndex}>
                <div className="agts-grid cols-4">
                  <label>Etapa<input value={stage.name} onChange={(e) => updateStage(stageIndex, "name", e.target.value)} /></label>
                  <label>Inicia día<input type="number" min="0" value={stage.startDay} onChange={(e) => updateStage(stageIndex, "startDay", e.target.value)} /></label>
                  <label>Duración<input type="number" min="0" value={stage.durationDays} onChange={(e) => updateStage(stageIndex, "durationDays", e.target.value)} /></label>
                  <div className="agts-inline-end">
                    <button
                      className="agts-btn agts-btn-danger"
                      onClick={() => setEditor((prev) => ({ ...prev, stages: prev.stages.filter((_, index) => index !== stageIndex) }))}
                    >
                      Quitar etapa
                    </button>
                  </div>
                </div>
                <label>Descripción de etapa<input value={stage.description || ""} onChange={(e) => updateStage(stageIndex, "description", e.target.value)} /></label>

                <div className="agts-panel-title">
                  <h3>Aplicaciones</h3>
                  <button className="agts-btn agts-btn-light" onClick={() => addApplication(stageIndex)}>+ Aplicación</button>
                </div>

                {stage.applications.length === 0 && <p className="agts-mini">Esta etapa no tiene aplicaciones programadas todavía.</p>}
                {stage.applications.map((app, appIndex) => (
                  <div className="agts-application" key={app.id || appIndex}>
                    <div className="agts-grid cols-4">
                      <label>Aplicación<input value={app.name} onChange={(e) => updateApplication(stageIndex, appIndex, "name", e.target.value)} /></label>
                      <label>Producto<input value={app.product} onChange={(e) => updateApplication(stageIndex, appIndex, "product", e.target.value)} /></label>
                      <label>Dosis<input type="number" step="any" value={app.dose ?? ""} onChange={(e) => updateApplication(stageIndex, appIndex, "dose", e.target.value)} /></label>
                      <label>Unidad<input value={app.doseUnit} onChange={(e) => updateApplication(stageIndex, appIndex, "doseUnit", e.target.value)} placeholder="kg/ha, L/ha, g/planta…" /></label>
                      <label>Día dentro de etapa<input type="number" min="0" value={app.dayOffset} onChange={(e) => updateApplication(stageIndex, appIndex, "dayOffset", e.target.value)} /></label>
                      <label>Método<input value={app.method} onChange={(e) => updateApplication(stageIndex, appIndex, "method", e.target.value)} /></label>
                      <label>Responsable<input value={app.owner} onChange={(e) => updateApplication(stageIndex, appIndex, "owner", e.target.value)} /></label>
                      <label>Prioridad<select value={app.priority} onChange={(e) => updateApplication(stageIndex, appIndex, "priority", e.target.value)}><option>Alta</option><option>Media</option><option>Baja</option></select></label>
                    </div>
                    <label>Título de tarea<input value={app.taskTitle} onChange={(e) => updateApplication(stageIndex, appIndex, "taskTitle", e.target.value)} placeholder="Si queda vacío, AgroMind usa el nombre de la aplicación" /></label>
                    <label>Notas<input value={app.notes} onChange={(e) => updateApplication(stageIndex, appIndex, "notes", e.target.value)} /></label>
                    <button
                      className="agts-btn agts-btn-danger"
                      onClick={() => setEditor((prev) => ({
                        ...prev,
                        stages: prev.stages.map((currentStage, si) =>
                          si === stageIndex
                            ? { ...currentStage, applications: currentStage.applications.filter((_, ai) => ai !== appIndex) }
                            : currentStage
                        ),
                      }))}
                    >
                      Quitar aplicación
                    </button>
                  </div>
                ))}
              </div>
            ))}

            <div className="agts-actions" style={{ justifyContent: "flex-end", marginTop: 18 }}>
              <button className="agts-btn agts-btn-primary" disabled={loading} onClick={saveEditor}>
                {editor.sheetId ? "Guardar como nueva versión" : "Crear ficha técnica"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
