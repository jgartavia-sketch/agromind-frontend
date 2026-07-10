// src/services/bitacoraService.js

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
 * Obtiene todas las entradas de la Bitácora de una finca.
 */
export async function loadBitacoraEntries(farmId) {
  if (!farmId) return [];

  const entries = await apiFetch(
    `/api/farms/${farmId}/bitacora`
  );

  return Array.isArray(entries)
    ? entries
    : Array.isArray(entries?.entries)
    ? entries.entries
    : Array.isArray(entries?.data)
    ? entries.data
    : [];
}

/**
 * Guarda una nueva nota en la Bitácora.
 *
 * insights se mantiene opcional para conservar compatibilidad
 * con la inteligencia desarrollada anteriormente.
 */
export async function createBitacoraEntry({
  farmId,
  text,
  insights = null,
}) {
  if (!farmId) {
    throw new Error("No hay una finca activa.");
  }

  const cleanText = String(text || "").trim();

  if (!cleanText) {
    throw new Error("Escribí una nota antes de guardarla.");
  }

  return apiFetch(
    `/api/farms/${farmId}/bitacora`,
    {
      method: "POST",
      body: JSON.stringify({
        text: cleanText,
        insights,
      }),
    }
  );
}


/**
 * Actualiza únicamente el texto de una nota.
 */
export async function updateBitacoraEntry({
  farmId,
  entryId,
  text,
}) {
  if (!farmId || !entryId) {
    throw new Error("No se pudo identificar la nota.");
  }

  const cleanText = String(text || "").trim();

  if (!cleanText) {
    throw new Error("La nota no puede quedar vacía.");
  }

  return apiFetch(
    `/api/farms/${farmId}/bitacora/${entryId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        text: cleanText,
      }),
    }
  );
}

/**
 * Elimina una nota de la Bitácora.
 */
export async function deleteBitacoraEntry({
  farmId,
  entryId,
}) {
  if (!farmId || !entryId) {
    throw new Error("No se pudo identificar la nota.");
  }

  return apiFetch(
    `/api/farms/${farmId}/bitacora/${entryId}`,
    {
      method: "DELETE",
    }
  );
}
