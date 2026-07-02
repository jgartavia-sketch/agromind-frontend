import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ACTIVE_FARM_KEY = "agromind_active_farm_id";
const ACTIVE_FARM_NAME_KEY = "agromind_active_farm_name";

const FarmContext = createContext(null);

export function FarmProvider({ children }) {
  const [activeFarm, setActiveFarmState] = useState(() => {
    const id = localStorage.getItem(ACTIVE_FARM_KEY);
    const name = localStorage.getItem(ACTIVE_FARM_NAME_KEY);

    if (!id) return null;

    return {
      id,
      name: name || "Finca activa",
    };
  });

  const setActiveFarm = (farm) => {
    if (!farm?.id) {
      localStorage.removeItem(ACTIVE_FARM_KEY);
      localStorage.removeItem(ACTIVE_FARM_NAME_KEY);
      setActiveFarmState(null);

      window.dispatchEvent(
        new CustomEvent("agromind:farm:change", {
          detail: { farm: null },
        })
      );

      return;
    }

    const normalizedFarm = {
      ...farm,
      name: farm.name || "Finca activa",
    };

    localStorage.setItem(ACTIVE_FARM_KEY, normalizedFarm.id);
    localStorage.setItem(ACTIVE_FARM_NAME_KEY, normalizedFarm.name);

    setActiveFarmState(normalizedFarm);

    window.dispatchEvent(
      new CustomEvent("agromind:farm:change", {
        detail: { farm: normalizedFarm },
      })
    );
  };

  useEffect(() => {
    const onStorage = (event) => {
      if (
        event.key !== ACTIVE_FARM_KEY &&
        event.key !== ACTIVE_FARM_NAME_KEY
      ) {
        return;
      }

      const id = localStorage.getItem(ACTIVE_FARM_KEY);
      const name = localStorage.getItem(ACTIVE_FARM_NAME_KEY);

      setActiveFarmState(
        id
          ? {
              id,
              name: name || "Finca activa",
            }
          : null
      );
    };

    const onFarmChange = (event) => {
      const farm = event?.detail?.farm || null;

      setActiveFarmState(
        farm?.id
          ? {
              ...farm,
              name: farm.name || "Finca activa",
            }
          : null
      );
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("agromind:farm:change", onFarmChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("agromind:farm:change", onFarmChange);
    };
  }, []);

  const value = useMemo(
    () => ({
      activeFarm,
      farmId: activeFarm?.id || null,
      farmName: activeFarm?.name || "",
      hasActiveFarm: Boolean(activeFarm?.id),
      setActiveFarm,
    }),
    [activeFarm]
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