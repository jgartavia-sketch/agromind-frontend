
export function summarizeMovements(movements) {
  return movements.reduce(
    (acc, m) => {
      acc.ingresos += m.ingresos;
      acc.gastos += m.gastos;
      acc.balance += m.ingresos - m.gastos;
      return acc;
    },
    { ingresos: 0, gastos: 0, balance: 0 }
  );
}