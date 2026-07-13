import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const ACTIVE_FARM_KEY = "agromind_active_farm_id";
const ACTIVE_FARM_NAME_KEY = "agromind_active_farm_name";
const ACTIVE_FARM_ROLE_KEY = "agromind_active_farm_role";

const API_BASE =
  import.meta.env.VITE_API_URL || "https://agromind-backend-slem.onrender.com";

const FarmContext = createContext(null);

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

function normalizeRole(role) {
  const normalizedRole = String(role || "").trim().toUpperCase();

  if (normalizedRole === "ADMIN" || normalizedRole === "CONSULTANT") {
    return normalizedRole;
  }

  return null;
}

function normalizeFarm(farm) {
  if (!farm?.id) return null;

  const role = normalizeRole(
    farm.role ||
      farm.activeRole ||
      farm.membershipRole ||
      farm.userRole
  );

  return {
    ...farm,
    id: String(farm.id),
    name: farm.name || "Finca activa",
    role,
  };
}

function normalizeFarms(farms) {
  if (!Array.isArray(farms)) return [];

  return farms
    .map(normalizeFarm)
    .filter(Boolean);
}

function getStoredFarm() {
  const id = localStorage.getItem(ACTIVE_FARM_KEY);

  if (!id) return null;

  return {
    id,
    name: localStorage.getItem(ACTIVE_FARM_NAME_KEY) || "Finca activa",
    role: normalizeRole(localStorage.getItem(ACTIVE_FARM_ROLE_KEY)),
  };
}

function persistFarm(farm) {
  if (!farm) {
    localStorage.removeItem(ACTIVE_FARM_KEY);
    localStorage.removeItem(ACTIVE_FARM_NAME_KEY);
    localStorage.removeItem(ACTIVE_FARM_ROLE_KEY);
    return;
  }

  localStorage.setItem(ACTIVE_FARM_KEY, farm.id);
  localStorage.setItem(ACTIVE_FARM_NAME_KEY, farm.name);

  if (farm.role) {
    localStorage.setItem(ACTIVE_FARM_ROLE_KEY, farm.role);
  } else {
    localStorage.removeItem(ACTIVE_FARM_ROLE_KEY);
  }
}

async function fetchFarms() {
  const token = getAuthToken();

  if (!token) {
    return [];
  }

  const response = await fetch(`${API_BASE}/api/farms`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error || `No se pudieron cargar las fincas. Error ${response.status}.`
    );
  }

  return normalizeFarms(data?.farms);
}

export function FarmProvider({ children }) {
  const initialStoredFarm = getStoredFarm();
  const activeFarmIdRef = useRef(initialStoredFarm?.id || null);
  const authTokenRef = useRef(getAuthToken());
  const authRefreshInProgressRef = useRef(false);

  const [farms, setFarmsState] = useState([]);
  const [activeFarm, setActiveFarmState] = useState(initialStoredFarm);
  const [farmsLoading, setFarmsLoading] = useState(false);
  const [farmsError, setFarmsError] = useState("");
  const [farmsLoaded, setFarmsLoaded] = useState(false);

  const applyActiveFarm = useCallback((farm, options = {}) => {
    const { emitEvent = true } = options;
    const normalizedFarm = normalizeFarm(farm);

    activeFarmIdRef.current = normalizedFarm?.id || null;
    persistFarm(normalizedFarm);
    setActiveFarmState(normalizedFarm);

    if (emitEvent) {
      window.dispatchEvent(
        new CustomEvent("agromind:farm:change", {
          detail: { farm: normalizedFarm },
        })
      );
    }

    return normalizedFarm;
  }, []);

  const setActiveFarm = useCallback(
    (farm) => {
      if (!farm?.id) {
        applyActiveFarm(null);
        return null;
      }

      const farmId = String(farm.id);

      const fullFarm =
        farms.find((item) => item.id === farmId) ||
        normalizeFarm(farm);

      return applyActiveFarm(fullFarm);
    },
    [applyActiveFarm, farms]
  );

  const setFarms = useCallback(
    (nextFarms) => {
      setFarmsState((currentFarms) => {
        const resolvedFarms =
          typeof nextFarms === "function"
            ? nextFarms(currentFarms)
            : nextFarms;

        const normalizedFarms = normalizeFarms(resolvedFarms);

        setActiveFarmState((currentActiveFarm) => {
          if (!currentActiveFarm?.id) {
            return currentActiveFarm;
          }

          const updatedActiveFarm = normalizedFarms.find(
            (farm) => farm.id === currentActiveFarm.id
          );

          if (!updatedActiveFarm) {
            return currentActiveFarm;
          }

          activeFarmIdRef.current = updatedActiveFarm.id;
          persistFarm(updatedActiveFarm);
          return updatedActiveFarm;
        });

        return normalizedFarms;
      });
    },
    []
  );

  const refreshFarms = useCallback(
    async (options = {}) => {
      const {
        preserveActiveFarm = true,
        selectFirstIfMissing = true,
        silent = false,
      } = options;

      try {
        if (!silent) {
          setFarmsLoading(true);
        }

        setFarmsError("");

        const nextFarms = await fetchFarms();

        setFarmsState(nextFarms);
        setFarmsLoaded(true);

        const storedFarmId =
          activeFarmIdRef.current || localStorage.getItem(ACTIVE_FARM_KEY);

        const matchingFarm =
          preserveActiveFarm && storedFarmId
            ? nextFarms.find((farm) => farm.id === String(storedFarmId))
            : null;

        const nextActiveFarm =
          matchingFarm ||
          (selectFirstIfMissing && nextFarms.length > 0 ? nextFarms[0] : null);

        applyActiveFarm(nextActiveFarm);

        return nextFarms;
      } catch (error) {
        const message =
          error?.message || "No se pudieron sincronizar las fincas.";

        setFarmsError(message);
        setFarmsLoaded(true);

        throw error;
      } finally {
        if (!silent) {
          setFarmsLoading(false);
        }
      }
    },
    [applyActiveFarm]
  );

  const syncAuthState = useCallback(async () => {
    const currentToken = getAuthToken();
    const previousToken = authTokenRef.current;

    if (currentToken === previousToken) {
      return;
    }

    authTokenRef.current = currentToken;

    if (!currentToken) {
      setFarmsState([]);
      setFarmsError("");
      setFarmsLoaded(true);
      applyActiveFarm(null);
      return;
    }

    if (authRefreshInProgressRef.current) {
      return;
    }

    authRefreshInProgressRef.current = true;

    try {
      await refreshFarms({
        preserveActiveFarm: true,
        selectFirstIfMissing: true,
      });
    } catch {
      // El error queda disponible mediante farmsError.
    } finally {
      authRefreshInProgressRef.current = false;
    }
  }, [applyActiveFarm, refreshFarms]);

  useEffect(() => {
    const token = getAuthToken();
    authTokenRef.current = token;

    if (!token) {
      setFarmsState([]);
      setFarmsLoaded(true);
      return;
    }

    refreshFarms().catch(() => {
      // El error queda disponible mediante farmsError.
    });
  }, [refreshFarms]);

  useEffect(() => {
    const onStorage = (event) => {
      if (
        event.key !== ACTIVE_FARM_KEY &&
        event.key !== ACTIVE_FARM_NAME_KEY &&
        event.key !== ACTIVE_FARM_ROLE_KEY
      ) {
        return;
      }

      const storedFarm = getStoredFarm();

      if (!storedFarm?.id) {
        activeFarmIdRef.current = null;
        setActiveFarmState(null);
        return;
      }

      const fullFarm =
        farms.find((farm) => farm.id === storedFarm.id) ||
        storedFarm;

      const normalizedFullFarm = normalizeFarm(fullFarm);
      activeFarmIdRef.current = normalizedFullFarm?.id || null;
      setActiveFarmState(normalizedFullFarm);
    };

    const onFarmChange = (event) => {
      const incomingFarm = normalizeFarm(event?.detail?.farm || null);

      if (!incomingFarm?.id) {
        activeFarmIdRef.current = null;
        persistFarm(null);
        setActiveFarmState(null);
        return;
      }

      const fullFarm =
        farms.find((farm) => farm.id === incomingFarm.id) ||
        incomingFarm;

      activeFarmIdRef.current = fullFarm.id;
      persistFarm(fullFarm);
      setActiveFarmState(fullFarm);
    };

    const onAuthChange = () => {
      syncAuthState();
    };

    const onWindowFocus = () => {
      syncAuthState();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("agromind:farm:change", onFarmChange);
    window.addEventListener("agromind:auth:change", onAuthChange);
    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("pageshow", onWindowFocus);

    const authWatcher = window.setInterval(() => {
      syncAuthState();
    }, 500);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("agromind:farm:change", onFarmChange);
      window.removeEventListener("agromind:auth:change", onAuthChange);
      window.removeEventListener("focus", onWindowFocus);
      window.removeEventListener("pageshow", onWindowFocus);
      window.clearInterval(authWatcher);
    };
  }, [farms, syncAuthState]);

  const value = useMemo(
    () => ({
      farms,
      setFarms,
      refreshFarms,
      farmsLoading,
      farmsError,
      farmsLoaded,

      activeFarm,
      farmId: activeFarm?.id || null,
      farmName: activeFarm?.name || "",
      activeRole: activeFarm?.role || null,

      isAdmin: activeFarm?.role === "ADMIN",
      isConsultant: activeFarm?.role === "CONSULTANT",

      hasActiveFarm: Boolean(activeFarm?.id),
      hasActiveRole: Boolean(activeFarm?.role),

      setActiveFarm,
    }),
    [
      activeFarm,
      farms,
      farmsError,
      farmsLoaded,
      farmsLoading,
      refreshFarms,
      setActiveFarm,
      setFarms,
    ]
  );

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarm() {
  const context = useContext(FarmContext);

  if (!context) {
    throw new Error("useFarm debe usarse dentro de FarmProvider.");
  }

  return context;
}
