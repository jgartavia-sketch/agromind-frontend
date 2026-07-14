// src/AgroMindApp.jsx
import { useEffect, useMemo, useState } from "react";
import FarmShell from "./components/FarmShell";
import LoginScreen from "./components/LoginScreen";
import ResetPasswordScreen from "./components/ResetPasswordScreen";
import InvitationAcceptPage from "./pages/InvitationAcceptPage";
import FarmWorkspacePage from "./pages/FarmWorkspacePage";
import LandingPage from "./pages/LandingPage";

const RAW_API_BASE =
  import.meta.env.VITE_API_URL || "https://agromind-backend-slem.onrender.com";

const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

const TOKEN_KEYS = ["agromind_token", "token", "auth_token", "jwt"];
const USER_KEYS = ["agromind_user", "user", "auth_user"];

function getCurrentLocation() {
  return {
    pathname: window.location.pathname || "/",
    search: window.location.search || "",
  };
}

function navigateTo(path, options = {}) {
  const { replace = false } = options;

  if (replace) {
    window.history.replaceState({}, "", path);
  } else {
    window.history.pushState({}, "", path);
  }

  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getStoredToken() {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function getStoredUser() {
  for (const k of USER_KEYS) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.email || parsed?.id || parsed?.name) return parsed;
    } catch {
      continue;
    }
  }

  return null;
}

function setStoredSession({ token, user }) {
  if (token) localStorage.setItem("agromind_token", token);
  if (user) localStorage.setItem("agromind_user", JSON.stringify(user));
}

function clearStoredSession() {
  [...TOKEN_KEYS, ...USER_KEYS].forEach((k) => localStorage.removeItem(k));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export default function AgroMindApp() {
  const [location, setLocation] = useState(getCurrentLocation);

  useEffect(() => {
    const handleLocationChange = () => {
      setLocation(getCurrentLocation());
    };

    window.addEventListener("popstate", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const currentPath = location.pathname;
  const currentParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const isResetPasswordRoute =
    currentPath === "/reset-password" && currentParams.has("token");

  const isInvitationAcceptRoute =
    currentPath === "/invitations/accept" && currentParams.has("token");

  const isLandingRoute = currentPath === "/";
  const isAuthRoute =
    currentPath === "/login" ||
    currentPath === "/register" ||
    currentPath === "/signup";

  const initialSession = useMemo(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();

    return {
      token,
      user: token && storedUser ? storedUser : null,
    };
  }, []);

  const [user, setUser] = useState(initialSession.user);
  const [workspaceView, setWorkspaceView] = useState("workspace");

  const [booting, setBooting] = useState(
    !isResetPasswordRoute &&
      !isInvitationAcceptRoute &&
      !initialSession.user &&
      !!initialSession.token
  );

  useEffect(() => {
    if (isResetPasswordRoute || isInvitationAcceptRoute) {
      setBooting(false);
      return;
    }

    const token = initialSession.token;

    if (!token) {
      setBooting(false);
      return;
    }

    let alive = true;

    const validateSession = async () => {
      try {
        const resp = await fetchWithTimeout(`${API_BASE}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!alive) return;

        if (!resp.ok) {
          clearStoredSession();
          setUser(null);
          setWorkspaceView("workspace");
          return;
        }

        const data = await resp.json().catch(() => ({}));

        if (data?.user) {
          setStoredSession({ token, user: data.user });
          setUser(data.user);
          setWorkspaceView("workspace");
        } else {
          clearStoredSession();
          setUser(null);
          setWorkspaceView("workspace");
        }
      } catch {
        if (!alive) return;

        if (!initialSession.user) {
          clearStoredSession();
          setUser(null);
          setWorkspaceView("workspace");
        }
      } finally {
        if (alive) setBooting(false);
      }
    };

    validateSession();

    return () => {
      alive = false;
    };
  }, [
    initialSession.token,
    initialSession.user,
    isResetPasswordRoute,
    isInvitationAcceptRoute,
  ]);

  const handleLogin = (payload) => {
    const token = payload?.token || null;

    const u =
      payload?.user ||
      (payload?.email
        ? { name: payload?.name || "Productor", email: payload.email }
        : null);

    if (token && u) {
      setStoredSession({ token, user: u });
    }

    setUser(u);
    setWorkspaceView("workspace");
    navigateTo("/select-farm", { replace: true });
  };

  const handleLogout = () => {
    clearStoredSession();
    setUser(null);
    setWorkspaceView("workspace");
    navigateTo("/", { replace: true });
  };

  const handleOpenFarm = () => {
    setWorkspaceView("farm");
    navigateTo("/app");
  };

  const handleBackToWorkspace = () => {
    setWorkspaceView("workspace");
    navigateTo("/select-farm");
  };

  const handleOpenAccountFromLanding = () => {
    if (!user) {
      navigateTo("/login");
      return;
    }

    setWorkspaceView("workspace");
    navigateTo("/select-farm");
  };

  if (isResetPasswordRoute) {
    return <ResetPasswordScreen apiBase={API_BASE} />;
  }

  if (isInvitationAcceptRoute) {
    return <InvitationAcceptPage />;
  }

  if (booting) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#020617",
          color: "#e2e8f0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>AgroMind CR</h2>
          <p style={{ margin: 0 }}>Preparando tu espacio...</p>
        </div>
      </div>
    );
  }

  if (isLandingRoute) {
    return (
      <LandingPage
        hasSession={Boolean(user)}
        onOpenAccount={handleOpenAccountFromLanding}
      />
    );
  }

  if (!user) {
    if (!isAuthRoute) {
      navigateTo("/login", { replace: true });
      return null;
    }

    return <LoginScreen onLogin={handleLogin} />;
  }

  if (currentPath === "/app" || workspaceView === "farm") {
    return (
      <FarmShell
        user={user}
        onLogout={handleLogout}
        onBackToWorkspace={handleBackToWorkspace}
      />
    );
  }

  return (
    <FarmWorkspacePage
      user={user}
      onOpenFarm={handleOpenFarm}
      onLogout={handleLogout}
    />
  );
}
