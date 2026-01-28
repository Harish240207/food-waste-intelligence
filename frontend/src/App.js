import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation,
} from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";

import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Admin from "./pages/Admin";
import Forecast from "./pages/Forecast";
import ForecastArchive from "./pages/ForecastArchive";
import AIAssistantPage from "./pages/AIAssistantPage";

import Login from "./pages/Login";
import AccessDenied from "./pages/AccessDenied";

import "./styles/winnow.css";

/* ===========================
   AUTH HELPERS
   =========================== */

const AUTH_EVENT = "auth:changed";

function emitAuthChanged() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

function getAuth() {
  try {
    const token = localStorage.getItem("token") || "";
    const userRaw = localStorage.getItem("user");
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { token, user };
  } catch {
    return { token: "", user: null };
  }
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  emitAuthChanged();
}

/* ===========================
   ROUTE TRANSITION (CSS only)
   =========================== */
function RouteTransition({ children }) {
  const location = useLocation();
  const [animate, setAnimate] = useState(false);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    setAnimate(true);
    const t = setTimeout(() => setAnimate(false), 450);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <div
      key={location.pathname}
      className={`page-transition ${animate ? "page-enter" : ""}`}
    >
      {children}
    </div>
  );
}

/* ===========================
   PROTECTED ROUTE
   =========================== */
function ProtectedRoute({ children, allowRoles }) {
  const { token, user } = getAuth();

  if (!token || !user?.role) return <Navigate to="/login" replace />;

  if (Array.isArray(allowRoles) && allowRoles.length > 0) {
    if (!allowRoles.includes(user.role)) return <Navigate to="/403" replace />;
  }

  return children;
}

/* ===========================
   TOPBAR (role aware)
   =========================== */
function Topbar() {
  const location = useLocation();

  // ✅ Hide topbar in login page
  const hideOnRoutes = ["/login", "/403"];
  const hideTopbar = hideOnRoutes.includes(location.pathname);

  const [auth, setAuth] = useState(() => getAuth());

  useEffect(() => {
    const sync = () => setAuth(getAuth());
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const role = auth?.user?.role || "";
  const loggedIn = Boolean(auth?.token);

  const tabs = useMemo(() => {
    if (!loggedIn) return [];

    if (role === "admin") {
      return [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/billing", label: "Billing" },
        { to: "/admin", label: "Admin" },
        { to: "/forecast", label: "Forecast" },
        { to: "/archive", label: "Archive" },
        { to: "/assistant", label: "AI Assistant" },
      ];
    }

    if (role === "cashier") {
      return [{ to: "/billing", label: "Billing" }];
    }

    if (role === "manager") {
      return [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/forecast", label: "Forecast" },
        { to: "/archive", label: "Archive" },
        { to: "/assistant", label: "AI Assistant" },
      ];
    }

    return [{ to: "/dashboard", label: "Dashboard" }];
  }, [loggedIn, role]);

  const logout = () => {
    clearAuth();
    window.location.href = "/login";
  };

  if (hideTopbar) return null;

  return (
    <nav className="topbar">
      <div className="nav-wrap">
        <div className="brand">
          <div className="brand-dot"></div>
          <div>
            <div className="brand-title">Food Waste Intelligence</div>
            <div className="brand-sub">Billing + Analytics + AI Forecasting</div>
          </div>
        </div>

        <div className="tabs">
          {!loggedIn ? (
            <NavLink
              to="/login"
              className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
            >
              Login
            </NavLink>
          ) : (
            <>
              {tabs.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
                >
                  {t.label}
                </NavLink>
              ))}

              <span
                className="tab"
                style={{
                  cursor: "default",
                  opacity: 0.9,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                Role: {role}
              </span>

              <button className="tab" onClick={logout}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const { token, user } = getAuth();

  const homePath = useMemo(() => {
    if (!token || !user?.role) return "/login";
    if (user.role === "cashier") return "/billing";
    return "/dashboard";
  }, [token, user]);

  return (
    <Router>
      <Topbar />

      <RouteTransition>
        <Routes>
          <Route path="/" element={<Navigate to={homePath} replace />} />

          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/403" element={<AccessDenied />} />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowRoles={["admin", "manager"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/billing"
            element={
              <ProtectedRoute allowRoles={["admin", "cashier"]}>
                <Billing />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowRoles={["admin"]}>
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route
            path="/forecast"
            element={
              <ProtectedRoute allowRoles={["admin", "manager"]}>
                <Forecast />
              </ProtectedRoute>
            }
          />

          <Route
            path="/archive"
            element={
              <ProtectedRoute allowRoles={["admin", "manager"]}>
                <ForecastArchive />
              </ProtectedRoute>
            }
          />

          {/* ✅ AI Assistant Page (ROLE BASED) */}
          <Route
            path="/assistant"
            element={
              <ProtectedRoute allowRoles={["admin", "manager"]}>
                <AIAssistantPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to={homePath} replace />} />
        </Routes>
      </RouteTransition>
    </Router>
  );
}
