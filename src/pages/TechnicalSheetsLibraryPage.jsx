import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/technical-sheets-beta.css";

const PRIVATE_BETA_EMAIL = "memo@gmail.com";
const API_BASE = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "https://agromind-backend-slem.onrender.com"
).replace(/\/+$/, "");

const TOKEN_KEYS = ["agromind_token", "agromind_jwt", "token", "jwt", "access_token"];
const REQUIREMENT_TYPES = ["Obligatorio", "Recomendado", "Referencia técnica", "Condicional", "Regulatorio", "Buena práctica"];
const TRIGGER_TYPES = ["Día desde siembra", "Semana desde siembra", "Mes desde siembra", "Días desde etapa", "Semanas desde evento", "Etapa fenológica", "Condición/resultado"];

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
    activeIngredient: "",
    purpose: "",
    dose: "",
    doseUnit: "kg/ha",
    method: "",
    dayOffset: 0,
    triggerType: "Día desde siembra",
    triggerValue: "",
    taskTitle: "",
    owner: "",
    priority: "Media",
    justification: "",
    reentryHours: "",
    withholdingDays: "",
    maxApplications: "",
    intervalDays: "",
    waterVolume: "",
    waterVolumeUnit: "L/ha",
    equipment: "",
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

function emptyAnalysis() {
  return {
    id: uid("analysis"),
    name: "",
    type: "",
    triggerType: "Mes desde siembra",
    triggerValue: "",
    sample: "",
    sampleSize: "",
    sampleUnit: "",
    parameters: "",
    targetRange: "",
    unit: "",
    laboratoryRequirement: "",
    notes: "",
  };
}

function emptyNutritionTarget() {
  return {
    id: uid("nutrient"),
    element: "",
    min: "",
    max: "",
    unit: "",
    phase: "",
    sampleType: "",
    sourceNotes: "",
  };
}

function emptyPest() {
  return {
    id: uid("pest"),
    commonName: "",
    scientificName: "",
    category: "",
    symptoms: "",
    monitoring: "",
    preventive: "",
    curative: "",
    integrated: "",
    trigger: "",
    notes: "",
  };
}

function emptyRequirement() {
  return {
    id: uid("req"),
    title: "",
    classification: "Recomendado",
    section: "",
    evidence: "",
    frequency: "",
    notes: "",
  };
}

function emptyRegulation() {
  return {
    id: uid("reg"),
    reference: "",
    title: "",
    year: "",
    notes: "",
  };
}

function emptyProfile() {
  return {
    identity: {
      scientificName: "",
      country: "",
      region: "",
      productionType: "",
      objective: "",
      scope: "",
      sourceOrganization: "",
      edition: "",
      sourceYear: "",
      sourceReference: "",
      classification: "Ficha técnica propia",
    },
    site: {
      previousUse: "",
      soilRequirements: "",
      climateRequirements: "",
      slopeRestrictions: "",
      waterConditions: "",
      environmentalRestrictions: "",
      permits: "",
      mappingNotes: "",
    },
    planting: {
      materialType: "",
      origin: "",
      phytosanitaryCondition: "",
      classification: "",
      density: "",
      densityUnit: "plantas/ha",
      plantCount: "",
      plantingDepth: "",
      pretreatment: "",
      plantingRecords: "",
    },
    water: {
      sourceRequirements: "",
      irrigationCriteria: "",
      qualityMonitoring: "",
      recordRequirements: "",
    },
    harvest: {
      qualityCriteria: "",
      harvestRecords: "",
      dispatchRecords: "",
      transportRequirements: "",
    },
    residues: {
      managementPlan: "",
      cropResidueHandling: "",
      environmentalMeasures: "",
      closureActivities: "",
    },
    analyses: [],
    nutritionTargets: [],
    pests: [],
    requirements: [],
    regulations: [],
  };
}

function mergeProfile(raw) {
  const base = emptyProfile();
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    ...base,
    ...source,
    identity: { ...base.identity, ...(source.identity || {}) },
    site: { ...base.site, ...(source.site || {}) },
    planting: { ...base.planting, ...(source.planting || {}) },
    water: { ...base.water, ...(source.water || {}) },
    harvest: { ...base.harvest, ...(source.harvest || {}) },
    residues: { ...base.residues, ...(source.residues || {}) },
    analyses: Array.isArray(source.analyses) ? source.analyses.map((item) => ({ ...emptyAnalysis(), ...item })) : [],
    nutritionTargets: Array.isArray(source.nutritionTargets)
      ? source.nutritionTargets.map((item) => ({ ...emptyNutritionTarget(), ...item }))
      : [],
    pests: Array.isArray(source.pests) ? source.pests.map((item) => ({ ...emptyPest(), ...item })) : [],
    requirements: Array.isArray(source.requirements)
      ? source.requirements.map((item) => ({ ...emptyRequirement(), ...item }))
      : [],
    regulations: Array.isArray(source.regulations)
      ? source.regulations.map((item) => ({ ...emptyRegulation(), ...item }))
      : [],
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
    profile: emptyProfile(),
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
    profile: mergeProfile(revision?.data?.profile),
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

function nullableNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
    profile: editor.profile,
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
        activeIngredient: app.activeIngredient || "",
        purpose: app.purpose || "",
        dose: nullableNumber(app.dose),
        doseUnit: app.doseUnit || "",
        method: app.method || "",
        dayOffset: Number(app.dayOffset || 0),
        triggerType: app.triggerType || "Día desde siembra",
        triggerValue: app.triggerValue || "",
        taskTitle: app.taskTitle || "",
        owner: app.owner || "",
        priority: app.priority || "Media",
        justification: app.justification || "",
        reentryHours: nullableNumber(app.reentryHours),
        withholdingDays: nullableNumber(app.withholdingDays),
        maxApplications: nullableNumber(app.maxApplications),
        intervalDays: nullableNumber(app.intervalDays),
        waterVolume: nullableNumber(app.waterVolume),
        waterVolumeUnit: app.waterVolumeUnit || "",
        equipment: app.equipment || "",
        notes: app.notes || "",
      })),
    })),
  };
}

function Field({ label, value, onChange, type = "text", placeholder = "", min, step }) {
  return (
    <label>
      {label}
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        min={min}
        step={step}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder = "", rows = 3 }) {
  return (
    <label>
      {label}
      <textarea
        rows={rows}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label>
      {label}
      <select value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Section({ title, subtitle, badge, children, open = false }) {
  return (
    <details className="agts-section" open={open}>
      <summary>
        <div>
          <strong>{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </div>
        {badge !== undefined && <b className="agts-section-badge">{badge}</b>}
      </summary>
      <div className="agts-section-body">{children}</div>
    </details>
  );
}

function EmptyRow({ children }) {
  return <div className="agts-empty-row">{children}</div>;
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
  const [proPlusNotice, setProPlusNotice] = useState(false);
  const editorRef = useRef(null);

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
          const revision = current.revisions?.find((item) => item.id === selectedRevisionId) || current.latestRevision || current.revisions?.[0];
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
    setProPlusNotice(false);
  }

  function newSheet() {
    setSelectedSheetId("");
    setSelectedRevisionId("");
    setEditor(emptyEditor());
    setMessage("Nueva ficha. Cuando la guardes se creará la versión 1.");
    setError("");
    setProPlusNotice(false);
  }

  function scrollToManual() {
    newSheet();
    window.setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function updateProfileGroup(group, field, value) {
    setEditor((prev) => ({
      ...prev,
      profile: { ...prev.profile, [group]: { ...prev.profile[group], [field]: value } },
    }));
  }

  function updateProfileList(listName, index, field, value) {
    setEditor((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [listName]: prev.profile[listName].map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
      },
    }));
  }

  function addProfileListItem(listName, factory) {
    setEditor((prev) => ({
      ...prev,
      profile: { ...prev.profile, [listName]: [...prev.profile[listName], factory()] },
    }));
  }

  function removeProfileListItem(listName, index) {
    setEditor((prev) => ({
      ...prev,
      profile: { ...prev.profile, [listName]: prev.profile[listName].filter((_, itemIndex) => itemIndex !== index) },
    }));
  }

  function updateStage(stageIndex, field, value) {
    setEditor((prev) => ({
      ...prev,
      stages: prev.stages.map((stage, index) => index === stageIndex ? { ...stage, [field]: value } : stage),
    }));
  }

  function addStage() {
    setEditor((prev) => ({ ...prev, stages: [...prev.stages, emptyStage(prev.stages.length)] }));
  }

  function removeStage(stageIndex) {
    setEditor((prev) => ({
      ...prev,
      stages: prev.stages.length <= 1 ? prev.stages : prev.stages.filter((_, index) => index !== stageIndex),
    }));
  }

  function updateApplication(stageIndex, appIndex, field, value) {
    setEditor((prev) => ({
      ...prev,
      stages: prev.stages.map((stage, index) => index !== stageIndex ? stage : {
        ...stage,
        applications: stage.applications.map((app, ai) => ai === appIndex ? { ...app, [field]: value } : app),
      }),
    }));
  }

  function addApplication(stageIndex) {
    setEditor((prev) => ({
      ...prev,
      stages: prev.stages.map((stage, index) => index === stageIndex ? { ...stage, applications: [...stage.applications, emptyApplication()] } : stage),
    }));
  }

  function removeApplication(stageIndex, appIndex) {
    setEditor((prev) => ({
      ...prev,
      stages: prev.stages.map((stage, index) => index === stageIndex ? {
        ...stage,
        applications: stage.applications.filter((_, ai) => ai !== appIndex),
      } : stage),
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
      const data = await api(editor.sheetId ? `/api/technical-sheets/${editor.sheetId}` : "/api/technical-sheets", {
        method: editor.sheetId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      const saved = data?.sheet;
      const latest = saved?.latestRevision || saved?.revisions?.[0] || data?.revision;
      if (saved?.id && latest) {
        setSelectedSheetId(saved.id);
        setSelectedRevisionId(latest.id);
        setEditor(hydrateRevision(saved.id, latest));
        setMessage(editor.sheetId ? `Nueva versión ${latest.version} creada. Las versiones anteriores quedan intactas.` : "Ficha técnica creada.");
      }
      await loadSheets({ keepSelection: true });
    } catch (e) {
      setError(e?.message || "No se pudo guardar la ficha técnica.");
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
        body: JSON.stringify({ revisionId: selectedRevisionId, name: `${currentRevision?.name || "Ficha"} · copia` }),
      });
      setMessage("Ficha duplicada. Ya puedes adaptarla sin tocar la original.");
      await loadSheets({ keepSelection: false });
      const fresh = data?.sheet;
      const latest = fresh?.latestRevision || fresh?.revisions?.[0];
      if (fresh?.id && latest) chooseRevision(fresh, latest);
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
      setError(e?.message || "No se pudo archivar la ficha técnica.");
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

  const profile = editor.profile;

  return (
    <div className="agts-root">
      <div className="agts-shell">
        <header className="agts-header">
          <div>
            <span className="agts-kicker">AgroMind Pro · Biblioteca técnica privada</span>
            <h1>Fichas técnicas</h1>
            <p>
              Diseña una guía técnica reutilizable y luego aplícala a un lote real. AgroMind conserva la ficha maestra,
              las versiones y los ajustes propios de cada ciclo sin mezclar planificación con ejecución.
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
            <button className="agts-proplus-upload" type="button" onClick={() => setProPlusNotice((value) => !value)}>
              <span className="agts-proplus-icon">✦</span>
              <span>
                <strong>Analizar ficha desde PDF</strong>
                <small>AgroMind Pro+ · Próximamente</small>
              </span>
              <b>PRO+</b>
            </button>

            {proPlusNotice && (
              <div className="agts-proplus-notice">
                <strong>Análisis inteligente de fichas</strong>
                <p>
                  Pro+ permitirá cargar un PDF para generar un borrador editable con etapas, análisis, nutrición,
                  aplicaciones y controles. Esta función todavía no está activa y no enviará archivos a ningún servicio.
                </p>
                <button className="agts-btn agts-btn-primary" type="button" onClick={scrollToManual}>Crear ficha manual</button>
              </div>
            )}

            <div className="agts-panel-title">
              <div>
                <span className="agts-kicker">Biblioteca</span>
                <h2>{sheets.length} fichas</h2>
              </div>
            </div>

            {sheets.length === 0 ? (
              <p>No hay fichas todavía. Crea la primera manualmente y úsala como plantilla técnica.</p>
            ) : (
              sheets.map((item) => {
                const latest = item.latestRevision || item.revisions?.[0];
                return (
                  <div key={item.id} className={`agts-sheet-card ${selectedSheetId === item.id ? "selected" : ""}`}>
                    <button className="agts-card-main" onClick={() => latest && chooseRevision(item, latest)}>
                      <strong>{latest?.name || "Ficha sin nombre"}</strong>
                      <span>{latest?.crop || "Cultivo"}{latest?.variety ? ` · ${latest.variety}` : ""}</span>
                      <small>v{latest?.version || 1} · {latest?.durationDays || 0} días · {latest?.data?.stages?.length || 0} etapas</small>
                    </button>
                    <div className="agts-version-row">
                      {(item.revisions || []).map((revision) => (
                        <button
                          key={revision.id}
                          className={`agts-version ${selectedRevisionId === revision.id ? "active" : ""}`}
                          onClick={() => chooseRevision(item, revision)}
                        >v{revision.version}</button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </aside>

          <main ref={editorRef} className="agts-panel agts-editor">
            <div className="agts-editor-head">
              <div>
                <span className="agts-kicker">{editor.sheetId ? `Versión ${editor.version}` : "Nueva ficha"}</span>
                <h2>Ficha técnica Pro</h2>
                <p>La ficha define cómo debería manejarse el cultivo. Los datos reales se registran cuando la vincules a una finca y lote.</p>
              </div>
              <div className="agts-actions-inline">
                {editor.sheetId && <button className="agts-btn" onClick={duplicateSelected} disabled={loading}>Duplicar</button>}
                {editor.sheetId && <button className="agts-btn agts-btn-danger" onClick={archiveSelected} disabled={loading}>Archivar</button>}
                <button className="agts-btn agts-btn-primary" onClick={saveEditor} disabled={loading}>Guardar {editor.sheetId ? "nueva versión" : "ficha"}</button>
              </div>
            </div>

            <div className="agts-guide-strip">
              <span>1. Ficha maestra</span><i>→</i><span>2. Finca / lote</span><i>→</i><span>3. Ciclo productivo</span><i>→</i><span>4. Ejecución y evidencia</span>
            </div>

            <Section title="1 · Identidad, fuente y alcance" subtitle="Qué cultivo describe, para dónde aplica y de dónde sale la información." open>
              <div className="agts-grid cols-4">
                <Field label="Nombre de ficha *" value={editor.name} onChange={(value) => setEditor((prev) => ({ ...prev, name: value }))} placeholder="Ej: BPA Piña Costa Rica" />
                <Field label="Cultivo *" value={editor.crop} onChange={(value) => setEditor((prev) => ({ ...prev, crop: value }))} placeholder="Ej: Piña" />
                <Field label="Variedad" value={editor.variety} onChange={(value) => setEditor((prev) => ({ ...prev, variety: value }))} placeholder="Ej: MD-2" />
                <Field label="Duración total (días)" type="number" min="0" value={editor.durationDays} onChange={(value) => setEditor((prev) => ({ ...prev, durationDays: value }))} />
                <Field label="Nombre científico" value={profile.identity.scientificName} onChange={(value) => updateProfileGroup("identity", "scientificName", value)} placeholder="Ej: Ananas comosus L." />
                <Field label="País" value={profile.identity.country} onChange={(value) => updateProfileGroup("identity", "country", value)} placeholder="Ej: Costa Rica" />
                <Field label="Región de aplicación" value={profile.identity.region} onChange={(value) => updateProfileGroup("identity", "region", value)} placeholder="Nacional / región / zona" />
                <Field label="Tipo de producción" value={profile.identity.productionType} onChange={(value) => updateProfileGroup("identity", "productionType", value)} placeholder="Ej: Fruta fresca" />
                <Field label="Organización / fuente" value={profile.identity.sourceOrganization} onChange={(value) => updateProfileGroup("identity", "sourceOrganization", value)} placeholder="MAG, SFE, universidad, técnico…" />
                <Field label="Edición" value={profile.identity.edition} onChange={(value) => updateProfileGroup("identity", "edition", value)} placeholder="Ej: Segunda edición" />
                <Field label="Año de fuente" value={profile.identity.sourceYear} onChange={(value) => updateProfileGroup("identity", "sourceYear", value)} placeholder="Ej: 2019" />
                <Field label="Clasificación de la ficha" value={profile.identity.classification} onChange={(value) => updateProfileGroup("identity", "classification", value)} placeholder="Oficial / técnica / propia" />
              </div>
              <TextArea label="Objetivo técnico" value={profile.identity.objective} onChange={(value) => updateProfileGroup("identity", "objective", value)} placeholder="Qué busca lograr esta ficha." />
              <TextArea label="Alcance" value={profile.identity.scope} onChange={(value) => updateProfileGroup("identity", "scope", value)} placeholder="Desde qué actividad hasta cuál cubre la ficha." />
              <TextArea label="Referencia o documento fuente" value={profile.identity.sourceReference} onChange={(value) => updateProfileGroup("identity", "sourceReference", value)} placeholder="Título, URL, publicación, capítulo o página de referencia." />
              <TextArea label="Descripción general" value={editor.description} onChange={(value) => setEditor((prev) => ({ ...prev, description: value }))} placeholder="Objetivo, condiciones generales y contexto agronómico." />
            </Section>

            <Section title="2 · Condiciones del sitio y unidad productiva" subtitle="Qué debe cumplir el terreno antes de aplicar esta ficha. La realidad se valida luego en la finca y el lote.">
              <div className="agts-callout">AgroMind debe poder contrastar la ficha con el mapa: lote, bloque o sección, suelo, drenajes, agua, pendientes, áreas sensibles y antecedentes.</div>
              <div className="agts-grid cols-2">
                <TextArea label="Uso anterior / historial requerido" value={profile.site.previousUse} onChange={(value) => updateProfileGroup("site", "previousUse", value)} />
                <TextArea label="Requisitos de suelo" value={profile.site.soilRequirements} onChange={(value) => updateProfileGroup("site", "soilRequirements", value)} />
                <TextArea label="Clima y variabilidad climática" value={profile.site.climateRequirements} onChange={(value) => updateProfileGroup("site", "climateRequirements", value)} />
                <TextArea label="Pendiente / topografía / restricciones" value={profile.site.slopeRestrictions} onChange={(value) => updateProfileGroup("site", "slopeRestrictions", value)} />
                <TextArea label="Fuentes y condiciones de agua" value={profile.site.waterConditions} onChange={(value) => updateProfileGroup("site", "waterConditions", value)} />
                <TextArea label="Restricciones ambientales" value={profile.site.environmentalRestrictions} onChange={(value) => updateProfileGroup("site", "environmentalRestrictions", value)} />
                <TextArea label="Permisos / estudios previos" value={profile.site.permits} onChange={(value) => updateProfileGroup("site", "permits", value)} />
                <TextArea label="Elementos que deberían estar en el mapa" value={profile.site.mappingNotes} onChange={(value) => updateProfileGroup("site", "mappingNotes", value)} placeholder="Ej: drenajes, pozos, nacientes, bodegas, caminos, áreas protegidas…" />
              </div>
            </Section>

            <Section title="3 · Material de propagación y siembra" subtitle="Procedencia, condición fitosanitaria, clasificación, densidad y registros del establecimiento.">
              <div className="agts-grid cols-4">
                <Field label="Tipo de material" value={profile.planting.materialType} onChange={(value) => updateProfileGroup("planting", "materialType", value)} />
                <Field label="Procedencia" value={profile.planting.origin} onChange={(value) => updateProfileGroup("planting", "origin", value)} />
                <Field label="Clasificación" value={profile.planting.classification} onChange={(value) => updateProfileGroup("planting", "classification", value)} />
                <Field label="Densidad" value={profile.planting.density} onChange={(value) => updateProfileGroup("planting", "density", value)} />
                <Field label="Unidad de densidad" value={profile.planting.densityUnit} onChange={(value) => updateProfileGroup("planting", "densityUnit", value)} />
                <Field label="Número de plantas de referencia" value={profile.planting.plantCount} onChange={(value) => updateProfileGroup("planting", "plantCount", value)} />
                <Field label="Profundidad / criterio de siembra" value={profile.planting.plantingDepth} onChange={(value) => updateProfileGroup("planting", "plantingDepth", value)} />
                <Field label="Tratamiento previo" value={profile.planting.pretreatment} onChange={(value) => updateProfileGroup("planting", "pretreatment", value)} />
              </div>
              <TextArea label="Condición fitosanitaria requerida" value={profile.planting.phytosanitaryCondition} onChange={(value) => updateProfileGroup("planting", "phytosanitaryCondition", value)} />
              <TextArea label="Registros que deben conservarse en la siembra" value={profile.planting.plantingRecords} onChange={(value) => updateProfileGroup("planting", "plantingRecords", value)} placeholder="Ej: lote, fecha, procedencia, clasificación, número de plantas…" />
            </Section>

            <Section title="4 · Cronograma técnico y etapas" subtitle="Etapas planificadas. Las fechas reales nacen cuando la ficha se vincula a un proceso de una finca." badge={editor.stages.length}>
              <div className="agts-callout">No todo ocurre por calendario. Una actividad puede depender de días desde siembra, etapa fenológica, semanas desde un evento o una condición observada. En esta beta, el disparador queda documentado y la tarea automática sigue usando el día relativo de tarea.</div>
              {editor.stages.map((stage, stageIndex) => (
                <div className="agts-stage" key={stage.id}>
                  <div className="agts-card-toolbar">
                    <strong>Etapa {stageIndex + 1}</strong>
                    {editor.stages.length > 1 && <button className="agts-link-danger" type="button" onClick={() => removeStage(stageIndex)}>Eliminar etapa</button>}
                  </div>
                  <div className="agts-grid cols-4">
                    <Field label="Nombre" value={stage.name} onChange={(value) => updateStage(stageIndex, "name", value)} />
                    <Field label="Día de inicio" type="number" min="0" value={stage.startDay} onChange={(value) => updateStage(stageIndex, "startDay", value)} />
                    <Field label="Duración (días)" type="number" min="0" value={stage.durationDays} onChange={(value) => updateStage(stageIndex, "durationDays", value)} />
                    <div className="agts-mini-stat"><b>{stage.applications.length}</b><span>aplicaciones planificadas</span></div>
                  </div>
                  <TextArea label="Descripción de la etapa" value={stage.description} onChange={(value) => updateStage(stageIndex, "description", value)} />

                  <div className="agts-subsection-head">
                    <div><span className="agts-kicker">Aplicaciones</span><h3>Plan técnico de aplicaciones</h3></div>
                    <button className="agts-btn" type="button" onClick={() => addApplication(stageIndex)}>+ Aplicación</button>
                  </div>

                  {stage.applications.length === 0 && <EmptyRow>Sin aplicaciones en esta etapa. También puede ser una etapa de observación, espera, análisis o cosecha.</EmptyRow>}
                  {stage.applications.map((app, appIndex) => (
                    <div className="agts-application" key={app.id}>
                      <div className="agts-card-toolbar">
                        <strong>Aplicación {appIndex + 1}</strong>
                        <button className="agts-link-danger" type="button" onClick={() => removeApplication(stageIndex, appIndex)}>Eliminar</button>
                      </div>
                      <div className="agts-grid cols-4">
                        <Field label="Labor / nombre" value={app.name} onChange={(value) => updateApplication(stageIndex, appIndex, "name", value)} />
                        <Field label="Producto comercial" value={app.product} onChange={(value) => updateApplication(stageIndex, appIndex, "product", value)} />
                        <Field label="Ingrediente activo" value={app.activeIngredient} onChange={(value) => updateApplication(stageIndex, appIndex, "activeIngredient", value)} />
                        <Field label="Objetivo / plaga / nutrición" value={app.purpose} onChange={(value) => updateApplication(stageIndex, appIndex, "purpose", value)} />
                        <Field label="Dosis" type="number" min="0" step="any" value={app.dose} onChange={(value) => updateApplication(stageIndex, appIndex, "dose", value)} />
                        <Field label="Unidad de dosis" value={app.doseUnit} onChange={(value) => updateApplication(stageIndex, appIndex, "doseUnit", value)} />
                        <Field label="Método" value={app.method} onChange={(value) => updateApplication(stageIndex, appIndex, "method", value)} />
                        <Field label="Equipo" value={app.equipment} onChange={(value) => updateApplication(stageIndex, appIndex, "equipment", value)} />
                        <SelectField label="Disparador" value={app.triggerType} onChange={(value) => updateApplication(stageIndex, appIndex, "triggerType", value)} options={TRIGGER_TYPES} />
                        <Field label="Valor / condición" value={app.triggerValue} onChange={(value) => updateApplication(stageIndex, appIndex, "triggerValue", value)} placeholder="Ej: 45 días / floración / umbral" />
                        <Field label="Día relativo de tarea" type="number" min="0" value={app.dayOffset} onChange={(value) => updateApplication(stageIndex, appIndex, "dayOffset", value)} />
                        <Field label="Título de tarea" value={app.taskTitle} onChange={(value) => updateApplication(stageIndex, appIndex, "taskTitle", value)} />
                        <Field label="Volumen de agua" type="number" min="0" step="any" value={app.waterVolume} onChange={(value) => updateApplication(stageIndex, appIndex, "waterVolume", value)} />
                        <Field label="Unidad de volumen" value={app.waterVolumeUnit} onChange={(value) => updateApplication(stageIndex, appIndex, "waterVolumeUnit", value)} />
                        <Field label="Reingreso (horas)" type="number" min="0" value={app.reentryHours} onChange={(value) => updateApplication(stageIndex, appIndex, "reentryHours", value)} />
                        <Field label="Carencia (días)" type="number" min="0" value={app.withholdingDays} onChange={(value) => updateApplication(stageIndex, appIndex, "withholdingDays", value)} />
                        <Field label="Máx. aplicaciones / ciclo" type="number" min="0" value={app.maxApplications} onChange={(value) => updateApplication(stageIndex, appIndex, "maxApplications", value)} />
                        <Field label="Intervalo (días)" type="number" min="0" value={app.intervalDays} onChange={(value) => updateApplication(stageIndex, appIndex, "intervalDays", value)} />
                        <Field label="Responsable sugerido" value={app.owner} onChange={(value) => updateApplication(stageIndex, appIndex, "owner", value)} />
                        <SelectField label="Prioridad" value={app.priority} onChange={(value) => updateApplication(stageIndex, appIndex, "priority", value)} options={["Alta", "Media", "Baja"]} />
                      </div>
                      <TextArea label="Justificación técnica" value={app.justification} onChange={(value) => updateApplication(stageIndex, appIndex, "justification", value)} placeholder="Por qué se realiza esta aplicación y qué condición la respalda." />
                      <TextArea label="Notas / restricciones" value={app.notes} onChange={(value) => updateApplication(stageIndex, appIndex, "notes", value)} />
                    </div>
                  ))}
                </div>
              ))}
              <button className="agts-btn" type="button" onClick={addStage}>+ Agregar etapa</button>
            </Section>

            <Section title="5 · Análisis, muestreos e inspecciones" subtitle="Suelo, foliar, agua, residuos, plagas u otros controles que generan resultados medibles." badge={profile.analyses.length}>
              {profile.analyses.length === 0 && <EmptyRow>Agrega análisis solo cuando la fuente técnica los pida. No inventes frecuencias ni rangos.</EmptyRow>}
              {profile.analyses.map((item, index) => (
                <div className="agts-repeat-card" key={item.id}>
                  <div className="agts-card-toolbar"><strong>Análisis / muestreo {index + 1}</strong><button className="agts-link-danger" onClick={() => removeProfileListItem("analyses", index)}>Eliminar</button></div>
                  <div className="agts-grid cols-4">
                    <Field label="Nombre" value={item.name} onChange={(value) => updateProfileList("analyses", index, "name", value)} />
                    <Field label="Tipo" value={item.type} onChange={(value) => updateProfileList("analyses", index, "type", value)} placeholder="Suelo, foliar, agua…" />
                    <SelectField label="Momento / disparador" value={item.triggerType} onChange={(value) => updateProfileList("analyses", index, "triggerType", value)} options={TRIGGER_TYPES} />
                    <Field label="Valor" value={item.triggerValue} onChange={(value) => updateProfileList("analyses", index, "triggerValue", value)} />
                    <Field label="Muestra" value={item.sample} onChange={(value) => updateProfileList("analyses", index, "sample", value)} placeholder="Ej: hoja D" />
                    <Field label="Tamaño de muestra" value={item.sampleSize} onChange={(value) => updateProfileList("analyses", index, "sampleSize", value)} />
                    <Field label="Unidad muestra" value={item.sampleUnit} onChange={(value) => updateProfileList("analyses", index, "sampleUnit", value)} />
                    <Field label="Laboratorio / acreditación" value={item.laboratoryRequirement} onChange={(value) => updateProfileList("analyses", index, "laboratoryRequirement", value)} />
                  </div>
                  <TextArea label="Parámetros por evaluar" value={item.parameters} onChange={(value) => updateProfileList("analyses", index, "parameters", value)} />
                  <div className="agts-grid cols-2">
                    <Field label="Rango / objetivo" value={item.targetRange} onChange={(value) => updateProfileList("analyses", index, "targetRange", value)} />
                    <Field label="Unidad" value={item.unit} onChange={(value) => updateProfileList("analyses", index, "unit", value)} />
                  </div>
                  <TextArea label="Notas" value={item.notes} onChange={(value) => updateProfileList("analyses", index, "notes", value)} />
                </div>
              ))}
              <button className="agts-btn" type="button" onClick={() => addProfileListItem("analyses", emptyAnalysis)}>+ Agregar análisis o muestreo</button>
            </Section>

            <Section title="6 · Nutrición y rangos objetivo" subtitle="Rangos de referencia y requerimientos del cultivo; separados de las aplicaciones comerciales." badge={profile.nutritionTargets.length}>
              <div className="agts-callout">Guardamos el objetivo nutricional por separado del fertilizante usado. Así después podremos comparar análisis real vs rango técnico.</div>
              {profile.nutritionTargets.length === 0 && <EmptyRow>Sin rangos nutricionales registrados.</EmptyRow>}
              {profile.nutritionTargets.map((item, index) => (
                <div className="agts-nutrition-row" key={item.id}>
                  <Field label="Elemento" value={item.element} onChange={(value) => updateProfileList("nutritionTargets", index, "element", value)} />
                  <Field label="Mínimo" value={item.min} onChange={(value) => updateProfileList("nutritionTargets", index, "min", value)} />
                  <Field label="Máximo" value={item.max} onChange={(value) => updateProfileList("nutritionTargets", index, "max", value)} />
                  <Field label="Unidad" value={item.unit} onChange={(value) => updateProfileList("nutritionTargets", index, "unit", value)} />
                  <Field label="Fase / cosecha" value={item.phase} onChange={(value) => updateProfileList("nutritionTargets", index, "phase", value)} />
                  <Field label="Tipo de muestra" value={item.sampleType} onChange={(value) => updateProfileList("nutritionTargets", index, "sampleType", value)} />
                  <Field label="Fuente / nota" value={item.sourceNotes} onChange={(value) => updateProfileList("nutritionTargets", index, "sourceNotes", value)} />
                  <button className="agts-link-danger agts-remove-cell" type="button" onClick={() => removeProfileListItem("nutritionTargets", index)}>Eliminar</button>
                </div>
              ))}
              <button className="agts-btn" type="button" onClick={() => addProfileListItem("nutritionTargets", emptyNutritionTarget)}>+ Agregar nutriente</button>
            </Section>

            <Section title="7 · Agua y riego" subtitle="Fuente, calidad, criterio de riego, mantenimiento y registros esperados.">
              <div className="agts-grid cols-2">
                <TextArea label="Requisitos de la fuente de agua" value={profile.water.sourceRequirements} onChange={(value) => updateProfileGroup("water", "sourceRequirements", value)} />
                <TextArea label="Criterio de riego" value={profile.water.irrigationCriteria} onChange={(value) => updateProfileGroup("water", "irrigationCriteria", value)} placeholder="Clima, suelo, etapa fisiológica, necesidad de planta…" />
                <TextArea label="Monitoreo / calidad de agua" value={profile.water.qualityMonitoring} onChange={(value) => updateProfileGroup("water", "qualityMonitoring", value)} />
                <TextArea label="Registros requeridos" value={profile.water.recordRequirements} onChange={(value) => updateProfileGroup("water", "recordRequirements", value)} placeholder="Fecha, cantidad de agua, revisiones del sistema…" />
              </div>
            </Section>

            <Section title="8 · Manejo integrado de plagas y arvenses" subtitle="Monitoreo, síntomas y opciones preventivas, curativas e integradas." badge={profile.pests.length}>
              <div className="agts-callout">La ficha separa monitoreo y control. El tratamiento químico no debe sustituir el diagnóstico ni la justificación técnica.</div>
              {profile.pests.length === 0 && <EmptyRow>Agrega únicamente plagas o arvenses sustentados por la fuente técnica.</EmptyRow>}
              {profile.pests.map((item, index) => (
                <div className="agts-repeat-card" key={item.id}>
                  <div className="agts-card-toolbar"><strong>Plaga / arvense {index + 1}</strong><button className="agts-link-danger" onClick={() => removeProfileListItem("pests", index)}>Eliminar</button></div>
                  <div className="agts-grid cols-3">
                    <Field label="Nombre común" value={item.commonName} onChange={(value) => updateProfileList("pests", index, "commonName", value)} />
                    <Field label="Nombre científico" value={item.scientificName} onChange={(value) => updateProfileList("pests", index, "scientificName", value)} />
                    <Field label="Categoría" value={item.category} onChange={(value) => updateProfileList("pests", index, "category", value)} placeholder="Suelo, planta, fruta, arvense…" />
                  </div>
                  <TextArea label="Síntomas / características" value={item.symptoms} onChange={(value) => updateProfileList("pests", index, "symptoms", value)} />
                  <TextArea label="Monitoreo / diagnóstico" value={item.monitoring} onChange={(value) => updateProfileList("pests", index, "monitoring", value)} />
                  <div className="agts-grid cols-3">
                    <TextArea label="Preventivo" value={item.preventive} onChange={(value) => updateProfileList("pests", index, "preventive", value)} />
                    <TextArea label="Curativo" value={item.curative} onChange={(value) => updateProfileList("pests", index, "curative", value)} />
                    <TextArea label="Manejo integrado" value={item.integrated} onChange={(value) => updateProfileList("pests", index, "integrated", value)} />
                  </div>
                  <TextArea label="Umbral / momento / condición" value={item.trigger} onChange={(value) => updateProfileList("pests", index, "trigger", value)} />
                  <TextArea label="Notas" value={item.notes} onChange={(value) => updateProfileList("pests", index, "notes", value)} />
                </div>
              ))}
              <button className="agts-btn" type="button" onClick={() => addProfileListItem("pests", emptyPest)}>+ Agregar plaga o arvense</button>
            </Section>

            <Section title="9 · Cosecha, despacho y transporte" subtitle="Qué debe registrarse para que la trazabilidad no termine al marcar una tarea como completada.">
              <div className="agts-grid cols-2">
                <TextArea label="Criterios de calidad / madurez" value={profile.harvest.qualityCriteria} onChange={(value) => updateProfileGroup("harvest", "qualityCriteria", value)} />
                <TextArea label="Registro de cosecha" value={profile.harvest.harvestRecords} onChange={(value) => updateProfileGroup("harvest", "harvestRecords", value)} placeholder="Lote, fecha, cantidad, tipo, tamaño, responsable…" />
                <TextArea label="Registro de despacho" value={profile.harvest.dispatchRecords} onChange={(value) => updateProfileGroup("harvest", "dispatchRecords", value)} />
                <TextArea label="Condiciones de transporte" value={profile.harvest.transportRequirements} onChange={(value) => updateProfileGroup("harvest", "transportRequirements", value)} />
              </div>
            </Section>

            <Section title="10 · Residuos, rastrojos y cierre del ciclo" subtitle="El ciclo productivo no termina en cosecha: define manejo de residuos, renovación y controles poscosecha.">
              <div className="agts-grid cols-2">
                <TextArea label="Plan de manejo" value={profile.residues.managementPlan} onChange={(value) => updateProfileGroup("residues", "managementPlan", value)} />
                <TextArea label="Manejo de rastrojos" value={profile.residues.cropResidueHandling} onChange={(value) => updateProfileGroup("residues", "cropResidueHandling", value)} />
                <TextArea label="Medidas ambientales / residuos peligrosos" value={profile.residues.environmentalMeasures} onChange={(value) => updateProfileGroup("residues", "environmentalMeasures", value)} />
                <TextArea label="Actividades de cierre / renovación" value={profile.residues.closureActivities} onChange={(value) => updateProfileGroup("residues", "closureActivities", value)} />
              </div>
            </Section>

            <Section title="11 · Cumplimiento, evidencia y buenas prácticas" subtitle="Distingue lo obligatorio de lo recomendado y deja claro qué evidencia debería conservar el productor." badge={profile.requirements.length}>
              {profile.requirements.length === 0 && <EmptyRow>Agrega requisitos cuando la fuente indique obligaciones, recomendaciones, controles o documentos a conservar.</EmptyRow>}
              {profile.requirements.map((item, index) => (
                <div className="agts-repeat-card" key={item.id}>
                  <div className="agts-card-toolbar"><strong>Requisito {index + 1}</strong><button className="agts-link-danger" onClick={() => removeProfileListItem("requirements", index)}>Eliminar</button></div>
                  <div className="agts-grid cols-3">
                    <Field label="Requisito / práctica" value={item.title} onChange={(value) => updateProfileList("requirements", index, "title", value)} />
                    <SelectField label="Clasificación" value={item.classification} onChange={(value) => updateProfileList("requirements", index, "classification", value)} options={REQUIREMENT_TYPES} />
                    <Field label="Sección / referencia" value={item.section} onChange={(value) => updateProfileList("requirements", index, "section", value)} />
                    <Field label="Evidencia esperada" value={item.evidence} onChange={(value) => updateProfileList("requirements", index, "evidence", value)} placeholder="Foto, factura, análisis, firma…" />
                    <Field label="Frecuencia" value={item.frequency} onChange={(value) => updateProfileList("requirements", index, "frequency", value)} />
                  </div>
                  <TextArea label="Notas" value={item.notes} onChange={(value) => updateProfileList("requirements", index, "notes", value)} />
                </div>
              ))}
              <button className="agts-btn" type="button" onClick={() => addProfileListItem("requirements", emptyRequirement)}>+ Agregar requisito</button>
            </Section>

            <Section title="12 · Referencias normativas y técnicas" subtitle="Guarda la referencia; AgroMind no debe confundir normativa con una recomendación agronómica." badge={profile.regulations.length}>
              {profile.regulations.length === 0 && <EmptyRow>Sin referencias agregadas.</EmptyRow>}
              {profile.regulations.map((item, index) => (
                <div className="agts-reg-row" key={item.id}>
                  <Field label="Número / referencia" value={item.reference} onChange={(value) => updateProfileList("regulations", index, "reference", value)} />
                  <Field label="Título" value={item.title} onChange={(value) => updateProfileList("regulations", index, "title", value)} />
                  <Field label="Año" value={item.year} onChange={(value) => updateProfileList("regulations", index, "year", value)} />
                  <Field label="Nota" value={item.notes} onChange={(value) => updateProfileList("regulations", index, "notes", value)} />
                  <button className="agts-link-danger agts-remove-cell" type="button" onClick={() => removeProfileListItem("regulations", index)}>Eliminar</button>
                </div>
              ))}
              <button className="agts-btn" type="button" onClick={() => addProfileListItem("regulations", emptyRegulation)}>+ Agregar referencia</button>
            </Section>

            <Section title="13 · Notas técnicas finales" subtitle="Observaciones que deben conservarse en todas las versiones y adaptaciones.">
              <TextArea label="Notas técnicas" value={editor.notes} onChange={(value) => setEditor((prev) => ({ ...prev, notes: value }))} rows={5} placeholder="Criterios, advertencias, supuestos, limitaciones y observaciones generales." />
            </Section>

            <div className="agts-savebar">
              <div>
                <strong>{editor.name || "Ficha sin nombre"}</strong>
                <span>{editor.crop || "Indica el cultivo"}{editor.variety ? ` · ${editor.variety}` : ""}</span>
              </div>
              <button className="agts-btn agts-btn-primary" onClick={saveEditor} disabled={loading}>Guardar {editor.sheetId ? "nueva versión" : "ficha"}</button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
