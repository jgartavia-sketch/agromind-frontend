AGROMIND CR — FICHAS TÉCNICAS / PROGRAMACIÓN AGRONÓMICA — BETA PRIVADA V2
Fecha: 2026-09-22

IMPORTANTE
- Este paquete REEMPLAZA los ZIP beta anteriores.
- La biblioteca de fichas ahora vive en el CENTRO DE FINCAS (/select-farm), junto a "Crear nueva finca".
- Solo memo@gmail.com ve el botón y las pantallas beta.
- El backend vuelve a verificar el correo real y permisos; esconder la interfaz no es la seguridad principal.

FLUJO FINAL
A) Centro de fincas
   memo@gmail.com ve: "Agregar ficha técnica · BETA".
   Allí crea fichas generales reutilizables, manualmente o desde PDF, y conserva versiones.

B) Dentro de una finca / zona / Process Lab
   Al crear un proceso aparece:
   "¿Vincular este proceso a una ficha técnica?"
   - No: el proceso funciona exactamente como hoy.
   - Sí: escoge ficha, versión y fecha real de inicio.
   - Puede ajustar duración, etapas, dosis, productos, fechas relativas, método, responsable o prioridad SOLO para ese proceso/finca. La ficha general no cambia.

C) Al confirmar un proceso vinculado
   AgroMind genera automáticamente etapas + aplicaciones + tareas con fechas.
   Las tareas entran al módulo Tareas y al Calendario Maestro existente.

D) Dentro de la finca
   memo@gmail.com ve "Programación técnica · BETA" para registrar aplicaciones reales, extraordinarias y generar la Cédula PDF.

E) Dashboard
   memo@gmail.com ve un bloque adicional de Operación Agronómica: ciclos activos, aplicaciones de hoy, pendientes, vencidas, realizadas, extraordinarias y cumplimiento.
   Los KPIs existentes también reciben las tareas generadas porque reutilizamos el sistema de Task actual.

POR QUÉ HAY UN INSTALADOR
Los archivos FarmWorkspacePage.jsx, ProcessModal.jsx, FarmShell.jsx, DashboardPage.jsx y TareasPage.jsx son archivos existentes grandes. Para evitar reemplazar accidentalmente código reciente, el ZIP agrega los módulos nuevos y usa un parche estricto sobre los puntos exactos revisados en main. Si el archivo local no coincide con el estado esperado, el instalador ABORTA en vez de hacer un reemplazo inseguro.

APLICACIÓN
1) Extraer este ZIP en la raíz de agromind-frontend.
2) Ejecutar UNA sola vez:
   node scripts/apply_agromind_technical_beta.mjs
   (o doble clic / ejecutar APLICAR_FICHAS_TECNICAS_BETA.cmd)
3) Validar:
   npm run check
4) Revisar:
   git status
   git diff --stat
5) Levantar:
   npm run dev

ARCHIVOS NUEVOS
- src/pages/TechnicalSheetsLibraryPage.jsx
- src/pages/TechnicalProgramPage.jsx
- src/components/map/TechnicalSheetProcessLink.jsx
- src/components/PrivateBetaAgronomicDashboard.jsx
- src/styles/technical-sheets-beta.css
- scripts/apply_agromind_technical_beta.mjs

ARCHIVOS QUE EL INSTALADOR INTEGRA (NO DESTRUYE EL RESTO)
- src/pages/FarmWorkspacePage.jsx
- src/components/map/ProcessModal.jsx
- src/components/FarmShell.jsx
- src/pages/DashboardPage.jsx
- src/pages/TareasPage.jsx

Si el instalador dice ABORTADO, NO HAGAS PUSH. Eso significa que tu archivo local no coincide con el punto revisado y hay que reconciliarlo antes.
