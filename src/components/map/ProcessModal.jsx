import React, { useEffect, useMemo, useState } from "react";
import { useFarm } from "../../context/FarmContext";

function nowIso() {
  return new Date().toISOString();
}

function todayYYYYMMDD() {
  return new Date().toISOString().slice(0, 10);
}

function formatProcessDate(date) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("es-CR");
  } catch {
    return "—";
  }
}

function addDaysToYYYYMMDD(startDate, durationDays) {
  if (!startDate) return "";
  const days = Number(durationDays);
  if (!Number.isFinite(days) || days < 0) return "";

  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addOneDayYYYYMMDD(dateValue) {
  if (!dateValue) return todayYYYYMMDD();

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return todayYYYYMMDD();

  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getStepDueDate(step) {
  if (!step) return "";
  if (step.dueDate || step.targetDate || step.endDate) {
    return step.dueDate || step.targetDate || step.endDate;
  }
  return addDaysToYYYYMMDD(step.startDate, step.durationDays || step.days || step.duration || 0);
}

function getSortedSteps(steps = []) {
  if (!Array.isArray(steps)) return [];
  return [...steps].sort((a, b) => {
    const ao = Number(a?.stepOrder || a?.order || 0);
    const bo = Number(b?.stepOrder || b?.order || 0);
    return ao - bo;
  });
}

function getNextStepStartDate(steps = []) {
  const sortedSteps = getSortedSteps(steps);
  if (sortedSteps.length === 0) return todayYYYYMMDD();

  const lastStep = sortedSteps[sortedSteps.length - 1];
  const lastDueDate = getStepDueDate(lastStep);

  return addOneDayYYYYMMDD(lastDueDate);
}

function getNextStepNumber(steps = []) {
  const sortedSteps = getSortedSteps(steps);
  if (sortedSteps.length === 0) return 1;
  const maxOrder = sortedSteps.reduce((max, step, index) => {
    const order = Number(step?.stepOrder || step?.order || index + 1);
    return Number.isFinite(order) && order > max ? order : max;
  }, 0);
  return maxOrder + 1;
}

function getStepDraftForProcess(process) {
  const steps = Array.isArray(process?.steps) ? process.steps : [];
  const nextStepNumber = getNextStepNumber(steps);

  return {
    localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `Etapa ${nextStepNumber}`,
    startDate: getNextStepStartDate(steps),
    durationDays: "7",
    notes: "",
  };
}

function getDurationDays(startDate, dueDate) {
  if (!startDate || !dueDate) return "—";

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${dueDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";

  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return diff >= 0 ? String(diff) : "—";
}

function getEmptyStepDraft(order = 1) {
  return {
    localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `Etapa ${order}`,
    startDate: todayYYYYMMDD(),
    durationDays: "7",
    notes: "",
  };
}

function getProgressFromSteps(steps = []) {
  const total = Array.isArray(steps) ? steps.length : 0;
  if (total === 0) return 0;
  const completed = steps.filter((s) => s?.status === "Completada").length;
  return Math.round((completed / total) * 100);
}

function getPriorityPillStyle(priority) {
  const v = String(priority || "Media").toLowerCase();

  if (v === "alta") {
    return {
      border: "1px solid rgba(248,113,113,0.34)",
      background: "rgba(248,113,113,0.12)",
      color: "#fecaca",
    };
  }

  if (v === "baja") {
    return {
      border: "1px solid rgba(96,165,250,0.34)",
      background: "rgba(96,165,250,0.12)",
      color: "#bfdbfe",
    };
  }

  return {
    border: "1px solid rgba(250,204,21,0.34)",
    background: "rgba(250,204,21,0.12)",
    color: "#fde68a",
  };
}

function getStatusPillStyle(status) {
  const v = String(status || "").toLowerCase();

  if (v === "completado" || v === "completada") {
    return {
      border: "1px solid rgba(34,197,94,0.34)",
      background: "rgba(34,197,94,0.12)",
      color: "#bbf7d0",
    };
  }

  if (v === "bloqueado" || v === "bloqueada") {
    return {
      border: "1px solid rgba(248,113,113,0.34)",
      background: "rgba(248,113,113,0.12)",
      color: "#fecaca",
    };
  }

  if (v === "en progreso" || v === "activo") {
    return {
      border: "1px solid rgba(56,189,248,0.34)",
      background: "rgba(56,189,248,0.12)",
      color: "#bae6fd",
    };
  }

  if (v === "pausado") {
    return {
      border: "1px solid rgba(148,163,184,0.34)",
      background: "rgba(148,163,184,0.12)",
      color: "#cbd5e1",
    };
  }

  return {
    border: "1px solid rgba(250,204,21,0.34)",
    background: "rgba(250,204,21,0.12)",
    color: "#fde68a",
  };
}

const PROCESS_PRIORITIES = ["Baja", "Media", "Alta"];

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#cbd5e1",
  fontSize: "0.78rem",
  fontWeight: 700,
};

const tinyPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0.18rem 0.55rem",
  borderRadius: "999px",
  fontSize: "0.72rem",
  fontWeight: 700,
};

function ProcessModalView({
  modalZone,
  modalZoneProcesses = [],
  processesLoading = false,
  processesError = "",
  processActionLoading = false,

  showCreateProcessForm = false,
  setShowCreateProcessForm,

  newProcessName = "",
  setNewProcessName,
  newProcessDescription = "",
  setNewProcessDescription,
  newProcessOwner = "",
  setNewProcessOwner,
  newProcessPriority = "Media",
  setNewProcessPriority,
  setNewProcessStartDate,
  setNewProcessTargetDate,

  newStepByProcess = {},
  openStepFormByProcess = {},
  setOpenStepFormByProcess,

  setProcessesError,
  updateStepDraftField,

  createProcessForZone,
  createStepForProcess,
  toggleStepCompletion,
  updateProcessStatus,
  deleteProcess,
}) {
  const { isConsultant } = useFarm();
  const canEdit = !isConsultant;

  const [draftSteps, setDraftSteps] = useState([getEmptyStepDraft(1)]);
  const [searchText, setSearchText] = useState("");
  const [expandedProcessById, setExpandedProcessById] = useState({});

  const shouldShowBuilder =
    canEdit && (showCreateProcessForm || modalZoneProcesses.length === 0);

  useEffect(() => {
    if (!modalZone?.id) return;
    if (!newProcessName && modalZoneProcesses.length === 0) {
      setNewProcessName("");
      setNewProcessDescription("");
      setNewProcessOwner("");
      setNewProcessPriority("Media");
      setNewProcessStartDate("");
      setNewProcessTargetDate("");
      setDraftSteps([getEmptyStepDraft(1)]);
    }
  }, [modalZone?.id]);

  const processStats = useMemo(() => {
    const total = modalZoneProcesses.length;
    const active = modalZoneProcesses.filter((p) => p.status === "Activo").length;
    const completed = modalZoneProcesses.filter((p) => p.status === "Completado").length;
    const pending = modalZoneProcesses.filter((p) => !p.status || p.status === "Pendiente").length;
    return { total, active, completed, pending };
  }, [modalZoneProcesses]);

  const filteredProcesses = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return modalZoneProcesses;
    return modalZoneProcesses.filter((process) => {
      return [process.name, process.description, process.owner, process.status, process.priority]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [modalZoneProcesses, searchText]);

  useEffect(() => {
    setExpandedProcessById({});
  }, [modalZone?.id]);

  const toggleProcessExpansion = (processId) => {
    setExpandedProcessById((prev) => ({
      ...prev,
      [processId]: !prev[processId],
    }));
  };

  if (!modalZone) return null;

  const resetBuilder = () => {
    setShowCreateProcessForm(false);
    setNewProcessName("");
    setNewProcessDescription("");
    setNewProcessOwner("");
    setNewProcessPriority("Media");
    setNewProcessStartDate("");
    setNewProcessTargetDate("");
    setDraftSteps([getEmptyStepDraft(1)]);
    setProcessesError("");
  };

  const addDraftStep = () => {
    setDraftSteps((prev) => {
      const lastStep = prev[prev.length - 1];
      const lastDueDate = addDaysToYYYYMMDD(lastStep?.startDate, lastStep?.durationDays);
      return [
        ...prev,
        {
          ...getEmptyStepDraft(prev.length + 1),
          startDate: addOneDayYYYYMMDD(lastDueDate),
        },
      ];
    });
  };

  const updateDraftStep = (localId, field, value) => {
    setDraftSteps((prev) => {
      const updated = prev.map((step) =>
        step.localId === localId
          ? {
              ...step,
              [field]: value,
            }
          : step
      );

      if (field !== "startDate" && field !== "durationDays") return updated;

      return updated.map((step, index, allSteps) => {
        if (index === 0) return step;

        const previousStep = allSteps[index - 1];
        const previousDueDate = addDaysToYYYYMMDD(
          previousStep?.startDate,
          previousStep?.durationDays
        );

        return {
          ...step,
          startDate: addOneDayYYYYMMDD(previousDueDate),
        };
      });
    });
  };

  const removeDraftStep = (localId) => {
    setDraftSteps((prev) => {
      const next = prev.filter((step) => step.localId !== localId);
      return next.length > 0 ? next : [getEmptyStepDraft(1)];
    });
  };

  const saveProcessLab = async () => {
    if (!canEdit) return;

    const cleanSteps = draftSteps
      .map((step, index) => {
        const safeName = step.name?.trim() || `Etapa ${index + 1}`;
        const dueDate = addDaysToYYYYMMDD(step.startDate, step.durationDays);
        return {
          name: safeName,
          startDate: step.startDate,
          durationDays: step.durationDays,
          dueDate,
          notes: step.notes || "",
        };
      })
      .filter((step) => step.name || step.startDate || step.durationDays || step.notes);

    await createProcessForZone(
      {
        name: newProcessName,
        description: newProcessDescription,
        owner: newProcessOwner,
        priority: newProcessPriority,
        type: "General",
        status: "Activo",
      },
      cleanSteps
    );

    setDraftSteps([getEmptyStepDraft(1)]);
  };

  return (
    <div
      id="zone-processes-section"
      style={{
        marginBottom: 0,
        padding: "18px",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        minHeight: 0,
        boxSizing: "border-box",
        display: "block",
        flex: "0 0 auto",
        overflow: "visible",
        borderRadius: "24px",
        border: "1px solid rgba(34,197,94,0.24)",
        background:
          "radial-gradient(circle at 12% 0%, rgba(34,197,94,0.22), transparent 30%), radial-gradient(circle at 92% 8%, rgba(20,184,166,0.14), transparent 26%), linear-gradient(160deg, rgba(9,18,39,0.97), rgba(2,6,23,0.99))",
        boxShadow: "0 26px 70px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >

      <style>{`
        #zone-processes-section {
          position: relative;
          isolation: isolate;
        }

        #zone-processes-section,
        #zone-processes-section * {
          box-sizing: border-box;
        }

        #zone-processes-section > * {
          min-width: 0;
        }

        #zone-processes-section::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 24px;
          pointer-events: none;
          background:
            radial-gradient(circle at var(--pl-x, 18%) var(--pl-y, 0%), rgba(34,197,94,0.13), transparent 28%),
            linear-gradient(120deg, transparent, rgba(20,184,166,0.045), transparent);
          opacity: 0.85;
          transition: opacity 220ms ease;
          z-index: -1;
        }

        #zone-processes-section .pl-stat-card,
        #zone-processes-section .pl-process-card,
        #zone-processes-section .pl-step-card,
        #zone-processes-section .pl-draft-step,
        #zone-processes-section .pl-builder-panel {
          position: relative;
          overflow: hidden;
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease,
            filter 180ms ease;
        }

        #zone-processes-section .pl-stat-card::before,
        #zone-processes-section .pl-process-card::before,
        #zone-processes-section .pl-step-card::before,
        #zone-processes-section .pl-draft-step::before,
        #zone-processes-section .pl-builder-panel::before {
          content: "";
          position: absolute;
          inset: -1px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 180ms ease;
          background:
            radial-gradient(circle at var(--mouse-x, 18%) var(--mouse-y, 18%), rgba(34,197,94,0.20), transparent 22%),
            linear-gradient(120deg, transparent, rgba(20,184,166,0.10), transparent);
        }

        #zone-processes-section .pl-stat-card:hover,
        #zone-processes-section .pl-process-card:hover,
        #zone-processes-section .pl-step-card:hover,
        #zone-processes-section .pl-draft-step:hover,
        #zone-processes-section .pl-builder-panel:hover {
          transform: translateY(-2px);
          border-color: rgba(34,197,94,0.40) !important;
          box-shadow:
            0 18px 44px rgba(0,0,0,0.34),
            0 0 0 1px rgba(34,197,94,0.10),
            0 0 34px rgba(34,197,94,0.10) !important;
        }

        #zone-processes-section .pl-stat-card:hover::before,
        #zone-processes-section .pl-process-card:hover::before,
        #zone-processes-section .pl-step-card:hover::before,
        #zone-processes-section .pl-draft-step:hover::before,
        #zone-processes-section .pl-builder-panel:hover::before {
          opacity: 1;
        }

        #zone-processes-section .pl-process-toggle {
          transition: background 180ms ease, filter 180ms ease;
        }

        #zone-processes-section .pl-process-toggle:hover {
          background: rgba(34,197,94,0.035) !important;
        }

        #zone-processes-section .pl-arrow {
          transition:
            transform 180ms ease,
            background 180ms ease,
            color 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        #zone-processes-section .pl-process-card:hover .pl-arrow {
          border-color: rgba(34,197,94,0.38) !important;
          box-shadow: 0 0 22px rgba(34,197,94,0.12);
        }

        #zone-processes-section .pl-progress-track {
          position: relative;
          overflow: hidden;
        }

        #zone-processes-section .pl-progress-fill {
          position: relative;
          transition: width 320ms ease;
          box-shadow: 0 0 16px rgba(34,197,94,0.30);
        }

        #zone-processes-section .pl-progress-fill::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.32), transparent);
          transform: translateX(-110%);
          animation: pl-progress-shine 2.25s ease-in-out infinite;
        }

        #zone-processes-section .primary-btn,
        #zone-processes-section .secondary-btn,
        #zone-processes-section .danger-link {
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            border-color 160ms ease,
            filter 160ms ease,
            background 160ms ease;
        }

        #zone-processes-section .primary-btn:hover,
        #zone-processes-section .secondary-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.08);
          box-shadow: 0 12px 28px rgba(34,197,94,0.14);
        }

        #zone-processes-section .danger-link:hover {
          transform: translateY(-1px);
          filter: brightness(1.15);
          text-shadow: 0 0 12px rgba(248,113,113,0.35);
        }

        #zone-processes-section .farm-feature-input,
        #zone-processes-section .farm-feature-textarea,
        #zone-processes-section .component-type-select {
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease,
            background 160ms ease;
        }

        #zone-processes-section .farm-feature-input:focus,
        #zone-processes-section .farm-feature-textarea:focus,
        #zone-processes-section .component-type-select:focus {
          border-color: rgba(34,197,94,0.52) !important;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.10), 0 0 24px rgba(34,197,94,0.08);
          outline: none;
        }

        #zone-processes-section,
        #zone-processes-section *,
        .agromind-process-modal,
        .agromind-process-modal *,
        .agromind-modal,
        .agromind-modal *,
        .agromind-modal-backdrop,
        .agromind-modal-backdrop *,
        .process-modal-body,
        .process-modal-body * {
          scrollbar-width: thin;
          scrollbar-color: rgba(34,197,94,0.58) rgba(15,23,42,0.20);
        }

        #zone-processes-section ::-webkit-scrollbar,
        .agromind-process-modal ::-webkit-scrollbar,
        .agromind-modal ::-webkit-scrollbar,
        .agromind-modal-backdrop ::-webkit-scrollbar,
        .process-modal-body ::-webkit-scrollbar {
          width: 9px;
          height: 9px;
        }

        #zone-processes-section ::-webkit-scrollbar-track,
        .agromind-process-modal ::-webkit-scrollbar-track,
        .agromind-modal ::-webkit-scrollbar-track,
        .agromind-modal-backdrop ::-webkit-scrollbar-track,
        .process-modal-body ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.03);
          border-radius: 999px;
          margin: 10px 0;
        }

        #zone-processes-section ::-webkit-scrollbar-thumb,
        .agromind-process-modal ::-webkit-scrollbar-thumb,
        .agromind-modal ::-webkit-scrollbar-thumb,
        .agromind-modal-backdrop ::-webkit-scrollbar-thumb,
        .process-modal-body ::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: linear-gradient(180deg, #22c55e, #16a34a, #15803d);
          border: 2px solid rgba(15,23,42,0.72);
          box-shadow: 0 0 18px rgba(34,197,94,0.18);
          transition: background 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        }

        #zone-processes-section ::-webkit-scrollbar-thumb:hover,
        .agromind-process-modal ::-webkit-scrollbar-thumb:hover,
        .agromind-modal ::-webkit-scrollbar-thumb:hover,
        .agromind-modal-backdrop ::-webkit-scrollbar-thumb:hover,
        .process-modal-body ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #4ade80, #22c55e, #16a34a);
          border-color: rgba(15,23,42,0.56);
          box-shadow: 0 0 14px rgba(34,197,94,0.45);
        }

        #zone-processes-section .pl-scroll-area {
          flex: 0 0 auto;
          min-height: 0;
          max-height: none;
          overflow: visible;
          padding-right: 0;
        }

        #zone-processes-section .pl-expanded-area {
          animation: pl-expand-in 180ms ease both;
        }

        #zone-processes-section .pl-step-card:hover .pl-step-number {
          box-shadow: 0 0 22px rgba(34,197,94,0.14);
          border-color: rgba(34,197,94,0.30);
        }

        @keyframes pl-expand-in {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pl-progress-shine {
          0% { transform: translateX(-120%); }
          45% { transform: translateX(120%); }
          100% { transform: translateX(120%); }
        }


        @media (max-width: 900px) {
          #zone-processes-section > div:first-of-type {
            grid-template-columns: 1fr !important;
          }

          #zone-processes-section > div:first-of-type .primary-btn {
            justify-self: start !important;
          }

          #zone-processes-section .pl-process-toggle > div {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 980px) {
          #zone-processes-section {
            padding: 14px !important;
            border-radius: 20px !important;
            margin-bottom: 12px !important;
          }

          #zone-processes-section [style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }

          #zone-processes-section [style*="min-width: 170px"] {
            min-width: 0 !important;
            width: 100% !important;
          }

          #zone-processes-section .pl-process-toggle {
            padding: 14px !important;
          }

          #zone-processes-section .pl-expanded-area {
            padding: 0 14px 14px !important;
          }
        }

        @media (max-width: 760px) {
          #zone-processes-section {
            padding: 12px !important;
            border-radius: 18px !important;
            box-shadow: 0 18px 46px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.03) !important;
          }

          #zone-processes-section > div:first-of-type {
            align-items: flex-start !important;
          }

          #zone-processes-section > div:first-of-type > div:first-child {
            width: 100% !important;
            align-items: flex-start !important;
          }

          #zone-processes-section h4 {
            font-size: 1rem !important;
          }

          #zone-processes-section p {
            font-size: 0.78rem !important;
          }

          #zone-processes-section .pl-stat-card {
            padding: 12px !important;
            border-radius: 16px !important;
          }

          #zone-processes-section .pl-builder-panel {
            padding: 12px !important;
            border-radius: 16px !important;
          }

          #zone-processes-section .pl-draft-step,
          #zone-processes-section .pl-step-card {
            padding: 11px !important;
            border-radius: 16px !important;
          }

          #zone-processes-section .pl-process-card {
            border-radius: 18px !important;
          }

          #zone-processes-section .pl-process-toggle {
            padding: 13px !important;
          }

          #zone-processes-section .pl-expanded-area {
            padding: 0 13px 13px !important;
          }

          #zone-processes-section strong[style*="white-space"] {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
            max-width: 100% !important;
            line-height: 1.25 !important;
          }

          #zone-processes-section .farm-feature-input,
          #zone-processes-section .farm-feature-textarea,
          #zone-processes-section .component-type-select {
            width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            font-size: 16px !important;
          }

          #zone-processes-section .primary-btn,
          #zone-processes-section .secondary-btn,
          #zone-processes-section .danger-link {
            min-height: 42px !important;
            justify-content: center !important;
          }

          #zone-processes-section .pl-builder-panel .primary-btn,
          #zone-processes-section .pl-builder-panel .secondary-btn,
          #zone-processes-section .pl-builder-panel .danger-link,
          #zone-processes-section .pl-expanded-area .primary-btn,
          #zone-processes-section .pl-expanded-area .secondary-btn,
          #zone-processes-section .pl-expanded-area .danger-link {
            width: 100% !important;
          }

          #zone-processes-section .pl-step-card > div,
          #zone-processes-section .pl-draft-step > div,
          #zone-processes-section .pl-expanded-area > div,
          #zone-processes-section .pl-builder-panel > div {
            min-width: 0 !important;
          }
        }

        @media (max-width: 560px) {
          #zone-processes-section {
            padding: 10px !important;
            border-radius: 16px !important;
            background:
              radial-gradient(circle at 8% 0%, rgba(34,197,94,0.18), transparent 28%),
              linear-gradient(160deg, rgba(9,18,39,0.98), rgba(2,6,23,1)) !important;
          }

          #zone-processes-section > div:first-of-type {
            gap: 10px !important;
            margin-bottom: 12px !important;
          }

          #zone-processes-section > div:first-of-type > div:first-child > div:first-child {
            width: 36px !important;
            height: 36px !important;
            border-radius: 14px !important;
            font-size: 0.78rem !important;
            flex: 0 0 auto !important;
          }

          #zone-processes-section [style*="display: grid"] {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          #zone-processes-section [style*="display: flex"] {
            max-width: 100% !important;
          }

          #zone-processes-section [style*="grid-column: 1 / -1"] {
            grid-column: auto !important;
          }

          #zone-processes-section .pl-stat-card strong {
            font-size: 1.18rem !important;
          }

          #zone-processes-section .pl-process-toggle > div {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }

          #zone-processes-section .pl-progress-track {
            height: 9px !important;
          }

          #zone-processes-section .pl-arrow {
            width: 24px !important;
            height: 24px !important;
            min-width: 24px !important;
          }

          #zone-processes-section .pl-step-card > div > div:first-child {
            width: 100% !important;
            flex: 1 1 100% !important;
          }

          #zone-processes-section .pl-step-card > div > button.secondary-btn {
            width: 100% !important;
          }

          #zone-processes-section .pl-step-number {
            min-width: 24px !important;
            flex: 0 0 auto !important;
          }

          #zone-processes-section [style*="gap: 10px"] {
            gap: 8px !important;
          }

          #zone-processes-section [style*="gap: 12px"] {
            gap: 9px !important;
          }

          #zone-processes-section [style*="padding: 16px"] {
            padding: 12px !important;
          }

          #zone-processes-section [style*="padding: 14px"] {
            padding: 11px !important;
          }

          #zone-processes-section [style*="font-size: 0.76rem"],
          #zone-processes-section [style*="font-size: 0.74rem"],
          #zone-processes-section [style*="font-size: 0.72rem"] {
            font-size: 0.73rem !important;
          }

          #zone-processes-section .farm-feature-textarea {
            min-height: 88px !important;
          }
        }

        @media (max-width: 420px) {
          #zone-processes-section {
            padding: 9px !important;
            border-radius: 14px !important;
          }

          #zone-processes-section .pl-process-card,
          #zone-processes-section .pl-builder-panel,
          #zone-processes-section .pl-draft-step,
          #zone-processes-section .pl-step-card,
          #zone-processes-section .pl-stat-card {
            border-radius: 14px !important;
          }

          #zone-processes-section .pl-process-toggle {
            padding: 11px !important;
          }

          #zone-processes-section .pl-expanded-area {
            padding: 0 11px 11px !important;
          }

          #zone-processes-section .primary-btn,
          #zone-processes-section .secondary-btn,
          #zone-processes-section .danger-link {
            width: 100% !important;
            min-height: 40px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          #zone-processes-section *,
          #zone-processes-section *::before,
          #zone-processes-section *::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "14px",
          width: "100%",
          minWidth: 0,
          maxWidth: "100%",
          flexWrap: "wrap",
          overflow: "visible",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, maxWidth: "100%", flex: "1 1 320px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "16px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, rgba(34,197,94,0.20), rgba(20,184,166,0.10))",
              border: "1px solid rgba(34,197,94,0.25)",
              color: "#bbf7d0",
              fontWeight: 900,
              boxShadow: "0 12px 28px rgba(34,197,94,0.08)",
            }}
          >
            PL
          </div>
          <div style={{ minWidth: 0 }}>
            <h4 style={{ margin: 0, color: "#f8fafc", fontSize: "1.08rem", letterSpacing: "-0.02em" }}>
              Process Lab
            </h4>
            <p
              style={{
                margin: "4px 0 0",
                color: "rgba(226,232,240,0.72)",
                fontSize: "0.82rem",
                lineHeight: 1.35,
                overflowWrap: "anywhere",
              }}
            >
              Zona: {modalZone.name} · procesos activos, etapas encadenadas y avance visible.
            </p>
          </div>
        </div>

        {canEdit && modalZoneProcesses.length > 0 ? (
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              setShowCreateProcessForm((prev) => !prev);
              setProcessesError("");
            }}
            disabled={processActionLoading}
            style={{ maxWidth: "100%", whiteSpace: "nowrap", flex: "0 0 auto", marginLeft: "auto" }}
          >
            {showCreateProcessForm ? "Cerrar laboratorio" : "Nuevo proceso"}
          </button>
        ) : isConsultant ? (
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "38px",
              padding: "0.48rem 0.78rem",
              borderRadius: "999px",
              border: "1px solid rgba(56,189,248,0.28)",
              background: "rgba(56,189,248,0.10)",
              color: "#bae6fd",
              fontSize: "0.78rem",
              fontWeight: 850,
              whiteSpace: "nowrap",
            }}
          >
            Modo consulta
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        {[
          ["Procesos", processStats.total, "◎"],
          ["Activos", processStats.active, "●"],
          ["Completados", processStats.completed, "✓"],
        ].map(([label, value, icon]) => (
          <div
            key={label}
            className="pl-stat-card"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
              e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
            }}
            style={{
              padding: "14px 14px",
              borderRadius: "18px",
              border: "1px solid rgba(148,163,184,0.16)",
              background: "linear-gradient(180deg, rgba(15,23,42,0.72), rgba(2,6,23,0.50))",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.025)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <div>
                <div style={{ color: "rgba(226,232,240,0.62)", fontSize: "0.72rem", marginBottom: "4px" }}>
                  {label}
                </div>
                <strong style={{ color: "#f8fafc", fontSize: "1.34rem", lineHeight: 1 }}>{value}</strong>
              </div>
              <span
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(34,197,94,0.18)",
                  background: "rgba(34,197,94,0.08)",
                  color: "#86efac",
                  fontWeight: 900,
                }}
              >
                {icon}
              </span>
            </div>
          </div>
        ))}
      </div>

      {shouldShowBuilder && (
        <div
          className="pl-builder-panel"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
            e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
          }}
          style={{
            marginBottom: "14px",
            padding: "14px",
            borderRadius: "16px",
            border: "1px solid rgba(34,197,94,0.20)",
            background: "linear-gradient(180deg, rgba(15,23,42,0.74), rgba(2,6,23,0.48))",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
            <div>
              <strong style={{ color: "#f8fafc", fontSize: "0.96rem" }}>Diseñar nuevo proceso</strong>
              <p style={{ margin: "4px 0 0", color: "rgba(226,232,240,0.68)", fontSize: "0.8rem" }}>
                Definí el objetivo, ordená las etapas y dejá listo el flujo operativo de esta zona.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "10px",
              marginBottom: "14px",
            }}
          >
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Nombre del proceso</label>
              <input
                className="farm-feature-input"
                value={newProcessName}
                onChange={(e) => setNewProcessName(e.target.value)}
                placeholder="Ej: Producción de tierra abonada"
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Objetivo / descripción</label>
              <textarea
                className="farm-feature-textarea"
                value={newProcessDescription}
                onChange={(e) => setNewProcessDescription(e.target.value)}
                placeholder="Qué se busca lograr en esta zona"
                rows={3}
              />
            </div>

            <div>
              <label style={labelStyle}>Responsable</label>
              <input
                className="farm-feature-input"
                value={newProcessOwner}
                onChange={(e) => setNewProcessOwner(e.target.value)}
                placeholder="Ej: José"
              />
            </div>

            <div>
              <label style={labelStyle}>Prioridad</label>
              <select
                className="component-type-select"
                value={newProcessPriority}
                onChange={(e) => setNewProcessPriority(e.target.value)}
              >
                {PROCESS_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
            <strong style={{ color: "#e5e7eb", fontSize: "0.9rem" }}>Etapas del proceso</strong>
            <button type="button" className="secondary-btn" onClick={addDraftStep} disabled={processActionLoading}>
              + Agregar etapa
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {draftSteps.map((step, index) => {
              const dueDate = addDaysToYYYYMMDD(step.startDate, step.durationDays);

              return (
                <div
                  key={step.localId}
                  className="pl-draft-step"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
                    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
                  }}
                  style={{
                    padding: "12px",
                    borderRadius: "14px",
                    border: "1px solid rgba(148,163,184,0.14)",
                    background: "rgba(2,6,23,0.42)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
                    <span style={{ ...tinyPillStyle, border: "1px solid rgba(34,197,94,0.24)", background: "rgba(34,197,94,0.12)", color: "#bbf7d0" }}>
                      Etapa {index + 1}
                    </span>
                    <button
                      type="button"
                      className="danger-link"
                      onClick={() => removeDraftStep(step.localId)}
                      disabled={processActionLoading}
                    >
                      Quitar
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Nombre de etapa</label>
                      <input
                        className="farm-feature-input"
                        value={step.name}
                        onChange={(e) => updateDraftStep(step.localId, "name", e.target.value)}
                        placeholder={`Etapa ${index + 1}`}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Inicio</label>
                      <input
                        className="farm-feature-input"
                        type="date"
                        value={step.startDate}
                        onChange={(e) => updateDraftStep(step.localId, "startDate", e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Duración días</label>
                      <input
                        className="farm-feature-input"
                        type="number"
                        min="0"
                        step="1"
                        value={step.durationDays}
                        onChange={(e) => updateDraftStep(step.localId, "durationDays", e.target.value)}
                        placeholder="Ej: 7"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Final estimado</label>
                      <input className="farm-feature-input" value={dueDate || ""} readOnly placeholder="Auto" />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Notas</label>
                      <textarea
                        className="farm-feature-textarea"
                        value={step.notes}
                        onChange={(e) => updateDraftStep(step.localId, "notes", e.target.value)}
                        placeholder="Instrucciones, recursos, observaciones o criterios de éxito"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end", marginTop: "14px" }}>
            {modalZoneProcesses.length > 0 && (
              <button type="button" className="secondary-btn" onClick={resetBuilder} disabled={processActionLoading}>
                Cancelar
              </button>
            )}

            <button type="button" className="primary-btn" onClick={saveProcessLab} disabled={processActionLoading}>
              {processActionLoading ? "Guardando..." : "Guardar proceso con etapas"}
            </button>
          </div>
        </div>
      )}

      {processesError ? (
        <div style={{ marginBottom: "10px", color: "#fca5a5", fontSize: "0.88rem" }}>
          {processesError}
        </div>
      ) : null}

      {processesLoading ? (
        <div
          style={{
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid rgba(148,163,184,0.16)",
            background: "rgba(2,6,23,0.45)",
            color: "#cbd5e1",
            fontSize: "0.9rem",
          }}
        >
          Cargando procesos...
        </div>
      ) : modalZoneProcesses.length > 0 ? (
        <>
          <div style={{ marginBottom: "14px", position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(148,163,184,0.75)",
                fontSize: "0.86rem",
                pointerEvents: "none",
              }}
            >
              ⌕
            </span>
            <input
              className="farm-feature-input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar por proceso, responsable, estado o prioridad..."
              style={{
                paddingLeft: "34px",
                borderRadius: "14px",
                background: "rgba(2,6,23,0.56)",
                border: "1px solid rgba(148,163,184,0.18)",
              }}
            />
          </div>

          <div className="pl-scroll-area" style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", minWidth: 0, minHeight: 0, boxSizing: "border-box" }}>
            {filteredProcesses.map((process) => {
              const steps = Array.isArray(process.steps) ? process.steps : [];
              const sortedSteps = getSortedSteps(steps);
              const completedSteps = steps.filter((s) => s?.status === "Completada").length;
              const progress = getProgressFromSteps(steps);
              const nextStepNumber = getNextStepNumber(steps);
              const defaultStepDraft = getStepDraftForProcess(process);
              const draft = {
                ...defaultStepDraft,
                ...(newStepByProcess[process.id] || {}),
              };
              const draftDueDate = addDaysToYYYYMMDD(draft.startDate, draft.durationDays);
              const isStepFormOpen = openStepFormByProcess[process.id] === true;
              const isProcessCompleted = process.status === "Completado";
              const nextProcessStatus = isProcessCompleted ? "Activo" : "Completado";
              const processActionLabel = isProcessCompleted ? "↺ Reabrir proceso" : "✓ Completar proceso";
              const isExpanded = expandedProcessById[process.id] === true;

              return (
                <div
                  key={process.id}
                  className="pl-process-card"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
                    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
                  }}
                  style={{
                    borderRadius: "22px",
                    border: isExpanded
                      ? "1px solid rgba(34,197,94,0.34)"
                      : "1px solid rgba(148,163,184,0.16)",
                    background: isExpanded
                      ? "radial-gradient(circle at 8% 0%, rgba(34,197,94,0.12), transparent 32%), linear-gradient(180deg, rgba(15,23,42,0.96), rgba(5,10,22,0.99))"
                      : "linear-gradient(180deg, rgba(15,23,42,0.82), rgba(5,10,22,0.96))",
                    overflow: "hidden",
                    boxShadow: isExpanded ? "0 22px 44px rgba(0,0,0,0.30), 0 0 0 1px rgba(34,197,94,0.04)" : "0 12px 24px rgba(0,0,0,0.14)",
                  }}
                >
                  <button
                    type="button"
                    className="pl-process-toggle"
                    onClick={() => toggleProcessExpansion(process.id)}
                    style={{
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      padding: "16px",
                      color: "inherit",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    aria-expanded={isExpanded}
                    title={isExpanded ? "Ocultar detalles del proceso" : "Ver detalles del proceso"}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) minmax(150px, 220px)",
                        gap: "14px",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "9px",
                            flexWrap: "wrap",
                            marginBottom: "8px",
                          }}
                        >
                          <span
                            className="pl-arrow"
                            style={{
                              width: "26px",
                              height: "26px",
                              borderRadius: "999px",
                              border: "1px solid rgba(148,163,184,0.18)",
                              background: isExpanded ? "rgba(34,197,94,0.15)" : "rgba(15,23,42,0.72)",
                              color: isExpanded ? "#bbf7d0" : "#cbd5e1",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.82rem",
                              fontWeight: 900,
                              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                              transition: "transform 160ms ease, background 160ms ease",
                            }}
                          >
                            ▶
                          </span>

                          <strong
                            style={{
                              color: "#e5e7eb",
                              fontSize: "1rem",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "min(460px, 100%)",
                            }}
                          >
                            {process.name}
                          </strong>

                          <span style={{ ...tinyPillStyle, ...getStatusPillStyle(process.status || "Activo") }}>
                            {process.status || "Activo"}
                          </span>

                          <span style={{ ...tinyPillStyle, ...getPriorityPillStyle(process.priority || "Media") }}>
                            Prioridad {process.priority || "Media"}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap",
                            color: "rgba(148,163,184,0.9)",
                            fontSize: "0.76rem",
                          }}
                        >
                          <span>{completedSteps}/{steps.length} etapas</span>
                          <span>Responsable: {process.owner || "—"}</span>
                          <span>Tipo: {process.type || "General"}</span>
                        </div>
                      </div>

                      <div style={{ minWidth: 0, width: "100%" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "10px",
                            marginBottom: "6px",
                            color: "#cbd5e1",
                            fontSize: "0.76rem",
                            fontWeight: 700,
                          }}
                        >
                          <span>Avance</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="pl-progress-track" style={{ width: "100%", height: "8px", borderRadius: "999px", background: "rgba(148,163,184,0.18)", overflow: "hidden" }}>
                          <div
                            className="pl-progress-fill"
                            style={{
                              width: `${progress}%`,
                              height: "100%",
                              background: "linear-gradient(90deg, rgba(34,197,94,0.95), rgba(20,184,166,0.95))",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      className="pl-expanded-area"
                      style={{
                        padding: "0 16px 16px",
                        borderTop: "1px solid rgba(148,163,184,0.12)",
                      }}
                    >
                      {process.description ? (
                        <p style={{ margin: "12px 0 10px", color: "rgba(226,232,240,0.78)", fontSize: "0.85rem", lineHeight: 1.45 }}>
                          {process.description}
                        </p>
                      ) : (
                        <p style={{ margin: "12px 0 10px", color: "rgba(148,163,184,0.74)", fontSize: "0.82rem", lineHeight: 1.45 }}>
                          Sin descripción. El campo está listo para cuando el proceso quiera contar su historia.
                        </p>
                      )}

                      {canEdit ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                            alignItems: "center",
                            marginBottom: "14px",
                            padding: "10px",
                            borderRadius: "16px",
                            background: "rgba(2,6,23,0.30)",
                            border: "1px solid rgba(148,163,184,0.10)",
                          }}
                        >
                          <button
                            type="button"
                            className="secondary-btn"
                            disabled={processActionLoading}
                            onClick={() => updateProcessStatus(process, nextProcessStatus)}
                            title={isProcessCompleted ? "Quitar completado y volver a activo" : "Marcar proceso como completado"}
                            style={
                              isProcessCompleted
                                ? {
                                    borderColor: "rgba(56,189,248,0.35)",
                                    background: "rgba(56,189,248,0.10)",
                                    color: "#bae6fd",
                                  }
                                : undefined
                            }
                          >
                            {processActionLoading ? "Actualizando..." : processActionLabel}
                          </button>

                          <button type="button" className="danger-link" onClick={() => deleteProcess(process)} disabled={processActionLoading}>
                            Borrar proceso
                          </button>
                        </div>
                      ) : null}

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          flexWrap: "wrap",
                          marginBottom: "10px",
                        }}
                      >
                        <div>
                          <strong style={{ color: "#f8fafc", fontSize: "0.9rem" }}>Ruta de etapas</strong>
                          <div style={{ color: "rgba(148,163,184,0.78)", fontSize: "0.72rem", marginTop: "2px" }}>
                            Secuencia operativa del proceso
                          </div>
                        </div>
                        {canEdit ? (
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => {
                              const willOpen = !openStepFormByProcess[process.id];
                              setOpenStepFormByProcess((prev) => ({ ...prev, [process.id]: willOpen }));

                              if (willOpen) {
                                const nextDraft = getStepDraftForProcess(process);
                                updateStepDraftField(process.id, "name", nextDraft.name);
                                updateStepDraftField(process.id, "startDate", nextDraft.startDate);
                                updateStepDraftField(process.id, "durationDays", nextDraft.durationDays);
                                updateStepDraftField(process.id, "notes", nextDraft.notes);
                              }

                              setProcessesError("");
                            }}
                            disabled={processActionLoading}
                          >
                            {isStepFormOpen ? "Cerrar etapa" : "+ Nueva etapa"}
                          </button>
                        ) : null}
                      </div>

                      {sortedSteps.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", position: "relative" }}>
                          {sortedSteps.map((step) => {
                            const isCompleted = step.status === "Completada";

                            return (
                              <div
                                key={step.id}
                                className="pl-step-card"
                                onMouseMove={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
                                  e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
                                }}
                                style={{
                                  padding: "12px",
                                  borderRadius: "18px",
                                  background: isCompleted
                                    ? "linear-gradient(180deg, rgba(34,197,94,0.10), rgba(2,6,23,0.38))"
                                    : "linear-gradient(180deg, rgba(15,23,42,0.62), rgba(2,6,23,0.48))",
                                  border: isCompleted ? "1px solid rgba(34,197,94,0.20)" : "1px solid rgba(148,163,184,0.13)",
                                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", minWidth: 0, flex: 1 }}>
                                    {canEdit ? (
                                      <button
                                        type="button"
                                        onClick={() => toggleStepCompletion(step)}
                                        disabled={processActionLoading}
                                        title={isCompleted ? "Reabrir etapa" : "Marcar como completada"}
                                        style={{
                                          width: "28px",
                                          height: "28px",
                                          minWidth: "28px",
                                          borderRadius: "999px",
                                          border: isCompleted ? "1px solid rgba(34,197,94,0.38)" : "1px solid rgba(148,163,184,0.28)",
                                          background: isCompleted ? "rgba(34,197,94,0.16)" : "rgba(15,23,42,0.9)",
                                          color: isCompleted ? "#bbf7d0" : "#94a3b8",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          cursor: processActionLoading ? "not-allowed" : "pointer",
                                          fontSize: "0.95rem",
                                          fontWeight: 700,
                                          lineHeight: 1,
                                          marginTop: "2px",
                                        }}
                                      >
                                        {isCompleted ? "✓" : ""}
                                      </button>
                                    ) : (
                                      <span
                                        aria-hidden="true"
                                        style={{
                                          width: "28px",
                                          height: "28px",
                                          minWidth: "28px",
                                          borderRadius: "999px",
                                          border: isCompleted ? "1px solid rgba(34,197,94,0.38)" : "1px solid rgba(148,163,184,0.28)",
                                          background: isCompleted ? "rgba(34,197,94,0.16)" : "rgba(15,23,42,0.9)",
                                          color: isCompleted ? "#bbf7d0" : "#94a3b8",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontSize: "0.95rem",
                                          fontWeight: 700,
                                          lineHeight: 1,
                                          marginTop: "2px",
                                        }}
                                      >
                                        {isCompleted ? "✓" : ""}
                                      </span>
                                    )}

                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                        <span className="pl-step-number" style={{ minWidth: "24px", height: "24px", borderRadius: "999px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(34,197,94,0.14)", color: "#bbf7d0", fontSize: "0.72rem", fontWeight: 700, border: "1px solid rgba(34,197,94,0.12)", transition: "box-shadow 160ms ease, border-color 160ms ease" }}>
                                          {step.stepOrder}
                                        </span>

                                        <div style={{ color: isCompleted ? "rgba(226,232,240,0.72)" : "#e5e7eb", fontSize: "0.84rem", fontWeight: 600, textDecoration: isCompleted ? "line-through" : "none" }}>
                                          {step.name}
                                        </div>

                                        {isCompleted ? (
                                          <span style={{ ...tinyPillStyle, ...getStatusPillStyle("Completada") }}>
                                            Hecha
                                          </span>
                                        ) : null}
                                      </div>

                                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", color: "rgba(148,163,184,0.88)", fontSize: "0.74rem", marginBottom: step.notes ? "6px" : "0" }}>
                                        <span>Responsable: {step.owner || "—"}</span>
                                        <span>Inicio: {formatProcessDate(step.startDate)}</span>
                                        <span>Días: {getDurationDays(step.startDate, step.dueDate)}</span>
                                        <span>Final: {formatProcessDate(step.dueDate)}</span>
                                        <span>Completada: {formatProcessDate(step.completedAt)}</span>
                                      </div>

                                      {step.notes ? (
                                        <div style={{ marginTop: "6px", color: "rgba(226,232,240,0.78)", fontSize: "0.78rem", whiteSpace: "pre-wrap" }}>
                                          {step.notes}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>

                                  {canEdit ? (
                                    <button type="button" className="secondary-btn" onClick={() => toggleStepCompletion(step)} disabled={processActionLoading}>
                                      {isCompleted ? "Reabrir" : "Completar"}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: "12px",
                            borderRadius: "14px",
                            border: "1px dashed rgba(148,163,184,0.18)",
                            color: "rgba(226,232,240,0.72)",
                            fontSize: "0.84rem",
                            background: "rgba(2,6,23,0.32)",
                          }}
                        >
                          Este proceso aún no tiene etapas. Agregá la primera para construir la ruta operativa.
                        </div>
                      )}

                      {canEdit && isStepFormOpen && (
                        <div
                          style={{
                            padding: "12px",
                            borderRadius: "14px",
                            border: "1px solid rgba(34,197,94,0.24)",
                            background: "radial-gradient(circle at top left, rgba(34,197,94,0.10), transparent 30%), rgba(2,6,23,0.46)",
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: "10px",
                            marginTop: "10px",
                          }}
                        >
                          <div>
                            <label style={labelStyle}>Etapa</label>
                            <input
                              className="farm-feature-input"
                              value={draft.name || `Etapa ${nextStepNumber}`}
                              onChange={(e) => updateStepDraftField(process.id, "name", e.target.value)}
                              placeholder={`Etapa ${nextStepNumber}`}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Fecha de inicio</label>
                            <input className="farm-feature-input" type="date" value={draft.startDate} onChange={(e) => updateStepDraftField(process.id, "startDate", e.target.value)} />
                          </div>

                          <div>
                            <label style={labelStyle}>Duración en días</label>
                            <input className="farm-feature-input" type="number" min="0" step="1" value={draft.durationDays} onChange={(e) => updateStepDraftField(process.id, "durationDays", e.target.value)} placeholder="Ej: 7" />
                          </div>

                          <div>
                            <label style={labelStyle}>Fecha final</label>
                            <input className="farm-feature-input" value={draftDueDate || ""} readOnly placeholder="Se calcula automáticamente" />
                          </div>

                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Notas</label>
                            <textarea className="farm-feature-textarea" value={draft.notes} onChange={(e) => updateStepDraftField(process.id, "notes", e.target.value)} placeholder="Notas de la etapa, observaciones o instrucciones" rows={3} />
                          </div>

                          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                            <button type="button" className="primary-btn" onClick={() => createStepForProcess(process)} disabled={processActionLoading}>
                              {processActionLoading ? "Agregando..." : `Agregar etapa ${nextStepNumber}`}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

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

const API_BASE =
  import.meta.env.VITE_API_URL || "https://agromind-backend-slem.onrender.com";

function looksLikeHtml(text) {
  return typeof text === "string" && /<(!doctype|html|body|pre)/i.test(text);
}

function normalizeApiErrorMessage(status, data) {
  if (typeof data === "string") {
    if (
      data.includes("Cannot GET /api/processes") ||
      data.includes("Cannot POST /api/processes") ||
      data.includes("Cannot DELETE /api/processes") ||
      data.includes("Cannot PUT /api/processes")
    ) {
      return "El backend desplegado todavía no tiene activas las rutas del gestor de procesos.";
    }

    if (looksLikeHtml(data)) return `Error ${status || 500} del servidor.`;
    return data;
  }

  if (data && typeof data === "object" && data.error) return data.error;
  return "Error en request.";
}

async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const error = new Error(normalizeApiErrorMessage(response.status, data));
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export default function ProcessModal({ modalZone, onBeforeCreate }) {
  const { isConsultant } = useFarm();

  const [modalZoneProcesses, setModalZoneProcesses] = useState([]);
  const [processesLoading, setProcessesLoading] = useState(false);
  const [processesError, setProcessesError] = useState("");
  const [processActionLoading, setProcessActionLoading] = useState(false);

  const [showCreateProcessForm, setShowCreateProcessForm] = useState(false);
  const [newProcessName, setNewProcessName] = useState("");
  const [newProcessDescription, setNewProcessDescription] = useState("");
  const [newProcessOwner, setNewProcessOwner] = useState("");
  const [newProcessPriority, setNewProcessPriority] = useState("Media");
  const [, setNewProcessStartDate] = useState("");
  const [, setNewProcessTargetDate] = useState("");

  const [newStepByProcess, setNewStepByProcess] = useState({});
  const [openStepFormByProcess, setOpenStepFormByProcess] = useState({});

  const loadZoneProcesses = async () => {
    if (!modalZone?.id) return;

    try {
      setProcessesLoading(true);
      setProcessesError("");

      const data = await apiFetch(`/api/processes/zone/${modalZone.id}`);
      setModalZoneProcesses(Array.isArray(data) ? data : []);
    } catch (error) {
      setProcessesError(error?.message || "No se pudieron cargar los procesos.");
      setModalZoneProcesses([]);
    } finally {
      setProcessesLoading(false);
    }
  };

  useEffect(() => {
    setShowCreateProcessForm(false);
    setNewProcessName("");
    setNewProcessDescription("");
    setNewProcessOwner("");
    setNewProcessPriority("Media");
    setNewStepByProcess({});
    setOpenStepFormByProcess({});
    loadZoneProcesses();
  }, [modalZone?.id]);

  const updateStepDraftField = (processId, field, value) => {
    setNewStepByProcess((previous) => ({
      ...previous,
      [processId]: {
        ...getEmptyStepDraft(),
        ...(previous[processId] || {}),
        [field]: value,
      },
    }));
  };

  const createProcessForZone = async (processOverride = null, initialSteps = []) => {
    if (isConsultant || !modalZone?.id) return null;

    const source = processOverride || {};
    const safeName = String(source.name ?? newProcessName).trim();
    const safeDescription = String(source.description ?? newProcessDescription).trim();
    const safeOwner = String(source.owner ?? newProcessOwner).trim();
    const safePriority = source.priority || newProcessPriority || "Media";

    if (!safeName) {
      setProcessesError("Escribe el nombre del proceso.");
      return null;
    }

    try {
      setProcessActionLoading(true);
      setProcessesError("");

      if (typeof onBeforeCreate === "function") await onBeforeCreate();

      const createdProcess = await apiFetch("/api/processes", {
        method: "POST",
        body: JSON.stringify({
          zoneId: modalZone.id,
          name: safeName,
          description: safeDescription,
          owner: safeOwner,
          priority: safePriority,
          startDate: null,
          targetDate: null,
          type: source.type || "General",
          status: source.status || "Borrador",
        }),
      });

      const processId = createdProcess?.id;
      const steps = Array.isArray(initialSteps) ? initialSteps : [];

      for (const [index, step] of steps.entries()) {
        const duration = Number(step?.durationDays);
        const dueDate = step?.dueDate || addDaysToYYYYMMDD(step?.startDate, duration);

        if (!step?.startDate) throw new Error(`Selecciona la fecha de inicio de la etapa ${index + 1}.`);
        if (!Number.isFinite(duration) || duration < 0) throw new Error(`Escribe una duración válida para la etapa ${index + 1}.`);
        if (!dueDate) throw new Error(`No se pudo calcular la fecha final de la etapa ${index + 1}.`);

        await apiFetch("/api/processes/step", {
          method: "POST",
          body: JSON.stringify({
            processId,
            name: String(step?.name || `Etapa ${index + 1}`).trim(),
            owner: safeOwner,
            priority: safePriority,
            startDate: step.startDate,
            dueDate,
            notes: step.notes || "",
            status: "Pendiente",
          }),
        });
      }

      setNewProcessName("");
      setNewProcessDescription("");
      setNewProcessOwner("");
      setNewProcessPriority("Media");
      setShowCreateProcessForm(false);
      await loadZoneProcesses();
      return createdProcess;
    } catch (error) {
      setProcessesError(error?.message || "No se pudo crear el proceso.");
      return null;
    } finally {
      setProcessActionLoading(false);
    }
  };

  const createStepForProcess = async (process) => {
    if (isConsultant || !process?.id) return;

    const existingSteps = Array.isArray(process.steps) ? process.steps : [];
    const draft = {
      ...getEmptyStepDraft(existingSteps.length + 1),
      ...(newStepByProcess[process.id] || {}),
    };
    const duration = Number(draft.durationDays);
    const dueDate = addDaysToYYYYMMDD(draft.startDate, draft.durationDays);

    if (!draft.startDate) return setProcessesError("Selecciona la fecha de inicio de la etapa.");
    if (!Number.isFinite(duration) || duration < 0) return setProcessesError("Escribe la duración de la etapa en días.");
    if (!dueDate) return setProcessesError("No se pudo calcular la fecha final de la etapa.");

    try {
      setProcessActionLoading(true);
      setProcessesError("");

      await apiFetch("/api/processes/step", {
        method: "POST",
        body: JSON.stringify({
          processId: process.id,
          name: String(draft.name || `Etapa ${existingSteps.length + 1}`).trim(),
          owner: process.owner || "",
          priority: process.priority || "Media",
          startDate: draft.startDate,
          dueDate,
          notes: draft.notes || "",
          status: "Pendiente",
        }),
      });

      setNewStepByProcess((previous) => ({
        ...previous,
        [process.id]: getEmptyStepDraft(existingSteps.length + 2),
      }));
      await loadZoneProcesses();
    } catch (error) {
      setProcessesError(error?.message || "No se pudo crear la etapa.");
    } finally {
      setProcessActionLoading(false);
    }
  };

  const toggleStepCompletion = async (step) => {
    if (isConsultant || !step?.id) return;
    const isCompleted = step.status === "Completada";

    try {
      setProcessActionLoading(true);
      setProcessesError("");
      await apiFetch(`/api/processes/step/${step.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: isCompleted ? "Pendiente" : "Completada",
          completedAt: isCompleted ? null : nowIso(),
        }),
      });
      await loadZoneProcesses();
    } catch (error) {
      setProcessesError(error?.message || "No se pudo actualizar la etapa.");
    } finally {
      setProcessActionLoading(false);
    }
  };

  const updateProcessStatus = async (process, status) => {
    if (isConsultant || !process?.id) return;
    const nextStatus = status || (process.status === "Completado" ? "Activo" : "Completado");

    try {
      setProcessActionLoading(true);
      setProcessesError("");
      await apiFetch(`/api/processes/${process.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: nextStatus,
          completedAt: nextStatus === "Completado" ? nowIso() : null,
        }),
      });
      await loadZoneProcesses();
    } catch (error) {
      setProcessesError(error?.message || "No se pudo actualizar el proceso.");
    } finally {
      setProcessActionLoading(false);
    }
  };

  const deleteProcess = async (process) => {
    if (isConsultant || !process?.id) return;
    if (!window.confirm(`¿Borrar el proceso "${process.name}"?\n\nTambién se eliminarán sus etapas.`)) return;

    try {
      setProcessActionLoading(true);
      setProcessesError("");
      await apiFetch(`/api/processes/${process.id}`, { method: "DELETE" });
      await loadZoneProcesses();
    } catch (error) {
      setProcessesError(error?.message || "No se pudo borrar el proceso.");
    } finally {
      setProcessActionLoading(false);
    }
  };

  return (
    <ProcessModalView
      modalZone={modalZone}
      modalZoneProcesses={modalZoneProcesses}
      processesLoading={processesLoading}
      processesError={processesError}
      processActionLoading={processActionLoading}
      showCreateProcessForm={showCreateProcessForm}
      setShowCreateProcessForm={setShowCreateProcessForm}
      newProcessName={newProcessName}
      setNewProcessName={setNewProcessName}
      newProcessDescription={newProcessDescription}
      setNewProcessDescription={setNewProcessDescription}
      newProcessOwner={newProcessOwner}
      setNewProcessOwner={setNewProcessOwner}
      newProcessPriority={newProcessPriority}
      setNewProcessPriority={setNewProcessPriority}
      setNewProcessStartDate={setNewProcessStartDate}
      setNewProcessTargetDate={setNewProcessTargetDate}
      newStepByProcess={newStepByProcess}
      openStepFormByProcess={openStepFormByProcess}
      setOpenStepFormByProcess={setOpenStepFormByProcess}
      setProcessesError={setProcessesError}
      updateStepDraftField={updateStepDraftField}
      createProcessForZone={createProcessForZone}
      createStepForProcess={createStepForProcess}
      toggleStepCompletion={toggleStepCompletion}
      updateProcessStatus={updateProcessStatus}
      deleteProcess={deleteProcess}
    />
  );
}

