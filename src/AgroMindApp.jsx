// src/AgroMindApp.jsx
import { useState } from "react";
import FarmShell from "./components/FarmShell";
import LoginScreen from "./components/LoginScreen";

export default function AgroMindApp() {
  const [user, setUser] = useState(null);

  const handleLogin = (payload) => {
    // payload = { name, email }
    setUser(payload);
  };

  const handleLogout = () => {
    setUser(null);
  };

  // Si no hay usuario -> mostrar login SIEMPRE
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Si hay usuario -> mostrar shell con el mapa
  return <FarmShell user={user} onLogout={handleLogout} />;
}
