import { useEffect, useMemo, useState } from "react";


const MAX_COMPONENT_PHOTOS = 5;
const API_BASE =
  import.meta.env.VITE_API_URL || "https://agromind-backend-slem.onrender.com";

function getAuthToken() {
  if (typeof window === "undefined" || !window.localStorage) return "";

  const directKeys = [
    "agromind_token",
    "token",
    "agromind_auth_token",
    "auth_token",
    "jwt",
    "accessToken",
    "access_token",
    "idToken",
    "id_token",
  ];

  for (const key of directKeys) {
    const value = localStorage.getItem(key);
    if (value && value !== "undefined" && value !== "null") {
      return value.replace(/^Bearer\s+/i, "").trim();
    }
  }

  const tokenFieldNames = [
    "token",
    "accessToken",
    "access_token",
    "authToken",
    "auth_token",
    "jwt",
  ];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;

    const rawValue = localStorage.getItem(key);
    if (!rawValue || rawValue === "undefined" || rawValue === "null") continue;

    const trimmed = rawValue.replace(/^Bearer\s+/i, "").trim();

    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) {
      return trimmed;
    }

    try {
      const parsed = JSON.parse(rawValue);
      if (!parsed || typeof parsed !== "object") continue;

      for (const field of tokenFieldNames) {
        const possibleToken = parsed[field];
        if (typeof possibleToken === "string" && possibleToken.trim()) {
          return possibleToken.replace(/^Bearer\s+/i, "").trim();
        }
      }

      if (parsed.user && typeof parsed.user === "object") {
        for (const field of tokenFieldNames) {
          const possibleToken = parsed.user[field];
          if (typeof possibleToken === "string" && possibleToken.trim()) {
            return possibleToken.replace(/^Bearer\s+/i, "").trim();
          }
        }
      }
    } catch {
      // no-op
    }
  }

  return "";
}

function getAuthHeaders(token = getAuthToken()) {
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
    
  };
}

function normalizePhotoUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

async function readApiError(response) {
  let rawText = "";

  try {
    rawText = await response.text();
  } catch {
    rawText = "";
  }

  if (rawText) {
    try {
      const data = JSON.parse(rawText);
      return data?.error || data?.message || `Error ${response.status} en request.`;
    } catch {
      const cleanText = rawText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (cleanText) return cleanText.slice(0, 220);
    }
  }

  return `Error ${response.status || ""} en request.`.trim();
}

function isRouteMissingError(response, message = "") {
  const value = String(message || "").toLowerCase();
  if (response?.status !== 404) return false;

  return (
    value.includes("cannot get") ||
    value.includes("cannot post") ||
    value.includes("cannot delete") ||
    value.includes("not found") ||
    value.includes("failed to load") ||
    value.includes("error 404") ||
    value === "error 404 en request." ||
    value === "error 404 en request"
  );
}

const COMPONENT_PHOTO_ENDPOINTS = [
  "/api/component-photos",
  "/api/component-photos",
];

async function fetchComponentPhotoJson({ method = "GET", suffix = "", token = "", bodyFactory = null }) {
  let lastError = null;

  for (const basePath of COMPONENT_PHOTO_ENDPOINTS) {
    const response = await fetch(`${API_BASE}${basePath}${suffix}`, {
      method,
      headers: getAuthHeaders(token),
      body: typeof bodyFactory === "function" ? bodyFactory() : undefined,
    });

    if (response.ok) {
      return response.status === 204 ? null : response.json();
    }

    const message = await readApiError(response);
    lastError = new Error(message);
    lastError.status = response.status;
    lastError.path = `${basePath}${suffix}`;

    if (!isRouteMissingError(response, message)) {
      throw lastError;
    }
  }

  throw new Error(
    lastError?.message ||
      "No se encontró la ruta de fotografías en el backend. Verificá el deploy de Render."
  );
}

export default function ComponentModal({
  modalZone,
  componentsDraft = [],
  COMPONENT_TYPES = [],
  editingNotesMap = {},
  closeComponentsModal,
  draftAddComponent,
  draftDeleteComponent,
  draftUpdate,
  toggleEditNote,
  saveComponentsModal,
  getComponentIcon,
  getComponentDisplayName,
}) {
  const safeComponents = Array.isArray(componentsDraft) ? componentsDraft : [];
  const totalComponents = safeComponents.length;

  const savedComponentIds = useMemo(() => {
    const savedComponents = Array.isArray(modalZone?.components)
      ? modalZone.components
      : [];

    return new Set(
      savedComponents
        .map((component) => String(component?.id || "").trim())
        .filter(Boolean)
    );
  }, [modalZone]);

  const [expandedComponentId, setExpandedComponentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState("Todos");
  const [hoveredComponentId, setHoveredComponentId] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1200 : window.innerWidth
  );
  const [photosByComponent, setPhotosByComponent] = useState({});
  const [photosLoadingMap, setPhotosLoadingMap] = useState({});
  const [photoUploadingMap, setPhotoUploadingMap] = useState({});
  const [photoErrorMap, setPhotoErrorMap] = useState({});
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [saveBeforePhotoPrompt, setSaveBeforePhotoPrompt] = useState(null);
  const [saveNotice, setSaveNotice] = useState("");

  const isTabletLayout = viewportWidth <= 920;
  const isMobileLayout = viewportWidth <= 640;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const componentTypeOptions = useMemo(() => {
    const baseTypes = Array.isArray(COMPONENT_TYPES) ? COMPONENT_TYPES : [];
    const requiredTypes = [
      "Árbol",
      "Animal",
      "Bebedero",
      "Comedero",
      "Bodega",
      "Lote de cultivo",
      "Pasillo",
      "Área de descanso",
      "Riego",
      "Infraestructura",
      "Otro",
    ];

    return Array.from(
      new Set(
        [...baseTypes, ...requiredTypes]
          .map((type) => String(type || "").trim())
          .filter(Boolean)
      )
    );
  }, [COMPONENT_TYPES]);

  const resolveIcon = (type) => {
    if (typeof getComponentIcon === "function") return getComponentIcon(type);

    const value = String(type || "Otro").toLowerCase();
    if (value.includes("animal")) return "🐄";
    if (
      value.includes("árbol") ||
      value.includes("arbol") ||
      value.includes("aguacate") ||
      value.includes("frutal")
    ) {
      return "🌳";
    }
    if (value.includes("cultivo") || value.includes("lote")) return "🌱";
    if (value.includes("bebedero") || value.includes("riego")) return "💧";
    if (value.includes("comedero")) return "🌾";
    if (value.includes("bodega") || value.includes("infraestructura")) return "🏠";
    if (value.includes("pasillo")) return "↔️";
    if (value.includes("descanso")) return "🟢";
    return "📍";
  };

  const resolveDisplayName = (component, index) => {
    if (typeof getComponentDisplayName === "function") {
      return getComponentDisplayName(component, index);
    }

    const name = String(component?.name || "").trim();
    if (name) return name;

    const type = String(component?.type || "Componente").trim() || "Componente";
    return `${type} #${index + 1}`;
  };

  const typeCounts = useMemo(() => {
    const counts = {};
    safeComponents.forEach((component) => {
      const type = String(component?.type || "Otro").trim() || "Otro";
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [safeComponents]);

  const availableFilterTypes = useMemo(() => {
    const currentTypes = Object.keys(typeCounts);
    return ["Todos", ...currentTypes];
  }, [typeCounts]);

  const filteredComponents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return safeComponents.filter((component, index) => {
      const name = resolveDisplayName(component, index).toLowerCase();
      const type = String(component?.type || "Otro").toLowerCase();
      const note = String(component?.note || "").toLowerCase();

      const matchesSearch = !query || name.includes(query) || type.includes(query) || note.includes(query);
      const matchesType = activeTypeFilter === "Todos" || String(component?.type || "Otro") === activeTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [safeComponents, searchTerm, activeTypeFilter]);

  const componentIconPreview = useMemo(
    () =>
      safeComponents.slice(0, 16).map((component, index) => ({
        key: component?.id || `component-icon-${index}`,
        icon: resolveIcon(component?.type),
        label: resolveDisplayName(component, index),
      })),
    [safeComponents]
  );

  const remainingIconCount = Math.max(totalComponents - componentIconPreview.length, 0);
  const topTypes = Object.entries(typeCounts).slice(0, 6);
  const hasActiveFilters = searchTerm.trim() || activeTypeFilter !== "Todos";

  const componentIdsSignature = useMemo(
    () =>
      safeComponents
        .map((component) => String(component?.id || ""))
        .filter(Boolean)
        .sort()
        .join("|"),
    [safeComponents]
  );

  const totalZonePhotos = useMemo(() => {
    return safeComponents.reduce((total, component) => {
      const componentId = component?.id;
      if (!componentId) return total;
      const photos = photosByComponent[componentId];
      return total + (Array.isArray(photos) ? photos.length : 0);
    }, 0);
  }, [safeComponents, photosByComponent]);

  const totalZonePhotosLabel =
    totalZonePhotos === 0
      ? "Sin fotografías"
      : `${totalZonePhotos} ${totalZonePhotos === 1 ? "fotografía" : "fotografías"}`;

  useEffect(() => {
    if (safeComponents.length === 0) {
      setExpandedComponentId(null);
      return;
    }

    if (!expandedComponentId) return;

    const expandedStillExists = safeComponents.some(
      (component) => component?.id === expandedComponentId
    );

    if (!expandedStillExists) {
      setExpandedComponentId(null);
    }
  }, [safeComponents, expandedComponentId]);

  const handleToggleExpanded = (componentId) => {
    setExpandedComponentId((prev) => {
      const next = prev === componentId ? null : componentId;
      if (next) loadComponentPhotos(next);
      return next;
    });
  };

  const handleAddComponent = () => {
    const beforeIds = new Set(safeComponents.map((component) => component?.id));
    draftAddComponent();

    setTimeout(() => {
      const newest = (Array.isArray(componentsDraft) ? componentsDraft : []).find(
        (component) => component?.id && !beforeIds.has(component.id)
      );
      if (newest?.id) setExpandedComponentId(newest.id);
    }, 0);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setActiveTypeFilter("Todos");
  };

  const isComponentSavedForPhotos = (component) => {
    const componentId = String(component?.id || "").trim();
    if (!componentId) return false;
    return savedComponentIds.has(componentId);
  };

  const openSaveBeforePhotoPrompt = (component) => {
    if (!component?.id) return;

    const componentIndex = safeComponents.findIndex(
      (item) => item?.id === component.id
    );

    setSaveBeforePhotoPrompt({
      id: component.id,
      name: resolveDisplayName(component, componentIndex >= 0 ? componentIndex : 0),
    });
  };

  const closeSaveBeforePhotoPrompt = () => {
    setSaveBeforePhotoPrompt(null);
  };

  const handleSaveWithoutClosing = async () => {
    try {
      const result = saveComponentsModal?.({
        keepOpen: true,
        stayOpen: true,
        source: "component-lab",
      });

      if (result && typeof result.then === "function") {
        await result;
      }

      setSaveNotice("✓ Cambios guardados. Puedes continuar en Component Lab.");
      window.setTimeout(() => setSaveNotice(""), 3200);
    } catch (error) {
      setSaveNotice("No se pudieron guardar los cambios. Intenta nuevamente.");
      window.setTimeout(() => setSaveNotice(""), 4200);
    }
  };

  const handleSaveComponentBeforePhoto = async () => {
    setSaveBeforePhotoPrompt(null);
    await handleSaveWithoutClosing();
  };

  const setPhotoError = (componentId, message = "") => {
    setPhotoErrorMap((prev) => ({ ...prev, [componentId]: message }));
  };

  const loadComponentPhotos = async (componentId, options = {}) => {
    if (!modalZone?.id || !componentId) return;
    if (!options.force && photosByComponent[componentId]) return;

    try {
      setPhotosLoadingMap((prev) => ({ ...prev, [componentId]: true }));
      setPhotoError(componentId, "");

      const token = getAuthToken();
      const data = await fetchComponentPhotoJson({
        method: "GET",
        suffix: `/${modalZone.id}/${componentId}`,
        token,
      });
      setPhotosByComponent((prev) => ({
        ...prev,
        [componentId]: Array.isArray(data?.photos) ? data.photos : [],
      }));
    } catch (error) {
      setPhotoError(
        componentId,
        error?.message || "No se pudieron cargar las fotografías."
      );
    } finally {
      setPhotosLoadingMap((prev) => ({ ...prev, [componentId]: false }));
    }
  };

  useEffect(() => {
    if (!modalZone?.id || !componentIdsSignature) return undefined;

    let cancelled = false;
    const token = getAuthToken();
    const componentIds = componentIdsSignature.split("|").filter(Boolean);

    componentIds.forEach(async (componentId) => {
      if (photosByComponent[componentId]) return;

      try {
        setPhotosLoadingMap((prev) => ({ ...prev, [componentId]: true }));

        const data = await fetchComponentPhotoJson({
          method: "GET",
          suffix: `/${modalZone.id}/${componentId}`,
          token,
        });

        if (cancelled) return;

        setPhotosByComponent((prev) => ({
          ...prev,
          [componentId]: Array.isArray(data?.photos) ? data.photos : [],
        }));
      } catch {
        if (cancelled) return;

        setPhotosByComponent((prev) =>
          prev[componentId] ? prev : { ...prev, [componentId]: [] }
        );
      } finally {
        if (!cancelled) {
          setPhotosLoadingMap((prev) => ({ ...prev, [componentId]: false }));
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [modalZone?.id, componentIdsSignature]);

  const handlePhotoInputChange = async (componentId, event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";

    if (!file || !modalZone?.id || !componentId) return;

    const component = safeComponents.find((item) => item?.id === componentId);
    if (!isComponentSavedForPhotos(component)) {
      openSaveBeforePhotoPrompt(component);
      return;
    }

    const currentPhotos = photosByComponent[componentId] || [];
    if (currentPhotos.length >= MAX_COMPONENT_PHOTOS) {
      setPhotoError(componentId, `Máximo ${MAX_COMPONENT_PHOTOS} fotos por componente.`);
      return;
    }

    try {
      setPhotoUploadingMap((prev) => ({ ...prev, [componentId]: true }));
      setPhotoError(componentId, "");

      const token = getAuthToken();
      const data = await fetchComponentPhotoJson({
        method: "POST",
        suffix: `/${modalZone.id}/${componentId}`,
        token,
        bodyFactory: () => {
          const formData = new FormData();
          formData.append("photo", file);
          return formData;
        },
      });
      if (data?.photo) {
        setPhotosByComponent((prev) => ({
          ...prev,
          [componentId]: [data.photo, ...(prev[componentId] || [])].slice(
            0,
            MAX_COMPONENT_PHOTOS
          ),
        }));
      } else {
        await loadComponentPhotos(componentId, { force: true });
      }
    } catch (error) {
      setPhotoError(componentId, error?.message || "No se pudo subir la foto.");
    } finally {
      setPhotoUploadingMap((prev) => ({ ...prev, [componentId]: false }));
    }
  };

  const handleDeletePhoto = async (componentId, photo) => {
    if (!componentId || !photo?.id) return;

    const ok = window.confirm("¿Eliminar esta fotografía del componente?");
    if (!ok) return;

    try {
      setPhotoError(componentId, "");
      const token = getAuthToken();
      await fetchComponentPhotoJson({
        method: "DELETE",
        suffix: `/${photo.id}`,
        token,
      });

      setPhotosByComponent((prev) => ({
        ...prev,
        [componentId]: (prev[componentId] || []).filter((item) => item.id !== photo.id),
      }));

      setPreviewPhoto((current) => (current?.id === photo.id ? null : current));
    } catch (error) {
      setPhotoError(componentId, error?.message || "No se pudo eliminar la foto.");
    }
  };

  const handleComponentCardMouseMove = (event) => {
    const card = event.currentTarget;
    if (!card || typeof card.getBoundingClientRect !== "function") return;

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    card.style.setProperty("--component-glow-x", `${x}px`);
    card.style.setProperty("--component-glow-y", `${y}px`);
  };

  return (
    <div
      className="component-lab-shell"
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobileLayout ? "8px" : "16px",
      }}
    >
      <div
        onClick={closeComponentsModal}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at top, rgba(34,197,94,0.13), transparent 36%), rgba(0,0,0,0.62)",
          backdropFilter: "blur(5px)",
        }}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: isMobileLayout ? "100%" : "min(1080px, 100%)",
          maxHeight: isMobileLayout ? "calc(100dvh - 16px)" : "min(88vh, 900px)",
          background:
            "linear-gradient(145deg, rgba(2,6,23,0.98), rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.22)",
          borderRadius: isMobileLayout ? "18px" : "24px",
          boxShadow:
            "0 28px 90px rgba(0,0,0,0.62), 0 0 0 1px rgba(34,197,94,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div
          style={{
            position: "relative",
            padding: isMobileLayout ? "18px 12px 16px" : "20px 18px 18px",
            borderBottom: "1px solid rgba(148,163,184,0.16)",
            background:
              "linear-gradient(135deg, rgba(6,78,59,0.48), rgba(15,23,42,0.86) 58%, rgba(2,6,23,0.92))",
            overflow: "visible",
            flexShrink: 0,
            zIndex: 2,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-90px",
              right: "-90px",
              width: "220px",
              height: "220px",
              borderRadius: "999px",
              background: "rgba(34,197,94,0.12)",
              filter: "blur(4px)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: isMobileLayout ? "column" : "row",
              alignItems: isMobileLayout ? "stretch" : "flex-start",
              justifyContent: "space-between",
              gap: isMobileLayout ? "12px" : "14px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "16px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(34,197,94,0.34)",
                    background:
                      "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(20,184,166,0.08))",
                    color: "#bbf7d0",
                    fontWeight: 950,
                    boxShadow: "0 0 32px rgba(34,197,94,0.13)",
                  }}
                >
                  CL
                </span>

                <div style={{ minWidth: 0 }}>
                  <h3
                    style={{
                      margin: 0,
                      color: "#f8fafc",
                      fontSize: "1.08rem",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Component Lab
                  </h3>
                  <div
                    style={{
                      marginTop: "0.22rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="zone-tag">{modalZone?.name || "Zona"}</span>
                    <span
                      style={{
                        color: "rgba(226,232,240,0.64)",
                        fontSize: "0.82rem",
                      }}
                    >
                      Inventario visual simple, listo para crecer.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="secondary-btn"
              onClick={closeComponentsModal}
              style={{ padding: "0.38rem 0.68rem", alignSelf: isMobileLayout ? "flex-end" : "auto" }}
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        <div
          style={{
            padding: isMobileLayout ? "12px" : "16px",
            overflow: "auto",
            minHeight: 0,
            WebkitOverflowScrolling: "touch",
          }}
        >
          <section
            style={{
              border: "1px solid rgba(34,197,94,0.22)",
              background:
                "linear-gradient(135deg, rgba(6,78,59,0.28), rgba(15,23,42,0.86))",
              borderRadius: isMobileLayout ? "18px" : "22px",
              padding: isMobileLayout ? "12px" : "16px",
              marginBottom: "14px",
              boxShadow: "0 20px 55px rgba(0,0,0,0.24)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobileLayout
                  ? "1fr"
                  : "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "12px",
              }}
            >
              <div
                style={{
                  border: "1px solid rgba(148,163,184,0.17)",
                  background: "rgba(2,6,23,0.36)",
                  borderRadius: "18px",
                  padding: "13px",
                }}
              >
                <div style={{ color: "rgba(226,232,240,0.62)", fontSize: "0.78rem" }}>
                  Componentes
                </div>
                <div
                  style={{
                    marginTop: "0.24rem",
                    color: "#f8fafc",
                    fontSize: "1.65rem",
                    fontWeight: 950,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {totalComponents}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid rgba(148,163,184,0.17)",
                  background: "rgba(2,6,23,0.36)",
                  borderRadius: "18px",
                  padding: "13px",
                }}
              >
                <div style={{ color: "rgba(226,232,240,0.62)", fontSize: "0.78rem" }}>
                  Modelo
                </div>
                <div
                  style={{
                    marginTop: "0.34rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: "#bbf7d0", fontSize: "0.94rem", fontWeight: 950 }}>
                    Inventario visual
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: "4px",
                      flexWrap: "wrap",
                      maxWidth: "100%",
                    }}
                    aria-label="Vista rápida de tipos de componentes"
                  >
                    {componentIconPreview.length > 0 ? (
                      componentIconPreview.map((item) => (
                        <span
                          key={item.key}
                          title={item.label}
                          style={{
                            width: "25px",
                            height: "25px",
                            borderRadius: "999px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid rgba(34,197,94,0.24)",
                            background: "rgba(34,197,94,0.10)",
                            fontSize: "0.78rem",
                            boxShadow: "0 0 16px rgba(34,197,94,0.08)",
                          }}
                        >
                          {item.icon}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: "rgba(226,232,240,0.52)", fontSize: "0.78rem" }}>
                        Sin iconos aún
                      </span>
                    )}

                    {remainingIconCount > 0 ? (
                      <span
                        style={{
                          minWidth: "25px",
                          height: "25px",
                          padding: "0 7px",
                          borderRadius: "999px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(148,163,184,0.22)",
                          background: "rgba(15,23,42,0.62)",
                          color: "#bbf7d0",
                          fontSize: "0.72rem",
                          fontWeight: 950,
                        }}
                      >
                        +{remainingIconCount}
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>

              <div
                style={{
                  border: "1px solid rgba(148,163,184,0.17)",
                  background: "rgba(2,6,23,0.36)",
                  borderRadius: "18px",
                  padding: "13px",
                }}
              >
                <div style={{ color: "rgba(226,232,240,0.62)", fontSize: "0.78rem" }}>
                  Zona actual
                </div>
                <div
                  style={{
                    marginTop: "0.36rem",
                    color: "#e5e7eb",
                    fontSize: "0.92rem",
                    fontWeight: 900,
                  }}
                >
                  📸 Registro fotográfico
                </div>
                <div
                  style={{
                    marginTop: "0.28rem",
                    color: totalZonePhotos > 0 ? "#bbf7d0" : "rgba(226,232,240,0.58)",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                  }}
                >
                  {totalZonePhotosLabel}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "12px",
                display: "flex",
                gap: "10px",
                alignItems: isMobileLayout ? "stretch" : "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: isMobileLayout ? "100%" : "auto" }}>
                {topTypes.length > 0 ? (
                  topTypes.map(([type, count]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActiveTypeFilter(type)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.38rem",
                        padding: "0.35rem 0.62rem",
                        borderRadius: "999px",
                        border:
                          activeTypeFilter === type
                            ? "1px solid rgba(34,197,94,0.42)"
                            : "1px solid rgba(148,163,184,0.18)",
                        background:
                          activeTypeFilter === type
                            ? "rgba(34,197,94,0.13)"
                            : "rgba(15,23,42,0.50)",
                        color: activeTypeFilter === type ? "#bbf7d0" : "rgba(226,232,240,0.82)",
                        fontSize: "0.76rem",
                        fontWeight: 850,
                        cursor: "pointer",
                      }}
                    >
                      <span>{resolveIcon(type)}</span>
                      <span>{type}</span>
                      <strong>{count}</strong>
                    </button>
                  ))
                ) : (
                  <span style={{ color: "rgba(226,232,240,0.55)", fontSize: "0.82rem" }}>
                    Los tipos aparecerán aquí cuando agregues componentes.
                  </span>
                )}
              </div>

              <button type="button" className="primary-btn" onClick={handleAddComponent} style={{ width: isMobileLayout ? "100%" : "auto", justifyContent: "center" }}>
                + Nuevo componente
              </button>
            </div>
          </section>

          <section
            style={{
              display: "flex",
              flexDirection: isMobileLayout ? "column" : "row",
              alignItems: isMobileLayout ? "stretch" : "center",
              justifyContent: "space-between",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                flex: "1 1 280px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0.55rem 0.72rem",
                borderRadius: "999px",
                border: "1px solid rgba(148,163,184,0.18)",
                background: "rgba(2,6,23,0.42)",
              }}
            >
              <span style={{ color: "rgba(226,232,240,0.56)" }}>🔍</span>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, tipo o nota..."
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "#e5e7eb",
                  fontSize: "0.88rem",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: isMobileLayout ? "100%" : "auto" }}>
              {availableFilterTypes.slice(0, 8).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveTypeFilter(type)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.32rem",
                    padding: "0.46rem 0.72rem",
                    borderRadius: "999px",
                    border:
                      activeTypeFilter === type
                        ? "1px solid rgba(34,197,94,0.40)"
                        : "1px solid rgba(148,163,184,0.17)",
                    background:
                      activeTypeFilter === type
                        ? "rgba(34,197,94,0.12)"
                        : "rgba(15,23,42,0.42)",
                    color: activeTypeFilter === type ? "#bbf7d0" : "rgba(226,232,240,0.78)",
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    fontWeight: 850,
                  }}
                >
                  {type !== "Todos" ? <span>{resolveIcon(type)}</span> : null}
                  <span>{type}</span>
                </button>
              ))}
            </div>
          </section>

          {totalComponents === 0 ? (
            <div
              style={{
                border: "1px dashed rgba(148,163,184,0.28)",
                background:
                  "linear-gradient(135deg, rgba(15,23,42,0.45), rgba(6,78,59,0.16))",
                borderRadius: "20px",
                padding: "20px",
                color: "rgba(226,232,240,0.74)",
              }}
            >
              <strong style={{ color: "#e5e7eb" }}>Aún no hay componentes.</strong>
              <div style={{ marginTop: "0.35rem" }}>
                Agregá árboles, animales, camas, tanques, bodegas, pasillos o cualquier elemento que exista en la zona.
              </div>
            </div>
          ) : filteredComponents.length === 0 ? (
            <div
              style={{
                border: "1px dashed rgba(148,163,184,0.26)",
                background: "rgba(15,23,42,0.38)",
                borderRadius: "18px",
                padding: "18px",
                color: "rgba(226,232,240,0.72)",
              }}
            >
              No encontré componentes con esos filtros.
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={resetFilters}
                  style={{ marginLeft: "10px", padding: "0.28rem 0.55rem" }}
                >
                  Limpiar filtros
                </button>
              ) : null}
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {filteredComponents.map((comp) => {
                const realIndex = safeComponents.findIndex((item) => item?.id === comp?.id);
                const index = realIndex >= 0 ? realIndex : 0;
                const isEditingNote = editingNotesMap?.[comp.id] === true;
                const noteText = String(comp.note || "").trim();
                const displayName = resolveDisplayName(comp, index);
                const icon = resolveIcon(comp.type);
                const isExpanded = expandedComponentId === comp.id;
                const isHovered = hoveredComponentId === comp.id;
                const compPhotos = photosByComponent[comp.id] || [];
                const compPhotosCount = compPhotos.length;
                const isPhotosLoading = photosLoadingMap[comp.id] === true;
                const isPhotoUploading = photoUploadingMap[comp.id] === true;
                const photoError = photoErrorMap[comp.id] || "";
                const isSavedForPhotos = isComponentSavedForPhotos(comp);
                const canAddPhoto =
                  isSavedForPhotos &&
                  compPhotosCount < MAX_COMPONENT_PHOTOS &&
                  !isPhotoUploading;

                return (
                  <article
                    key={comp.id}
                    style={{
                      "--component-glow-x": "50%",
                      "--component-glow-y": "50%",
                      position: "relative",
                      margin: 0,
                      borderRadius: isMobileLayout ? "17px" : "20px",
                      border:
                        isExpanded || isHovered
                          ? "1px solid rgba(34,197,94,0.44)"
                          : "1px solid rgba(148,163,184,0.18)",
                      background: isExpanded
                        ? "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(6,78,59,0.34))"
                        : isHovered
                        ? "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(20,184,166,0.18), rgba(6,78,59,0.16))"
                        : "linear-gradient(135deg, rgba(15,23,42,0.94), rgba(8,47,73,0.16))",
                      boxShadow: isExpanded
                        ? "0 24px 60px rgba(0,0,0,0.34), 0 0 44px rgba(34,197,94,0.16), inset 0 0 0 1px rgba(34,197,94,0.06)"
                        : isHovered
                        ? "0 22px 54px rgba(0,0,0,0.30), 0 0 40px rgba(34,197,94,0.13), inset 0 1px 0 rgba(255,255,255,0.04)"
                        : "0 12px 30px rgba(0,0,0,0.17)",
                      overflow: "hidden",
                      transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                      transition:
                        "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease",
                    }}
                    onMouseEnter={() => setHoveredComponentId(comp.id)}
                    onMouseMove={handleComponentCardMouseMove}
                    onMouseLeave={() =>
                      setHoveredComponentId((prev) => (prev === comp.id ? null : prev))
                    }
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        opacity: isExpanded || isHovered ? 1 : 0,
                        background:
                          "radial-gradient(420px circle at var(--component-glow-x) var(--component-glow-y), rgba(255,255,255,0.16), rgba(34,197,94,0.13) 18%, rgba(20,184,166,0.08) 32%, transparent 58%), radial-gradient(circle at 16% 0%, rgba(34,197,94,0.16), transparent 34%), radial-gradient(circle at 92% 18%, rgba(20,184,166,0.12), transparent 28%)",
                        transition: "opacity 180ms ease",
                        mixBlendMode: "screen",
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => handleToggleExpanded(comp.id)}
                      style={{
                        position: "relative",
                        zIndex: 1,
                        width: "100%",
                        border: "none",
                        background: "transparent",
                        color: "inherit",
                        cursor: "pointer",
                        padding: isMobileLayout ? "13px" : "15px",
                        display: "grid",
                        gridTemplateColumns: "auto minmax(0, 1fr) auto",
                        gap: "12px",
                        alignItems: "center",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "999px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(34,197,94,0.26)",
                          background:
                            "linear-gradient(135deg, rgba(34,197,94,0.14), rgba(20,184,166,0.06))",
                          fontSize: "1.08rem",
                          boxShadow:
                            isExpanded || isHovered
                              ? "0 0 34px rgba(34,197,94,0.20), inset 0 1px 0 rgba(255,255,255,0.06)"
                              : "none",
                        }}
                      >
                        {icon}
                      </span>

                      <span style={{ minWidth: 0 }}>
                        <span
                          style={{
                            display: "block",
                            color: "#f8fafc",
                            fontSize: "0.99rem",
                            fontWeight: 950,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {displayName}
                        </span>

                        <span
                          style={{
                            marginTop: "0.32rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.48rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.34rem",
                              padding: "0.25rem 0.54rem",
                              borderRadius: "999px",
                              border: "1px solid rgba(148,163,184,0.18)",
                              background: "rgba(2,6,23,0.38)",
                              color: "rgba(226,232,240,0.80)",
                              fontSize: "0.74rem",
                              fontWeight: 850,
                            }}
                          >
                            <span>{icon}</span>
                            <span>{comp.type || "Otro"}</span>
                          </span>

                          <span
                            style={{
                              color: noteText ? "rgba(187,247,208,0.86)" : "rgba(226,232,240,0.48)",
                              fontSize: "0.76rem",
                              fontWeight: 750,
                            }}
                          >
                            {noteText ? "Con nota" : "Sin nota"}
                          </span>

                          <span
                            style={{
                              color: "rgba(226,232,240,0.44)",
                              fontSize: "0.76rem",
                              fontWeight: 750,
                            }}
                          >
                            📷 {compPhotosCount}/{MAX_COMPONENT_PHOTOS}
                          </span>
                        </span>
                      </span>

                      <span
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "999px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: isExpanded
                            ? "1px solid rgba(34,197,94,0.38)"
                            : "1px solid rgba(148,163,184,0.16)",
                          background: isExpanded ? "rgba(34,197,94,0.13)" : "rgba(2,6,23,0.44)",
                          color: isExpanded ? "#86efac" : "#cbd5e1",
                          fontWeight: 950,
                          transition: "transform 180ms ease, background 180ms ease, border-color 180ms ease",
                          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        }}
                        title={isExpanded ? "Contraer" : "Expandir"}
                      >
                        ›
                      </span>
                    </button>

                    {isExpanded ? (
                      <div
                        style={{
                          position: "relative",
                          zIndex: 1,
                          padding: "0 15px 15px",
                          borderTop: "1px dashed rgba(148,163,184,0.18)",
                          animation: "componentLabFadeIn 160ms ease",
                        }}
                      >
                        <div
                          className="component-lab-edit-grid"
                          style={{
                            display: "grid",
                            gridTemplateColumns: isTabletLayout
                              ? "1fr"
                              : "minmax(180px, 1fr) minmax(160px, 0.58fr)",
                            gap: "10px",
                            paddingTop: "14px",
                          }}
                        >
                          <input
                            className="farm-feature-input"
                            value={comp.name}
                            onChange={(e) => draftUpdate(comp.id, { name: e.target.value })}
                            placeholder="Nombre del componente (ej: Aguacate #4, Tanque principal)"
                          />

                          <select
                            className="component-type-select"
                            value={comp.type || "Otro"}
                            onChange={(e) => draftUpdate(comp.id, { type: e.target.value })}
                          >
                            {componentTypeOptions.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>

                        <section
                          style={{
                            marginTop: "12px",
                            border: "1px solid rgba(34,197,94,0.18)",
                            background:
                              "linear-gradient(135deg, rgba(2,6,23,0.40), rgba(6,78,59,0.16))",
                            borderRadius: "16px",
                            padding: "12px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: isMobileLayout ? "stretch" : "center",
                              justifyContent: "space-between",
                              gap: "10px",
                              flexDirection: isMobileLayout ? "column" : "row",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  color: "#e5e7eb",
                                  fontSize: "0.86rem",
                                  fontWeight: 950,
                                }}
                              >
                                📷 Evidencia fotográfica
                              </div>
                              <div
                                style={{
                                  marginTop: "0.2rem",
                                  color: "rgba(226,232,240,0.58)",
                                  fontSize: "0.76rem",
                                }}
                              >
                                {isPhotosLoading
                                  ? "Cargando fotografías..."
                                  : `${compPhotosCount}/${MAX_COMPONENT_PHOTOS} fotografías guardadas`}
                              </div>
                            </div>

                            {isSavedForPhotos ? (
                              <label
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minHeight: "40px",
                                  padding: "0.48rem 0.72rem",
                                  borderRadius: "999px",
                                  border: canAddPhoto
                                    ? "1px solid rgba(34,197,94,0.36)"
                                    : "1px solid rgba(148,163,184,0.18)",
                                  background: canAddPhoto
                                    ? "rgba(34,197,94,0.12)"
                                    : "rgba(15,23,42,0.55)",
                                  color: canAddPhoto
                                    ? "#bbf7d0"
                                    : "rgba(226,232,240,0.48)",
                                  fontSize: "0.8rem",
                                  fontWeight: 900,
                                  cursor: canAddPhoto ? "pointer" : "not-allowed",
                                  width: isMobileLayout ? "100%" : "auto",
                                }}
                                title={
                                  canAddPhoto
                                    ? "Tomar o subir fotografía"
                                    : "Máximo de fotografías alcanzado"
                                }
                              >
                                {isPhotoUploading
                                  ? "Subiendo..."
                                  : canAddPhoto
                                  ? "+ Agregar fotografía"
                                  : "Máximo alcanzado"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={!canAddPhoto}
                                  onChange={(event) => handlePhotoInputChange(comp.id, event)}
                                  style={{ display: "none" }}
                                />
                              </label>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openSaveBeforePhotoPrompt(comp)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minHeight: "40px",
                                  padding: "0.48rem 0.72rem",
                                  borderRadius: "999px",
                                  border: "1px solid rgba(250,204,21,0.28)",
                                  background: "rgba(250,204,21,0.10)",
                                  color: "#fde68a",
                                  fontSize: "0.8rem",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                  width: isMobileLayout ? "100%" : "auto",
                                }}
                                title="Guarda el componente antes de agregar fotografías"
                              >
                                + Agregar fotografía
                              </button>
                            )}
                          </div>

                          {photoError ? (
                            <div
                              style={{
                                marginTop: "10px",
                                padding: "0.58rem 0.7rem",
                                borderRadius: "12px",
                                border: "1px solid rgba(248,113,113,0.24)",
                                background: "rgba(248,113,113,0.08)",
                                color: "#fecaca",
                                fontSize: "0.78rem",
                              }}
                            >
                              {photoError}
                            </div>
                          ) : null}

                          {compPhotos.length > 0 ? (
                            <div
                              style={{
                                marginTop: "12px",
                                display: "grid",
                                gridTemplateColumns: isMobileLayout
                                  ? "repeat(2, minmax(0, 1fr))"
                                  : "repeat(auto-fill, minmax(112px, 1fr))",
                                gap: "10px",
                              }}
                            >
                              {compPhotos.map((photo) => {
                                const photoUrl = normalizePhotoUrl(photo.url);
                                return (
                                  <div
                                    key={photo.id}
                                    style={{
                                      position: "relative",
                                      borderRadius: "14px",
                                      overflow: "hidden",
                                      border: "1px solid rgba(148,163,184,0.18)",
                                      background: "rgba(2,6,23,0.44)",
                                      aspectRatio: "1 / 1",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setPreviewPhoto(photo)}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        padding: 0,
                                        border: "none",
                                        background: "transparent",
                                        cursor: "zoom-in",
                                      }}
                                      title="Ver fotografía"
                                    >
                                      <img
                                        src={photoUrl}
                                        alt="Evidencia del componente"
                                        loading="lazy"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          display: "block",
                                          objectFit: "cover",
                                        }}
                                      />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeletePhoto(comp.id, photo)}
                                      style={{
                                        position: "absolute",
                                        top: "7px",
                                        right: "7px",
                                        width: "30px",
                                        height: "30px",
                                        borderRadius: "999px",
                                        border: "1px solid rgba(248,113,113,0.32)",
                                        background: "rgba(2,6,23,0.76)",
                                        color: "#fecaca",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: "0 10px 22px rgba(0,0,0,0.32)",
                                      }}
                                      title="Eliminar fotografía"
                                    >
                                      🗑
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : !isPhotosLoading ? (
                            <div
                              style={{
                                marginTop: "12px",
                                border: "1px dashed rgba(148,163,184,0.20)",
                                background: "rgba(2,6,23,0.25)",
                                borderRadius: "14px",
                                padding: "11px 12px",
                                color: "rgba(226,232,240,0.58)",
                                fontSize: "0.8rem",
                              }}
                            >
                              Sin fotos todavía. Desde celular podés tomar una foto directa.
                            </div>
                          ) : null}
                        </section>

                        <div style={{ marginTop: "12px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "10px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.82rem",
                                color: "rgba(226,232,240,0.72)",
                                fontWeight: 850,
                              }}
                            >
                              Nota simple
                            </span>

                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => toggleEditNote(comp.id)}
                              style={{ padding: "0.25rem 0.55rem" }}
                              title={isEditingNote ? "Cerrar edición" : "Editar nota"}
                            >
                              ✏️ {isEditingNote ? "Listo" : "Editar"}
                            </button>
                          </div>

                          {isEditingNote ? (
                            <textarea
                              className="farm-feature-textarea"
                              value={comp.note}
                              onChange={(e) => draftUpdate(comp.id, { note: e.target.value })}
                              placeholder="Nota breve del componente (ej: árbol joven, pendiente de revisión, cerca del riego...)"
                              rows={3}
                            />
                          ) : (
                            <div
                              style={{
                                marginTop: "8px",
                                padding: "11px 12px",
                                borderRadius: "14px",
                                border: "1px solid rgba(148,163,184,0.16)",
                                background: "rgba(2,6,23,0.36)",
                                color: noteText ? "#e5e7eb" : "rgba(226,232,240,0.50)",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {noteText || "Sin nota. Podés dejarlo así o agregar una observación rápida."}
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            marginTop: "12px",
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            type="button"
                            className="danger-link"
                            onClick={() => draftDeleteComponent(comp.id)}
                          >
                            Borrar componente
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {saveNotice ? (
          <div
            style={{
              margin: isMobileLayout ? "0 12px 10px" : "0 16px 10px",
              padding: "0.62rem 0.78rem",
              borderRadius: "13px",
              border: saveNotice.startsWith("✓")
                ? "1px solid rgba(34,197,94,0.24)"
                : "1px solid rgba(248,113,113,0.24)",
              background: saveNotice.startsWith("✓")
                ? "rgba(34,197,94,0.10)"
                : "rgba(248,113,113,0.08)",
              color: saveNotice.startsWith("✓") ? "#bbf7d0" : "#fecaca",
              fontSize: "0.82rem",
              fontWeight: 850,
            }}
          >
            {saveNotice}
          </div>
        ) : null}

        <div
          style={{
            padding: "13px 16px",
            borderTop: "1px solid rgba(148,163,184,0.16)",
            background: "rgba(2,6,23,0.42)",
            display: "flex",
            alignItems: isMobileLayout ? "stretch" : "center",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          <div style={{ color: "rgba(226,232,240,0.58)", fontSize: "0.8rem" }}>
            {filteredComponents.length} visible{filteredComponents.length === 1 ? "" : "s"} · {totalComponents} total
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", width: isMobileLayout ? "100%" : "auto" }}>
            <button type="button" className="secondary-btn" onClick={closeComponentsModal} style={{ flex: isMobileLayout ? "1 1 100%" : "0 0 auto", justifyContent: "center" }}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={handleSaveWithoutClosing}
              style={{ flex: isMobileLayout ? "1 1 100%" : "0 0 auto", justifyContent: "center" }}
            >
              Guardar cambios
            </button>
          </div>
        </div>
      </div>

      {saveBeforePhotoPrompt ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeSaveBeforePhotoPrompt}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10020,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobileLayout ? "14px" : "24px",
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(5px)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(430px, 100%)",
              borderRadius: "20px",
              border: "1px solid rgba(250,204,21,0.24)",
              background:
                "linear-gradient(135deg, rgba(2,6,23,0.98), rgba(113,63,18,0.30))",
              boxShadow: "0 24px 80px rgba(0,0,0,0.58)",
              padding: isMobileLayout ? "16px" : "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  color: "#f8fafc",
                  fontSize: "1rem",
                  fontWeight: 950,
                }}
              >
                📸 Primero guarda el componente
              </h4>
              <button
                type="button"
                className="secondary-btn"
                onClick={closeSaveBeforePhotoPrompt}
                style={{ padding: "0.32rem 0.62rem" }}
                title="Cancelar"
              >
                ✕
              </button>
            </div>

            <p
              style={{
                margin: "12px 0 0",
                color: "rgba(226,232,240,0.74)",
                fontSize: "0.88rem",
                lineHeight: 1.55,
              }}
            >
              Para agregar evidencias fotográficas, primero debes guardar este componente.
            </p>

            {saveBeforePhotoPrompt?.name ? (
              <div
                style={{
                  marginTop: "12px",
                  padding: "0.62rem 0.72rem",
                  borderRadius: "14px",
                  border: "1px solid rgba(148,163,184,0.16)",
                  background: "rgba(15,23,42,0.52)",
                  color: "rgba(226,232,240,0.82)",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                }}
              >
                Componente: {saveBeforePhotoPrompt.name}
              </div>
            ) : null}

            <div
              style={{
                marginTop: "16px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="secondary-btn"
                onClick={closeSaveBeforePhotoPrompt}
                style={{ flex: isMobileLayout ? "1 1 100%" : "0 0 auto", justifyContent: "center" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleSaveComponentBeforePhoto}
                style={{ flex: isMobileLayout ? "1 1 100%" : "0 0 auto", justifyContent: "center" }}
              >
                💾 Guardar componente
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {previewPhoto ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewPhoto(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10020,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobileLayout ? "12px" : "24px",
            background: "rgba(0,0,0,0.78)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(920px, 100%)",
              maxHeight: "92dvh",
              borderRadius: "20px",
              overflow: "hidden",
              border: "1px solid rgba(148,163,184,0.22)",
              background: "rgba(2,6,23,0.96)",
              boxShadow: "0 28px 90px rgba(0,0,0,0.66)",
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                borderBottom: "1px solid rgba(148,163,184,0.16)",
              }}
            >
              <span style={{ color: "#e5e7eb", fontWeight: 900, fontSize: "0.86rem" }}>
                Evidencia fotográfica
              </span>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setPreviewPhoto(null)}
                style={{ padding: "0.32rem 0.62rem" }}
              >
                ✕
              </button>
            </div>
            <img
              src={normalizePhotoUrl(previewPhoto.url)}
              alt="Evidencia ampliada del componente"
              style={{
                width: "100%",
                maxHeight: "calc(92dvh - 54px)",
                display: "block",
                objectFit: "contain",
                background: "#020617",
              }}
            />
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes componentLabFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .component-lab-shell input:focus,
        .component-lab-shell textarea:focus,
        .component-lab-shell select:focus {
          border-color: rgba(34,197,94,0.48) !important;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.10), 0 0 28px rgba(34,197,94,0.08) !important;
        }

        .component-lab-shell,
        .component-lab-shell * {
          box-sizing: border-box;
        }

        .component-lab-shell button,
        .component-lab-shell input,
        .component-lab-shell textarea,
        .component-lab-shell select {
          max-width: 100%;
        }

        .component-lab-shell input,
        .component-lab-shell textarea,
        .component-lab-shell select {
          font-size: 16px;
        }

        @media (max-width: 920px) {
          .component-lab-edit-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 720px) {
          .component-lab-shell .primary-btn,
          .component-lab-shell .secondary-btn,
          .component-lab-shell .danger-link {
            min-height: 42px;
          }

          .component-lab-shell .zone-tag {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .component-lab-edit-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 520px) {
          .component-lab-shell article button[style] {
            gap: 10px !important;
          }
        }

      `}</style>
    </div>
  );
}
