// src/config/api.js
const FALLBACK_API_URL = "https://agromind-backend-slem.onrender.com";

export const API_BASE_URL = String(
  import.meta.env.VITE_API_URL || FALLBACK_API_URL
).replace(/\/+$/, "");

export function assertApiConfigured() {
  if (!API_BASE_URL) {
    throw new Error("No se pudo configurar la URL del API de AgroMind.");
  }
}
