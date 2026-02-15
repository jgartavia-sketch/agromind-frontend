
// src/components/FarmMap.jsx


import FarmSummary from "../components/farm/FarmSummary";


import { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import "../styles/farm-map.css";

import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Draw from "ol/interaction/Draw";
import Feature from "ol/Feature";

import { fromLonLat, toLonLat } from "ol/proj";
import { Style, Stroke, Fill, Circle as CircleStyle } from "ol/style";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import Polygon from "ol/geom/Polygon";

// Claves de localStorage
const VIEW_KEY = "agromind_farm_view";
const DRAWINGS_KEY = "agromind_farm_drawings";

// Paletas de colores
const POINT_COLORS = ["#f97316", "#22c55e", "#38bdf8", "#eab308", "#ec4899"];
const LINE_COLORS = ["#22c55e", "#38bdf8", "#f97316", "#a855f7", "#facc15"];
const POLYGON_COLORS = ["#22c55e88", "#38bdf888", "#f9731688", "#a855f788"];

const ZONE_TYPES = ["Zona de animales", "Pasillo", "Cultivo", "Zona libre"];
const ZONE_STATUSES = [
  "Operativa",
  "Prioridad alta",
  "Cosecha próxima",
  "Disponible",
];

const COMPONENT_TYPES = [
  "Bebedero",
  "Comedero",
  "Bodega",
  "Lote de cultivo",
  "Pasillo",
  "Área de descanso",
  "Otro",
];

function pickColor(kind, colorIndexRef) {
  let palette = POINT_COLORS;
  if (kind === "line") palette = LINE_COLORS;
  if (kind === "polygon") palette = POLYGON_COLORS;

  const idxRef = colorIndexRef.current;
  const current = idxRef[kind] || 0;
  const color = palette[current % palette.length];
  idxRef[kind] = current + 1;
  return color;
}

function generateName(kind, countersRef) {
  const counters = countersRef.current;
  const next = (counters[kind] || 0) + 1;
  counters[kind] = next;

  if (kind === "point") return `Punto ${next}`;
  if (kind === "line") return `Línea ${next}`;
  return `Zona ${next}`;
}

export default function FarmMap({ focusZoneRequest }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const vectorSourceRef = useRef(null);
  const drawInteractionRef = useRef(null);

  // id -> Feature del mapa
  const featuresMapRef = useRef({});

  // Lista de negocio: puntos, líneas y zonas
  const [featuresList, setFeaturesList] = useState([]);

  const [drawMode, setDrawMode] = useState("move");
  const [selectedId, setSelectedId] = useState(null);
  const [expandedZoneId, setExpandedZoneId] = useState(null);

  // Para hover bidireccional
  const [hoveredId, setHoveredId] = useState(null);

  const countersRef = useRef({
    point: 0,
    line: 0,
    polygon: 0,
  });

  const colorIndexRef = useRef({
    point: 0,
    line: 0,
    polygon: 0,
  });

  const apiKey = import.meta.env.VITE_MAPTILER_KEY;

  // Guardar datos + vista
  const persistDrawingsAndView = (list, options = {}) => {
    const vectorSource = vectorSourceRef.current;
    const map = mapInstanceRef.current;
    if (!vectorSource || !map) return;

    const featuresMap = featuresMapRef.current;

    const payload = list
      .map((item) => {
        const feature = featuresMap[item.id];
        if (!feature) return null;

        const geometry = feature.getGeometry();
        if (!geometry) return null;

        const geomType = geometry.getType();
        let coordinates;

        if (geomType === "Point") {
          coordinates = toLonLat(geometry.getCoordinates());
        } else if (geomType === "LineString") {
          coordinates = geometry
            .getCoordinates()
            .map((coord) => toLonLat(coord));
        } else if (geomType === "Polygon") {
          coordinates = geometry.getCoordinates().map((ring) =>
            ring.map((coord) => toLonLat(coord))
          );
        } else {
          return null;
        }

        return {
          id: item.id,
          kind: item.kind,
          color: item.color,
          name: item.name,
          note: item.note || "",
          zoneType: item.zoneType || null,
          status: item.status || null,
          components: Array.isArray(item.components) ? item.components : [],
          geomType,
          coordinates,
        };
      })
      .filter(Boolean);

    try {
      localStorage.setItem(DRAWINGS_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn("No se pudieron guardar los dibujos:", err);
    }

    // Vista
    let viewToSave = options.view || null;

    if (!viewToSave) {
      const view = map.getView();
      const center = view.getCenter();
      const zoom = view.getZoom();

      if (center && typeof zoom === "number") {
        const [lon, lat] = toLonLat(center);
        viewToSave = { lon, lat, zoom };
      }
    }

    if (viewToSave) {
      try {
        localStorage.setItem(VIEW_KEY, JSON.stringify(viewToSave));
      } catch (err) {
        console.warn("No se pudo guardar la vista de la finca:", err);
      }
    }
  };

  // Inicializar mapa y cargar datos
  useEffect(() => {
    if (!apiKey || apiKey === "TU_API_KEY_AQUI") return;

    if (mapRef.current && !mapInstanceRef.current) {
      let centerLonLat = [-84.433, 10.34];
      let zoom = 15;

      // Vista guardada
      try {
        const savedView = localStorage.getItem(VIEW_KEY);
        if (savedView) {
          const parsed = JSON.parse(savedView);
          if (
            parsed &&
            typeof parsed.lon === "number" &&
            typeof parsed.lat === "number"
          ) {
            centerLonLat = [parsed.lon, parsed.lat];
          }
          if (parsed && typeof parsed.zoom === "number") {
            zoom = parsed.zoom;
          }
        }
      } catch (err) {
        console.warn("No se pudo leer la vista guardada:", err);
      }

      const baseLayer = new TileLayer({
        source: new XYZ({
          url: `https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=${apiKey}`,
          attributions: "© MapTiler © OpenStreetMap contributors",
        }),
      });

      const vectorSource = new VectorSource();
      vectorSourceRef.current = vectorSource;

      const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: (feature) => {
          const kind = feature.get("kind");
          const color = feature.get("color") || "#22c55e";

          const selected = feature.get("selected") === true;
          const hovered = feature.get("hovered") === true;
          const active = selected || hovered;

          if (kind === "point") {
            return new Style({
              image: new CircleStyle({
                radius: active ? 8 : 6,
                fill: new Fill({ color }),
                stroke: new Stroke({
                  color: active ? "#f9fafb" : "#020617",
                  width: active ? 2 : 1.5,
                }),
              }),
            });
          }

          if (kind === "line") {
            return new Style({
              stroke: new Stroke({
                color,
                width: active ? 5 : 3,
              }),
            });
          }

          if (kind === "polygon") {
            return new Style({
              fill: new Fill({ color }),
              stroke: new Stroke({
                color: active ? "#f9fafb" : "#e5e7eb",
                width: active ? 3 : 1.5,
              }),
            });
          }

          return new Style({
            stroke: new Stroke({
              color,
              width: active ? 4 : 2,
            }),
          });
        },
      });

      const map = new Map({
        target: mapRef.current,
        layers: [baseLayer, vectorLayer],
        view: new View({
          center: fromLonLat(centerLonLat),
          zoom,
        }),
      });

      mapInstanceRef.current = map;

      // Cargar dibujos guardados
      try {
        const savedDrawings = localStorage.getItem(DRAWINGS_KEY);
        if (savedDrawings) {
          const parsed = JSON.parse(savedDrawings);
          if (Array.isArray(parsed)) {
            const newList = [];
            const counters = { point: 0, line: 0, polygon: 0 };

            parsed.forEach((item) => {
              const {
                id,
                kind,
                color,
                name,
                note,
                zoneType,
                status,
                components,
                geomType,
                coordinates,
              } = item;

              if (!id || !kind || !geomType || !coordinates) return;

              let geometry = null;

              if (geomType === "Point") {
                geometry = new Point(fromLonLat(coordinates));
              } else if (geomType === "LineString") {
                const lineCoords = coordinates.map((c) => fromLonLat(c));
                geometry = new LineString(lineCoords);
              } else if (geomType === "Polygon") {
                const polygonCoords = coordinates.map((ring) =>
                  ring.map((c) => fromLonLat(c))
                );
                geometry = new Polygon(polygonCoords);
              }

              if (!geometry) return;

              const feature = new Feature(geometry);
              const safeKind =
                kind === "point" || kind === "line" || kind === "polygon"
                  ? kind
                  : "point";

              counters[safeKind] = (counters[safeKind] || 0) + 1;

              const finalName =
                name && name.trim().length > 0
                  ? name
                  : generateName(safeKind, { current: counters });

              const finalColor =
                color ||
                pickColor(
                  safeKind,
                  { current: { ...colorIndexRef.current } }
                );

              const finalZoneType =
                safeKind === "polygon" ? zoneType || "Zona libre" : null;

              const finalStatus =
                safeKind === "polygon" ? status || "Disponible" : null;

              const finalComponents =
                safeKind === "polygon" && Array.isArray(components)
                  ? components.map((c, idx) => ({
                      id:
                        c.id ||
                        `comp-${idx}-${Date.now().toString(36)}${Math.random()
                          .toString(36)
                          .slice(2, 6)}`,
                      name: c.name || "",
                      note: c.note || "",
                      type: c.type || "Otro",
                    }))
                  : [];

              feature.setProperties({
                id,
                kind: safeKind,
                color: finalColor,
                name: finalName,
                note: note || "",
                zoneType: finalZoneType,
                status: finalStatus,
                components: finalComponents,
                geomType,
                selected: false,
                hovered: false,
              });

              vectorSource.addFeature(feature);
              featuresMapRef.current[id] = feature;

              newList.push({
                id,
                kind: safeKind,
                color: finalColor,
                name: finalName,
                note: note || "",
                zoneType: finalZoneType,
                status: finalStatus,
                components: finalComponents,
              });
            });

            countersRef.current = counters;
            setFeaturesList(newList);
          }
        }
      } catch (err) {
        console.warn("No se pudieron cargar los dibujos guardados:", err);
      }

      // Hover desde mapa → tabla
      const handlePointerMove = (evt) => {
        const mapInstance = mapInstanceRef.current;
        if (!mapInstance) return;

        const pixel = mapInstance.getEventPixel(evt.originalEvent);
        let foundId = null;

        mapInstance.forEachFeatureAtPixel(pixel, (feature) => {
          const fid = feature.get("id");
          if (fid) {
            foundId = fid;
            return true;
          }
          return false;
        });

        setHoveredId((prev) => (prev === foundId ? prev : foundId || null));
      };

      // Selección desde mapa → tabla
      const handleSingleClick = (evt) => {
        const mapInstance = mapInstanceRef.current;
        if (!mapInstance) return;

        const pixel = mapInstance.getEventPixel(evt.originalEvent);
        let foundId = null;

        mapInstance.forEachFeatureAtPixel(pixel, (feature) => {
          const fid = feature.get("id");
          if (fid) {
            foundId = fid;
            return true;
          }
          return false;
        });

        if (foundId) {
          handleSelectFeature(foundId);
        } else {
          const vectorSourceLocal = vectorSourceRef.current;
          if (vectorSourceLocal) {
            vectorSourceLocal
              .getFeatures()
              .forEach((f) => f.set("selected", false));
          }
          setSelectedId(null);
        }
      };

      map.on("pointermove", handlePointerMove);
      map.on("singleclick", handleSingleClick);

      // Cleanup
      return () => {
        map.un("pointermove", handlePointerMove);
        map.un("singleclick", handleSingleClick);

        if (mapInstanceRef.current) {
          if (drawInteractionRef.current) {
            mapInstanceRef.current.removeInteraction(
              drawInteractionRef.current
            );
          }
          mapInstanceRef.current.setTarget(null);
          mapInstanceRef.current = null;
        }
      };
    }
  }, [apiKey]);

  // Sincronizar flag "hovered" en las features cuando cambia hoveredId
  useEffect(() => {
    const featuresMap = featuresMapRef.current;
    Object.entries(featuresMap).forEach(([id, feature]) => {
      feature.set("hovered", id === hoveredId);
    });
  }, [hoveredId]);

  // Al terminar de dibujar algo
  const handleDrawEnd = (feature, mode) => {
    const kind =
      mode === "point" ? "point" : mode === "line" ? "line" : "polygon";

    const id = `${kind}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const color = pickColor(kind, colorIndexRef);
    const name = generateName(kind, countersRef);
    const note = "";

    const zoneType = kind === "polygon" ? "Zona libre" : null;
    const status = kind === "polygon" ? "Disponible" : null;
    const components = kind === "polygon" ? [] : undefined;

    feature.setProperties({
      id,
      kind,
      color,
      name,
      note,
      zoneType,
      status,
      components,
      geomType:
        mode === "point"
          ? "Point"
          : mode === "line"
          ? "LineString"
          : "Polygon",
      selected: false,
      hovered: false,
    });

    featuresMapRef.current[id] = feature;

    setFeaturesList((prev) => {
      const updated = [
        ...prev,
        {
          id,
          kind,
          color,
          name,
          note,
          zoneType,
          status,
          components,
        },
      ];
      persistDrawingsAndView(updated);
      return updated;
    });
  };

  // Herramienta de dibujo
  useEffect(() => {
    const map = mapInstanceRef.current;
    const vectorSource = vectorSourceRef.current;
    if (!map || !vectorSource) return;

    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }

    if (drawMode === "move") return;

    const type =
      drawMode === "point"
        ? "Point"
        : drawMode === "line"
        ? "LineString"
        : "Polygon";

    const draw = new Draw({
      source: vectorSource,
      type,
    });

    draw.on("drawend", (evt) => {
      const feature = evt.feature;
      handleDrawEnd(feature, drawMode);
    });

    map.addInteraction(draw);
    drawInteractionRef.current = draw;
  }, [drawMode]);

  // Seleccionar feature (click en tabla o desde el mapa)
  const handleSelectFeature = (id) => {
    const map = mapInstanceRef.current;
    const vectorSource = vectorSourceRef.current;
    const feature = featuresMapRef.current[id];
    if (!map || !vectorSource || !feature) return;

    vectorSource.getFeatures().forEach((f) => {
      f.set("selected", f === feature);
    });

    const geometry = feature.getGeometry();
    if (geometry) {
      map.getView().fit(geometry, {
        maxZoom: 19,
        duration: 400,
        padding: [40, 40, 40, 40],
      });
    }

    setSelectedId(id);
  };

  // Cambios generales
  const handleNameChange = (id, value) => {
    const feature = featuresMapRef.current[id];
    if (feature) feature.set("name", value);

    setFeaturesList((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, name: value } : item
      );
      persistDrawingsAndView(updated);
      return updated;
    });
  };

  const handleZoneTypeChange = (id, value) => {
    const feature = featuresMapRef.current[id];
    if (feature) feature.set("zoneType", value);

    setFeaturesList((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, zoneType: value } : item
      );
      persistDrawingsAndView(updated);
      return updated;
    });
  };

  const handleZoneStatusChange = (id, value) => {
    const feature = featuresMapRef.current[id];
    if (feature) feature.set("status", value);

    setFeaturesList((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, status: value } : item
      );
      persistDrawingsAndView(updated);
      return updated;
    });
  };

  const handleZoneNameChange = (id, value) => {
    handleNameChange(id, value);
  };

  const handleDeleteFeature = (id) => {
    const vectorSource = vectorSourceRef.current;
    const feature = featuresMapRef.current[id];

    if (vectorSource && feature) {
      vectorSource.removeFeature(feature);
    }
    delete featuresMapRef.current[id];

    setFeaturesList((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      persistDrawingsAndView(updated);
      return updated;
    });

    if (selectedId === id) setSelectedId(null);
    if (expandedZoneId === id) setExpandedZoneId(null);
    if (hoveredId === id) setHoveredId(null);
  };

  const handleSaveViewClick = () => {
    persistDrawingsAndView(featuresList);
  };

  // Abrir/cerrar panel de componentes (solo zonas)
  const handleToggleComponents = (zoneId) => {
    setExpandedZoneId((prev) => (prev === zoneId ? null : zoneId));
  };

  // ---- COMPONENTES MANUALES POR ZONA ----
  const handleAddComponent = (zoneId) => {
    const newComp = {
      id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: "",
      note: "",
      type: "Otro",
    };

    setFeaturesList((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== zoneId) return item;
        const current = Array.isArray(item.components)
          ? item.components
          : [];
        const components = [...current, newComp];

        const feature = featuresMapRef.current[zoneId];
        if (feature) feature.set("components", components);

        return { ...item, components };
      });
      persistDrawingsAndView(updated);
      return updated;
    });
  };

  const handleComponentNameChange = (zoneId, compId, value) => {
    setFeaturesList((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== zoneId) return item;
        const current = Array.isArray(item.components)
          ? item.components
          : [];
        const components = current.map((c) =>
          c.id === compId ? { ...c, name: value } : c
        );

        const feature = featuresMapRef.current[zoneId];
        if (feature) feature.set("components", components);

        return { ...item, components };
      });
      persistDrawingsAndView(updated);
      return updated;
    });
  };

  const handleComponentNoteChange = (zoneId, compId, value) => {
    setFeaturesList((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== zoneId) return item;
        const current = Array.isArray(item.components)
          ? item.components
          : [];
        const components = current.map((c) =>
          c.id === compId ? { ...c, note: value } : c
        );

        const feature = featuresMapRef.current[zoneId];
        if (feature) feature.set("components", components);

        return { ...item, components };
      });
      persistDrawingsAndView(updated);
      return updated;
    });
  };

  const handleComponentTypeChange = (zoneId, compId, value) => {
    setFeaturesList((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== zoneId) return item;
        const current = Array.isArray(item.components)
          ? item.components
          : [];
        const components = current.map((c) =>
          c.id === compId ? { ...c, type: value } : c
        );

        const feature = featuresMapRef.current[zoneId];
        if (feature) feature.set("components", components);

        return { ...item, components };
      });
      persistDrawingsAndView(updated);
      return updated;
    });
  };

  const handleDeleteComponent = (zoneId, compId) => {
    setFeaturesList((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== zoneId) return item;
        const current = Array.isArray(item.components)
          ? item.components
          : [];
        const components = current.filter((c) => c.id !== compId);

        const feature = featuresMapRef.current[zoneId];
        if (feature) feature.set("components", components);

        return { ...item, components };
      });
      persistDrawingsAndView(updated);
      return updated;
    });
  };

  // Derivados
  const zonesOnly = featuresList.filter((f) => f.kind === "polygon");
  const currentZone =
    expandedZoneId && zonesOnly.find((z) => z.id === expandedZoneId);
  const zoneComponents =
    currentZone && Array.isArray(currentZone.components)
      ? currentZone.components
      : [];

  // 👉 Resumen rápido para el mini-dashboard
  const pointCount = featuresList.filter((f) => f.kind === "point").length;
  const lineCount = featuresList.filter((f) => f.kind === "line").length;
  const zoneCount = zonesOnly.length;

  const statusCounts = {
    Operativa: 0,
    "Prioridad alta": 0,
    "Cosecha próxima": 0,
    Disponible: 0,
    Otro: 0,
  };

  zonesOnly.forEach((z) => {
    const s = z.status || "Disponible";
    if (statusCounts[s] !== undefined) {
      statusCounts[s]++;
    } else {
      statusCounts.Otro++;
    }
  });

  // 🔗 Cuando viene una orden desde Tareas para enfocar una zona
  useEffect(() => {
    if (!focusZoneRequest || !focusZoneRequest.name) return;
    const normalized = focusZoneRequest.name.trim().toLowerCase();

    const target = zonesOnly.find(
      (z) => (z.name || "").trim().toLowerCase() === normalized
    );

    if (target) {
      handleSelectFeature(target.id);
      setExpandedZoneId(target.id); // abrimos el panel de componentes de esa zona
    }
  }, [focusZoneRequest, zonesOnly]);

  if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
    return (
      <div className="farm-map-shell farm-map-error">
        <p>
          Falta configurar la llave de mapas (<code>VITE_MAPTILER_KEY</code>).
        </p>
        <p>
          Creá una cuenta gratis en MapTiler, poné la key en el archivo
          <code>.env</code> y recargá la página.
        </p>
      </div>
    );
  }

  return (
    <div className="farm-map-shell">
      
     {/* MINI-DASHBOARD DE RESUMEN */}
<div className="farm-map-summary">
  <FarmSummary pointCount={pointCount} />


        <div className="summary-chip">
          <span className="summary-dot dot-line" />
          <span className="summary-label">
            {lineCount} {lineCount === 1 ? "línea" : "líneas"}
          </span>
        </div>

        <div className="summary-chip">
          <span className="summary-dot dot-zone" />
          <span className="summary-label">
            {zoneCount} {zoneCount === 1 ? "zona" : "zonas"}
          </span>
        </div>

        <div className="summary-chip summary-chip-status">
          <span className="status-pill status-ok" />
          <span className="summary-label">
            {statusCounts["Operativa"]} operativa
            {statusCounts["Operativa"] === 1 ? "" : "s"}
          </span>
        </div>

        <div className="summary-chip summary-chip-status">
          <span className="status-pill status-warning" />
          <span className="summary-label">
            {statusCounts["Prioridad alta"]} con prioridad
          </span>
        </div>

        <div className="summary-chip summary-chip-status">
          <span className="status-pill status-info" />
          <span className="summary-label">
            {statusCounts["Cosecha próxima"]} cosecha próxima
          </span>
        </div>
     
</div>
      {/* Toolbar */}
      <div className="farm-map-toolbar">
        <div className="farm-map-tools-left">
          <button
            type="button"
            className={drawMode === "move" ? "tool-btn active" : "tool-btn"}
            onClick={() => setDrawMode("move")}
          >
            Mover
          </button>
          <button
            type="button"
            className={drawMode === "point" ? "tool-btn active" : "tool-btn"}
            onClick={() => setDrawMode("point")}
          >
            Punto
          </button>
          <button
            type="button"
            className={drawMode === "line" ? "tool-btn active" : "tool-btn"}
            onClick={() => setDrawMode("line")}
          >
            Línea
          </button>
          <button
            type="button"
            className={drawMode === "polygon" ? "tool-btn active" : "tool-btn"}
            onClick={() => setDrawMode("polygon")}
          >
            Zona
          </button>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={handleSaveViewClick}
        >
          Usar esta vista como mi finca
        </button>
      </div>

      {/* Mapa */}
      <div className="farm-map-layout">
        <div ref={mapRef} className="farm-map" />
      </div>

      {/* Tabla: puntos, líneas y zonas */}
      {featuresList.length > 0 && (
        <div className="farm-zones-table-wrapper">
          <div className="farm-zones-header-row">
            <span>ZONA / ELEMENTO</span>
            <span>TIPO</span>
            <span>ESTADO</span>
            <span>COMPONENTES / ACCIONES</span>
          </div>

          {featuresList.map((item) => {
            const isZone = item.kind === "polygon";
            const typeLabel =
              item.kind === "point"
                ? "Punto"
                : item.kind === "line"
                ? "Línea"
                : "Zona";

            const rowClass =
              "farm-zones-row" +
              (selectedId === item.id ? " selected" : "") +
              (hoveredId === item.id ? " hovered" : "");

            const totalComponents = Array.isArray(item.components)
              ? item.components.length
              : 0;

            return (
              <div
                key={item.id}
                className={rowClass}
                onClick={() => handleSelectFeature(item.id)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() =>
                  setHoveredId((prev) => (prev === item.id ? null : prev))
                }
              >
                {/* Nombre + color */}
                <div className="zone-col zone-name">
                  <span
                    className="feature-color-pill"
                    style={{ backgroundColor: item.color }}
                  />
                  <input
                    className="zone-name-input"
                    value={item.name}
                    onChange={(e) => handleNameChange(item.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Tipo */}
                <div className="zone-col zone-type">
                  {isZone ? (
                    <select
                      value={item.zoneType || "Zona libre"}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleZoneTypeChange(item.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ZONE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="type-label">{typeLabel}</span>
                  )}
                </div>

                {/* Estado */}
                <div className="zone-col zone-status">
                  {isZone ? (
                    <select
                      value={item.status || "Disponible"}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleZoneStatusChange(item.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="status-select"
                    >
                      {ZONE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="status-label">—</span>
                  )}
                </div>

                {/* Componentes / Acciones */}
                <div className="zone-col zone-components">
                  {isZone && (
                    <>
                      <span className="components-summary">
                        {totalComponents === 0
                          ? "Sin componentes"
                          : totalComponents === 1
                          ? "1 componente"
                          : `${totalComponents} componentes`}
                      </span>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleComponents(item.id);
                        }}
                        style={{ marginLeft: "0.5rem" }}
                      >
                        {expandedZoneId === item.id
                          ? "Ocultar componentes"
                          : "Ver componentes"}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className="danger-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFeature(item.id);
                    }}
                    style={{ marginLeft: isZone ? "0.5rem" : 0 }}
                  >
                    Borrar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Panel de componentes (solo si hay zona expandida) */}
      {expandedZoneId && currentZone && (
        <div className="farm-zone-components-panel">
          <div className="farm-zone-components-header">
            <h4>Componentes de la zona</h4>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span className="zone-tag">{currentZone.name}</span>
              <button
                type="button"
                className="danger-link"
                onClick={() => handleDeleteFeature(currentZone.id)}
              >
                Borrar zona
              </button>
            </div>
          </div>

          {zoneComponents.length === 0 && (
            <p className="farm-zone-components-empty">
              Aún no has agregado componentes a esta zona.{" "}
              Usa el botón <strong>“Agregar componente”</strong>.
            </p>
          )}

          {zoneComponents.map((comp) => (
            <div key={comp.id} className="farm-zone-component-row">
              <div className="farm-zone-component-icon">
                <span className="geom-dot" />
              </div>

              <div className="farm-zone-component-body">
                <div className="farm-zone-component-header">
                  <span className="component-kind-badge">
                    {comp.type || "Componente"}
                  </span>

                  <button
                    type="button"
                    className="danger-link"
                    onClick={() =>
                      handleDeleteComponent(currentZone.id, comp.id)
                    }
                  >
                    Borrar
                  </button>
                </div>

                <div className="farm-zone-component-type-row">
                  <label className="component-type-label">
                    Tipo de componente
                  </label>
                  <select
                    className="component-type-select"
                    value={comp.type || "Otro"}
                    onChange={(e) =>
                      handleComponentTypeChange(
                        currentZone.id,
                        comp.id,
                        e.target.value
                      )
                    }
                  >
                    {COMPONENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  className="farm-feature-input"
                  value={comp.name}
                  onChange={(e) =>
                    handleComponentNameChange(
                      currentZone.id,
                      comp.id,
                      e.target.value
                    )
                  }
                  placeholder="Nombre del componente (ej: Gallinero, Bebedero, Bodega)"
                />

                <textarea
                  className="farm-feature-textarea"
                  value={comp.note}
                  onChange={(e) =>
                    handleComponentNoteChange(
                      currentZone.id,
                      comp.id,
                      e.target.value
                    )
                  }
                  placeholder="Notas / detalles (ej: revisar techo, cambiar malla, etc.)"
                  rows={2}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            className="primary-btn"
            onClick={() => handleAddComponent(currentZone.id)}
            style={{ marginTop: "0.5rem" }}
          >
            Agregar componente
          </button>
        </div>
         )}
    </div>
  );
}
