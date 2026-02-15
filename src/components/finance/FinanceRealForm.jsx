// src/components/finance/FinanceRealForm.jsx
import { useState } from "react";
import "./finance-real-form.css";

export default function FinanceRealForm({ onAddMovement }) {
  const [type, setType] = useState("Ingreso");
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!concept || !amount) return;

    onAddMovement({
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      concept,
      category: category || "General",
      type,
      amount: Number(amount),
      note,
    });

    // reset
    setConcept("");
    setCategory("");
    setAmount("");
    setNote("");
  };

  return (
    <section className="finance-real-card">
      <h3>📒 Registrar movimiento real</h3>
      <p className="finance-real-subtitle">
        Datos ingresados manualmente · reflejan la operación real de la finca
      </p>

      <form className="finance-real-form" onSubmit={handleSubmit}>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="Ingreso">Ingreso</option>
          <option value="Gasto">Gasto</option>
        </select>

        <input
          type="text"
          placeholder="Concepto (ej: Venta de huevos)"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
        />

        <input
          type="text"
          placeholder="Categoría (ej: Producción, Insumos)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <input
          type="number"
          placeholder="Monto en colones"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <textarea
          placeholder="Nota opcional"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />

        <button type="submit" className="primary-btn">
          Guardar movimiento
        </button>
      </form>
    </section>
  );
}
