import { AGRICULTURAL_DICTIONARY } from "./dictionary";
import {
  normalizeText,
  extractMoney,
  extractNumbers,
  extractCrops,
  extractZones,
  extractHours,
  extractLiters,
  extractUnits,
} from "./extractors";
import { estimateCosts, formatCRC } from "./costEngine";
import { buildSmartQuestions } from "./questionEngine";

export function analyzeEntry(text) {
  const rawText = String(text || "");
  const clean = normalizeText(rawText);

  const money = extractMoney(rawText);
  const numbers = extractNumbers(rawText);
  const crops = extractCrops(clean);
  const zones = extractZones(clean);
  const hours = extractHours(clean);
  const liters = extractLiters(clean);
  const units = extractUnits(clean);

  const matchedRules = AGRICULTURAL_DICTIONARY
    .map((rule) => {
      const matchedKeywords = rule.keywords.filter((keyword) =>
        clean.includes(normalizeText(keyword))
      );

      if (!matchedKeywords.length) return null;

      return {
        ...rule,
        matchedKeywords,
      };
    })
    .filter(Boolean);

  const costEstimate = estimateCosts({ matchedRules, hours, liters });
  const smartQuestions = buildSmartQuestions({
    matchedRules,
    crops,
    zones,
    hours,
    liters,
    money,
  });

  const insights = matchedRules.map((rule) => ({
    type: rule.type,
    title: rule.title,
    severity: rule.severity,
    modules: rule.modules || [],
    message: buildRuleMessage(rule),
    matchedKeywords: rule.matchedKeywords,
    questions: rule.questions || [],
  }));

  if (money.length) {
    insights.push({
      type: "Finanzas",
      title: "Monto detectado",
      severity: "media",
      modules: ["Finanzas"],
      message: `Se detectó este monto: ${money.join(", ")}. Puede convertirse en gasto, ingreso o inversión.`,
      matchedKeywords: money,
      questions: [
        "¿Este monto fue un gasto o un ingreso?",
        "¿A qué categoría pertenece?",
        "¿Desea enviarlo al módulo de Finanzas?",
      ],
    });
  }

  if (crops.length) {
    insights.push({
      type: "Cultivo",
      title: "Cultivo detectado",
      severity: "baja",
      modules: ["Procesos"],
      message: `Cultivo identificado: ${crops.join(", ")}.`,
      matchedKeywords: crops,
      questions: [
        "¿Desea asociar esta entrada a un proceso de cultivo?",
        "¿Ese cultivo está en vivero, campo o cosecha?",
      ],
    });
  }

  if (zones.length) {
    insights.push({
      type: "Zona",
      title: "Zona de finca detectada",
      severity: "baja",
      modules: ["Mapa", "Tareas"],
      message: `Zona identificada: ${zones.join(", ")}.`,
      matchedKeywords: zones,
      questions: [
        "¿Desea asociar esta actividad a esa zona del mapa?",
        "¿Debe crearse una tarea de seguimiento en esta zona?",
      ],
    });
  }

  if (numbers.length || hours.length || liters.length || units.length) {
    insights.push({
      type: "Datos",
      title: "Datos operativos detectados",
      severity: "baja",
      modules: ["Procesos", "Finanzas"],
      message: buildDataMessage({ numbers, hours, liters, units }),
      matchedKeywords: [...numbers, ...units],
      questions: [
        "¿Qué representa cada cantidad detectada?",
        "¿Desea usar estos datos para actualizar procesos o finanzas?",
      ],
    });
  }

  if (costEstimate.hasEstimate) {
    insights.push({
      type: "Finanzas",
      title: "Costo operativo estimado",
      severity: "media",
      modules: ["Finanzas"],
      message: `Costo estimado: ${formatCRC(costEstimate.total)}. Revise el monto antes de registrarlo.`,
      matchedKeywords: ["costo estimado"],
      questions: [
        "¿Está correcto este costo estimado?",
        "¿Desea corregirlo antes de enviarlo a Finanzas?",
        "¿Debe registrarse como gasto operativo?",
      ],
      costEstimate,
    });
  }

  if (!insights.length) {
    insights.push({
      type: "IA",
      title: "Entrada guardada",
      severity: "baja",
      modules: ["Bitácora"],
      message:
        "No se detectaron acciones automáticas claras todavía, pero queda registrada para análisis futuro.",
      matchedKeywords: [],
      questions: [
        "¿Esta entrada debería generar una tarea, gasto, proceso o alerta?",
      ],
    });
  }

  return {
    rawText,
    summary: {
      crops,
      zones,
      money,
      numbers,
      hours,
      liters,
      units,
      matchedRuleIds: matchedRules.map((rule) => rule.id),
      modules: [...new Set(matchedRules.flatMap((rule) => rule.modules || []))],
      highestSeverity: getHighestSeverity(matchedRules),
    },
    smartQuestions,
    costEstimate,
    insights,
  };
}

function buildRuleMessage(rule) {
  const modules = rule.modules?.length ? ` Módulos sugeridos: ${rule.modules.join(", ")}.` : "";
  return `${rule.title}. Puede alimentar decisiones operativas de AgroMind.${modules}`;
}

function buildDataMessage({ numbers, hours, liters, units }) {
  const parts = [];

  if (numbers.length) parts.push(`números: ${numbers.join(", ")}`);
  if (hours.length) parts.push(`horas: ${hours.join(", ")}`);
  if (liters.length) parts.push(`litros: ${liters.join(", ")}`);
  if (units.length) parts.push(`unidades detectadas: ${units.join(", ")}`);

  return `Se detectaron datos útiles: ${parts.join(" · ")}.`;
}

function getHighestSeverity(rules) {
  if (rules.some((rule) => rule.severity === "alta")) return "alta";
  if (rules.some((rule) => rule.severity === "media")) return "media";
  return "baja";
}