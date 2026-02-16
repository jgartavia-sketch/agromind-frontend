// src/config/api.js
export const API_BASE_URL = import.meta.env.VITE_API_URL;

export function assertApiConfigured() {
  if (!API_BASE_URL) {
    throw new Error(
      "Falta VITE_API_URL. Configúrala en Vercel (Production) y redeploy."
    );
  }
}
