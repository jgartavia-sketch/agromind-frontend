// src/services/calendarService.js

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://agromind-backend-slem.onrender.com";

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
    : [];
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
      calendarProcesses.push({
        id: process.id,

        itemType: "process",

        title: process.name,

        zoneId: zone.id,

        zoneName: zone.name,

        process,

        editable: false,

        start:
          process.startDate ||
          process.createdAt,

        end:
          process.targetDate ||
          process.completedAt ||
          process.createdAt,

        backgroundColor: "#22c55e",

        borderColor: "#22c55e",

        textColor: "#ffffff",

        extendedProps: {
          readonly: true,
          source: "process_lab",
        },
      });
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