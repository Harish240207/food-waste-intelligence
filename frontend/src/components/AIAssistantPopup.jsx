import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import toast from "react-hot-toast";
import "../styles/winnow.css";

/**
 * ✅ AI Assistant Popup
 * - Popup floating chat
 * - Backend: /ai/chat (Rule Based AI)
 * - Multilingual (text + voice)
 * - Mic input (SpeechRecognition)
 * - Speaker output (SpeechSynthesis)
 */

const LANGS = [
  { code: "en-IN", name: "English" },
  { code: "ta-IN", name: "தமிழ் (Tamil)" },
  { code: "hi-IN", name: "हिन्दी (Hindi)" },
  { code: "bn-IN", name: "বাংলা (Bengali)" },
  { code: "mr-IN", name: "मराठी (Marathi)" },
  { code: "te-IN", name: "తెలుగు (Telugu)" },
  { code: "ml-IN", name: "മലയാളം (Malayalam)" },
];

const quickPrompts = [
  "Tomorrow forecast: top 5 items by predicted quantity.",
  "Waste risk: list items tagged OVERPRODUCTION_RISK.",
  "Waste cost: show estimated loss and top risk items.",
];


export default function AIAssistantPopup() {
  const [open, setOpen] = useState(false);

  const [lang, setLang] = useState("en-IN");
  const [micOn, setMicOn] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi 👋 I’m your AI Food Waste Assistant.\nI answer only using your dashboard billing + forecast data.",
    },
  ]);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const endRef = useRef(null);
  const recognitionRef = useRef(null);

  const selectedLang = useMemo(
    () => LANGS.find((l) => l.code === lang),
    [lang]
  );

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open]);

  // ✅ Voice recognition setup
  useEffect(() => {
    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;

    if (!SR) return;

    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        finalText += event.results[i][0].transcript;
      }
      setText(finalText);
    };

    recognition.onerror = () => {
      setMicOn(false);
      toast.error("Voice recognition failed");
    };

    recognition.onend = () => {
      setMicOn(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, [lang]);

  // ✅ speak AI response
  const speak = (message) => {
    try {
      if (!speakerOn) return;
      if (!window.speechSynthesis) return;

      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(message);
      utter.lang = lang;
      utter.rate = 1;
      utter.pitch = 1;

      window.speechSynthesis.speak(utter);
    } catch {}
  };

  const toggleMic = () => {
    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;

    if (!SR || !recognitionRef.current) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    if (micOn) {
      recognitionRef.current.stop();
      setMicOn(false);
      return;
    }

    setMicOn(true);
    setText("");
    recognitionRef.current.start();
  };

  const send = async (customText) => {
    if (loading) return;

    const prompt = (customText ?? text).trim();
    if (!prompt) return toast.error("Type something or use mic");

    // stop mic if running
    if (micOn) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setMicOn(false);
    }

    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setText("");
    setLoading(true);

    try {
      const res = await api.post("/ai/chat", {
        message: prompt,
        language: selectedLang?.name || "English",
      });

      const reply = res.data?.reply || "No response";

      setMessages((m) => [...m, { role: "assistant", text: reply }]);
      speak(reply);
    } catch (e) {
      const backendMsg =
        e?.response?.data?.reply ||
        e?.message ||
        "AI failed. Backend not responding.";

      toast.error("AI failed");
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `❌ ${backendMsg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ✅ Floating button */}
      <button
        className="ai-float-btn"
        onClick={() => setOpen((v) => !v)}
        title="AI Assistant"
      >
        🤖
      </button>

      {/* ✅ Popup */}
      {open && (
        <div className="ai-popup card glass">
          {/* Header */}
          <div className="ai-header">
            <div style={{ display: "flex", flexDirection: "column" }}>
              <b style={{ fontSize: 14 }}>AI Assistant</b>
              <span className="muted" style={{ fontSize: 12 }}>
                Dashboard Data Based • Text + Voice
              </span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className={`btn btn-ghost ${speakerOn ? "flash" : ""}`}
                style={{ padding: "8px 10px" }}
                onClick={() => setSpeakerOn((v) => !v)}
                title="Speaker"
              >
                🔊
              </button>

              <button
                className="btn btn-danger"
                style={{ padding: "8px 10px" }}
                onClick={() => setOpen(false)}
              >
                ✖
              </button>
            </div>
          </div>

          {/* Language selector */}
          <div style={{ marginTop: 10 }}>
            <label className="muted">Language</label>
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick prompts */}
          <div className="ai-quick">
            {quickPrompts.map((q) => (
              <button
                key={q}
                className="ai-chip"
                onClick={() => send(q)}
                disabled={loading}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="ai-messages">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`ai-msg ${
                  m.role === "user" ? "ai-user" : "ai-assistant"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && <div className="muted">AI typing...</div>}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="ai-inputbar">
            <button
              className={`btn btn-ghost ${micOn ? "flash" : ""}`}
              style={{ padding: "10px 12px" }}
              onClick={toggleMic}
              title="Mic input"
              disabled={loading}
            >
              🎤
            </button>

            <input
              value={text}
              placeholder="Ask in any language..."
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              disabled={loading}
            />

            <button
              className="btn btn-primary"
              onClick={() => send()}
              disabled={loading}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
