import React, { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "alphamind_sessions";

// ── TYPEWRITER HERO ───────────────────────────────────────────────────────────
function TypewriterHero() {
  const fullText = "AlphaMind";
  const [displayed, setDisplayed] = React.useState("");
  const [phase, setPhase] = React.useState("typing");

  React.useEffect(() => {
    let timeout;
    if (phase === "typing") {
      if (displayed.length < fullText.length) {
        timeout = setTimeout(() => setDisplayed(fullText.slice(0, displayed.length + 1)), 110);
      } else {
        timeout = setTimeout(() => setPhase("pause"), 2000);
      }
    } else if (phase === "pause") {
      timeout = setTimeout(() => setPhase("deleting"), 400);
    } else if (phase === "deleting") {
      if (displayed.length > 0) {
        timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 65);
      } else {
        timeout = setTimeout(() => setPhase("typing"), 500);
      }
    }
    return () => clearTimeout(timeout);
  }, [displayed, phase]);

  const alphaText = displayed.slice(0, Math.min(displayed.length, 5));
  const mindText = displayed.length > 5 ? displayed.slice(5) : "";

  return (
    <h1 style={{ fontSize: "clamp(72px, 13vw, 120px)", fontWeight: "700", fontFamily: "'Lora', serif", lineHeight: 1.05, marginBottom: "16px", minHeight: "1.2em" }}>
      <span style={{ color: "#FAED26" }}>{alphaText}</span>
      <span style={{ color: "#FFFFFF" }}>{mindText}</span>
      <span style={{ borderRight: "5px solid #FAED26", marginLeft: "3px", animation: "cursorBlink 1s step-end infinite" }}></span>
    </h1>
  );
}

// ── MARKDOWN RENDERER ─────────────────────────────────────────────────────────
function renderMarkdown(text) {
  const lines = text.split("\n");
  const elements = [];
  let codeBlock = [];
  let inCode = false;
  let codeLang = "";
  let key = 0;

  const CopyButton = ({ code }) => {
    const [copied, setCopied] = React.useState(false);
    return (
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        style={{
          position: "absolute", top: "10px", right: "10px",
          background: copied ? "#FAED26" : "#E8E8E8",
          border: "none", borderRadius: "6px", padding: "4px 10px",
          color: copied ? "#0A0A0A" : "#888", fontSize: "10px",
          fontFamily: "monospace", cursor: "pointer", transition: "all 0.2s",
          letterSpacing: "1px"
        }}
      >{copied ? "COPIED ✓" : "COPY"}</button>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (!inCode) {
        inCode = true;
        codeLang = line.slice(3).trim() || "code";
        codeBlock = [];
      } else {
        const codeStr = codeBlock.join("\n");
        elements.push(
          <div key={key++} style={{ position: "relative", marginBottom: "14px" }}>
            <div style={{ background: "#F5F5F5", borderRadius: "10px", border: "1px solid #DDDDDD", overflow: "hidden" }}>
              <div style={{ background: "#EEEEEE", padding: "6px 14px", borderBottom: "1px solid #DDDDDD", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "9px", color: "#960016", fontFamily: "monospace", letterSpacing: "2px" }}>{codeLang.toUpperCase()}</span>
                <CopyButton code={codeStr} />
              </div>
              <pre style={{ margin: 0, padding: "16px", overflowX: "auto", fontSize: "13px", color: "#333333", fontFamily: "monospace", lineHeight: 1.7 }}><code>{codeStr}</code></pre>
            </div>
          </div>
        );
        inCode = false; codeBlock = []; codeLang = "";
      }
      continue;
    }

    if (inCode) { codeBlock.push(line); continue; }

    const parseBold = (str) => {
      const parts = str.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i} style={{ color: "#960016", fontWeight: "700" }}>{p.slice(2, -2)}</strong>
          : p
      );
    };

    if (line.startsWith("### ")) {
      elements.push(<div key={key++} style={{ fontSize: "16px", fontWeight: "700", color: "#960016", fontFamily: "'Lora', serif", marginBottom: "8px", marginTop: "12px" }}>{line.slice(4)}</div>);
    } else if (line.startsWith("## ")) {
      elements.push(<div key={key++} style={{ fontSize: "18px", fontWeight: "700", color: "#960016", fontFamily: "'Lora', serif", marginBottom: "10px", marginTop: "14px" }}>{line.slice(3)}</div>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(<div key={key++} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}><span style={{ color: "#960016", marginTop: "2px" }}>•</span><span style={{ fontSize: "15px", color: "#333333", lineHeight: 1.7, fontFamily: "'Lora', serif" }}>{parseBold(line.slice(2))}</span></div>);
    } else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)[1];
      elements.push(<div key={key++} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}><span style={{ color: "#960016", fontFamily: "monospace", fontSize: "12px", minWidth: "18px", marginTop: "3px" }}>{num}.</span><span style={{ fontSize: "15px", color: "#333333", lineHeight: 1.7, fontFamily: "'Lora', serif" }}>{parseBold(line.replace(/^\d+\. /, ""))}</span></div>);
    } else if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: "8px" }} />);
    } else {
      elements.push(<div key={key++} style={{ fontSize: "15px", color: "#333333", lineHeight: 1.7, fontFamily: "'Lora', serif", marginBottom: "4px" }}>{parseBold(line)}</div>);
    }
  }

  return <div>{elements}</div>;
}

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveSessions(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

function ConfidenceBar({ value }) {
  const color = value >= 70 ? "#960016" : value >= 45 ? "#FAED26" : "#DDDDDD";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "7px" }}>
      <div style={{ flex: 1, height: "3px", background: "#E0E0E0", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: "2px", transition: "width 1.2s cubic-bezier(.4,0,.2,1)" }} />
      </div>
      <span style={{ fontSize: "13px", color: "#FAED26", fontFamily: "monospace", minWidth: "34px", fontWeight: "600" }}>{value}%</span>
    </div>
  );
}

// ── FOLLOW-UP THREAD ──────────────────────────────────────────────────────────
function FollowUp({ question, sessionData, onClose }) {
  const [messages, setMessages] = useState([{ role: "assistant", content: `Let's go deeper on this:\n\n"${question}"\n\nWhat's your initial thought or reaction?` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/think", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUp: true, context: sessionData, question, messages: updated })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{
        background: "#FFFFFF", border: "2px solid #CC0020",
        borderRadius: "20px", width: "100%", maxWidth: "680px",
        height: "88vh", maxHeight: "800px",
        display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(204,0,32,0.3)", overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEEEEE", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
          <div style={{ flex: 1, paddingRight: "12px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#960016", fontFamily: "monospace", marginBottom: "6px" }}>DEEP DIVE MODE</div>
            <p style={{ fontSize: "14px", color: "#555555", fontFamily: "'Lora', serif", fontStyle: "italic", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>"{question}"</p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid #DDDDDD", color: "#888", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontSize: "13px", flexShrink: 0, whiteSpace: "nowrap" }}>✕ Close</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px", display: "flex", flexDirection: "column", gap: "12px", WebkitOverflowScrolling: "touch" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "88%", padding: "13px 16px",
                borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: m.role === "user" ? "#960016" : "#F5F5F5",
                border: m.role === "user" ? "none" : "1px solid #EEEEEE",
                color: m.role === "user" ? "#FFFFFF" : "#333333",
                fontSize: "15px", fontFamily: "'Lora', serif", lineHeight: 1.7, wordBreak: "break-word"
              }}>
                {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: "6px", padding: "4px 0" }}>
              {[0,1,2].map(i => <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#FAED26", animation: `blink 1.2s ${i*0.2}s infinite` }} />)}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "14px 18px 20px", borderTop: "1px solid #EEEEEE", flexShrink: 0, background: "#FAFAFA" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "stretch" }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Reply to go deeper..."
              rows={2}
              style={{ flex: 1, background: "#FFFFFF", border: `1.5px solid ${input ? "#960016" : "#DDDDDD"}`, borderRadius: "12px", padding: "12px 16px", color: "#0A0A0A", fontSize: "15px", fontFamily: "'Lora', serif", resize: "none", outline: "none", lineHeight: 1.5 }}
            />
            <button onClick={send} disabled={loading || !input.trim()} style={{
              width: "48px", background: !input.trim() ? "#EEEEEE" : "#FAED26",
              border: "none", borderRadius: "12px",
              color: !input.trim() ? "#AAA" : "#0A0A0A",
              cursor: !input.trim() ? "not-allowed" : "pointer",
              fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "stretch"
            }}>→</button>
          </div>
          <p style={{ textAlign: "center", fontSize: "9px", color: "#BBBBBB", marginTop: "8px", letterSpacing: "1px", fontFamily: "monospace" }}>ENTER TO SEND · SHIFT+ENTER FOR NEW LINE</p>
        </div>
      </div>
    </div>
  );
}

// ── EXPORT AS IMAGE ──────────────────────────────────────────────────────────
async function exportCardAsImage(session, cardRef) {
  if (!cardRef?.current) return;
  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(cardRef.current, { backgroundColor: "#FFFFFF", scale: 2, useCORS: true, logging: false });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `alphamind-${session.data.title.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  } catch (e) { console.error("Export failed:", e); }
}

// ── CARD ──────────────────────────────────────────────────────────────────────
function Card({ session, feedback, onFeedback }) {
  const { data } = session;
  const [followUpQ, setFollowUpQ] = useState(null);
  const [visible, setVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef(null);
  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  return (
    <>
      {followUpQ && <FollowUp question={followUpQ} sessionData={data} onClose={() => setFollowUpQ(null)} />}
      <div ref={cardRef} style={{
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.5s cubic-bezier(.4,0,.2,1)",
        background: "#FFFFFF", border: "none",
        borderRadius: "20px", padding: "clamp(20px, 4vw, 38px)", marginTop: "28px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)"
      }}>
        {/* Label */}
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#960016", fontFamily: "monospace", marginBottom: "16px" }}>ALPHAMIND · STRUCTURED OUTPUT</div>

        {/* Title */}
        <h2 style={{ fontSize: "38px", fontWeight: "700", fontFamily: "'Lora', Georgia, serif", color: "#0A0A0A", marginBottom: "14px", lineHeight: 1.2 }}>{data.title}</h2>

        {/* Core */}
        <div style={{ borderLeft: "4px solid #960016", paddingLeft: "18px", marginBottom: "34px" }}>
          <p style={{ fontSize: "20px", color: "#444444", lineHeight: 1.8, fontFamily: "'Lora', Georgia, serif", fontStyle: "italic" }}>{data.core}</p>
        </div>

        {/* Grid */}
        <div className="am-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div style={{ background: "#FAFAFA", borderRadius: "14px", padding: "24px", border: "1.5px solid #EEEEEE" }}>
            <div style={{ fontSize: "12px", letterSpacing: "3px", color: "#960016", fontFamily: "monospace", marginBottom: "16px", fontWeight: "600" }}>ASSUMPTION SCAN</div>
            {data.assumptions.map((a, i) => (
              <div key={i} style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "16px", color: "#333333", marginBottom: "8px", lineHeight: 1.6, fontFamily: "'Lora', serif" }}>{a.text}</p>
                <ConfidenceBar value={a.confidence} />
              </div>
            ))}
          </div>

          <div style={{ background: "#FAFAFA", borderRadius: "14px", padding: "24px", border: "1.5px solid #EEEEEE" }}>
            <div style={{ fontSize: "12px", letterSpacing: "3px", color: "#960016", fontFamily: "monospace", marginBottom: "16px", fontWeight: "600" }}>ACTION SEQUENCE</div>
            {data.actions.map((a, i) => {
              const uc = a.urgency === "NOW" ? "#960016" : a.urgency === "WEEK" ? "#FAED26" : "#CCCCCC";
              const tc = a.urgency === "NOW" ? "#FFFFFF" : "#0A0A0A";
              return (
                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "14px" }}>
                  <span style={{ fontSize: "8px", fontFamily: "monospace", color: tc, background: uc, borderRadius: "4px", padding: "3px 7px", whiteSpace: "nowrap", marginTop: "3px", fontWeight: "700" }}>{a.urgency}</span>
                  <p style={{ fontSize: "16px", color: "#333333", lineHeight: 1.6, fontFamily: "'Lora', serif" }}>{a.step}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Socratic */}
        <div style={{ background: "#FAFAFA", borderRadius: "14px", padding: "24px", border: "1.5px solid #EEEEEE", marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", letterSpacing: "3px", color: "#960016", fontFamily: "monospace", marginBottom: "4px", fontWeight: "600" }}>SOCRATIC PROBE</div>
          <div style={{ fontSize: "9px", color: "#BBBBBB", fontFamily: "monospace", marginBottom: "16px", letterSpacing: "1px" }}>CLICK ANY QUESTION TO GO DEEPER</div>
          {data.questions.map((q, i) => (
            <div key={i} onClick={() => setFollowUpQ(q)}
              style={{ display: "flex", gap: "14px", marginBottom: "8px", alignItems: "flex-start", cursor: "pointer", padding: "12px", borderRadius: "10px", border: "1px solid transparent", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#FFF9E6"; e.currentTarget.style.borderColor = "#FAED26"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
            >
              <span style={{ color: "#960016", fontFamily: "monospace", fontSize: "16px", marginTop: "3px", minWidth: "26px", fontWeight: "700" }}>Q{i + 1}</span>
              <p style={{ fontSize: "17px", color: "#333333", lineHeight: 1.7, fontFamily: "'Lora', serif", flex: 1 }}>{q}</p>
              <span style={{ color: "#960016", fontSize: "14px", marginTop: "2px" }}>↗</span>
            </div>
          ))}
        </div>

        {/* Wildcard */}
        <div style={{ background: "linear-gradient(135deg, #FFF9E6 0%, #FFFDE0 100%)", borderRadius: "14px", padding: "24px", marginBottom: "26px", border: "2px solid #FAED26" }}>
          <div style={{ fontSize: "12px", letterSpacing: "3px", color: "#960016", fontFamily: "monospace", marginBottom: "10px", fontWeight: "600" }}>⚡ WILDCARD PERSPECTIVE</div>
          <p style={{ fontSize: "18px", color: "#333333", lineHeight: 1.8, fontStyle: "italic", fontFamily: "'Lora', serif" }}>{data.wildcard}</p>
        </div>

        {/* Bottom bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "9px", letterSpacing: "2px", color: "#AAAAAA", fontFamily: "monospace" }}>WAS THIS USEFUL?</span>
            {["up", "down"].map(v => (
              <button key={v} onClick={() => onFeedback(v)} style={{
                background: feedback === v ? (v === "up" ? "#FAED26" : "#EEEEEE") : "transparent",
                border: `1.5px solid ${feedback === v ? (v === "up" ? "#FAED26" : "#DDDDDD") : "#DDDDDD"}`,
                color: "#0A0A0A", borderRadius: "8px", padding: "5px 14px", cursor: "pointer", fontSize: "14px", transition: "all 0.2s"
              }}>{v === "up" ? "👍" : "👎"}</button>
            ))}
            {feedback && <span style={{ fontSize: "9px", color: "#960016", fontFamily: "monospace", letterSpacing: "1px" }}>{feedback === "up" ? "SIGNAL NOTED ✓" : "NOTED — IMPROVING ✓"}</span>}
          </div>
          <button onClick={async () => { setExporting(true); await exportCardAsImage(session, cardRef); setExporting(false); }}
            style={{ background: "transparent", border: "1.5px solid #DDDDDD", color: "#AAAAAA", borderRadius: "8px", padding: "7px 16px", cursor: "pointer", fontSize: "10px", letterSpacing: "2px", fontFamily: "monospace", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#960016"; e.currentTarget.style.color = "#960016"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#DDDDDD"; e.currentTarget.style.color = "#AAAAAA"; }}
          >{exporting ? "DONE" : "↓ SAVE"}</button>
        </div>
      </div>
    </>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function AlphaMind() {
  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { setMounted(true); setSessions(loadSessions()); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [sessions, loading]);

  const handleFeedback = (id, vote) => {
    const updated = sessions.map(s => s.id === id ? { ...s, feedback: vote } : s);
    setSessions(updated); saveSessions(updated);
  };

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    setShowLanding(false);
    setLoading(true); setError("");
    const userText = input.trim();
    setInput("");
    try {
      const messages = [
        ...sessions.slice(-6).flatMap(s => ([{ role: "user", content: s.input }, { role: "assistant", content: JSON.stringify(s.data) }])),
        { role: "user", content: userText }
      ];
      const res = await fetch("/api/think", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const newSession = { id: Date.now(), input: userText, data, feedback: null };
      const updated = [...sessions, newSession];
      setSessions(updated); saveSessions(updated);
    } catch (e) {
      setError(`Something went wrong: ${e.message}`);
    } finally { setLoading(false); }
  };

  const starters = [
    "I want to start a business selling handmade products",
    "Should I quit my job and freelance?",
    "I have an app idea but don't know how to start",
    "I want to grow my LinkedIn presence"
  ];

  if (!mounted) return null;

  return (
    <>
      <style suppressHydrationWarning>{`
        @media (max-width: 600px) {
          .am-grid { grid-template-columns: 1fr !important; }
          .am-hero { font-size: 56px !important; }
          .am-header { padding: 14px 16px !important; }
          .am-content { padding: 24px 14px 180px !important; }
          .am-inputbar { padding: 12px 14px 16px !important; }
        }
        @media (max-width: 768px) {
          .am-grid { grid-template-columns: 1fr !important; }
        }
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Source+Code+Pro:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #CC0020; }
        textarea { outline: none; }
        textarea::placeholder { color: rgba(255,255,255,0.4); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #F5F5F5; }
        ::-webkit-scrollbar-thumb { background: #960016; border-radius: 2px; }
        @keyframes blink { 0%,100%{opacity:0.3} 50%{opacity:1} }
        @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        body {
          background-color: #CC0020;
          background-image:
            radial-gradient(circle, #FAED26 1.5px, transparent 1.5px),
            radial-gradient(circle, #FAED26 1px, transparent 1px);
          background-size: 28px 28px, 14px 14px;
          background-position: 0 0, 7px 7px;
          position: relative;
        }
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, rgba(204,0,32,0.92) 0%, rgba(204,0,32,0.3) 45%, rgba(250,237,38,0.85) 100%);
          pointer-events: none;
          z-index: 0;
        }
        #__next { position: relative; z-index: 1; }
        button:hover { opacity: 0.85; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Lora', Georgia, serif", color: "#0A0A0A" }}>

        {/* Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(204,0,32,0.92)", backdropFilter: "blur(16px)",
          borderBottom: "1.5px solid rgba(250,237,38,0.3)",
          padding: "clamp(12px, 3vw, 16px) clamp(14px, 4vw, 28px)",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <span onClick={() => setShowLanding(true)} style={{ fontSize: "26px", fontWeight: "700", fontFamily: "'Lora', serif", letterSpacing: "-0.5px", cursor: "pointer" }}>
                <span style={{ color: "#FAED26" }}>Alpha</span><span style={{ color: "#FFFFFF" }}>Mind</span>
              </span>
              <span style={{ fontSize: "10px", letterSpacing: "4px", color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>THINKING CANVAS</span>
            </div>
          </div>
          {sessions.length > 0 && (
            <button onClick={() => { setSessions([]); saveSessions([]); setShowLanding(true); }} style={{ background: "transparent", border: "1.5px solid rgba(250,237,38,0.3)", color: "rgba(255,255,255,0.5)", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontSize: "9px", letterSpacing: "2px", fontFamily: "monospace" }}>CLEAR ALL</button>
          )}
        </div>

        {/* Content */}
        <div style={{ maxWidth: "780px", margin: "0 auto", padding: "clamp(20px, 4vw, 40px) clamp(12px, 4vw, 20px) 200px" }}>

          {showLanding && !loading && (
            <div style={{ textAlign: "center", paddingTop: "80px", animation: "fadeUp 0.6s ease forwards" }}>
              <div style={{ fontSize: "11px", letterSpacing: "6px", color: "rgba(255,255,255,0.95)", marginBottom: "24px", fontFamily: "monospace", textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>WELCOME TO</div>
              <TypewriterHero />
              <p style={{ fontSize: "24px", color: "#FFFFFF", fontStyle: "italic", textShadow: "0 1px 6px rgba(0,0,0,0.2)", fontFamily: "'Lora', serif", marginBottom: "14px" }}>Your structured thinking partner</p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)", letterSpacing: "3px", fontFamily: "monospace", marginBottom: "56px" }}>TYPE AN IDEA · DEEP DIVE · DOWNLOAD</p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", padding: "0 8px" }}>
                {starters.map(s => (
                  <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }} style={{
                    background: "transparent", border: "1.5px solid rgba(255,255,255,0.9)", color: "#FFFFFF",
                    borderRadius: "20px", padding: "13px 22px", cursor: "pointer",
                    fontSize: "15px", fontFamily: "'Lora', serif", transition: "all 0.2s", lineHeight: 1.4
                  }}

                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {!showLanding && sessions.map(session => (
            <div key={session.id}>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "6px", marginTop: "32px", fontFamily: "monospace" }}>
                <span style={{ color: "#FAED26", fontWeight: "600" }}>YOU</span> → {session.input}
              </div>
              <Card session={session} feedback={session.feedback} onFeedback={v => handleFeedback(session.id, v)} />
            </div>
          ))}

          {!showLanding && loading && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "7px", marginBottom: "16px" }}>
                {[0,1,2].map(i => <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#FAED26", animation: `blink 1.2s ${i*0.2}s infinite` }} />)}
              </div>
              <div style={{ fontSize: "10px", letterSpacing: "4px", color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>ALPHAMIND IS THINKING</div>
            </div>
          )}

          {error && (
            <div style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid #FAED26", borderRadius: "12px", padding: "16px", marginTop: "20px", fontSize: "13px", color: "#FAED26", fontFamily: "monospace" }}>{error}</div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(204,0,32,0.95)", backdropFilter: "blur(16px)", borderTop: "1.5px solid rgba(250,237,38,0.3)", padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 20px) clamp(14px, 3vw, 22px)" }}>
          <div style={{ maxWidth: "780px", margin: "0 auto" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                placeholder="Describe your idea, problem, or decision..."
                rows={2}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.12)",
                  border: `1.5px solid ${input ? "#FAED26" : "rgba(255,255,255,0.2)"}`,
                  borderRadius: "14px", padding: "14px 18px", color: "#FFFFFF",
                  fontSize: "15px", fontFamily: "'Lora', serif", resize: "none", lineHeight: 1.6,
                  transition: "border-color 0.2s",
                  boxShadow: input ? "0 0 0 3px rgba(250,237,38,0.2)" : "none"
                }}
              />
              <button onClick={handleSubmit} disabled={loading || !input.trim()} style={{
                width: "52px", minHeight: "52px",
                background: loading || !input.trim() ? "#EEEEEE" : "#FAED26",
                border: "none", color: loading || !input.trim() ? "#AAAAAA" : "#0A0A0A",
                borderRadius: "14px", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                fontSize: "20px", transition: "all 0.2s", alignSelf: "stretch",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: loading || !input.trim() ? "none" : "0 4px 14px rgba(250,237,38,0.4)"
              }}>→</button>
            </div>
            <p style={{ textAlign: "center", fontSize: "9px", color: "rgba(255,255,255,0.35)", marginTop: "10px", letterSpacing: "2px", fontFamily: "monospace" }}>
            
            </p>
          </div>
        </div>
      </div>
    </>
  );
}