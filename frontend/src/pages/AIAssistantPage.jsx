import React from "react";
import AIAssistantPopup from "../components/AIAssistantPopup";
import "../styles/winnow.css";

export default function AIAssistantPage() {
  return (
    <>
      {/* HERO */}
      <div className="hero">
        <div
          className="hero-bgimg"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=2400&q=80)",
          }}
        />
        <div className="hero-overlay-dark" />

        <div className="hero-box">
          <div className="hero-tag">
            <span className="hero-tag-dot" />
            AI ASSISTANT
          </div>

          <h1>AI Assistant</h1>
          <p>
            Multilingual AI Chat + Voice assistant (Data Based).
            Data-driven Assistant powered by your Billing + Forecast dashboard insights.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary">
              Click 🤖 floating button to chat
            </button>
          </div>
        </div>
      </div>

      {/* PAGE CONTENT */}
      <div className="page">
        <div
          className="panel card glass"
          style={{
            maxWidth: 980,
            margin: "26px auto",
            padding: 18,
          }}
        >
          <div
            className="panel-head"
            style={{ display: "flex", alignItems: "baseline", gap: 12 }}
          >
            <h2 style={{ margin: 0 }}>Assistant Panel</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              Text + Voice • Tamil / English / Hindi / Bengali / Marathi / Telugu /
              Malayalam
            </span>
          </div>

          <div className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
            ✅ This page is only for Admin / Manager.
            <br />
            ✅ Use the floating 🤖 button (bottom-right) to open the assistant.
            <br />
            ✅ Ask questions related to your Billing and Forecast data.
          </div>
        </div>
      </div>

      {/* ✅ Popup Chat */}
      <AIAssistantPopup />
    </>
  );
}
