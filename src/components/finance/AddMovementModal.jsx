// src/components/finance/AddMovementModal.jsx
import { useEffect, useMemo, useState } from "react";

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const EMPTY = {
  id: null,
  date: "",
  concept: "",
  category: "",
  type: "Ingreso",
  amount: "",
  note: "",
};

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
      note: initialMovement.note || "",
    };
  }, [initialMovement]);

  const [form, setForm] = useState(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();

    const concept = String(form.concept || "").trim();
    const category = String(form.category || "").trim();
    const type = String(form.type || "").trim();
    const note = String(form.note || "").trim();

    if (!concept) {
      alert("Escribe un concepto (ej: venta, compra, etc.).");
      return;
    }

    if (type !== "Ingreso" && type !== "Gasto") {
      alert('Tipo inválido. Debe ser "Ingreso" o "Gasto".');
      return;
    }

    const amountNum = Number(String(form.amount || "").replaceAll(",", "").trim());
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      alert("Monto inválido. Debe ser un número >= 0.");
      return;
    }

    const payload = {
      ...(form.id ? { id: form.id } : {}),
      date: form.date || todayYYYYMMDD(),
      concept,
      category: category || "General",
      type,
      amount: amountNum,
      note: note || null,
    };

    onSave(payload);
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        style={{
          width: "min(720px, 100%)",
          background: "rgba(2, 6, 23, 0.98)",
          border: "1px solid #1e293b",
          borderRadius: "18px",
          padding: "1.25rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h3 style={{ margin: 0 }}>
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
            style={{ height: "fit-content" }}
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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
                placeholder="Ej: cosecha, venta, compra de fertilizante..."
                disabled={saving}
              />
            </div>

            <div className="task-field">
              <label>Categoría</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                placeholder="Ej: ventas, insumos, transporte..."
                disabled={saving}
              />
            </div>

            <div className="task-field">
              <label>Monto (CRC)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setField("amount", e.target.value)}
                placeholder="Ej: 25000"
                disabled={saving}
                min="0"
                step="1"
              />
            </div>

            <div className="task-field" style={{ gridColumn: "1 / -1" }}>
              <label>Nota</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setField("note", e.target.value)}
                placeholder="Opcional"
                disabled={saving}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar"}
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}