import { useNavigate } from "react-router-dom";
import "../styles/winnow.css";

export default function AccessDenied() {
  const navigate = useNavigate();

  const heroImg =
    "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=2400&q=80";

  return (
    <>
      {/* HERO */}
      <div className="hero">
        <div
          className="hero-bgimg"
          style={{ backgroundImage: `url(${heroImg})` }}
        />
        <div className="hero-overlay-dark" />

        <div className="hero-box">
          <div className="hero-tag">
            <span className="hero-tag-dot" />
            SECURITY
          </div>

          <h1>Access Denied</h1>
          <p>
            You don’t have permission to access this page. Please login with the
            correct role.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => navigate("/login")}>
              Go to Login
            </button>

            <button className="btn btn-ghost" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="page">
        <div className="panel card glass">
          <div className="panel-head">
            <h2>Why this happened?</h2>
            <span className="muted">RBAC Protected Route</span>
          </div>

          <div className="muted" style={{ lineHeight: 1.7 }}>
            ✅ This project uses <b>Role Based Login</b>.
            <br />
            Example:
            <br />
            • Admin → Admin panel
            <br />
            • Cashier → Billing
            <br />
            • Manager → Analytics/Dashboard
            <br />
            <br />
            Please login with proper role to access this page.
          </div>
        </div>
      </div>
    </>
  );
}
