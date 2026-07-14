// src/pages/FarmWorkspacePage.jsx

import { useMemo, useState } from "react";
import { useFarm } from "../context/FarmContext";

const RAW_API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://agromind-backend-slem.onrender.com";

const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

function getAuthToken() {
  return (
    localStorage.getItem("agromind_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("jwt") ||
    ""
  );
}

function getInitials(name) {
  return String(name || "AG")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function FarmWorkspacePage({ user, onOpenFarm, onLogout }) {
  const {
    farms,
    setFarms,
    setActiveFarm,
    refreshFarms,
    farmsLoading,
    farmsError,
  } = useFarm();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [farmName, setFarmName] = useState("");
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [pendingFarmAction, setPendingFarmAction] = useState(null);
  const [deleteFarmTarget, setDeleteFarmTarget] = useState(null);

  const adminFarms = useMemo(
    () => farms.filter((farm) => farm.role === "ADMIN"),
    [farms]
  );

  const consultantFarms = useMemo(
    () => farms.filter((farm) => farm.role === "CONSULTANT"),
    [farms]
  );

  const handleOpenFarm = (farm) => {
    if (!farm?.id) return;

    setActiveFarm(farm);

    if (typeof onOpenFarm === "function") {
      onOpenFarm(farm);
    }
  };

  const handlePrepareRenameFarm = (farm) => {
    if (!farm?.id || farm.role !== "ADMIN") return;

    setPendingFarmAction({
      type: "rename",
      farm,
    });

    setFeedback(
      `La acción para renombrar "${farm.name || "esta finca"}" queda preparada para el siguiente paso.`
    );
  };

  const handlePrepareDeleteFarm = (farm) => {
    if (!farm?.id || farm.role !== "ADMIN") return;

    setPendingFarmAction({
      type: "delete",
      farm,
    });

    setFeedback("");
    setDeleteFarmTarget(farm);
  };

  const handleCloseDeleteFarmModal = () => {
    setDeleteFarmTarget(null);
    setPendingFarmAction(null);
  };

  const handleConfirmDeleteFarm = () => {
    if (!deleteFarmTarget?.id || deleteFarmTarget.role !== "ADMIN") return;

    setFeedback(
      `La eliminación de "${deleteFarmTarget.name || "esta finca"}" está lista para conectarse al backend en el siguiente paso.`
    );

    setDeleteFarmTarget(null);
    setPendingFarmAction(null);
  };

  const handleCreateFarm = async (event) => {
    event.preventDefault();

    const cleanName = farmName.trim();

    if (!cleanName) {
      setFeedback("Escribe un nombre para la finca.");
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setFeedback("Tu sesión no está disponible. Inicia sesión nuevamente.");
      return;
    }

    setCreating(true);
    setFeedback("");

    try {
      const response = await fetch(`${API_BASE}/api/farms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: cleanName,
          view: null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "No se pudo crear la finca.");
      }

      const createdFarm = data?.farm
        ? {
            ...data.farm,
            role: data.farm.role || "ADMIN",
          }
        : null;

      if (!createdFarm?.id) {
        throw new Error("El servidor no devolvió la finca creada.");
      }

      setFarms((currentFarms) => [
        createdFarm,
        ...currentFarms.filter((farm) => farm.id !== createdFarm.id),
      ]);

      setActiveFarm(createdFarm);
      setFarmName("");
      setIsCreateOpen(false);

      await refreshFarms({
        preserveActiveFarm: true,
        selectFirstIfMissing: true,
        silent: true,
      });

      if (typeof onOpenFarm === "function") {
        onOpenFarm(createdFarm);
      }
    } catch (error) {
      setFeedback(error?.message || "No se pudo crear la finca.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(16,185,129,0.10), transparent 32%), #020617",
        color: "#e2e8f0",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <header
        style={{
          minHeight: "72px",
          padding:
            "0.9rem max(1rem, env(safe-area-inset-right, 0px)) 0.9rem max(1rem, env(safe-area-inset-left, 0px))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          borderBottom: "1px solid rgba(148,163,184,0.14)",
          background: "rgba(2,6,23,0.88)",
          backdropFilter: "blur(14px)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              display: "grid",
              placeItems: "center",
              borderRadius: "999px",
              background: "linear-gradient(135deg, #34d399, #14b8a6)",
              color: "#022c22",
              fontWeight: 950,
            }}
          >
            AG
          </div>

          <div>
            <strong
              style={{
                display: "block",
                color: "#f8fafc",
                fontSize: "1.05rem",
              }}
            >
              AgroMind CR
            </strong>
            <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>
              Centro de fincas
            </span>
          </div>
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            style={{
              minHeight: "40px",
              padding: "0.55rem 0.9rem",
              borderRadius: "999px",
              border: "1px solid rgba(148,163,184,0.24)",
              background: "rgba(15,23,42,0.72)",
              color: "#cbd5e1",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Cerrar sesión
          </button>
        )}
      </header>

      <main
        style={{
          width: "min(1180px, 100%)",
          margin: "0 auto",
          padding:
            "clamp(1.25rem, 4vw, 2.4rem) max(1rem, env(safe-area-inset-right, 0px)) calc(2rem + env(safe-area-inset-bottom, 0px)) max(1rem, env(safe-area-inset-left, 0px))",
        }}
      >
        <section
          style={{
            padding: "clamp(1.35rem, 4vw, 2.4rem)",
            borderRadius: "24px",
            border: "1px solid rgba(45,212,191,0.18)",
            background:
              "linear-gradient(145deg, rgba(15,23,42,0.92), rgba(6,78,59,0.18))",
            boxShadow: "0 28px 80px rgba(0,0,0,0.28)",
          }}
        >
          <p
            style={{
              margin: "0 0 0.45rem",
              color: "#5eead4",
              fontSize: "0.75rem",
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Bienvenido
          </p>

          <h1
            style={{
              margin: 0,
              color: "#f8fafc",
              fontSize: "clamp(1.9rem, 5vw, 3rem)",
              lineHeight: 1.05,
            }}
          >
            {user?.name || "Tu espacio de trabajo"}
          </h1>

          <p
            style={{
              margin: "0.9rem 0 0",
              maxWidth: "64ch",
              color: "#94a3b8",
              lineHeight: 1.7,
            }}
          >
            Administra tus propias fincas o entra a las fincas donde colaboras
            como consultor. Cada acceso conserva su rol y sus permisos.
          </p>
        </section>

        {(farmsError || feedback) && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.85rem 1rem",
              borderRadius: "14px",
              border: "1px solid rgba(248,113,113,0.28)",
              background: "rgba(127,29,29,0.18)",
              color: "#fecaca",
              fontWeight: 700,
            }}
          >
            {feedback || farmsError}
          </div>
        )}

        <section style={{ marginTop: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "0.85rem",
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 0.35rem",
                  color: "#5eead4",
                  fontSize: "0.72rem",
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Administración
              </p>
              <h2 style={{ margin: 0, color: "#f8fafc" }}>Mis fincas</h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setFeedback("");
                setFarmName("");
                setIsCreateOpen(true);
              }}
              style={primaryButtonStyle}
            >
              Crear nueva finca
            </button>
          </div>

          {farmsLoading ? (
            <div style={emptyStyle}>Cargando fincas...</div>
          ) : adminFarms.length === 0 ? (
            <div style={emptyStyle}>
              <div style={{ fontSize: "2rem" }}>🌱</div>
              <h3 style={{ margin: "0.6rem 0 0", color: "#f8fafc" }}>
                Todavía no tienes fincas
              </h3>
              <p style={emptyTextStyle}>
                Crea tu primera finca para empezar a construir su mapa y sus
                procesos.
              </p>
            </div>
          ) : (
            <div style={gridStyle}>
              {adminFarms.map((farm) => (
                <FarmCard
                  key={farm.id}
                  farm={farm}
                  label="Administrador"
                  onOpen={() => handleOpenFarm(farm)}
                  onRename={() => handlePrepareRenameFarm(farm)}
                  onDelete={() => handlePrepareDeleteFarm(farm)}
                  pendingAction={pendingFarmAction}
                />
              ))}
            </div>
          )}
        </section>

        <section style={{ marginTop: "2rem" }}>
          <div style={{ marginBottom: "0.85rem" }}>
            <p
              style={{
                margin: "0 0 0.35rem",
                color: "#7dd3fc",
                fontSize: "0.72rem",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Colaboración
            </p>
            <h2 style={{ margin: 0, color: "#f8fafc" }}>
              Fincas compartidas conmigo
            </h2>
          </div>

          {farmsLoading ? (
            <div style={emptyStyle}>Cargando accesos...</div>
          ) : consultantFarms.length === 0 ? (
            <div style={emptyStyle}>
              <div style={{ fontSize: "2rem" }}>🤝</div>
              <h3 style={{ margin: "0.6rem 0 0", color: "#f8fafc" }}>
                No tienes fincas compartidas
              </h3>
              <p style={emptyTextStyle}>
                Cuando un administrador te otorgue acceso, la finca aparecerá
                aquí.
              </p>
            </div>
          ) : (
            <div style={gridStyle}>
              {consultantFarms.map((farm) => (
                <FarmCard
                  key={farm.id}
                  farm={farm}
                  label="Consultor"
                  onOpen={() => handleOpenFarm(farm)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {deleteFarmTarget && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseDeleteFarmModal();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            display: "grid",
            placeItems: "center",
            padding:
              "max(1rem, env(safe-area-inset-top, 0px)) max(1rem, env(safe-area-inset-right, 0px)) max(1rem, env(safe-area-inset-bottom, 0px)) max(1rem, env(safe-area-inset-left, 0px))",
            background: "rgba(2,6,23,0.82)",
            backdropFilter: "blur(10px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-farm-title"
            style={{
              width: "min(520px, 100%)",
              padding: "clamp(1.2rem, 4vw, 1.8rem)",
              borderRadius: "24px",
              border: "1px solid rgba(248,113,113,0.30)",
              background:
                "linear-gradient(155deg, rgba(15,23,42,0.99), rgba(69,10,10,0.30))",
              boxShadow: "0 34px 100px rgba(0,0,0,0.64)",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                display: "grid",
                placeItems: "center",
                borderRadius: "16px",
                border: "1px solid rgba(248,113,113,0.34)",
                background: "rgba(127,29,29,0.24)",
                fontSize: "1.4rem",
              }}
            >
              🗑
            </div>

            <p
              style={{
                margin: "1rem 0 0.4rem",
                color: "#fca5a5",
                fontSize: "0.72rem",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Acción destructiva
            </p>

            <h2 id="delete-farm-title" style={{ margin: 0, color: "#f8fafc" }}>
              Eliminar finca
            </h2>

            <div
              style={{
                marginTop: "1rem",
                padding: "0.95rem 1rem",
                borderRadius: "16px",
                border: "1px solid rgba(148,163,184,0.16)",
                background: "rgba(15,23,42,0.56)",
                color: "#cbd5e1",
                lineHeight: 1.65,
              }}
            >
              ¿Seguro que deseas eliminar{" "}
              <strong style={{ color: "#f8fafc" }}>
                {deleteFarmTarget.name || "esta finca"}
              </strong>
              ?
            </div>

            <p
              style={{
                margin: "1rem 0 0",
                color: "#94a3b8",
                lineHeight: 1.65,
                fontSize: "0.9rem",
              }}
            >
              Esta acción eliminará permanentemente la finca y toda la información
              asociada: mapa, zonas, procesos, tareas, bitácora y finanzas. No podrá
              recuperarse.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.7rem",
                flexWrap: "wrap",
                marginTop: "1.35rem",
              }}
            >
              <button
                type="button"
                onClick={handleCloseDeleteFarmModal}
                style={secondaryButtonStyle}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteFarm}
                style={dangerButtonStyle}
              >
                Eliminar finca
              </button>
            </div>
          </section>
        </div>
      )}

      {isCreateOpen && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creating) {
              setIsCreateOpen(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding:
              "max(1rem, env(safe-area-inset-top, 0px)) max(1rem, env(safe-area-inset-right, 0px)) max(1rem, env(safe-area-inset-bottom, 0px)) max(1rem, env(safe-area-inset-left, 0px))",
            background: "rgba(2,6,23,0.78)",
            backdropFilter: "blur(10px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-farm-title"
            style={{
              width: "min(520px, 100%)",
              padding: "clamp(1.2rem, 4vw, 1.8rem)",
              borderRadius: "22px",
              border: "1px solid rgba(45,212,191,0.24)",
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.99), rgba(2,6,23,0.99))",
              boxShadow: "0 34px 90px rgba(0,0,0,0.58)",
            }}
          >
            <p
              style={{
                margin: "0 0 0.4rem",
                color: "#5eead4",
                fontSize: "0.72rem",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Nueva finca
            </p>

            <h2 id="create-farm-title" style={{ margin: 0, color: "#f8fafc" }}>
              Crear espacio de trabajo
            </h2>

            <form
              onSubmit={handleCreateFarm}
              style={{
                display: "grid",
                gap: "0.85rem",
                marginTop: "1.2rem",
              }}
            >
              <label
                htmlFor="farm-workspace-name"
                style={{
                  color: "#e2e8f0",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                }}
              >
                Nombre de la finca
              </label>

              <input
                id="farm-workspace-name"
                type="text"
                value={farmName}
                onChange={(event) => {
                  setFarmName(event.target.value);
                  if (feedback) setFeedback("");
                }}
                placeholder="Ej: Finca Los Laureles"
                autoFocus
                disabled={creating}
                maxLength={80}
                style={{
                  width: "100%",
                  minHeight: "48px",
                  padding: "0.78rem 0.95rem",
                  borderRadius: "14px",
                  border: "1px solid rgba(148,163,184,0.28)",
                  background: "rgba(15,23,42,0.78)",
                  color: "#f8fafc",
                  font: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {feedback && (
                <div
                  style={{
                    padding: "0.75rem 0.85rem",
                    borderRadius: "12px",
                    border: "1px solid rgba(248,113,113,0.28)",
                    background: "rgba(127,29,29,0.18)",
                    color: "#fecaca",
                    fontWeight: 700,
                    fontSize: "0.86rem",
                  }}
                >
                  {feedback}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.7rem",
                  flexWrap: "wrap",
                  marginTop: "0.35rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creating}
                  style={secondaryButtonStyle}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={creating || !farmName.trim()}
                  style={primaryButtonStyle}
                >
                  {creating ? "Creando..." : "Crear finca"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function FarmCard({
  farm,
  label,
  onOpen,
  onRename,
  onDelete,
  pendingAction,
}) {
  const isAdminFarm = farm.role === "ADMIN";
  const isPendingRename =
    pendingAction?.type === "rename" && pendingAction?.farm?.id === farm.id;
  const isPendingDelete =
    pendingAction?.type === "delete" && pendingAction?.farm?.id === farm.id;

  return (
    <article
      style={{
        minWidth: 0,
        padding: "1.15rem",
        borderRadius: "18px",
        border:
          farm.role === "ADMIN"
            ? "1px solid rgba(45,212,191,0.22)"
            : "1px solid rgba(56,189,248,0.22)",
        background:
          farm.role === "ADMIN"
            ? "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(6,78,59,0.16))"
            : "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(14,116,144,0.12))",
        boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            display: "grid",
            placeItems: "center",
            borderRadius: "14px",
            background:
              farm.role === "ADMIN"
                ? "rgba(45,212,191,0.13)"
                : "rgba(56,189,248,0.13)",
            color: farm.role === "ADMIN" ? "#99f6e4" : "#bae6fd",
            fontWeight: 950,
          }}
        >
          {getInitials(farm.name)}
        </div>

        <span
          style={{
            padding: "0.32rem 0.68rem",
            borderRadius: "999px",
            border: "1px solid rgba(148,163,184,0.2)",
            background: "rgba(15,23,42,0.72)",
            color: "#cbd5e1",
            fontSize: "0.72rem",
            fontWeight: 850,
          }}
        >
          {label}
        </span>
      </div>

      <h3
        style={{
          margin: "1rem 0 0",
          color: "#f8fafc",
          fontSize: "1.12rem",
          overflowWrap: "anywhere",
        }}
      >
        {farm.name || "Finca AgroMind"}
      </h3>

      <p
        style={{
          margin: "0.45rem 0 0",
          color: "#94a3b8",
          fontSize: "0.84rem",
          lineHeight: 1.55,
        }}
      >
        {farm.role === "ADMIN"
          ? "Control administrativo completo."
          : "Acceso operativo de consulta."}
      </p>

      <button
        type="button"
        onClick={onOpen}
        style={{
          width: "100%",
          minHeight: "42px",
          marginTop: "1rem",
          padding: "0.62rem 0.9rem",
          borderRadius: "999px",
          border:
            farm.role === "ADMIN"
              ? "1px solid rgba(45,212,191,0.34)"
              : "1px solid rgba(56,189,248,0.34)",
          background:
            farm.role === "ADMIN"
              ? "rgba(20,184,166,0.14)"
              : "rgba(14,165,233,0.12)",
          color: farm.role === "ADMIN" ? "#99f6e4" : "#bae6fd",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        {farm.role === "ADMIN" ? "Abrir finca" : "Abrir en modo consulta"}
      </button>

      {isAdminFarm && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "0.65rem",
            marginTop: "0.75rem",
          }}
        >
          <button
            type="button"
            onClick={onRename}
            aria-pressed={isPendingRename}
            style={{
              minHeight: "40px",
              padding: "0.58rem 0.7rem",
              borderRadius: "12px",
              border: isPendingRename
                ? "1px solid rgba(45,212,191,0.58)"
                : "1px solid rgba(148,163,184,0.22)",
              background: isPendingRename
                ? "rgba(20,184,166,0.18)"
                : "rgba(15,23,42,0.68)",
              color: isPendingRename ? "#99f6e4" : "#cbd5e1",
              fontWeight: 850,
              cursor: "pointer",
            }}
          >
            ✏️ Renombrar
          </button>

          <button
            type="button"
            onClick={onDelete}
            aria-pressed={isPendingDelete}
            style={{
              minHeight: "40px",
              padding: "0.58rem 0.7rem",
              borderRadius: "12px",
              border: isPendingDelete
                ? "1px solid rgba(248,113,113,0.58)"
                : "1px solid rgba(248,113,113,0.28)",
              background: isPendingDelete
                ? "rgba(127,29,29,0.34)"
                : "rgba(127,29,29,0.16)",
              color: "#fecaca",
              fontWeight: 850,
              cursor: "pointer",
            }}
          >
            🗑 Eliminar
          </button>
        </div>
      )}
    </article>
  );
}

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: "1rem",
};

const emptyStyle = {
  minHeight: "190px",
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  padding: "1.25rem",
  borderRadius: "18px",
  border: "1px dashed rgba(71,85,105,0.7)",
  background: "rgba(15,23,42,0.34)",
  color: "#94a3b8",
};

const emptyTextStyle = {
  margin: "0.5rem 0 0",
  color: "#94a3b8",
  textAlign: "center",
};

const primaryButtonStyle = {
  minHeight: "44px",
  padding: "0.65rem 1rem",
  borderRadius: "999px",
  border: "1px solid #2dd4bf",
  background: "linear-gradient(135deg, #2dd4bf, #14b8a6)",
  color: "#042f2e",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  minHeight: "44px",
  padding: "0.65rem 1rem",
  borderRadius: "999px",
  border: "1px solid rgba(148,163,184,0.24)",
  background: "rgba(15,23,42,0.72)",
  color: "#cbd5e1",
  fontWeight: 800,
  cursor: "pointer",
};


const dangerButtonStyle = {
  minHeight: "44px",
  padding: "0.65rem 1rem",
  borderRadius: "999px",
  border: "1px solid rgba(248,113,113,0.52)",
  background: "linear-gradient(135deg, #b91c1c, #7f1d1d)",
  color: "#fee2e2",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(127,29,29,0.26)",
};
