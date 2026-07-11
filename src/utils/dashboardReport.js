// src/utils/dashboardReport.js
import { jsPDF } from "jspdf";

const PAGE = {
  width: 210,
  height: 297,
  margin: 15,
  top: 15,
  footerY: 287,
  contentBottom: 278,
};

const COLORS = {
  primary: [22, 101, 52],
  primaryDark: [18, 56, 23],
  primaryMid: [21, 128, 61],
  primarySoft: [238, 248, 236],
  primaryPale: [247, 252, 245],

  white: [255, 255, 255],
  paper: [252, 253, 251],
  text: [31, 41, 55],
  textStrong: [20, 52, 25],
  muted: [100, 116, 139],
  border: [220, 229, 220],

  green: [22, 163, 74],
  greenSoft: [240, 253, 244],

  red: [185, 28, 28],
  redSoft: [254, 242, 242],

  amber: [180, 83, 9],
  amberSoft: [255, 247, 237],

  blue: [29, 78, 216],
  blueSoft: [239, 246, 255],

  slate: [71, 85, 105],
  slateSoft: [248, 250, 252],
};

function sanitizeFilename(value) {
  return String(value || "Finca")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 70);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("es-CR", {
    maximumFractionDigits: 0,
  });
}

function formatMoneyCRC(value) {
  const amount = Number(value || 0);
  const sign = amount < 0 ? "-" : "";
  return `${sign}CRC ${formatNumber(Math.abs(amount))}`;
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return date.toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ? `${value}T12:00:00`
      : value
  );

  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return date.toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function pluralize(value, singular, plural) {
  return Number(value) === 1 ? singular : plural;
}

function getStatusLabel({ alerts, finance }) {
  const critical = alerts.filter((alert) => alert.level === "danger").length;
  const warnings = alerts.filter(
    (alert) => alert.level === "warning"
  ).length;

  if (critical > 0) {
    return {
      label: "Atencion prioritaria",
      description:
        "La finca presenta alertas criticas que requieren revision inmediata.",
      tone: "danger",
    };
  }

  if (warnings > 0) {
    return {
      label: "Seguimiento recomendado",
      description:
        "La operacion se mantiene activa, aunque existen puntos que requieren atencion.",
      tone: "warning",
    };
  }

  if (Number(finance?.balance || 0) < 0) {
    return {
      label: "Balance bajo observacion",
      description:
        "La operacion se mantiene estable, pero el balance financiero del periodo es negativo.",
      tone: "warning",
    };
  }

  return {
    label: "Operacion estable",
    description:
      "La finca mantiene una operacion general estable durante el periodo analizado.",
    tone: "success",
  };
}

function getTonePalette(tone) {
  if (tone === "danger") {
    return {
      fill: COLORS.redSoft,
      border: [248, 113, 113],
      text: COLORS.red,
      accent: COLORS.red,
    };
  }

  if (tone === "warning") {
    return {
      fill: COLORS.amberSoft,
      border: [251, 191, 36],
      text: COLORS.amber,
      accent: COLORS.amber,
    };
  }

  if (tone === "info") {
    return {
      fill: COLORS.blueSoft,
      border: [96, 165, 250],
      text: COLORS.blue,
      accent: COLORS.blue,
    };
  }

  return {
    fill: COLORS.greenSoft,
    border: [74, 222, 128],
    text: COLORS.primary,
    accent: COLORS.green,
  };
}

function addPageFooter(doc, pageNumber) {
  doc.setDrawColor(...COLORS.border);
  doc.line(PAGE.margin, PAGE.footerY - 6, PAGE.width - PAGE.margin, PAGE.footerY - 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);

  doc.text("AgroMind Business Intelligence", PAGE.margin, PAGE.footerY);
  doc.text("La finca que piensa.", PAGE.width / 2, PAGE.footerY, {
    align: "center",
  });
  doc.text(`Pagina ${pageNumber}`, PAGE.width - PAGE.margin, PAGE.footerY, {
    align: "right",
  });
}

function addPage(doc, pageNumberRef, pageTitle = "") {
  addPageFooter(doc, pageNumberRef.value);
  doc.addPage();
  pageNumberRef.value += 1;

  if (pageTitle) {
    drawPageHeader(doc, pageTitle, pageNumberRef.value);
    return 28;
  }

  return PAGE.top;
}

function ensureSpace(doc, y, requiredHeight, pageNumberRef, pageTitle = "") {
  if (y + requiredHeight <= PAGE.contentBottom) return y;
  return addPage(doc, pageNumberRef, pageTitle);
}

function drawPageHeader(doc, title, pageNumber) {
  doc.setFillColor(...COLORS.primaryDark);
  doc.rect(0, 0, PAGE.width, 18, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.white);
  doc.text("AgroMind CR", PAGE.margin, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(title, PAGE.width - PAGE.margin, 11, { align: "right" });

  doc.setDrawColor(...COLORS.border);
  doc.line(PAGE.margin, 23, PAGE.width - PAGE.margin, 23);

  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Reporte ejecutivo · Pagina ${pageNumber}`, PAGE.margin, 27);
}

function drawCoverHeader(doc, { farmName, userName, generatedAt }) {
  doc.setFillColor(...COLORS.primaryDark);
  doc.roundedRect(PAGE.margin, PAGE.top, PAGE.width - PAGE.margin * 2, 57, 5, 5, "F");

  doc.setFillColor(...COLORS.primaryMid);
  doc.circle(PAGE.width - 35, 23, 24, "F");

  doc.setFillColor(...COLORS.primary);
  doc.circle(PAGE.width - 28, 35, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(23);
  doc.text("AgroMind CR", PAGE.margin + 8, PAGE.top + 14);

  doc.setFontSize(12);
  doc.text("Reporte Ejecutivo de Finca", PAGE.margin + 8, PAGE.top + 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Business Intelligence", PAGE.margin + 8, PAGE.top + 35);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(String(farmName), PAGE.margin + 8, PAGE.top + 45);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Generado: ${formatDate(generatedAt)}`,
    PAGE.width - PAGE.margin - 8,
    PAGE.top + 45,
    { align: "right" }
  );

  doc.text(
    `Responsable: ${userName || "Usuario AgroMind"}`,
    PAGE.width - PAGE.margin - 8,
    PAGE.top + 51,
    { align: "right" }
  );
}

function drawSectionLabel(doc, title, subtitle, y, pageNumberRef, pageTitle = "") {
  y = ensureSpace(doc, y, subtitle ? 18 : 13, pageNumberRef, pageTitle);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.textStrong);
  doc.text(title, PAGE.margin, y + 5);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(subtitle, PAGE.margin, y + 11);
  }

  doc.setDrawColor(...COLORS.border);
  doc.line(PAGE.margin, y + (subtitle ? 14 : 9), PAGE.width - PAGE.margin, y + (subtitle ? 14 : 9));

  return y + (subtitle ? 20 : 15);
}

function drawStatusCard(doc, status, y) {
  const palette = getTonePalette(status.tone);

  doc.setFillColor(...palette.fill);
  doc.setDrawColor(...palette.border);
  doc.roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 29, 4, 4, "FD");

  doc.setFillColor(...palette.accent);
  doc.roundedRect(PAGE.margin + 4, y + 4, 20, 21, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.white);
  doc.text("BI", PAGE.margin + 14, y + 17, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...palette.text);
  doc.text(status.label, PAGE.margin + 30, y + 10);

  const lines = doc.splitTextToSize(status.description, 142);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);
  doc.text(lines, PAGE.margin + 30, y + 17);

  return y + 35;
}

function drawKpiCard(doc, {
  x,
  y,
  width,
  height = 28,
  label,
  value,
  tone = "green",
  subtitle = "",
}) {
  const palette = getTonePalette(tone);

  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(x, y, width, height, 4, 4, "FD");

  doc.setFillColor(...palette.accent);
  doc.roundedRect(x + 4, y + 4, 3, height - 8, 1.5, 1.5, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(String(label), x + 11, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...palette.text);

  const valueText = String(value ?? 0);
  const maxWidth = width - 15;

  if (doc.getTextWidth(valueText) > maxWidth) {
    doc.setFontSize(11);
  }

  doc.text(valueText, x + 11, y + 19);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...COLORS.muted);
    doc.text(subtitle, x + 11, y + height - 4);
  }
}

function drawSummaryBox(doc, text, y, pageNumberRef, pageTitle = "") {
  const width = PAGE.width - PAGE.margin * 2;
  const lines = doc.splitTextToSize(String(text), width - 12);
  const height = 12 + lines.length * 4.2;

  y = ensureSpace(doc, y, height + 4, pageNumberRef, pageTitle);

  doc.setFillColor(...COLORS.primaryPale);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(PAGE.margin, y, width, height, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.primary);
  doc.text("LECTURA EJECUTIVA", PAGE.margin + 6, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.text);
  doc.text(lines, PAGE.margin + 6, y + 13);

  return y + height + 6;
}

function drawListCard(
  doc,
  { title, description, meta = "", tone = "success" },
  y,
  pageNumberRef,
  pageTitle = ""
) {
  const palette = getTonePalette(tone);
  const availableWidth = PAGE.width - PAGE.margin * 2;
  const textWidth = meta ? availableWidth - 54 : availableWidth - 18;
  const lines = doc.splitTextToSize(String(description || ""), textWidth);
  const height = Math.max(20, 13 + lines.length * 4.1);

  y = ensureSpace(doc, y, height + 4, pageNumberRef, pageTitle);

  doc.setFillColor(...palette.fill);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(PAGE.margin, y, availableWidth, height, 4, 4, "FD");

  doc.setFillColor(...palette.accent);
  doc.circle(PAGE.margin + 6, y + 7, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(...palette.text);
  doc.text(String(title || "Registro"), PAGE.margin + 12, y + 8);

  if (meta) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(String(meta), PAGE.width - PAGE.margin - 5, y + 8, {
      align: "right",
    });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);
  doc.text(lines, PAGE.margin + 12, y + 14);

  return y + height + 4;
}

function drawBarComparison(doc, {
  y,
  income,
  expense,
  balance,
}) {
  const maxValue = Math.max(Math.abs(income), Math.abs(expense), 1);
  const chartWidth = PAGE.width - PAGE.margin * 2 - 42;
  const incomeWidth = Math.max(4, (Math.abs(income) / maxValue) * chartWidth);
  const expenseWidth = Math.max(4, (Math.abs(expense) / maxValue) * chartWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textStrong);
  doc.text("Ingresos", PAGE.margin, y + 4);

  doc.setFillColor(...COLORS.border);
  doc.roundedRect(PAGE.margin + 32, y, chartWidth, 7, 3.5, 3.5, "F");

  doc.setFillColor(...COLORS.green);
  doc.roundedRect(PAGE.margin + 32, y, incomeWidth, 7, 3.5, 3.5, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(formatMoneyCRC(income), PAGE.width - PAGE.margin, y + 5, {
    align: "right",
  });

  y += 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textStrong);
  doc.text("Gastos", PAGE.margin, y + 4);

  doc.setFillColor(...COLORS.border);
  doc.roundedRect(PAGE.margin + 32, y, chartWidth, 7, 3.5, 3.5, "F");

  doc.setFillColor(...COLORS.red);
  doc.roundedRect(PAGE.margin + 32, y, expenseWidth, 7, 3.5, 3.5, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(formatMoneyCRC(expense), PAGE.width - PAGE.margin, y + 5, {
    align: "right",
  });

  y += 17;

  const balanceTone = balance < 0 ? "danger" : "success";
  const palette = getTonePalette(balanceTone);

  doc.setFillColor(...palette.fill);
  doc.setDrawColor(...palette.border);
  doc.roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 20, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...palette.text);
  doc.text("Balance del periodo", PAGE.margin + 6, y + 7);

  doc.setFontSize(15);
  doc.text(formatMoneyCRC(balance), PAGE.margin + 6, y + 16);

  return y + 27;
}

function buildExecutiveSummary({ kpis, alerts, finance }) {
  const processText = `${kpis.activeProcesses} ${pluralize(
    kpis.activeProcesses,
    "proceso activo",
    "procesos activos"
  )}`;

  const taskText = `${kpis.pendingTasks} ${pluralize(
    kpis.pendingTasks,
    "tarea pendiente",
    "tareas pendientes"
  )}`;

  const componentText = `${kpis.registeredComponents} ${pluralize(
    kpis.registeredComponents,
    "componente registrado",
    "componentes registrados"
  )}`;

  const warningCount = alerts.filter(
    (alert) => alert.level !== "success"
  ).length;

  const alertText =
    warningCount > 0
      ? `${warningCount} ${pluralize(
          warningCount,
          "alerta requiere",
          "alertas requieren"
        )} seguimiento`
      : "no se identifican alertas operativas criticas";

  const financeText =
    Number(finance.balance || 0) >= 0
      ? `el balance del periodo es positivo por ${formatMoneyCRC(
          finance.balance
        )}`
      : `el balance del periodo es negativo por ${formatMoneyCRC(
          finance.balance
        )}`;

  return `Durante el periodo analizado, la finca registra ${processText}, ${taskText} y ${componentText}. Ademas, ${alertText}. En el frente financiero, ${financeText}.`;
}

function buildOperationalConclusion({ alerts, upcomingTasks, recentActivity }) {
  const dangerCount = alerts.filter((alert) => alert.level === "danger").length;
  const warningCount = alerts.filter((alert) => alert.level === "warning").length;

  if (dangerCount > 0) {
    return "La prioridad operativa debe concentrarse en resolver las alertas criticas antes de ampliar nuevas actividades o procesos.";
  }

  if (warningCount > 0) {
    return "La operacion se mantiene activa, pero conviene atender primero las alertas pendientes y luego continuar con la planificacion.";
  }

  if (upcomingTasks.length === 0 && recentActivity.length === 0) {
    return "No se observan alertas relevantes, aunque la finca presenta poca actividad registrada durante el periodo.";
  }

  return "La operacion presenta continuidad y no muestra alertas criticas. El enfoque debe mantenerse en el cumplimiento de las proximas actividades.";
}

function buildFinancialConclusion(finance) {
  const income = Number(finance.income ?? finance.ingresos ?? 0);
  const expense = Number(finance.expense ?? finance.gastos ?? 0);
  const balance = Number(finance.balance || 0);

  if (balance < 0) {
    return "El balance del periodo es negativo. Se recomienda revisar los gastos recientes y priorizar movimientos directamente vinculados con la operacion productiva.";
  }

  if (income === 0 && expense === 0) {
    return "No existen movimientos financieros registrados para el periodo analizado. La lectura financiera aun no es representativa.";
  }

  if (expense > income * 0.8) {
    return "El balance es positivo, aunque los gastos consumen una proporcion alta de los ingresos. Conviene revisar eficiencia y margen operativo.";
  }

  return "La finca mantiene un balance financiero positivo durante el periodo. El siguiente paso es sostener el control de gastos y registrar cada movimiento oportunamente.";
}

function buildTerritoryConclusion({ map, totals }) {
  const territoryElements =
    Number(map.zones || 0) +
    Number(map.points || 0) +
    Number(map.lines || 0);

  if (territoryElements === 0) {
    return "La finca aun no tiene una estructura territorial registrada en el mapa. Completar esta informacion aumentara el valor de los analisis.";
  }

  if (Number(map.zones || 0) > 0 && Number(totals.processes || 0) === 0) {
    return "La finca cuenta con estructura territorial registrada, pero todavia no existen procesos asociados. Vincular procesos con zonas mejorara el seguimiento.";
  }

  return "La finca cuenta con una base territorial organizada y suficiente para sostener el seguimiento de procesos, tareas y componentes.";
}

export async function downloadDashboardReport(payload) {
  if (!payload?.farmName) {
    throw new Error("No hay una finca activa para generar el reporte.");
  }

  const {
    farmName,
    userName,
    generatedAt,
    kpis = {},
    alerts = [],
    recentActivity = [],
    upcomingTasks = [],
    finance = {},
    map = {},
    totals = {},
  } = payload;

  const normalizedFinance = {
    income: Number(finance.ingresos ?? finance.income ?? 0),
    expense: Number(finance.gastos ?? finance.expense ?? 0),
    balance: Number(finance.balance || 0),
  };

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageNumberRef = { value: 1 };

  // PAGE 1 — EXECUTIVE COVER
  drawCoverHeader(doc, {
    farmName,
    userName,
    generatedAt,
  });

  let y = 80;

  const status = getStatusLabel({
    alerts,
    finance: normalizedFinance,
  });

  y = drawStatusCard(doc, status, y);

  y = drawSectionLabel(
    doc,
    "Resumen ejecutivo",
    "Lectura general del estado actual de la finca",
    y,
    pageNumberRef
  );

  const gap = 4;
  const width = (PAGE.width - PAGE.margin * 2 - gap * 2) / 3;

  drawKpiCard(doc, {
    x: PAGE.margin,
    y,
    width,
    label: "Procesos activos",
    value: kpis.activeProcesses || 0,
    tone: "success",
    subtitle: "En ejecucion",
  });

  drawKpiCard(doc, {
    x: PAGE.margin + width + gap,
    y,
    width,
    label: "Tareas pendientes",
    value: kpis.pendingTasks || 0,
    tone: "warning",
    subtitle: "Por atender",
  });

  drawKpiCard(doc, {
    x: PAGE.margin + (width + gap) * 2,
    y,
    width,
    label: "Componentes",
    value: kpis.registeredComponents || 0,
    tone: "info",
    subtitle: "Registrados",
  });

  y += 35;

  y = drawSummaryBox(
    doc,
    buildExecutiveSummary({
      kpis,
      alerts,
      finance: normalizedFinance,
    }),
    y,
    pageNumberRef
  );

  y = drawSectionLabel(
    doc,
    "Indicadores clave",
    "Panorama compacto para toma de decisiones",
    y,
    pageNumberRef
  );

  const secondaryWidth = (PAGE.width - PAGE.margin * 2 - gap) / 2;

  drawKpiCard(doc, {
    x: PAGE.margin,
    y,
    width: secondaryWidth,
    label: "Alertas activas",
    value: alerts.filter((alert) => alert.level !== "success").length,
    tone:
      alerts.some((alert) => alert.level === "danger")
        ? "danger"
        : alerts.some((alert) => alert.level === "warning")
        ? "warning"
        : "success",
  });

  drawKpiCard(doc, {
    x: PAGE.margin + secondaryWidth + gap,
    y,
    width: secondaryWidth,
    label: "Balance del periodo",
    value: formatMoneyCRC(normalizedFinance.balance),
    tone: normalizedFinance.balance < 0 ? "danger" : "success",
  });

  y += 35;

  y = drawSummaryBox(
    doc,
    buildOperationalConclusion({
      alerts,
      upcomingTasks,
      recentActivity,
    }),
    y,
    pageNumberRef
  );

  addPageFooter(doc, pageNumberRef.value);

  // PAGE 2 — OPERATION
  doc.addPage();
  pageNumberRef.value += 1;
  drawPageHeader(doc, "Operacion y seguimiento", pageNumberRef.value);
  y = 32;

  y = drawSectionLabel(
    doc,
    "Alertas y seguimiento",
    "Situaciones que requieren atencion operativa",
    y,
    pageNumberRef,
    "Operacion y seguimiento"
  );

  if (alerts.length === 0) {
    y = drawListCard(
      doc,
      {
        title: "Sin alertas activas",
        description:
          "No existen alertas relevantes para la finca en este momento.",
        tone: "success",
      },
      y,
      pageNumberRef,
      "Operacion y seguimiento"
    );
  } else {
    alerts.forEach((alert) => {
      y = drawListCard(
        doc,
        {
          title: alert.title,
          description: alert.description,
          tone: alert.level,
        },
        y,
        pageNumberRef,
        "Operacion y seguimiento"
      );
    });
  }

  y = drawSectionLabel(
    doc,
    "Proximas actividades",
    "Tareas pendientes con fecha futura",
    y + 4,
    pageNumberRef,
    "Operacion y seguimiento"
  );

  if (upcomingTasks.length === 0) {
    y = drawListCard(
      doc,
      {
        title: "Sin actividades proximas",
        description:
          "No existen tareas pendientes con fecha futura registrada.",
        tone: "info",
      },
      y,
      pageNumberRef,
      "Operacion y seguimiento"
    );
  } else {
    upcomingTasks.forEach((task) => {
      y = drawListCard(
        doc,
        {
          title: task.title || "Actividad",
          description: `${task.zone || "Zona general"}${
            task.owner ? ` · Responsable: ${task.owner}` : ""
          }`,
          meta: formatShortDate(task.due),
          tone: "success",
        },
        y,
        pageNumberRef,
        "Operacion y seguimiento"
      );
    });
  }

  y = drawSectionLabel(
    doc,
    "Actividad reciente",
    "Ultimos registros relevantes de la finca",
    y + 4,
    pageNumberRef,
    "Operacion y seguimiento"
  );

  if (recentActivity.length === 0) {
    y = drawListCard(
      doc,
      {
        title: "Sin actividad reciente",
        description:
          "Las acciones registradas en AgroMind apareceran en esta seccion.",
        tone: "info",
      },
      y,
      pageNumberRef,
      "Operacion y seguimiento"
    );
  } else {
    recentActivity.forEach((activity) => {
      y = drawListCard(
        doc,
        {
          title: activity.title,
          description: activity.description,
          meta: formatShortDate(activity.date),
          tone: "success",
        },
        y,
        pageNumberRef,
        "Operacion y seguimiento"
      );
    });
  }

  addPageFooter(doc, pageNumberRef.value);

  // PAGE 3 — FINANCE
  doc.addPage();
  pageNumberRef.value += 1;
  drawPageHeader(doc, "Finanzas del periodo", pageNumberRef.value);
  y = 32;

  y = drawSectionLabel(
    doc,
    "Resumen financiero",
    "Ingresos, gastos y balance del periodo actual",
    y,
    pageNumberRef,
    "Finanzas del periodo"
  );

  const financeCardWidth = (PAGE.width - PAGE.margin * 2 - gap * 2) / 3;

  drawKpiCard(doc, {
    x: PAGE.margin,
    y,
    width: financeCardWidth,
    height: 31,
    label: "Ingresos",
    value: formatMoneyCRC(normalizedFinance.income),
    tone: "success",
  });

  drawKpiCard(doc, {
    x: PAGE.margin + financeCardWidth + gap,
    y,
    width: financeCardWidth,
    height: 31,
    label: "Gastos",
    value: formatMoneyCRC(normalizedFinance.expense),
    tone: "danger",
  });

  drawKpiCard(doc, {
    x: PAGE.margin + (financeCardWidth + gap) * 2,
    y,
    width: financeCardWidth,
    height: 31,
    label: "Balance",
    value: formatMoneyCRC(normalizedFinance.balance),
    tone: normalizedFinance.balance < 0 ? "danger" : "success",
  });

  y += 42;

  y = drawSectionLabel(
    doc,
    "Relacion ingresos-gastos",
    "Comparacion visual del movimiento financiero",
    y,
    pageNumberRef,
    "Finanzas del periodo"
  );

  y = drawBarComparison(doc, {
    y,
    income: normalizedFinance.income,
    expense: normalizedFinance.expense,
    balance: normalizedFinance.balance,
  });

  y = drawSectionLabel(
    doc,
    "Lectura financiera",
    "Interpretacion ejecutiva del periodo",
    y,
    pageNumberRef,
    "Finanzas del periodo"
  );

  y = drawSummaryBox(
    doc,
    buildFinancialConclusion(normalizedFinance),
    y,
    pageNumberRef,
    "Finanzas del periodo"
  );

  y = drawSectionLabel(
    doc,
    "Datos de control",
    "Volumen de registros utilizados en el analisis",
    y,
    pageNumberRef,
    "Finanzas del periodo"
  );

  const controlWidth = (PAGE.width - PAGE.margin * 2 - gap) / 2;

  drawKpiCard(doc, {
    x: PAGE.margin,
    y,
    width: controlWidth,
    label: "Movimientos financieros",
    value: totals.movements || 0,
    tone: "info",
  });

  drawKpiCard(doc, {
    x: PAGE.margin + controlWidth + gap,
    y,
    width: controlWidth,
    label: "Tareas totales",
    value: totals.tasks || 0,
    tone: "warning",
  });

  addPageFooter(doc, pageNumberRef.value);

  // PAGE 4 — TERRITORY
  doc.addPage();
  pageNumberRef.value += 1;
  drawPageHeader(doc, "Territorio y estructura", pageNumberRef.value);
  y = 32;

  y = drawSectionLabel(
    doc,
    "Mapa de la finca",
    "Estructura territorial registrada en AgroMind",
    y,
    pageNumberRef,
    "Territorio y estructura"
  );

  const mapWidth = (PAGE.width - PAGE.margin * 2 - gap) / 2;

  drawKpiCard(doc, {
    x: PAGE.margin,
    y,
    width: mapWidth,
    height: 32,
    label: "Zonas",
    value: map.zones || 0,
    tone: "success",
    subtitle: "Areas delimitadas",
  });

  drawKpiCard(doc, {
    x: PAGE.margin + mapWidth + gap,
    y,
    width: mapWidth,
    height: 32,
    label: "Puntos",
    value: map.points || 0,
    tone: "info",
    subtitle: "Referencias puntuales",
  });

  y += 39;

  drawKpiCard(doc, {
    x: PAGE.margin,
    y,
    width: mapWidth,
    height: 32,
    label: "Lineas",
    value: map.lines || 0,
    tone: "warning",
    subtitle: "Trazos registrados",
  });

  drawKpiCard(doc, {
    x: PAGE.margin + mapWidth + gap,
    y,
    width: mapWidth,
    height: 32,
    label: "Componentes",
    value: kpis.registeredComponents || 0,
    tone: "success",
    subtitle: "Elementos de finca",
  });

  y += 42;

  y = drawSectionLabel(
    doc,
    "Estructura operativa",
    "Relacion entre territorio, procesos y actividades",
    y,
    pageNumberRef,
    "Territorio y estructura"
  );

  const operationalWidth = (PAGE.width - PAGE.margin * 2 - gap * 2) / 3;

  drawKpiCard(doc, {
    x: PAGE.margin,
    y,
    width: operationalWidth,
    label: "Procesos totales",
    value: totals.processes || 0,
    tone: "success",
  });

  drawKpiCard(doc, {
    x: PAGE.margin + operationalWidth + gap,
    y,
    width: operationalWidth,
    label: "Tareas totales",
    value: totals.tasks || 0,
    tone: "warning",
  });

  drawKpiCard(doc, {
    x: PAGE.margin + (operationalWidth + gap) * 2,
    y,
    width: operationalWidth,
    label: "Movimientos",
    value: totals.movements || 0,
    tone: "info",
  });

  y += 36;

  y = drawSectionLabel(
    doc,
    "Lectura territorial",
    "Interpretacion ejecutiva de la estructura registrada",
    y,
    pageNumberRef,
    "Territorio y estructura"
  );

  y = drawSummaryBox(
    doc,
    buildTerritoryConclusion({
      map,
      totals,
    }),
    y,
    pageNumberRef,
    "Territorio y estructura"
  );

  y = drawSectionLabel(
    doc,
    "Cierre ejecutivo",
    "Vision general para seguimiento",
    y,
    pageNumberRef,
    "Territorio y estructura"
  );

  y = drawSummaryBox(
    doc,
    "Este reporte resume el estado actual de la finca con base en los datos registrados en AgroMind. Su valor aumenta conforme se mantienen actualizados los procesos, tareas, movimientos financieros, componentes y registros de bitacora.",
    y,
    pageNumberRef,
    "Territorio y estructura"
  );

  addPageFooter(doc, pageNumberRef.value);

  const dateKey = new Date(generatedAt || Date.now())
    .toISOString()
    .slice(0, 10);

  const filename = `Reporte_AgroMind_${sanitizeFilename(
    farmName
  )}_${dateKey}.pdf`;

  doc.save(filename);
}
