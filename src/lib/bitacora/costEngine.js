import { COST_DEFAULTS } from "./dictionary";

export function estimateCosts({ matchedRules = [], hours = [], liters = [] }) {
  const costSignals = matchedRules.flatMap((rule) => rule.costSignals || []);
  const uniqueSignals = [...new Set(costSignals)];

  const totalHours = hours.reduce((sum, value) => sum + value, 0);
  const totalLiters = liters.reduce((sum, value) => sum + value, 0);

  const lines = [];

  if (uniqueSignals.includes("fuel") && totalLiters > 0) {
    lines.push({
      label: "Combustible estimado",
      amount: Math.round(totalLiters * COST_DEFAULTS.fuelLiterCRC),
      detail: `${totalLiters} litro(s) x ₡${COST_DEFAULTS.fuelLiterCRC}`,
    });
  }

  if (uniqueSignals.includes("labor") && totalHours > 0) {
    lines.push({
      label: "Mano de obra estimada",
      amount: Math.round(totalHours * COST_DEFAULTS.laborHourCRC),
      detail: `${totalHours} hora(s) x ₡${COST_DEFAULTS.laborHourCRC}`,
    });
  }

  if (uniqueSignals.includes("machine_wear") && totalHours > 0) {
    lines.push({
      label: "Desgaste de máquina estimado",
      amount: Math.round(totalHours * COST_DEFAULTS.machineWearHourCRC),
      detail: `${totalHours} hora(s) x ₡${COST_DEFAULTS.machineWearHourCRC}`,
    });
  }

  const total = lines.reduce((sum, item) => sum + item.amount, 0);

  return {
    hasEstimate: lines.length > 0,
    lines,
    total,
  };
}

export function formatCRC(amount) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}