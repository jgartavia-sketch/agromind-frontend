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
  const [categoryOpen, setCategoryOpen] = useState(false);
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
    setCategoryOpen(false);
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

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);

    if (category === "Otro") {
      setField("category", customCategory);
      return;
    }

    setCustomCategory("");
    setField("category", category);
    setCategoryOpen(false);
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

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="movement-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding:
          "calc(0.75rem + env(safe-area-inset-top, 0px)) calc(0.75rem + env(safe-area-inset-right, 0px)) calc(0.75rem + env(safe-area-inset-bottom, 0px)) calc(0.75rem + env(safe-area-inset-left, 0px))",
        overflow: "hidden",
        overscrollBehavior: "none",
        boxSizing: "border-box",
      }}
    >
      <div
        className="modal-card"
        style={{
          width: "min(720px, 100%)",
          maxWidth: "100%",
          maxHeight:
            "calc(100dvh - 1.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
          overflowY: "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          background: "rgba(2, 6, 23, 0.99)",
          border: "1px solid #1e293b",
          borderRadius: "18px",
          padding: "1.25rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            alignItems: "flex-start",
            position: "sticky",
            top: 0,
            background: "rgba(2, 6, 23, 0.99)",
            paddingBottom: "0.75rem",
            zIndex: 4,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h3 id="movement-modal-title" style={{ margin: 0 }}>
              {isEdit ? "Editar movimiento" : "Agregar movimiento"}
            </h3>
            <p style={{ marginTop: "0.35rem", opacity: 0.8 }}>
              {isEdit
                ? "Ajusta el movimiento y guarda cambios."
                : "Registra un ingreso o gasto real de tu finca."}
            </p>
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
            disabled={saving}
            style={{ height: "fit-content", flex: "0 0 auto" }}
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
              gap: "0.9rem",
            }}
          >
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
              <label>Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setField("type", e.target.value)}
                disabled={saving}
              >
                <option value="Ingreso">Ingreso</option>
                <option value="Gasto">Gasto</option>
              </select>
            </div>

            <div className="task-field" style={{ gridColumn: "1 / -1" }}>
              <label>Concepto</label>
              <input
                type="text"
                value={form.concept}
                onChange={(e) => setField("concept", e.target.value)}
                disabled={saving}
              />
            </div>

            <div
              className="task-field"
              style={{ gridColumn: "1 / -1", minWidth: 0 }}
            >
              <label>Categoría</label>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => setCategoryOpen((open) => !open)}
                disabled={saving}
                aria-expanded={categoryOpen}
                style={{
                  width: "100%",
                  minHeight: "46px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textAlign: "left",
                  padding: "0.75rem 0.9rem",
                  borderRadius: "12px",
                }}
              >
                <span>
                  {selectedCategory === "Otro"
                    ? customCategory || "Otro"
                    : selectedCategory || "Seleccionar categoría"}
                </span>
                <span aria-hidden="true">{categoryOpen ? "▲" : "▼"}</span>
              </button>

              {categoryOpen && (
                <div
                  style={{
                    marginTop: "0.55rem",
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(160px, 100%), 1fr))",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    border: "1px solid rgba(74, 222, 128, 0.24)",
                    borderRadius: "14px",
                    background: "rgba(15, 23, 42, 0.88)",
                  }}
                >
                  {CATEGORY_OPTIONS.map((category) => {
                    const active = selectedCategory === category;

                    return (
                      <button
                        key={category}
                        type="button"
                        className={active ? "primary-btn" : "secondary-btn"}
                        onClick={() => handleCategorySelect(category)}
                        disabled={saving}
                        style={{
                          width: "100%",
                          minHeight: "42px",
                          justifyContent: "center",
                        }}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedCategory === "Otro" && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => handleCustomCategoryChange(e.target.value)}
                  disabled={saving}
                  placeholder="Escribe la categoría"
                  style={{ marginTop: "0.55rem" }}
                />
              )}
            </div>

            <div className="task-field">
              <label>Monto (CRC)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setField("amount", e.target.value)}
                disabled={saving}
                min="0"
                step="1"
              />
            </div>

            <div className="task-field" style={{ gridColumn: "1 / -1" }}>
              <label>Número de factura (opcional)</label>
              <input
                type="text"
                value={form.invoiceNumber}
                onChange={(e) => setField("invoiceNumber", e.target.value)}
                disabled={saving}
                maxLength={80}
              />
            </div>

            <div className="task-field" style={{ gridColumn: "1 / -1" }}>
              <label>Nota</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setField("note", e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              marginTop: "1rem",
              paddingTop: "1rem",
              paddingBottom: "0.25rem",
              flexWrap: "wrap",
            }}
          >
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
