// src/services/calendarService.js

const RAW_API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://agromind-backend-slem.onrender.com";

const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

function getAuthToken() {
  return (
    localStorage.getItem("agromind_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("agromind_auth_token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("jwt") ||
    ""
  );
}

function toYYYYMMDD(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const clean = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

    const d = new Date(clean);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return "";
  }

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function pickFirstDate(...values) {
  for (const value of values) {
    const date = toYYYYMMDD(value);
    if (date) return date;
  }
  return "";
}

function normalizeProcessTitle(process) {
  return (
    process?.name ||
    process?.title ||
    process?.processName ||
    process?.label ||
    "Proceso"
  ).toString();
}

function getStageList(process) {
  const candidates = [
    process?.stages,
    process?.steps,
    process?.phases,
    process?.etapas,
    process?.timeline,
    process?.calendarStages,
  ];

  for (const value of candidates) {
    if (Array.isArray(value) && value.length) return value;
  }

  return [];
}

async function apiFetch(path, options = {}) {
  const token = getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Error ${response.status}`
    );
  }

  return data;
}

/**
 * Obtiene todas las zonas de la finca activa.
 */
export async function loadFarmZones(farmId) {
  if (!farmId) return [];

  const map = await apiFetch(`/api/farms/${farmId}/map`);

  return Array.isArray(map?.zones)
    ? map.zones
    : [];
}

/**
 * Obtiene todos los procesos de una zona.
 */
export async function loadZoneProcesses(zoneId) {
  if (!zoneId) return [];

  const processes = await apiFetch(
    `/api/processes/zone/${zoneId}`
  );

  return Array.isArray(processes)
    ? processes
    : Array.isArray(processes?.processes)
    ? processes.processes
    : Array.isArray(processes?.data)
    ? processes.data
    : [];
}

function buildProcessCalendarItem({ process, zone }) {
  const title = normalizeProcessTitle(process);

  const start = pickFirstDate(
    process?.start,
    process?.startDate,
    process?.startedAt,
    process?.plannedStartDate,
    process?.createdAt
  );

  const due = pickFirstDate(
    process?.due,
    process?.dueDate,
    process?.end,
    process?.endDate,
    process?.targetDate,
    process?.estimatedEndDate,
    process?.plannedEndDate,
    process?.completedAt,
    start
  );

  if (!start) return null;

  return {
    id: process?.id || process?._id || `${zone?.id || "zone"}-${title}-${start}`,
    itemType: "process",
    title,
    zoneId: zone?.id,
    zoneName: zone?.name,
    process,
    editable: false,
    start,
    due: due || start,
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
    textColor: "#ffffff",
    extendedProps: {
      readonly: true,
      source: "process_lab",
      zoneId: zone?.id,
      zoneName: zone?.name,
    },
  };
}

function buildStageCalendarItem({ process, stage, zone, index }) {
  const processTitle = normalizeProcessTitle(process);

  const stageTitle = (
    stage?.name ||
    stage?.title ||
    stage?.label ||
    stage?.stageName ||
    stage?.etapa ||
    `Etapa ${index + 1}`
  ).toString();

  const start = pickFirstDate(
    stage?.start,
    stage?.startDate,
    stage?.startedAt,
    stage?.plannedStartDate,
    stage?.date,
    process?.startDate,
    process?.createdAt
  );

  const due = pickFirstDate(
    stage?.due,
    stage?.dueDate,
    stage?.end,
    stage?.endDate,
    stage?.targetDate,
    stage?.estimatedEndDate,
    stage?.plannedEndDate,
    stage?.completedAt,
    start
  );

  if (!start) return null;

  return {
    id: `${process?.id || process?._id || "process"}-stage-${stage?.id || stage?._id || index}`,
    itemType: "process",
    title: `${processTitle} · ${stageTitle}`,
    zoneId: zone?.id,
    zoneName: zone?.name,
    process,
    stage,
    editable: false,
    start,
    due: due || start,
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
    textColor: "#ffffff",
    extendedProps: {
      readonly: true,
      source: "process_lab",
      scope: "stage",
      processId: process?.id || process?._id,
      stageId: stage?.id || stage?._id || index,
      zoneId: zone?.id,
      zoneName: zone?.name,
    },
  };
}

/**
 * Construye todos los procesos del calendario.
 *
 * IMPORTANTE:
 * Los procesos son SOLO LECTURA.
 * El calendario nunca modifica procesos.
 */
export async function loadCalendarProcesses(farmId) {
  const zones = await loadFarmZones(farmId);

  const calendarProcesses = [];

  for (const zone of zones) {
    const processes = await loadZoneProcesses(zone.id);

    for (const process of processes) {
      const stages = getStageList(process);

      if (stages.length) {
        stages.forEach((stage, index) => {
          const item = buildStageCalendarItem({ process, stage, zone, index });
          if (item) calendarProcesses.push(item);
        });
        continue;
      }

      const item = buildProcessCalendarItem({ process, zone });
      if (item) calendarProcesses.push(item);
    }
  }

  return calendarProcesses;
}

/**
 * Punto único de entrada del Calendario Maestro.
 *
 * Aquí se unirán:
 *
 * - Procesos
 * - Tareas
 * - Eventos agrícolas
 * - Finanzas
 */
export async function loadCalendarItems(farmId) {
  const processItems =
    await loadCalendarProcesses(farmId);

  return [
    ...processItems,
  ];
}
