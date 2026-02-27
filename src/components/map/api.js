// src/components/map/api.js

export function getAuthToken() {
  return (
    localStorage.getItem("agromind_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("agromind_auth_token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("jwt") ||
    ""
  );
}

export const API_BASE =
  import.meta.env.VITE_API_URL || "https://agromind-backend-slem.onrender.com";

export async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && data.error) ||
      (typeof data === "string" ? data : "Error en request.");
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}