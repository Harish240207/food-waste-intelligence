import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/winnow.css";

export default function AIFloatButton() {
  const nav = useNavigate();

  return (
    <button
      className="ai-float-btn"
      onClick={() => nav("/ai-assistant")}
      title="Open AI Assistant"
    >
      🤖
    </button>
  );
}
