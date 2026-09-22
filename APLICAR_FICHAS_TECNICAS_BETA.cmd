@echo off
setlocal
cd /d "%~dp0"
echo.
echo === AGROMIND - INTEGRANDO FICHAS TECNICAS BETA ===
node scripts\apply_agromind_technical_beta.mjs
if errorlevel 1 (
  echo.
  echo ERROR: La integracion fue abortada. NO hagas push.
  pause
  exit /b 1
)
echo.
echo Integracion aplicada. Ejecuta ahora: npm run check
pause
