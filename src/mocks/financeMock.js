
export const financeMock = {
  fincas: [
    {
      id: "finca_1",
      nombre: "Finca Principal",
      zonas: [
        {
          id: "zona_1",
          nombre: "Huerta Orgánica",
          movimientos: [
            { mes: "2026-01", ingresos: 120000, gastos: 45000 },
            { mes: "2026-02", ingresos: 135000, gastos: 52000 },
            { mes: "2026-03", ingresos: 150000, gastos: 60000 },
          ],
        },
        {
          id: "zona_2",
          nombre: "Vivero",
          movimientos: [
            { mes: "2026-01", ingresos: 65000, gastos: 30000 },
            { mes: "2026-02", ingresos: 72000, gastos: 35000 },
            { mes: "2026-03", ingresos: 80000, gastos: 42000 },
          ],
        },
      ],
    },

    {
      id: "finca_2",
      nombre: "Finca Experimental",
      zonas: [
        {
          id: "zona_3",
          nombre: "Área de Ensayo",
          movimientos: [
            { mes: "2026-01", ingresos: 40000, gastos: 25000 },
            { mes: "2026-02", ingresos: 50000, gastos: 30000 },
            { mes: "2026-03", ingresos: 60000, gastos: 32000 },
          ],
        },
      ],
    },
  ],
};
