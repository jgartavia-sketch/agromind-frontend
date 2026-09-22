import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import "../styles/technical-sheets-beta.css";

const API_BASE = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "https://agromind-backend-slem.onrender.com"
).replace(/\/+$/, "");

function dateOnly(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CR", { year: "numeric", month: "short", day: "2-digit" });
}

function certificateNumber(app) {
  const clean = String(app?.id || "AGM").replace(/[^a-zA-Z0-9]/g, "").slice(-10).toUpperCase();
  return `CED-AGM-${clean || Date.now()}`;
}

export default function TechnicalProgramPage({ token, farmId }) {
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [completeId, setCompleteId] = useState("");
  const [completeForm, setCompleteForm] = useState({
    actualDate: dateOnly(new Date()),
    appliedDose: "",
    appliedDoseUnit: "",
    area: "",
    areaUnit: "ha",
    responsible: "",
    equipment: "",
    notes: "",
    evidenceText: "",
  });
  const [extraForm, setExtraForm] = useState({
    name: "",
    product: "",
    dose: "",
    doseUnit: "kg/ha",
    method: "",
    scheduledDate: dateOnly(new Date()),
    stageName: "Aplicación extraordinaria",
    owner: "",
    priority: "Media",
    notes: "",
  });

  const selectedCycle = useMemo(
    () => cycles.find((cycle) => cycle.id === selectedCycleId) || cycles[0] || null,
    [cycles, selectedCycleId]
  );

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
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

  async function loadCycles() {
    if (!farmId || !token) return;
    setLoading(true);
    setError("");
    try {
      const data = await api(`/api/farms/${farmId}/crop-cycles?ts=${Date.now()}`);
      const list = Array.isArray(data?.cycles) ? data.cycles : [];
      setCycles(list);
      if (!selectedCycleId && list[0]?.id) setSelectedCycleId(list[0].id);
      if (selectedCycleId && !list.some((item) => item.id === selectedCycleId) && list[0]?.id) {
        setSelectedCycleId(list[0].id);
      }
    } catch (e) {
      setError(e?.message || "No se pudo cargar la programación técnica.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCycles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId, token]);

  async function completeApplication(application) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const evidence = String(completeForm.evidenceText || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12);

      await api(`/api/farms/${farmId}/applications/${application.id}/complete`, {
        method: "PATCH",
        body: JSON.stringify({
          actualDate: completeForm.actualDate,
          appliedDose:
            completeForm.appliedDose === "" ? application.plannedDose : Number(completeForm.appliedDose),
          appliedDoseUnit: completeForm.appliedDoseUnit || application.plannedDoseUnit || "",
          area: completeForm.area === "" ? null : Number(completeForm.area),
          areaUnit: completeForm.areaUnit,
          responsible: completeForm.responsible,
          equipment: completeForm.equipment,
          notes: completeForm.notes,
          evidence,
        }),
      });

      setCompleteId("");
      setMessage("Aplicación registrada. La tarea quedó completada y la cédula está lista.");
      await loadCycles();
      window.dispatchEvent(new CustomEvent("agromind:tasks:refresh", { detail: { farmId } }));
    } catch (e) {
      setError(e?.message || "No se pudo registrar la aplicación.");
    } finally {
      setLoading(false);
    }
  }

  async function addExtraApplication() {
    if (!selectedCycle?.id) return;
    if (!extraForm.name.trim()) {
      setError("Escribe el nombre de la aplicación extraordinaria.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    try {
      await api(`/api/farms/${farmId}/crop-cycles/${selectedCycle.id}/applications-extra`, {
        method: "POST",
        body: JSON.stringify({
          ...extraForm,
          dose: extraForm.dose === "" ? null : Number(extraForm.dose),
        }),
      });
      setExtraForm({
        name: "",
        product: "",
        dose: "",
        doseUnit: "kg/ha",
        method: "",
        scheduledDate: dateOnly(new Date()),
        stageName: "Aplicación extraordinaria",
        owner: "",
        priority: "Media",
        notes: "",
      });
      setMessage("Aplicación extraordinaria agregada. También se creó su tarea en el calendario.");
      await loadCycles();
      window.dispatchEvent(new CustomEvent("agromind:tasks:refresh", { detail: { farmId } }));
    } catch (e) {
      setError(e?.message || "No se pudo agregar la aplicación extraordinaria.");
    } finally {
      setLoading(false);
    }
  }

  async function updateCycleStatus(status) {
    if (!selectedCycle?.id) return;
    setLoading(true);
    setError("");
    try {
      await api(`/api/farms/${farmId}/crop-cycles/${selectedCycle.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage(`Ciclo actualizado a ${status.toLowerCase()}.`);
      await loadCycles();
    } catch (e) {
      setError(e?.message || "No se pudo actualizar el ciclo.");
    } finally {
      setLoading(false);
    }
  }

  function generateCertificate(app, cycle) {
    const doc = new jsPDF();
    const number = certificateNumber(app);
    const rows = [
      ["Cédula", number],
      ["Cultivo", `${cycle.crop || ""}${cycle.variety ? ` · ${cycle.variety}` : ""}`],
      ["Zona / lote", cycle.zoneName || "No especificado"],
      ["Ficha aplicada", `${cycle.technicalSheetName || "Ficha técnica"} · v${cycle.sheetVersion || 1}`],
      ["Etapa", app.stageName || "—"],
      ["Aplicación", app.name || "—"],
      ["Producto", app.product || "—"],
      ["Fecha programada", formatDate(app.scheduledDate)],
      ["Fecha realizada", formatDate(app.actualDate)],
      ["Dosis programada", `${app.plannedDose ?? "—"} ${app.plannedDoseUnit || ""}`],
      ["Dosis aplicada", `${app.appliedDose ?? "—"} ${app.appliedDoseUnit || ""}`],
      ["Área tratada", `${app.area ?? "—"} ${app.areaUnit || ""}`],
      ["Método", app.method || "—"],
      ["Responsable", app.responsible || "—"],
      ["Equipo", app.equipment || "—"],
      ["Tipo", app.isExtra ? "Extraordinaria / fuera de programa" : "Programada"],
    ];

    doc.setFontSize(18);
    doc.text("AgroMind · Cédula de aplicación", 14, 18);
    doc.setFontSize(9);
    doc.text(`Generada: ${new Date().toLocaleString("es-CR")}`, 14, 25);

    let y = 36;
    for (const [label, value] of rows) {
      doc.setFont(undefined, "bold");
      doc.text(`${label}:`, 14, y);
      doc.setFont(undefined, "normal");
      const lines = doc.splitTextToSize(String(value || "—"), 132);
      doc.text(lines, 62, y);
      y += Math.max(8, lines.length * 5 + 2);
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }

    if (app.notes) {
      y += 2;
      doc.setFont(undefined, "bold");
      doc.text("Observaciones:", 14, y);
      y += 6;
      doc.setFont(undefined, "normal");
      const lines = doc.splitTextToSize(String(app.notes), 180);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 4;
    }

    if (Array.isArray(app.evidence) && app.evidence.length) {
      if (y > 245) {
        doc.addPage();
        y = 20;
      }
      doc.setFont(undefined, "bold");
      doc.text("Evidencia / referencias:", 14, y);
      y += 6;
      doc.setFont(undefined, "normal");
      app.evidence.forEach((item) => {
        const lines = doc.splitTextToSize(`• ${String(item)}`, 180);
        doc.text(lines, 14, y);
        y += lines.length * 5 + 2;
      });
    }

    doc.save(`${number}-${cycle.crop || "cultivo"}.pdf`);
  }

  return (
    <div className="agts-root" style={{ minHeight: "auto", padding: 0, background: "transparent" }}>
      <div className="agts-shell">
        <header className="agts-header" style={{ marginBottom: 14 }}>
          <div>
            <span className="agts-kicker">Ejecución agronómica · beta privada</span>
            <h1 style={{ fontSize: "clamp(26px,3vw,38px)" }}>Programación técnica</h1>
            <p>
              Aquí se ejecuta lo que nació en una ficha: ciclos por finca, aplicaciones programadas,
              extraordinarias, cumplimiento y cédulas de aplicación.
            </p>
          </div>
        </header>

        {loading && <div className="agts-loading">Actualizando programación…</div>}
        {message && <div className="agts-alert ok">{message}</div>}
        {error && <div className="agts-alert error">{error}</div>}

        <div className="agts-layout">
          <aside className="agts-panel agts-list">
            <span className="agts-kicker">Ciclos de esta finca</span>
            <h2 style={{ marginTop: 5 }}>{cycles.length} ciclos</h2>
            <p className="agts-mini">
              Los ciclos se crean al vincular una ficha técnica desde un proceso en el mapa.
            </p>
            <hr className="agts-separator" />
            {cycles.length === 0 ? (
              <p>No hay ciclos técnicos todavía.</p>
            ) : (
              cycles.map((cycle) => (
                <button
                  key={cycle.id}
                  className={`agts-cycle ${selectedCycle?.id === cycle.id ? "active" : ""}`}
                  onClick={() => setSelectedCycleId(cycle.id)}
                >
                  <strong>{cycle.crop}{cycle.variety ? ` · ${cycle.variety}` : ""}</strong>
                  <span>{cycle.zoneName || "Sin zona"}</span>
                  <small>{formatDate(cycle.startDate)} → {formatDate(cycle.endDate)} · {cycle.status}</small>
                </button>
              ))
            )}
          </aside>

          <section className="agts-panel">
            {!selectedCycle ? (
              <div>
                <span className="agts-kicker">Sin programación</span>
                <h2>Vincula una ficha desde un proceso</h2>
                <p>
                  Abre una zona en el mapa, crea un proceso y activa “Usar ficha técnica”. AgroMind generará
                  etapas, aplicaciones y tareas automáticamente.
                </p>
              </div>
            ) : (
              <>
                <div className="agts-panel-title">
                  <div>
                    <span className="agts-kicker">{selectedCycle.status}</span>
                    <h2>{selectedCycle.crop}{selectedCycle.variety ? ` · ${selectedCycle.variety}` : ""}</h2>
                    <p>
                      {selectedCycle.zoneName || "Sin zona"} · {selectedCycle.technicalSheetName} v{selectedCycle.sheetVersion}
                    </p>
                  </div>
                  <div className="agts-actions-inline">
                    {selectedCycle.status !== "COMPLETADO" && (
                      <button className="agts-btn agts-btn-light" onClick={() => updateCycleStatus("COMPLETADO")}>Completar ciclo</button>
                    )}
                    {selectedCycle.status === "COMPLETADO" && (
                      <button className="agts-btn" onClick={() => updateCycleStatus("ACTIVO")}>Reabrir ciclo</button>
                    )}
                  </div>
                </div>

                <div className="agts-stats">
                  <div><b>{selectedCycle.applications?.length || 0}</b><span>Aplicaciones</span></div>
                  <div><b>{selectedCycle.applications?.filter((a) => a.status === "REALIZADA").length || 0}</b><span>Realizadas</span></div>
                  <div><b>{selectedCycle.applications?.filter((a) => a.status !== "REALIZADA").length || 0}</b><span>Pendientes</span></div>
                  <div><b>{selectedCycle.applications?.filter((a) => a.isExtra).length || 0}</b><span>Extraordinarias</span></div>
                </div>

                <div className="agts-stage">
                  <div className="agts-panel-title">
                    <div><span className="agts-kicker">Fuera del programa base</span><h3>Aplicación extraordinaria</h3></div>
                  </div>
                  <div className="agts-grid cols-4">
                    <label>Nombre<input value={extraForm.name} onChange={(e) => setExtraForm({ ...extraForm, name: e.target.value })} /></label>
                    <label>Producto<input value={extraForm.product} onChange={(e) => setExtraForm({ ...extraForm, product: e.target.value })} /></label>
                    <label>Dosis<input type="number" step="any" value={extraForm.dose} onChange={(e) => setExtraForm({ ...extraForm, dose: e.target.value })} /></label>
                    <label>Unidad<input value={extraForm.doseUnit} onChange={(e) => setExtraForm({ ...extraForm, doseUnit: e.target.value })} /></label>
                    <label>Método<input value={extraForm.method} onChange={(e) => setExtraForm({ ...extraForm, method: e.target.value })} /></label>
                    <label>Fecha<input type="date" value={extraForm.scheduledDate} onChange={(e) => setExtraForm({ ...extraForm, scheduledDate: e.target.value })} /></label>
                    <label>Responsable<input value={extraForm.owner} onChange={(e) => setExtraForm({ ...extraForm, owner: e.target.value })} /></label>
                    <label>Prioridad<select value={extraForm.priority} onChange={(e) => setExtraForm({ ...extraForm, priority: e.target.value })}><option>Alta</option><option>Media</option><option>Baja</option></select></label>
                  </div>
                  <label>Notas<textarea value={extraForm.notes} onChange={(e) => setExtraForm({ ...extraForm, notes: e.target.value })} /></label>
                  <button className="agts-btn agts-btn-light" onClick={addExtraApplication}>Agregar y crear tarea</button>
                </div>

                <div>
                  {(selectedCycle.applications || []).map((app) => (
                    <article className={`agts-execution ${app.status === "REALIZADA" ? "done" : ""}`} key={app.id}>
                      <div className="agts-panel-title">
                        <div>
                          <span className="agts-kicker">{app.stageName || "Aplicación"}{app.isExtra ? " · extraordinaria" : ""}</span>
                          <h3>{app.name}</h3>
                          <p>
                            {app.product || "Sin producto"} · {app.plannedDose ?? "—"} {app.plannedDoseUnit || ""} · {formatDate(app.scheduledDate)}
                          </p>
                        </div>
                        <div className="agts-actions-inline">
                          {app.status !== "REALIZADA" ? (
                            <button
                              className="agts-btn"
                              onClick={() => {
                                setCompleteId(app.id);
                                setCompleteForm((prev) => ({
                                  ...prev,
                                  actualDate: dateOnly(new Date()),
                                  appliedDose: app.plannedDose ?? "",
                                  appliedDoseUnit: app.plannedDoseUnit || "",
                                  notes: app.notes || "",
                                  evidenceText: "",
                                }));
                              }}
                            >
                              Registrar aplicación
                            </button>
                          ) : (
                            <button className="agts-btn agts-btn-light" onClick={() => generateCertificate(app, selectedCycle)}>
                              Cédula PDF
                            </button>
                          )}
                        </div>
                      </div>

                      {app.status === "REALIZADA" && (
                        <div className="agts-mini">
                          Realizada {formatDate(app.actualDate)} · {app.appliedDose ?? "—"} {app.appliedDoseUnit || ""}
                          {app.responsible ? ` · ${app.responsible}` : ""}
                        </div>
                      )}

                      {completeId === app.id && (
                        <div className="agts-complete">
                          <div className="agts-grid cols-4">
                            <label>Fecha real<input type="date" value={completeForm.actualDate} onChange={(e) => setCompleteForm({ ...completeForm, actualDate: e.target.value })} /></label>
                            <label>Dosis aplicada<input type="number" step="any" value={completeForm.appliedDose} onChange={(e) => setCompleteForm({ ...completeForm, appliedDose: e.target.value })} /></label>
                            <label>Unidad<input value={completeForm.appliedDoseUnit} onChange={(e) => setCompleteForm({ ...completeForm, appliedDoseUnit: e.target.value })} /></label>
                            <label>Área<input type="number" step="any" value={completeForm.area} onChange={(e) => setCompleteForm({ ...completeForm, area: e.target.value })} /></label>
                            <label>Unidad área<input value={completeForm.areaUnit} onChange={(e) => setCompleteForm({ ...completeForm, areaUnit: e.target.value })} /></label>
                            <label>Responsable<input value={completeForm.responsible} onChange={(e) => setCompleteForm({ ...completeForm, responsible: e.target.value })} /></label>
                            <label>Equipo<input value={completeForm.equipment} onChange={(e) => setCompleteForm({ ...completeForm, equipment: e.target.value })} /></label>
                          </div>
                          <label>Observaciones<textarea value={completeForm.notes} onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })} /></label>
                          <label>Evidencia / referencias<textarea value={completeForm.evidenceText} onChange={(e) => setCompleteForm({ ...completeForm, evidenceText: e.target.value })} placeholder="Una referencia, URL o código de evidencia por línea" /></label>
                          <div className="agts-actions-inline">
                            <button className="agts-btn agts-btn-primary" onClick={() => completeApplication(app)}>Confirmar realizada</button>
                            <button className="agts-btn" onClick={() => setCompleteId("")}>Cancelar</button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
