import { useState } from "react";

export default function AddMovementModal({ onClose, onSave }) {
  const [type, setType] = useState("Gasto");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [concept, setConcept] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    if (!amount || !category || !concept || !date) return;

    onSave({
      id: Date.now(),
      type,
      amount: Number(amount),
      category,
      concept,
      date,
      note,
    });

    onClose();
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3>Agregar movimiento</h3>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Tipo
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="Ingreso">Ingreso</option>
              <option value="Gasto">Gasto</option>
            </select>
          </label>

          <label>
            Monto
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="₡0"
            />
          </label>

          <label>
            Categoría
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Insumos, Mano de obra..."
            />
          </label>

          <label>
            Concepto
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Compra de fertilizante"
            />
          </label>

          <label>
            Fecha
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label>
            Nota
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opcional"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
