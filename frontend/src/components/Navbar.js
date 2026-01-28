import React, { useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/winnow.css";

export default function Navbar() {
  const navigate = useNavigate();

  // token format: username::role
  const token = localStorage.getItem("token") || "";

  const user = useMemo(() => {
    if (!token.includes("::")) return null;
    const [username, role] = token.split("::");
    return { username, role };
  }, [token]);

  const role = user?.role || "";

  // ✅ Role based access
  const canAccessAI = ["admin", "manager"].includes(role);
  // If you want cashier also:
  // const canAccessAI = ["admin", "manager", "cashier"].includes(role);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
    window.location.reload();
  };

  const linkClass = ({ isActive }) =>
    `nav-link ${isActive ? "active" : ""}`;

  return (
    <div className="navbar glass">
      <div className="nav-left">
        <div className="brand">
          <div className="brand-icon" />
          <div>
            <b>Food Waste Intelligence</b>
            <div className="muted" style={{ fontSize: 12 }}>
              Billing + Analytics + AI Forecasting
            </div>
          </div>
        </div>
      </div>

      <div className="nav-mid">
        <NavLink to="/dashboard" className={linkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/billing" className={linkClass}>
          Billing
        </NavLink>

        {role === "admin" && (
          <NavLink to="/admin" className={linkClass}>
            Admin
          </NavLink>
        )}

        <NavLink to="/forecast" className={linkClass}>
          Forecast
        </NavLink>
        <NavLink to="/archive" className={linkClass}>
          Archive
        </NavLink>

        {/* ✅ NEW ROLE BASED TAB */}
        {canAccessAI && (
          <NavLink to="/assistant" className={linkClass}>
            AI Assistant
          </NavLink>
        )}
      </div>

      <div className="nav-right">
        {user ? (
          <>
            <span className="muted" style={{ marginRight: 12 }}>
              {user.username} ({user.role})
            </span>

            <button className="btn btn-danger" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <NavLink to="/" className="btn btn-primary">
            Login
          </NavLink>
        )}
      </div>
    </div>
  );
}
