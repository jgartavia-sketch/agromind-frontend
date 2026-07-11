// src/components/finance/AddMovementModal.jsx
import { useEffect, useMemo, useState } from "react";

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const CATEGORY_OPTIONS = [
  "Ventas",
  "Producción",
  "Insumos",
  "Mano de obra",
  "Transporte",
  "Mantenimiento",
  "Servicios",
  "Alimentación animal",
  "Infraestructura",
  "Equipos y herramientas",
  "Impuestos",
  "Otro",
];

const EMPTY = {
  id: null,
  date: "",
  concept: "",
  category: "",
  type: "Ingreso",
  amount: "",
  invoiceNumber: "",
  note: "",
};

function isKnownCategory(category) {
  return CATEGORY_OPTIONS.includes(String(category || "").trim());
}

export default function AddMovementModal({
  onClose,
  onSave,
  saving = false,
  initialMovement = null,
}) {
  const isEdit = !!initialMovement?.id;

  const initial = useMemo(() => {
    if (!initialMovement) return { ...EMPTY, date: todayYYYYMMDD() };

    return {
      id: initialMovement.id ?? null,
      date: initialMovement.date || todayYYYYMMDD(),
      concept: initialMovement.concept || "",
      category: initialMovement.category || "",
      type: initialMovement.type || "Ingreso",
      amount:
        initialMovement.amount === 0 || initialMovement.amount
          ? String(initialMovement.amount)
          : "",
      invoiceNumber:
        typeof initialMovement.invoiceNumber === "string" &&
        initialMovement.invoiceNumber.trim()
          ? initialMovement.invoiceNumber.trim()
          : "",
      note: initialMovement.note || "",
    };
  }, [initialMovement]);

  const [form, setForm] = useState(initial);
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const current = String(initial.category || "").trim();
    if (!current) return "";
    return isKnownCategory(current) ? current : "Otro";
  });
  const [customCategory, setCustomCategory] = useState(() => {
    const current = String(initial.category || "").trim();
    return current && !isKnownCategory(current) ? current : "";
  });

  useEffect(() => {
    setForm(initial);

    const current = String(initial.category || "").trim();
    setSelectedCategory(
      current ? (isKnownCategory(current) ? current : "Otro") : ""
    );
    setCustomCategory(current && !isKnownCategory(current) ? current : "");
  }, [initial]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);

    if (value === "Otro") {
      setField("category", customCategory);
      return;
    }

    setCustomCategory("");
    setField("category", value);
  };

  const handleCustomCategoryChange = (value) => {
    setCustomCategory(value);
    setField("category", value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const concept = String(form.concept || "").trim();
    const category =
      selectedCategory === "Otro"
        ? String(customCategory || "").trim()
        : String(form.category || "").trim();
    const type = String(form.type || "").trim();
    const note = String(form.note || "").trim();
    const invoiceNumber = String(form.invoiceNumber || "").trim();

    if (!concept) {
      alert("Escribe un concepto.");
      return;
    }

    if (!category) {
      alert("Selecciona una categoría o escribe una categoría personalizada.");
      return;
    }

    if (type !== "Ingreso" && type !== "Gasto") {
      alert("Tipo inválido.");
      return;
    }

    const amountNum = Number(String(form.amount || "").replaceAll(",", "").trim());

    if (!Number.isFinite(amountNum) || amountNum < 0) {
      alert("Monto inválido.");
      return;
    }

    const invoiceClean = invoiceNumber ? invoiceNumber.slice(0, 80) : null;

    const payload = {
      ...(form.id ? { id: form.id } : {}),
      date: form.date || todayYYYYMMDD(),
      concept,
      category,
      type,
      amount: amountNum,
      invoiceNumber: invoiceClean,
      note: note || null,
    };

    onSave(payload);
  };

  const modalStyles = {
    overlay: {
      position: "fixed",
      inset: 0,
      width: "100vw",
      height: "100dvh",
      background:
        "radial-gradient(circle at top, rgba(16,185,129,0.12), transparent 35%), rgba(0,0,0,0.76)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding:
        "calc(0.75rem + env(safe-area-inset-top, 0px)) calc(0.75rem + env(safe-area-inset-right, 0px)) calc(0.75rem + env(safe-area-inset-bottom, 0px)) calc(0.75rem + env(safe-area-inset-left, 0px))",
      overflow: "hidden",
      overscrollBehavior: "none",
      boxSizing: "border-box",
    },
    card: {
      width: "min(760px, 100%)",
      maxWidth: "100%",
      maxHeight:
        "calc(100dvh - 1.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background:
        "linear-gradient(180deg, rgba(5,12,28,0.995), rgba(2,6,23,0.995))",
      border: "1px solid rgba(52,211,153,0.22)",
      borderRadius: "24px",
      boxShadow:
        "0 32px 90px rgba(0,0,0,0.62), 0 0 0 1px rgba(255,255,255,0.02) inset",
      boxSizing: "border-box",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      gap: "1rem",
      alignItems: "flex-start",
      flex: "0 0 auto",
      padding: "1.15rem 1.25rem 1rem",
      background:
        "linear-gradient(180deg, rgba(5,12,28,1), rgba(5,12,28,0.98))",
      borderBottom: "1px solid rgba(148,163,184,0.1)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
    },
    body: {
      minHeight: 0,
      overflowY: "auto",
      overscrollBehavior: "contain",
      WebkitOverflowScrolling: "touch",
      padding: "1rem 1.25rem calc(1.35rem + env(safe-area-inset-bottom, 0px))",
      scrollbarGutter: "stable",
    },
    titleRow: {
      display: "flex",
      gap: "0.8rem",
      alignItems: "center",
      minWidth: 0,
    },
    icon: {
      width: "44px",
      height: "44px",
      borderRadius: "14px",
      display: "grid",
      placeItems: "center",
      flex: "0 0 auto",
      background:
        "linear-gradient(135deg, rgba(34,197,94,0.24), rgba(20,184,166,0.12))",
      border: "1px solid rgba(74,222,128,0.28)",
      boxShadow: "0 10px 26px rgba(34,197,94,0.12)",
      fontSize: "1.25rem",
    },
    panel: {
      padding: "1rem",
      borderRadius: "18px",
      background:
        "linear-gradient(180deg, rgba(15,23,42,0.72), rgba(8,15,30,0.7))",
      border: "1px solid rgba(148,163,184,0.1)",
      boxShadow: "0 14px 34px rgba(0,0,0,0.16)",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
      gap: "0.95rem",
    },
    typeSwitcher: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "0.4rem",
      padding: "0.35rem",
      borderRadius: "14px",
      background: "rgba(2,6,23,0.82)",
      border: "1px solid rgba(100,116,139,0.35)",
    },
    amountWrap: {
      position: "relative",
    },
    amountSymbol: {
      position: "absolute",
      left: "0.9rem",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#4ade80",
      fontWeight: 800,
      fontSize: "1rem",
      pointerEvents: "none",
      zIndex: 1,
    },
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="movement-modal-title"
      style={modalStyles.overlay}
    >
      <div className="modal-card" style={modalStyles.card}>
        <div style={modalStyles.header}>
          <div style={modalStyles.titleRow}>
            <div style={modalStyles.icon}>₡</div>

            <div style={{ minWidth: 0 }}>
              <h3
                id="movement-modal-title"
                style={{ margin: 0, fontSize: "1.45rem", color: "#f8fafc" }}
              >
                {isEdit ? "Editar movimiento" : "Agregar movimiento"}
              </h3>

              <p
                style={{
                  margin: "0.35rem 0 0",
                  color: "#94a3b8",
                  lineHeight: 1.45,
                }}
              >
                {isEdit
                  ? "Ajusta los datos financieros de este movimiento."
                  : "Registra un ingreso o gasto real de tu finca."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
            disabled={saving}
            style={{
              height: "fit-content",
              flex: "0 0 auto",
              borderRadius: "999px",
              paddingInline: "1rem",
            }}
          >
            Cerrar
          </button>
        </div>

        <div style={modalStyles.body}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: "0.85rem" }}>
            <section style={modalStyles.panel}>
              <div style={modalStyles.grid}>
                <div className="task-field">
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setField("date", e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="task-field">
                  <label>Tipo de movimiento</label>

                  <div style={modalStyles.typeSwitcher}>
                    {["Ingreso", "Gasto"].map((type) => {
                      const active = form.type === type;

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setField("type", type)}
                          disabled={saving}
                          style={{
                            minHeight: "42px",
                            borderRadius: "10px",
                            border: active
                              ? type === "Ingreso"
                                ? "1px solid rgba(74,222,128,0.55)"
                                : "1px solid rgba(248,113,113,0.55)"
                              : "1px solid transparent",
                            background: active
                              ? type === "Ingreso"
                                ? "linear-gradient(135deg, rgba(34,197,94,0.26), rgba(20,184,166,0.16))"
                                : "linear-gradient(135deg, rgba(248,113,113,0.22), rgba(249,115,22,0.12))"
                              : "transparent",
                            color: active
                              ? type === "Ingreso"
                                ? "#bbf7d0"
                                : "#fecaca"
                              : "#94a3b8",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  className="task-field"
                  style={{ gridColumn: "1 / -1" }}
                >
                  <label>Concepto</label>
                  <input
                    type="text"
                    value={form.concept}
                    onChange={(e) => setField("concept", e.target.value)}
                    disabled={saving}
                    placeholder="Ej: Venta de cosecha, compra de fertilizante"
                  />
                </div>
              </div>
            </section>

            <section style={modalStyles.panel}>
              <div style={modalStyles.grid}>
                <div className="task-field">
                  <label>Categoría</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    disabled={saving}
                  >
                    <option value="">Seleccionar categoría</option>
                    {CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="task-field">
                  <label>Monto (CRC)</label>
                  <div style={modalStyles.amountWrap}>
                    <span style={modalStyles.amountSymbol}>₡</span>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setField("amount", e.target.value)}
                      disabled={saving}
                      min="0"
                      step="1"
                      placeholder="0"
                      style={{
                        paddingLeft: "2.1rem",
                        fontSize: "1.05rem",
                        fontWeight: 700,
                      }}
                    />
                  </div>
                </div>

                {selectedCategory === "Otro" && (
                  <div
                    className="task-field"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <label>Otra categoría</label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) =>
                        handleCustomCategoryChange(e.target.value)
                      }
                      disabled={saving}
                      placeholder="Escribe la categoría personalizada"
                    />
                  </div>
                )}
              </div>
            </section>

            <section style={modalStyles.panel}>
              <div style={modalStyles.grid}>
                <div
                  className="task-field"
                  style={{ gridColumn: "1 / -1" }}
                >
                  <label>Número de factura (opcional)</label>
                  <input
                    type="text"
                    value={form.invoiceNumber}
                    onChange={(e) =>
                      setField("invoiceNumber", e.target.value)
                    }
                    disabled={saving}
                    maxLength={80}
                    placeholder="Ej: FAC-2026-001"
                  />
                </div>

                <div
                  className="task-field"
                  style={{ gridColumn: "1 / -1" }}
                >
                  <label>Nota</label>
                  <textarea
                    value={form.note}
                    onChange={(e) => setField("note", e.target.value)}
                    disabled={saving}
                    rows={2}
                    placeholder="Agrega un detalle útil para este movimiento"
                    style={{ resize: "vertical", minHeight: "78px" }}
                  />
                </div>
              </div>
            </section>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
                flexWrap: "wrap",
                paddingTop: "0.25rem",
              }}
            >
              <button
                type="submit"
                className="primary-btn"
                disabled={saving}
                style={{
                  minWidth: "220px",
                  minHeight: "48px",
                  borderRadius: "999px",
                  fontWeight: 800,
                }}
              >
                {saving
                  ? "Guardando…"
                  : isEdit
                  ? "Guardar cambios"
                  : "Guardar movimiento"}
              </button>
            </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
