import { analyzeEntry } from "./analyzer";

export function buildDetectedActivities(analysis) {
  const insights = analysis?.insights || [];

  return insights
    .filter((item) => item.type !== "Datos" && item.type !== "Zona" && item.type !== "Cultivo")
    .map((item, index) => ({
      id: `${item.type}-${item.title}-${index}`,
      type: item.type,
      title: item.title,
      severity: item.severity || "baja",
      modules: item.modules || [],
      questions: item.questions || [],
    }));
}

export function analyzeAnswer(answer) {
  return analyzeEntry(answer || "");
}

export function buildFinalActions({ baseAnalysis, confirmedActivities, answers }) {
  const allModules = new Set(baseAnalysis?.summary?.modules || []);

  confirmedActivities.forEach((activity) => {
    (activity.modules || []).forEach((module) => allModules.add(module));
  });

  answers.forEach((item) => {
    (item.analysis?.summary?.modules || []).forEach((module) => allModules.add(module));
  });

  const hasFinance =
    allModules.has("Finanzas") ||
    baseAnalysis?.costEstimate?.hasEstimate ||
    answers.some((item) => item.analysis?.costEstimate?.hasEstimate);

  const hasTasks =
    allModules.has("Tareas") ||
    confirmedActivities.some((item) => item.type === "Tareas");

  const hasProcesses =
    allModules.has("Procesos") ||
    allModules.has("Proceso") ||
    confirmedActivities.some((item) => item.type === "Proceso");

  return {
    hasFinance,
    hasTasks,
    hasProcesses,
  };
}

export function getExtraQuestionsFromAnswer(answerAnalysis, existingQuestions = []) {
  const questions = answerAnalysis?.smartQuestions || [];

  return questions
    .filter((question) => !existingQuestions.includes(question))
    .slice(0, 3);
}