export function buildSmartQuestions({ matchedRules = [], crops = [], zones = [], hours = [], liters = [], money = [] }) {
  const questions = [];

  matchedRules.forEach((rule) => {
    (rule.questions || []).forEach((question) => questions.push(question));
  });

  if (!crops.length) questions.push("¿Qué cultivo estuvo relacionado con esta actividad?");
  if (!zones.length) questions.push("¿En qué zona de la finca ocurrió?");
  if (!hours.length && matchedRules.some((rule) => (rule.costSignals || []).includes("labor"))) {
    questions.push("¿Cuántas horas de trabajo tomó esta actividad?");
  }
  if (!liters.length && matchedRules.some((rule) => (rule.costSignals || []).includes("fuel"))) {
    questions.push("¿Cuánta gasolina se utilizó?");
  }
  if (!money.length && matchedRules.some((rule) => rule.modules?.includes("Finanzas"))) {
    questions.push("¿Hubo algún monto que deba registrarse en Finanzas?");
  }

  return [...new Set(questions)].slice(0, 8);
}