import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// ✅ Global CSS
import "./styles/winnow.css";

// ✅ Toast UI
import { Toaster } from "react-hot-toast";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />

    {/* ✅ Premium Global Toast */}
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={12}
      toastOptions={{
        duration: 2600,
        style: {
          background: "rgba(10, 12, 16, 0.82)",
          color: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(246, 211, 101, 0.18)",
          borderRadius: "16px",
          padding: "12px 14px",
          backdropFilter: "blur(14px)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          fontWeight: 800,
        },
        success: {
          iconTheme: {
            primary: "#f6d365",
            secondary: "#0b1018",
          },
        },
        error: {
          iconTheme: {
            primary: "#ff5b73",
            secondary: "#0b1018",
          },
        },
      }}
    />
  </React.StrictMode>
);
