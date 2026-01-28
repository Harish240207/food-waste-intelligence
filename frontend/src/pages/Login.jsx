import { useState } from "react";
import api from "../api";
import toast from "react-hot-toast";
import "../styles/winnow.css";

export default function Login({ onLogin }) {
  const heroImg =
    "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=2400&q=80";

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      const res = await api.post("/auth/login", { username, password });
      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      window.dispatchEvent(new Event("auth:changed"));

      toast.success(`Welcome ${user.username} (${user.role})`);
      onLogin?.(user);
    } catch (e) {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="hero">
        <div className="hero-bgimg" style={{ backgroundImage: `url(${heroImg})` }} />
        <div className="hero-overlay-dark" />

        <div className="hero-box">
          <div className="hero-tag">
            <span className="hero-tag-dot" />
            SECURE ACCESS
          </div>
          <h1>Login</h1>
          <p>
            Role based login for Admin / Manager / Cashier. This makes the project
            production-like and professional.
          </p>

          <div className="hero-actions">
            <button className="btn btn-ghost">Admin / Manager / Cashier</button>
          </div>
        </div>
      </div>

      <div className="page">
        {/* ✅ Added className login-panel */}
        <div className="panel card glass login-panel">
          <div className="panel-head">
            <h2>Sign In</h2>
            <span className="muted">Use your credentials</span>
          </div>

          {/* ✅ Added className login-form-row */}
          <div className="login-form-row">
            <div>
              <label className="muted">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>

            <div>
              <label className="muted">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>

          <div className="muted" style={{ marginTop: 14 }}>
            Demo users:
            <br />
            <b>admin / admin123</b> (admin)
            <br />
            <b>manager / manager123</b> (manager)
            <br />
            <b>cashier / cashier123</b> (cashier)
          </div>
        </div>
      </div>
    </>
  );
}
