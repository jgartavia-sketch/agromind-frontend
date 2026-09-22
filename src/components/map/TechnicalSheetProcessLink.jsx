import { useEffect, useMemo, useState } from "react";
import "../../styles/technical-sheets-beta.css";

const PRIVATE_BETA_EMAIL = "memo@gmail.com";
const API_BASE = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "https://agromind-backend-slem.onrender.com"
).replace(/\/+$/, "");

function getToken() {
  return (
    localStorage.getItem("agromind_token") ||
    localStorage.getItem("agromind_jwt") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function getStoredEmail() {
  const keys = ["agromind_user", "user", "auth_user"];
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.email) return String(parsed.email).trim().toLowerCase();
    } catch {
      // ignore invalid local storage entries
    }
  }
  return "";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cloneConfiguration(revision) {
  if (!revision) return null;
  return {
    name: revision.name || "",
    crop: revision.crop || "",
    variety: revision.variety || "",
    durationDays: Number(revision.durationDays || 0),
    description: revision?.data?.description || "",
    notes: revision?.data?.notes || "",
    sourceType: revision.sourceType || "MANUAL",
    sourceFileName: revision.sourceFileName || null,
    stages: (revision?.data?.stages || []).map((stage, stageIndex) => ({
      ...stage,
      id: stage.id || `stage-${stageIndex + 1}`,
      startDay: Number(stage.startDay || 0),
      durationDays: Number(stage.durationDays || 0),
      applications: (stage.applications || []).map((app, appIndex) => ({
        ...app,
        id: app.id || `app-${stageIndex + 1}-${appIndex + 1}`,
        dose: app.dose === null || app.dose === undefined ? "" : app.dose,
        dayOffset: Number(app.dayOffset || 0),
      })),
    })),
  };
}

function normalizeConfiguration(configuration) {
  if (!configuration) return null;
  return {
    ...configuration,
    durationDays: Number(configuration.durationDays || 0),
    stages: (configuration.stages || []).map((stage) => ({
      ...stage,
      startDay: Number(stage.startDay || 0),
      durationDays: Number(stage.durationDays || 0),
      applications: (stage.applications || []).map((app) => ({
        ...app,
        dose: app.dose === "" || app.dose === null ? null : Number(app.dose),
        dayOffset: Number(app.dayOffset || 0),
      })),
    })),
  };
}

export default function TechnicalSheetProcessLink({ value, onChange }) {
  const betaEnabled = getStoredEmail() === PRIVATE_BETA_EMAIL;
  const enabled = value?.enabled === true;
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOverrides, setShowOverrides] = useState(false);

  const selectedSheet = useMemo(
    () => sheets.find((item) => item.id === value?.sheetId) || null,
    [sheets, value?.sheetId]
  );

  const selectedRevision = useMemo(() => {
    if (!selectedSheet) return null;
    return (
      selectedSheet.revisions?.find((revision) => revision.id === value?.revisionId) ||
      selectedSheet.latestRevision ||
      selectedSheet.revisions?.[0] ||
      null
    );
  }, [selectedSheet, value?.revisionId]);

  useEffect(() => {
    if (!betaEnabled) return;
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE}/api/technical-sheets?ts=${Date.now()}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "No se pudieron cargar las fichas técnicas.");
        if (!alive) return;
        setSheets(Array.isArray(data?.sheets) ? data.sheets : []);
      } catch (e) {
        if (alive) setError(e?.message || "No se pudieron cargar las fichas técnicas.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [betaEnabled]);

  if (!betaEnabled) return null;

  function emit(next) {
    onChange?.({
      enabled: next.enabled === true,
      sheetId: next.sheetId || "",
      revisionId: next.revisionId || "",
      startDate: next.startDate || today(),
      configuration: next.configuration || null,
      label: next.label || "",
    });
  }

  function selectSheet(sheetId) {
    const sheet = sheets.find((item) => item.id === sheetId);
    const revision = sheet?.latestRevision || sheet?.revisions?.[0] || null;
    emit({
      ...value,
      enabled: true,
      sheetId: sheet?.id || "",
      revisionId: revision?.id || "",
      startDate: value?.startDate || today(),
      configuration: cloneConfiguration(revision),
      label: revision ? `${revision.name} · v${revision.version}` : "",
    });
  }

  function selectRevision(revisionId) {
    const revision = selectedSheet?.revisions?.find((item) => item.id === revisionId) || null;
    emit({
      ...value,
      enabled: true,
      revisionId: revision?.id || "",
      configuration: cloneConfiguration(revision),
      label: revision ? `${revision.name} · v${revision.version}` : "",
    });
  }

  function updateStage(stageIndex, field, nextValue) {
    const configuration = value?.configuration || cloneConfiguration(selectedRevision);
    if (!configuration) return;
    emit({
      ...value,
      configuration: {
        ...configuration,
        stages: configuration.stages.map((stage, index) =>
          index === stageIndex ? { ...stage, [field]: nextValue } : stage
        ),
      },
    });
  }

  function updateApplication(stageIndex, appIndex, field, nextValue) {
    const configuration = value?.configuration || cloneConfiguration(selectedRevision);
    if (!configuration) return;
    emit({
      ...value,
      configuration: {
        ...configuration,
        stages: configuration.stages.map((stage, index) =>
          index !== stageIndex
            ? stage
            : {
                ...stage,
                applications: stage.applications.map((app, ai) =>
                  ai === appIndex ? { ...app, [field]: nextValue } : app
                ),
              }
        ),
      },
    });
  }

  const configuration = value?.configuration || cloneConfiguration(selectedRevision);
  const stages = configuration?.stages || [];
  const totalApplications = stages.reduce(
    (total, stage) => total + (stage.applications?.length || 0),
    0
  );

  return (
    <div className="agts-link">
      <div className="agts-link-head">
        <div>
          <span className="agts-kicker">Programación agronómica · beta privada</span>
          <strong style={{ display: "block", marginTop: 4, color: "#f8fafc" }}>
            ¿Vincular este proceso a una ficha técnica?
          </strong>
          <div className="agts-mini">
            La ficha general no se modifica. Los ajustes hechos aquí pertenecen únicamente a este proceso y esta finca.
          </div>
        </div>
        <label className="agts-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => {
              const nextEnabled = event.target.checked;
              if (!nextEnabled) {
                emit({ enabled: false, startDate: value?.startDate || today() });
                return;
              }
              const first = sheets[0];
              const revision = first?.latestRevision || first?.revisions?.[0] || null;
              emit({
                enabled: true,
                sheetId: first?.id || "",
                revisionId: revision?.id || "",
                startDate: value?.startDate || today(),
                configuration: cloneConfiguration(revision),
                label: revision ? `${revision.name} · v${revision.version}` : "",
              });
            }}
          />
          {enabled ? "Sí, usar ficha" : "No, proceso independiente"}
        </label>
      </div>

      {enabled && (
        <div className="agts-preview">
          {loading && <div className="agts-mini">Cargando fichas…</div>}
          {error && <div className="agts-alert error">{error}</div>}
          {!loading && sheets.length === 0 && (
            <div className="agts-alert error">
              No hay fichas técnicas creadas. Créala primero desde el Centro de fincas.
            </div>
          )}

          {sheets.length > 0 && (
            <>
              <div className="agts-grid cols-4">
                <label style={{ gridColumn: "span 2" }}>
                  Ficha técnica
                  <select value={value?.sheetId || ""} onChange={(e) => selectSheet(e.target.value)}>
                    {sheets.map((sheet) => {
                      const latest = sheet.latestRevision || sheet.revisions?.[0];
                      return (
                        <option key={sheet.id} value={sheet.id}>
                          {latest?.crop || "Cultivo"}{latest?.variety ? ` · ${latest.variety}` : ""} — {latest?.name || "Ficha"} · v{latest?.version || 1}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label>
                  Versión
                  <select value={selectedRevision?.id || ""} onChange={(e) => selectRevision(e.target.value)}>
                    {(selectedSheet?.revisions || []).map((revision) => (
                      <option key={revision.id} value={revision.id}>
                        v{revision.version} · {revision.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Inicio real en esta finca
                  <input
                    type="date"
                    value={value?.startDate || today()}
                    onChange={(e) => emit({ ...value, startDate: e.target.value })}
                  />
                </label>
              </div>

              {selectedRevision && (
                <>
                  <div className="agts-preview-summary">
                    <span className="agts-chip">{selectedRevision.crop}{selectedRevision.variety ? ` · ${selectedRevision.variety}` : ""}</span>
                    <span className="agts-chip">{configuration?.durationDays || selectedRevision.durationDays || 0} días</span>
                    <span className="agts-chip">{stages.length} etapas</span>
                    <span className="agts-chip">{totalApplications} aplicaciones → tareas</span>
                  </div>

                  <button
                    type="button"
                    className="agts-btn agts-btn-light"
                    onClick={() => setShowOverrides((current) => !current)}
                  >
                    {showOverrides ? "Ocultar ajustes de esta finca" : "Ajustar esta ficha solo para este proceso"}
                  </button>

                  {showOverrides && (
                    <div style={{ marginTop: 12 }}>
                      <label style={{ maxWidth: 220 }}>
                        Duración total aplicada
                        <input
                          type="number"
                          min="0"
                          value={configuration?.durationDays ?? ""}
                          onChange={(e) => emit({
                            ...value,
                            configuration: { ...configuration, durationDays: e.target.value },
                          })}
                        />
                      </label>

                      {stages.map((stage, stageIndex) => (
                        <div className="agts-override-stage" key={stage.id || stageIndex}>
                          <div className="agts-grid cols-4">
                            <label>Etapa<input value={stage.name} onChange={(e) => updateStage(stageIndex, "name", e.target.value)} /></label>
                            <label>Inicia día<input type="number" min="0" value={stage.startDay} onChange={(e) => updateStage(stageIndex, "startDay", e.target.value)} /></label>
                            <label>Duración<input type="number" min="0" value={stage.durationDays} onChange={(e) => updateStage(stageIndex, "durationDays", e.target.value)} /></label>
                            <div className="agts-mini" style={{ alignSelf: "end", paddingBottom: 12 }}>
                              Ajuste local: no cambia la ficha general.
                            </div>
                          </div>

                          {(stage.applications || []).map((app, appIndex) => (
                            <div className="agts-application" key={app.id || appIndex}>
                              <div className="agts-grid cols-4">
                                <label>Aplicación<input value={app.name || ""} onChange={(e) => updateApplication(stageIndex, appIndex, "name", e.target.value)} /></label>
                                <label>Producto<input value={app.product || ""} onChange={(e) => updateApplication(stageIndex, appIndex, "product", e.target.value)} /></label>
                                <label>Dosis<input type="number" step="any" value={app.dose ?? ""} onChange={(e) => updateApplication(stageIndex, appIndex, "dose", e.target.value)} /></label>
                                <label>Unidad<input value={app.doseUnit || ""} onChange={(e) => updateApplication(stageIndex, appIndex, "doseUnit", e.target.value)} /></label>
                                <label>Día en etapa<input type="number" min="0" value={app.dayOffset || 0} onChange={(e) => updateApplication(stageIndex, appIndex, "dayOffset", e.target.value)} /></label>
                                <label>Método<input value={app.method || ""} onChange={(e) => updateApplication(stageIndex, appIndex, "method", e.target.value)} /></label>
                                <label>Responsable<input value={app.owner || ""} onChange={(e) => updateApplication(stageIndex, appIndex, "owner", e.target.value)} /></label>
                                <label>Prioridad<select value={app.priority || "Media"} onChange={(e) => updateApplication(stageIndex, appIndex, "priority", e.target.value)}><option>Alta</option><option>Media</option><option>Baja</option></select></label>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {enabled && value?.configuration && (
        <input type="hidden" value={JSON.stringify(normalizeConfiguration(value.configuration))} readOnly />
      )}
    </div>
  );
}
