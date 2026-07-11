// src/utils/dashboardReport.js
import { jsPDF } from "jspdf";

const PAGE = {
  width: 210,
  height: 297,
  margin: 16,
  bottom: 18,
};

const COLORS = {
  green: [22, 101, 52],
  greenLight: [240, 249, 241],
  greenSoft: [220, 252, 231],
  text: [31, 41, 55],
  muted: [100, 116, 139],
  border: [220, 229, 220],
  red: [185, 28, 28],
  amber: [180, 83, 9],
  blue: [29, 78, 216],
  white: [255, 255, 255],
};

function sanitizeFilename(value) {
  return String(value || "Finca")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 70);
}

function formatMoneyCRC(value) {
  return Number(value || 0).toLocaleString("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  });
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

function addFooter(doc, pageNumber) {
  const y = PAGE.height - 10;

  doc.setDrawColor(...COLORS.border);
  doc.line(PAGE.margin, y - 4, PAGE.width - PAGE.margin, y - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text("AgroMind CR - La finca que piensa.", PAGE.margin, y);
  doc.text(`Pagina ${pageNumber}`, PAGE.width - PAGE.margin, y, {
    align: "right",
  });
}

function ensureSpace(doc, y, requiredHeight, pageNumberRef) {
  if (y + requiredHeight <= PAGE.height - PAGE.bottom) return y;

  addFooter(doc, pageNumberRef.value);
  doc.addPage();
  pageNumberRef.value += 1;

  return PAGE.margin;
}

function drawSectionTitle(doc, title, y, pageNumberRef) {
  y = ensureSpace(doc, y, 14, pageNumberRef);

  doc.setFillColor(...COLORS.greenLight);
  doc.roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 11, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.green);
  doc.text(title, PAGE.margin + 4, y + 7.2);

  return y + 17;
}

function drawKpiCard(doc, { x, y, width, label, value }) {
  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(x, y, width, 25, 3, 3, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(label, x + 4, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...COLORS.green);
  doc.text(String(value ?? 0), x + 4, y + 18);
}

function drawInfoRow(
  doc,
  { title, description, meta = "", level = "success" },
  y,
  pageNumberRef
) {
  const availableWidth = PAGE.width - PAGE.margin * 2;
  const descriptionLines = doc.splitTextToSize(
    String(description || ""),
    availableWidth - 14
  );

  const rowHeight = Math.max(18, 12 + descriptionLines.length * 4);
  y = ensureSpace(doc, y, rowHeight + 3, pageNumberRef);

  const palette =
    level === "danger"
      ? { fill: [254, 242, 242], text: COLORS.red }
      : level === "warning"
      ? { fill: [255, 247, 237], text: COLORS.amber }
      : level === "info"
      ? { fill: [239, 246, 255], text: COLORS.blue }
      : { fill: COLORS.greenLight, text: COLORS.green };

  doc.setFillColor(...palette.fill);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(PAGE.margin, y, availableWidth, rowHeight, 3, 3, "FD");

  doc.setFillColor(...palette.text);
  doc.circle(PAGE.margin + 5, y + 6, 1.6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...palette.text);
  doc.text(String(title || "Registro"), PAGE.margin + 10, y + 7);

  if (meta) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(String(meta), PAGE.width - PAGE.margin - 4, y + 7, {
      align: "right",
    });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);
  doc.text(descriptionLines, PAGE.margin + 10, y + 12);

  return y + rowHeight + 4;
}

function buildExecutiveSummary({ kpis, alerts, finance }) {
  const parts = [
    `La finca registra ${kpis.activeProcesses} procesos activos`,
    `${kpis.pendingTasks} tareas pendientes`,
    `y ${kpis.registeredComponents} componentes`,
  ];

  const warningCount = alerts.filter(
    (alert) => alert.level !== "success"
  ).length;

  if (warningCount > 0) {
    parts.push(
      `Se identificaron ${warningCount} alertas que requieren seguimiento`
    );
  } else {
    parts.push("No se identificaron alertas operativas críticas");
  }

  parts.push(
    `El balance del mes es ${formatMoneyCRC(finance.balance)}`
  );

  return `${parts.join(". ")}.`;
}

export async function downloadDashboardReport(payload) {
  if (!payload?.farmName) {
    throw new Error("No hay una finca activa para generar el reporte.");
  }

  const {
    farmName,
    userName,
    generatedAt,
    kpis,
    alerts = [],
    recentActivity = [],
    upcomingTasks = [],
    finance,
    map,
    totals,
  } = payload;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageNumberRef = { value: 1 };
  let y = PAGE.margin;

  doc.setFillColor(...COLORS.green);
  doc.roundedRect(
    PAGE.margin,
    y,
    PAGE.width - PAGE.margin * 2,
    38,
    4,
    4,
    "F"
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.white);
  doc.text("AgroMind CR", PAGE.margin + 7, y + 12);

  doc.setFontSize(12);
  doc.text("Reporte ejecutivo de finca", PAGE.margin + 7, y + 21);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Finca: ${farmName}`, PAGE.margin + 7, y + 29);
  doc.text(
    `Generado: ${formatDate(generatedAt)}`,
    PAGE.width - PAGE.margin - 7,
    y + 12,
    { align: "right" }
  );
  doc.text(
    `Responsable: ${userName || "Usuario AgroMind"}`,
    PAGE.width - PAGE.margin - 7,
    y + 21,
    { align: "right" }
  );

  y += 46;

  y = drawSectionTitle(doc, "Resumen ejecutivo", y, pageNumberRef);

  const cardGap = 4;
  const cardWidth =
    (PAGE.width - PAGE.margin * 2 - cardGap * 2) / 3;

  drawKpiCard(doc, {
    x: PAGE.margin,
    y,
    width: cardWidth,
    label: "Procesos activos",
    value: kpis.activeProcesses,
  });

  drawKpiCard(doc, {
    x: PAGE.margin + cardWidth + cardGap,
    y,
    width: cardWidth,
    label: "Tareas pendientes",
    value: kpis.pendingTasks,
  });

  drawKpiCard(doc, {
    x: PAGE.margin + (cardWidth + cardGap) * 2,
    y,
    width: cardWidth,
    label: "Componentes",
    value: kpis.registeredComponents,
  });

  y += 32;

  const summaryLines = doc.splitTextToSize(
    buildExecutiveSummary({ kpis, alerts, finance }),
    PAGE.width - PAGE.margin * 2
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);
  doc.text(summaryLines, PAGE.margin, y);
  y += summaryLines.length * 4.5 + 8;

  y = drawSectionTitle(doc, "Alertas y seguimiento", y, pageNumberRef);

  alerts.forEach((alert) => {
    y = drawInfoRow(
      doc,
      {
        title: alert.title,
        description: alert.description,
        level: alert.level,
      },
      y,
      pageNumberRef
    );
  });

  y = drawSectionTitle(doc, "Proximas actividades", y, pageNumberRef);

  if (upcomingTasks.length === 0) {
    y = drawInfoRow(
      doc,
      {
        title: "Sin actividades proximas",
        description:
          "No existen tareas pendientes con fecha futura registrada.",
        level: "info",
      },
      y,
      pageNumberRef
    );
  } else {
    upcomingTasks.forEach((task) => {
      y = drawInfoRow(
        doc,
        {
          title: task.title || "Actividad",
          description: `${task.zone || "Zona general"}${
            task.owner ? ` - Responsable: ${task.owner}` : ""
          }`,
          meta: formatShortDate(task.due),
          level: "success",
        },
        y,
        pageNumberRef
      );
    });
  }

  y = drawSectionTitle(doc, "Finanzas del mes", y, pageNumberRef);

  const financeWidth =
    (PAGE.width - PAGE.margin * 2 - cardGap * 2) / 3;

  drawKpiCard(doc, {
    x: PAGE.margin,
    y,
    width: financeWidth,
    label: "Ingresos",
    value: formatMoneyCRC(finance.ingresos),
  });

  drawKpiCard(doc, {
    x: PAGE.margin + financeWidth + cardGap,
    y,
    width: financeWidth,
    label: "Gastos",
    value: formatMoneyCRC(finance.gastos),
  });

  drawKpiCard(doc, {
    x: PAGE.margin + (financeWidth + cardGap) * 2,
    y,
    width: financeWidth,
    label: "Balance",
    value: formatMoneyCRC(finance.balance),
  });

  y += 32;

  y = drawSectionTitle(doc, "Territorio y estructura", y, pageNumberRef);

  const mapItems = [
    ["Zonas", map.zones],
    ["Puntos", map.points],
    ["Lineas", map.lines],
    ["Procesos totales", totals.processes],
    ["Tareas totales", totals.tasks],
    ["Movimientos financieros", totals.movements],
  ];

  const rowWidth =
    (PAGE.width - PAGE.margin * 2 - cardGap * 2) / 3;

  mapItems.forEach(([label, value], index) => {
    if (index === 3) y += 29;

    const column = index % 3;
    drawKpiCard(doc, {
      x: PAGE.margin + column * (rowWidth + cardGap),
      y,
      width: rowWidth,
      label,
      value,
    });
  });

  y += 32;

  y = drawSectionTitle(doc, "Actividad reciente", y, pageNumberRef);

  if (recentActivity.length === 0) {
    y = drawInfoRow(
      doc,
      {
        title: "Sin actividad reciente",
        description:
          "Las acciones registradas en AgroMind aparecerán en esta sección.",
        level: "info",
      },
      y,
      pageNumberRef
    );
  } else {
    recentActivity.forEach((activity) => {
      y = drawInfoRow(
        doc,
        {
          title: activity.title,
          description: activity.description,
          meta: formatShortDate(activity.date),
          level: "success",
        },
        y,
        pageNumberRef
      );
    });
  }

  addFooter(doc, pageNumberRef.value);

  const dateKey = new Date(generatedAt || Date.now())
    .toISOString()
    .slice(0, 10);

  const filename = `Reporte_AgroMind_${sanitizeFilename(
    farmName
  )}_${dateKey}.pdf`;

  doc.save(filename);
}