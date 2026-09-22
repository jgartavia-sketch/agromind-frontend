import fs from "fs";
import path from "path";

const root = process.cwd();

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`No existe ${rel}. Ejecuta este script desde la raíz de agromind-frontend.`);
  return { file, text: fs.readFileSync(file, "utf8") };
}

function write(file, text) {
  fs.writeFileSync(file, text, "utf8");
}

function replaceOnce(text, needle, replacement, label) {
  const count = text.split(needle).length - 1;
  if (count === 0) throw new Error(`No encontré el punto de integración: ${label}`);
  if (count > 1) throw new Error(`El punto de integración '${label}' aparece ${count} veces; se aborta para no tocar el archivo equivocado.`);
  return text.replace(needle, replacement);
}

function patchFarmWorkspace() {
  const rel = "src/pages/FarmWorkspacePage.jsx";
  const { file, text: original } = read(rel);
  let text = original;
  if (text.includes("TechnicalSheetsLibraryPage")) return console.log(`✓ ${rel} ya integrado`);

  text = replaceOnce(
    text,
    'import { useFarm } from "../context/useFarm";\n',
    'import { useFarm } from "../context/useFarm";\nimport TechnicalSheetsLibraryPage from "./TechnicalSheetsLibraryPage";\n',
    "import biblioteca técnica"
  );

  text = replaceOnce(
    text,
    '  const [leavingFarm, setLeavingFarm] = useState(false);\n',
    '  const [leavingFarm, setLeavingFarm] = useState(false);\n  const [isTechnicalSheetsOpen, setIsTechnicalSheetsOpen] = useState(false);\n',
    "estado biblioteca técnica"
  );

  text = replaceOnce(
    text,
    '  const consultantFarms = useMemo(\n    () => farms.filter((farm) => farm.role === "CONSULTANT"),\n    [farms]\n  );\n',
    '  const consultantFarms = useMemo(\n    () => farms.filter((farm) => farm.role === "CONSULTANT"),\n    [farms]\n  );\n\n  const technicalBetaEnabled =\n    String(user?.email || "").trim().toLowerCase() === "memo@gmail.com";\n',
    "gate beta en centro de fincas"
  );

  text = replaceOnce(
    text,
    '  return (\n    <div\n      style={{\n        minHeight: "100vh",',
    '  if (isTechnicalSheetsOpen && technicalBetaEnabled) {\n    return (\n      <TechnicalSheetsLibraryPage\n        user={user}\n        onClose={() => setIsTechnicalSheetsOpen(false)}\n      />\n    );\n  }\n\n  return (\n    <div\n      style={{\n        minHeight: "100vh",',
    "vista biblioteca técnica"
  );

  const createButtonStart = `            <button\n              type="button"\n              onClick={() => {\n                setFeedback("");\n                setFarmName("");\n                setIsCreateOpen(true);\n              }}\n              style={primaryButtonStyle}\n            >\n              Crear nueva finca\n            </button>`;

  const replacement = `            <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>\n              {technicalBetaEnabled && (\n                <button\n                  type="button"\n                  onClick={() => {\n                    setFeedback("");\n                    setIsTechnicalSheetsOpen(true);\n                  }}\n                  style={{\n                    ...primaryButtonStyle,\n                    background: "rgba(13,148,136,0.16)",\n                    color: "#99f6e4",\n                    border: "1px solid rgba(45,212,191,0.32)",\n                    boxShadow: "none",\n                  }}\n                >\n                  Agregar ficha técnica · BETA\n                </button>\n              )}\n\n              <button\n                type="button"\n                onClick={() => {\n                  setFeedback("");\n                  setFarmName("");\n                  setIsCreateOpen(true);\n                }}\n                style={primaryButtonStyle}\n              >\n                Crear nueva finca\n              </button>\n            </div>`;

  text = replaceOnce(text, createButtonStart, replacement, "botón fichas técnicas junto a crear finca");
  write(file, text);
  console.log(`✓ ${rel}`);
}

function patchProcessModal() {
  const rel = "src/components/map/ProcessModal.jsx";
  const { file, text: original } = read(rel);
  let text = original;
  if (text.includes("TechnicalSheetProcessLink")) return console.log(`✓ ${rel} ya integrado`);

  text = replaceOnce(
    text,
    'import { useFarm } from "../../context/useFarm";\n',
    'import { useFarm } from "../../context/useFarm";\nimport TechnicalSheetProcessLink from "./TechnicalSheetProcessLink";\n',
    "import vínculo ficha técnica"
  );

  text = replaceOnce(
    text,
    '  const [expandedProcessById, setExpandedProcessById] = useState({});\n',
    '  const [expandedProcessById, setExpandedProcessById] = useState({});\n  const [technicalSheetLink, setTechnicalSheetLink] = useState({\n    enabled: false,\n    sheetId: "",\n    revisionId: "",\n    startDate: todayYYYYMMDD(),\n    configuration: null,\n    label: "",\n  });\n',
    "estado vínculo ficha"
  );

  text = replaceOnce(
    text,
    '    setDraftSteps([getEmptyStepDraft(1)]);\n    setProcessesError("");\n',
    '    setDraftSteps([getEmptyStepDraft(1)]);\n    setTechnicalSheetLink({\n      enabled: false,\n      sheetId: "",\n      revisionId: "",\n      startDate: todayYYYYMMDD(),\n      configuration: null,\n      label: "",\n    });\n    setProcessesError("");\n',
    "reset vínculo ficha"
  );

  text = replaceOnce(
    text,
    '        type: "General",\n        status: "Activo",\n      },\n      cleanSteps\n    );',
    '        type: technicalSheetLink?.enabled ? "Cultivo" : "General",\n        status: "Activo",\n        technicalSheetLink,\n      },\n      technicalSheetLink?.enabled ? [] : cleanSteps\n    );',
    "guardar proceso vinculado"
  );

  text = replaceOnce(
    text,
    '          <div\n            style={{\n              display: "grid",\n              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",\n              gap: "10px",\n              marginBottom: "14px",\n            }}\n          >',
    '          <TechnicalSheetProcessLink\n            value={technicalSheetLink}\n            onChange={setTechnicalSheetLink}\n          />\n\n          <div\n            style={{\n              display: "grid",\n              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",\n              gap: "10px",\n              marginBottom: "14px",\n            }}\n          >',
    "selector ficha en constructor"
  );

  text = replaceOnce(
    text,
    '          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>\n            <strong style={{ color: "#e5e7eb", fontSize: "0.9rem" }}>Etapas del proceso</strong>',
    '          {!technicalSheetLink?.enabled && (\n            <>\n          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>\n            <strong style={{ color: "#e5e7eb", fontSize: "0.9rem" }}>Etapas del proceso</strong>',
    "ocultar etapas manuales al usar ficha"
  );

  text = replaceOnce(
    text,
    '          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end", marginTop: "14px" }}>\n',
    '            </>\n          )}\n\n          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end", marginTop: "14px" }}>\n',
    "cierre etapas manuales"
  );

  text = replaceOnce(
    text,
    '    setDraftSteps([getEmptyStepDraft(1)]);\n  };\n\n  return (',
    '    setDraftSteps([getEmptyStepDraft(1)]);\n    setTechnicalSheetLink({\n      enabled: false,\n      sheetId: "",\n      revisionId: "",\n      startDate: todayYYYYMMDD(),\n      configuration: null,\n      label: "",\n    });\n  };\n\n  return (',
    "reset vínculo después de guardar"
  );

  text = replaceOnce(
    text,
    '{processActionLoading ? "Guardando..." : "Guardar proceso con etapas"}',
    '{processActionLoading\n                ? "Guardando..."\n                : technicalSheetLink?.enabled\n                  ? "Crear proceso + programación técnica"\n                  : "Guardar proceso con etapas"}',
    "texto guardar proceso"
  );

  text = replaceOnce(
    text,
    '    if (!safeName) {\n      setProcessesError("Escribe el nombre del proceso.");\n      return null;\n    }',
    '    if (!safeName && !source?.technicalSheetLink?.enabled) {\n      setProcessesError("Escribe el nombre del proceso.");\n      return null;\n    }',
    "nombre opcional cuando la ficha lo define"
  );

  text = replaceOnce(
    text,
    'export default function ProcessModal({ modalZone, onBeforeCreate }) {\n  const { isConsultant } = useFarm();',
    'export default function ProcessModal({ modalZone, onBeforeCreate }) {\n  const { isConsultant, farmId } = useFarm();',
    "farmId en ProcessModal"
  );

  text = replaceOnce(
    text,
    '      if (typeof onBeforeCreate === "function") await onBeforeCreate();\n\n      const createdProcess = await apiFetch("/api/processes", {',
    `      if (typeof onBeforeCreate === "function") await onBeforeCreate();\n\n      const technicalLink = source?.technicalSheetLink;\n\n      if (technicalLink?.enabled) {\n        if (!farmId) throw new Error("No se detectó la finca activa.");\n        if (!technicalLink.sheetId || !technicalLink.revisionId) {\n          throw new Error("Selecciona una ficha técnica y su versión.");\n        }\n        if (!technicalLink.startDate) {\n          throw new Error("Selecciona la fecha real de inicio para aplicar la ficha.");\n        }\n\n        const linked = await apiFetch(\n          \`/api/farms/\${farmId}/technical-sheets/link-process\`,\n          {\n            method: "POST",\n            body: JSON.stringify({\n              zoneId: modalZone.id,\n              technicalSheetId: technicalLink.sheetId,\n              revisionId: technicalLink.revisionId,\n              startDate: technicalLink.startDate,\n              configuration: technicalLink.configuration,\n              process: {\n                name: safeName,\n                description: safeDescription,\n                owner: safeOwner,\n                priority: safePriority,\n                type: source.type || "Cultivo",\n                status: source.status || "Activo",\n              },\n            }),\n          }\n        );\n\n        setNewProcessName("");\n        setNewProcessDescription("");\n        setNewProcessOwner("");\n        setNewProcessPriority("Media");\n        setShowCreateProcessForm(false);\n        await loadZoneProcesses();\n        window.dispatchEvent(\n          new CustomEvent("agromind:technical:refresh", { detail: { farmId } })\n        );\n        window.dispatchEvent(\n          new CustomEvent("agromind:tasks:refresh", { detail: { farmId } })\n        );\n        return linked?.process || null;\n      }\n\n      const createdProcess = await apiFetch("/api/processes", {`,
    "endpoint proceso vinculado"
  );

  text = replaceOnce(
    text,
    '                          <span>Tipo: {process.type || "General"}</span>\n',
    '                          <span>Tipo: {process.type || "General"}</span>\n                          {process.technicalSheetName ? (\n                            <span>Ficha: {process.technicalSheetName} v{process.technicalSheetVersion || 1}</span>\n                          ) : null}\n',
    "identidad de ficha en proceso"
  );

  write(file, text);
  console.log(`✓ ${rel}`);
}

function patchFarmShell() {
  const rel = "src/components/FarmShell.jsx";
  const { file, text: original } = read(rel);
  let text = original;
  if (text.includes("TechnicalProgramPage")) return console.log(`✓ ${rel} ya integrado`);

  text = replaceOnce(
    text,
    'const TeamAccessPage = lazy(() => import("../pages/TeamAccessPage"));\n',
    'const TeamAccessPage = lazy(() => import("../pages/TeamAccessPage"));\nconst TechnicalProgramPage = lazy(() => import("../pages/TechnicalProgramPage"));\n',
    "import programa técnico"
  );

  text = replaceOnce(
    text,
    '    bitacora: <><path d="M5 4h14v17H5z"/><path d="M8 2v4M16 2v4M8 10h8M8 14h8M8 18h5"/></>,\n',
    '    bitacora: <><path d="M5 4h14v17H5z"/><path d="M8 2v4M16 2v4M8 10h8M8 14h8M8 18h5"/></>,\n    programa: <><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5M7 3v4M17 3v4"/></>,\n',
    "icono programa técnico"
  );

  const tabsNeedle = `  const mainTabs = useMemo(() => (isAdmin ? [\n    ["dashboard", "Dashboard"],\n    ["mapa", "Mapa de la finca"],\n    ["tareas", "Tareas"],\n    ["finanzas", "Finanzas"],\n    ["clima", "Clima"],\n    ["bitacora", "Bitácora"],\n    ["team", "Equipo y acceso"],\n  ] : [\n    ["mapa", "Mapa de la finca"],\n    ["tareas", "Mis tareas"],\n    ["clima", "Clima"],\n    ["bitacora", "Mi bitácora"],\n  ]), [isAdmin]);`;

  const tabsReplacement = `  const technicalBetaEnabled =\n    String(user?.email || "").trim().toLowerCase() === "memo@gmail.com";\n\n  const mainTabs = useMemo(() => (isAdmin ? [\n    ["dashboard", "Dashboard"],\n    ["mapa", "Mapa de la finca"],\n    ["tareas", "Tareas"],\n    ...(technicalBetaEnabled ? [["programa", "Programación técnica · BETA"]] : []),\n    ["finanzas", "Finanzas"],\n    ["clima", "Clima"],\n    ["bitacora", "Bitácora"],\n    ["team", "Equipo y acceso"],\n  ] : [\n    ["mapa", "Mapa de la finca"],\n    ["tareas", "Mis tareas"],\n    ["clima", "Clima"],\n    ["bitacora", "Mi bitácora"],\n  ]), [isAdmin, technicalBetaEnabled]);`;

  text = replaceOnce(text, tabsNeedle, tabsReplacement, "tab programa técnico");

  text = replaceOnce(
    text,
    '            {isAdmin && activeTab === "finanzas" && (\n              <FinanzasPage token={token} farmId={farmId} />\n            )}\n',
    '            {isAdmin && technicalBetaEnabled && activeTab === "programa" && (\n              <TechnicalProgramPage token={token} farmId={farmId} />\n            )}\n\n            {isAdmin && activeTab === "finanzas" && (\n              <FinanzasPage token={token} farmId={farmId} />\n            )}\n',
    "render programa técnico"
  );

  write(file, text);
  console.log(`✓ ${rel}`);
}

function patchDashboard() {
  const rel = "src/pages/DashboardPage.jsx";
  const { file, text: original } = read(rel);
  let text = original;
  if (text.includes("PrivateBetaAgronomicDashboard")) return console.log(`✓ ${rel} ya integrado`);

  text = replaceOnce(
    text,
    'import { downloadDashboardReport } from "../utils/dashboardReport";\n',
    'import { downloadDashboardReport } from "../utils/dashboardReport";\nimport PrivateBetaAgronomicDashboard from "../components/PrivateBetaAgronomicDashboard";\n',
    "import dashboard agronómico"
  );

  text = replaceOnce(
    text,
    '      </section>\n\n      {errorMsg ? (',
    '      </section>\n\n      <PrivateBetaAgronomicDashboard user={user} farmId={farmId} />\n\n      {errorMsg ? (',
    "panel agronómico dashboard"
  );

  write(file, text);
  console.log(`✓ ${rel}`);
}

function patchTasks() {
  const rel = "src/pages/TareasPage.jsx";
  const { file, text: original } = read(rel);
  let text = original;

  if (text.includes('const TIPOS = ["Riego", "Alimentación", "Mantenimiento", "Cosecha", "Aplicación"];')) {
    return console.log(`✓ ${rel} ya integrado`);
  }

  text = replaceOnce(
    text,
    'const TIPOS = ["Riego", "Alimentación", "Mantenimiento", "Cosecha"];',
    'const TIPOS = ["Riego", "Alimentación", "Mantenimiento", "Cosecha", "Aplicación"];',
    "tipo Aplicación en Tareas"
  );

  write(file, text);
  console.log(`✓ ${rel}`);
}

try {
  patchFarmWorkspace();
  patchProcessModal();
  patchFarmShell();
  patchDashboard();
  patchTasks();
  console.log("\nAgroMind Fichas Técnicas Beta quedó integrada en el frontend.");
  console.log("Siguiente paso recomendado: npm run check");
} catch (error) {
  console.error("\nABORTADO:", error.message);
  process.exit(1);
}
