import { useContext } from "react";
import { FarmContext } from "./FarmContextStore";

export function useFarm() {
  const context = useContext(FarmContext);

  if (!context) {
    throw new Error("useFarm debe usarse dentro de FarmProvider.");
  }

  return context;
}
