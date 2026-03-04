import React, { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "alphamind_sessions";

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
          background: copied ? "#42D674" : "#2e2e2e",
          border: "none", borderRadius: "6px", padding: "4px 10px",
          color: copied ? "#0f1f0f" : "#888", fontSize: "10px",
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
            <div style={{ background: "#111", borderRadius: "10px", border: "1px solid #2e2e2e", overflow: "hidden" }}>
              <div style={{ background: "#1a1a1a", padding: "6px 14px", borderBottom: "1px solid #2e2e2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "9px", color: "#42D674", fontFamily: "monospace", letterSpacing: "2px" }}>{codeLang.toUpperCase()}</span>
                <CopyButton code={codeStr} />
              </div>
              <pre style={{ margin: 0, padding: "16px", overflowX: "auto", fontSize: "12px", color: "#E3F0A3", fontFamily: "monospace", lineHeight: 1.7 }}><code>{codeStr}</code></pre>
            </div>
          </div>
        );
        inCode = false;
        codeBlock = [];
        codeLang = "";
      }
      continue;
    }

    if (inCode) { codeBlock.push(line); continue; }

    // Bold
    const parseBold = (str) => {
      const parts = str.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i} style={{ color: "#80EF80", fontWeight: "700" }}>{p.slice(2, -2)}</strong>
          : p
      );
    };

    if (line.startsWith("### ")) {
      elements.push(<div key={key++} style={{ fontSize: "14px", fontWeight: "700", color: "#80EF80", fontFamily: "'Lora', serif", marginBottom: "8px", marginTop: "12px" }}>{line.slice(4)}</div>);
    } else if (line.startsWith("## ")) {
      elements.push(<div key={key++} style={{ fontSize: "16px", fontWeight: "700", color: "#42D674", fontFamily: "'Lora', serif", marginBottom: "10px", marginTop: "14px" }}>{line.slice(3)}</div>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(<div key={key++} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}><span style={{ color: "#42D674", marginTop: "2px" }}>•</span><span style={{ fontSize: "13px", color: "#cccccc", lineHeight: 1.7, fontFamily: "'Lora', serif" }}>{parseBold(line.slice(2))}</span></div>);
    } else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)[1];
      elements.push(<div key={key++} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}><span style={{ color: "#42D674", fontFamily: "monospace", fontSize: "11px", minWidth: "18px", marginTop: "3px" }}>{num}.</span><span style={{ fontSize: "13px", color: "#cccccc", lineHeight: 1.7, fontFamily: "'Lora', serif" }}>{parseBold(line.replace(/^\d+\. /, ""))}</span></div>);
    } else if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: "8px" }} />);
    } else {
      elements.push(<div key={key++} style={{ fontSize: "13px", color: "#cccccc", lineHeight: 1.7, fontFamily: "'Lora', serif", marginBottom: "4px" }}>{parseBold(line)}</div>);
    }
  }

  return <div>{elements}</div>;
}



function loadSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveSessions(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function ConfidenceBar({ value }) {
  const color = value >= 70 ? "#42D674" : value >= 45 ? "#80EF80" : "#BADBA2";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "7px" }}>
      <div style={{ flex: 1, height: "3px", background: "#2e2e2e", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: "2px", transition: "width 1.2s cubic-bezier(.4,0,.2,1)" }} />
      </div>
      <span style={{ fontSize: "13px", color, fontFamily: "monospace", minWidth: "34px", fontWeight: "600" }}>{value}%</span>
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.88)",
      zIndex: 200,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px"
    }}>
      <div style={{
        background: "#1a1a1a",
        border: "1.5px solid #42D674",
        borderRadius: "20px",
        width: "100%",
        maxWidth: "680px",
        height: "88vh",
        maxHeight: "800px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 0 40px rgba(66,214,116,0.15)",
        overflow: "hidden"
      }}>

        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid #2e2e2e",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexShrink: 0
        }}>
          <div style={{ flex: 1, paddingRight: "12px" }}>
            <div style={{ fontSize: "9px", letterSpacing: "3px", color: "#42D674", fontFamily: "monospace", marginBottom: "6px" }}>
              DEEP DIVE MODE
            </div>
            <p style={{
              fontSize: "12px", color: "#BADBA2",
              fontFamily: "'Lora', serif", fontStyle: "italic",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden"
            }}>
              "{question}"
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "transparent",
            border: "1px solid #2e2e2e",
            color: "#555",
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: "pointer",
            fontSize: "12px",
            flexShrink: 0,
            whiteSpace: "nowrap"
          }}>✕ Close</button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          WebkitOverflowScrolling: "touch"
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "88%",
                padding: "11px 14px",
                borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: m.role === "user" ? "#42D674" : "#212121",
                border: m.role === "user" ? "none" : "1px solid #2e2e2e",
                color: m.role === "user" ? "#0f1f0f" : "#cccccc",
                fontSize: "13px",
                fontFamily: "'Lora', serif",
                lineHeight: 1.7,
                wordBreak: "break-word"
              }}>
                {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: "6px", padding: "4px 0" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#42D674", animation: `blink 1.2s ${i*0.2}s infinite` }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "12px 16px 20px",
          borderTop: "1px solid #2e2e2e",
          flexShrink: 0,
          background: "#1a1a1a"
        }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "stretch" }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Reply to go deeper..."
              rows={2}
              style={{
                flex: 1,
                background: "#212121",
                border: `1px solid ${input ? "#42D674" : "#2e2e2e"}`,
                borderRadius: "12px",
                padding: "11px 14px",
                color: "#F5F5F5",
                fontSize: "14px",
                fontFamily: "'Lora', serif",
                resize: "none",
                outline: "none",
                lineHeight: 1.5,
                WebkitAppearance: "none"
              }}
            />
            <button onClick={send} disabled={loading || !input.trim()} style={{
              width: "48px",
              background: !input.trim() ? "#2e2e2e" : "#42D674",
              border: "none",
              borderRadius: "12px",
              color: !input.trim() ? "#555" : "#0f1f0f",
              cursor: !input.trim() ? "not-allowed" : "pointer",
              fontSize: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              alignSelf: "stretch"
            }}>→</button>
          </div>
          <p style={{ textAlign: "center", fontSize: "9px", color: "#333", marginTop: "8px", letterSpacing: "1px", fontFamily: "monospace" }}>
          
          </p>
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
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: "#212121",
      scale: 2,
      useCORS: true,
      logging: false
    });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `alphamind-${session.data.title.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  } catch (e) {
    console.error("Export failed:", e);
  }
}

// ── CARD ──────────────────────────────────────────────────────────────────────
function Card({ session, feedback, onFeedback }) {
  const { data } = session;
  const [followUpQ, setFollowUpQ] = useState(null);
  const [visible, setVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef(null);
  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  const handleExport = async () => {
    setExporting(true);
    await exportCardAsImage(session, cardRef);
    setExporting(false);
  };

  return (
    <>
      {followUpQ && <FollowUp question={followUpQ} sessionData={data} onClose={() => setFollowUpQ(null)} />}

      <div ref={cardRef} style={{
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.5s cubic-bezier(.4,0,.2,1)",
        background: "#212121", border: "1.5px solid #2e2e2e",
        borderRadius: "20px", padding: "clamp(18px, 4vw, 36px)", marginTop: "28px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)"
      }}>

        {/* Label */}
        <div style={{ fontSize: "12px", letterSpacing: "4px", color: "#BADBA2", fontFamily: "monospace", marginBottom: "16px" }}>
          ALPHAMIND · STRUCTURED OUTPUT
        </div>

        {/* Title */}
        <h2 style={{ fontSize: "34px", fontWeight: "700", fontFamily: "'Lora', Georgia, serif", color: "#F5F5F5", marginBottom: "12px", lineHeight: 1.25 }}>
          {data.title}
        </h2>

        {/* Core */}
        <div style={{ borderLeft: "3px solid #42D674", paddingLeft: "16px", marginBottom: "32px" }}>
          <p style={{ fontSize: "18px", color: "#BADBA2", lineHeight: 1.8, fontFamily: "'Lora', Georgia, serif", fontStyle: "italic" }}>{data.core}</p>
        </div>

        {/* Grid */}
        <div className="am-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div style={{ background: "#1a1a1a", borderRadius: "14px", padding: "22px", border: "1.5px solid #2e2e2e" }}>
            <div style={{ fontSize: "14px", letterSpacing: "3px", color: "#80EF80", fontFamily: "monospace", marginBottom: "16px", fontWeight: "600" }}>ASSUMPTION SCAN</div>
            {data.assumptions.map((a, i) => (
              <div key={i} style={{ marginBottom: "14px" }}>
                <p style={{ fontSize: "16px", color: "#cccccc", marginBottom: "6px", lineHeight: 1.6, fontFamily: "'Lora', serif" }}>{a.text}</p>
                <ConfidenceBar value={a.confidence} />
              </div>
            ))}
          </div>

          <div style={{ background: "#1a1a1a", borderRadius: "14px", padding: "22px", border: "1.5px solid #2e2e2e" }}>
            <div style={{ fontSize: "14px", letterSpacing: "3px", color: "#80EF80", fontFamily: "monospace", marginBottom: "16px", fontWeight: "600" }}>ACTION SEQUENCE</div>
            {data.actions.map((a, i) => {
              const uc = a.urgency === "NOW" ? "#42D674" : a.urgency === "WEEK" ? "#80EF80" : "#BADBA2";
              return (
                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "14px" }}>
                  <span style={{ fontSize: "8px", fontFamily: "monospace", color: uc, border: `1.5px solid ${uc}`, borderRadius: "4px", padding: "2px 6px", whiteSpace: "nowrap", marginTop: "3px", fontWeight: "700" }}>{a.urgency}</span>
                  <p style={{ fontSize: "16px", color: "#cccccc", lineHeight: 1.6, fontFamily: "'Lora', serif" }}>{a.step}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Socratic — clickable */}
        <div style={{ background: "#1a1a1a", borderRadius: "14px", padding: "22px", border: "1.5px solid #2e2e2e", marginBottom: "16px" }}>
          <div style={{ fontSize: "14px", letterSpacing: "3px", color: "#80EF80", fontFamily: "monospace", marginBottom: "4px", fontWeight: "600" }}>SOCRATIC PROBE</div>
          <div style={{ fontSize: "9px", color: "#444", fontFamily: "monospace", marginBottom: "14px", letterSpacing: "1px" }}>CLICK ANY QUESTION TO GO DEEPER</div>
          {data.questions.map((q, i) => (
            <div key={i} onClick={() => setFollowUpQ(q)}
              style={{ display: "flex", gap: "14px", marginBottom: "8px", alignItems: "flex-start", cursor: "pointer", padding: "10px", borderRadius: "10px", border: "1px solid transparent", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1e2e1e"; e.currentTarget.style.borderColor = "#42D674"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
            >
              <span style={{ color: "#42D674", fontFamily: "monospace", fontSize: "16px", marginTop: "3px", minWidth: "26px", fontWeight: "700" }}>Q{i + 1}</span>
              <p style={{ fontSize: "17px", color: "#cccccc", lineHeight: 1.7, fontFamily: "'Lora', serif", flex: 1 }}>{q}</p>
              <span style={{ color: "#42D674", fontSize: "14px", marginTop: "2px" }}>↗</span>
            </div>
          ))}
        </div>

        {/* Wildcard */}
        <div style={{ background: "linear-gradient(135deg, #1a2e1a 0%, #0f1f0f 100%)", borderRadius: "14px", padding: "22px", marginBottom: "24px", border: "1.5px solid #42D674" }}>
          <div style={{ fontSize: "14px", letterSpacing: "3px", color: "#42D674", fontFamily: "monospace", marginBottom: "10px", fontWeight: "600" }}>⚡ WILDCARD PERSPECTIVE</div>
          <p style={{ fontSize: "17px", color: "#E3F0A3", lineHeight: 1.8, fontStyle: "italic", fontFamily: "'Lora', serif" }}>{data.wildcard}</p>
        </div>

        {/* Bottom bar: feedback + download */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "9px", letterSpacing: "2px", color: "#BADBA2", fontFamily: "monospace" }}>WAS THIS USEFUL?</span>
            {["up", "down"].map(v => (
              <button key={v} onClick={() => onFeedback(v)} style={{
                background: feedback === v ? (v === "up" ? "#42D674" : "#80EF80") : "transparent",
                border: `1.5px solid ${feedback === v ? (v === "up" ? "#42D674" : "#80EF80") : "#2e2e2e"}`,
                color: feedback === v ? "#0f1f0f" : "#BADBA2",
                borderRadius: "8px", padding: "5px 14px", cursor: "pointer", fontSize: "14px", transition: "all 0.2s"
              }}>{v === "up" ? "👍" : "👎"}</button>
            ))}
            {feedback && <span style={{ fontSize: "9px", color: "#BADBA2", fontFamily: "monospace", letterSpacing: "1px" }}>{feedback === "up" ? "SIGNAL NOTED ✓" : "NOTED — IMPROVING ✓"}</span>}
          </div>

          {/* Download button */}
          <button onClick={handleExport} disabled={exporting} style={{
            background: "transparent", border: "1.5px solid #2e2e2e",
            color: "#555", borderRadius: "8px", padding: "6px 14px",
            cursor: "pointer", fontSize: "10px", letterSpacing: "2px",
            fontFamily: "monospace", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "6px"
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#42D674"; e.currentTarget.style.color = "#42D674"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2e2e2e"; e.currentTarget.style.color = "#555"; }}
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
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { setMounted(true); setSessions(loadSessions()); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [sessions, loading]);

  const handleFeedback = (id, vote) => {
    const updated = sessions.map(s => s.id === id ? { ...s, feedback: vote } : s);
    setSessions(updated);
    saveSessions(updated);
  };

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError("");
    const userText = input.trim();
    setInput("");
    try {
      const messages = [
        ...sessions.slice(-6).flatMap(s => ([
          { role: "user", content: s.input },
          { role: "assistant", content: JSON.stringify(s.data) }
        ])),
        { role: "user", content: userText }
      ];
      const res = await fetch("/api/think", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const newSession = { id: Date.now(), input: userText, data, feedback: null };
      const updated = [...sessions, newSession];
      setSessions(updated);
      saveSessions(updated);
    } catch (e) {
      setError(`Something went wrong: ${e.message}`);
    } finally {
      setLoading(false);
    }
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
          .am-card { padding: 20px !important; }
          .am-title { font-size: 20px !important; }
          .am-hero { font-size: 48px !important; }
          .am-header { padding: 14px 16px !important; }
          .am-content { padding: 24px 14px 180px !important; }
          .am-inputbar { padding: 12px 14px 16px !important; }
          .am-feedback { flex-wrap: wrap; gap: 8px !important; }
          .am-deepmodal { padding: 10px !important; }
          .am-deepinner { max-height: 95vh !important; border-radius: 14px !important; }
          .am-bottombar { flex-direction: row !important; }
          .am-starters { padding: 0 10px !important; }
        }
        @media (max-width: 768px) {
          .am-grid { grid-template-columns: 1fr !important; }
        }
      
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Source+Code+Pro:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #1a1a1a; }
        textarea { outline: none; }
        textarea::placeholder { color: #555; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #1a1a1a; }
        ::-webkit-scrollbar-thumb { background: #42D674; border-radius: 2px; }
        @keyframes blink { 0%,100%{opacity:0.3} 50%{opacity:1} }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        button:hover { opacity: 0.85; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#1a1a1a", fontFamily: "'Lora', Georgia, serif", color: "#F5F5F5" }}>

        {/* Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(26,26,26,0.97)", backdropFilter: "blur(12px)",
          borderBottom: "1.5px solid #2e2e2e",
          padding: "clamp(12px, 3vw, 16px) clamp(14px, 4vw, 28px)", display: "flex", justifyContent: "space-between", alignItems: "center", className: "am-header"
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontSize: "26px", fontWeight: "700", fontFamily: "'Lora', serif", letterSpacing: "-0.5px" }}>
              <span style={{ color: "#80EF80" }}>Alpha</span><span style={{ color: "#42D674" }}>Mind</span>
            </span>
            <span style={{ fontSize: "10px", letterSpacing: "4px", color: "#80EF80", fontFamily: "monospace" }}>THINKING CANVAS</span>
          </div>
          {sessions.length > 0 && (
            <button onClick={() => { setSessions([]); saveSessions([]); }} style={{
              background: "transparent", border: "1.5px solid #2e2e2e", color: "#555",
              borderRadius: "8px", padding: "6px 14px", cursor: "pointer",
              fontSize: "9px", letterSpacing: "2px", fontFamily: "monospace"
            }}>CLEAR ALL</button>
          )}
        </div>

        {/* Content */}
        <div style={{ maxWidth: "780px", margin: "0 auto", padding: "clamp(20px, 4vw, 40px) clamp(12px, 4vw, 20px) 200px" }}>

          {sessions.length === 0 && !loading && (
            <div style={{ textAlign: "center", paddingTop: "80px", animation: "fadeUp 0.6s ease forwards" }}>
              <div style={{ fontSize: "12px", letterSpacing: "6px", color: "#80EF80", marginBottom: "20px", fontFamily: "monospace" }}>WELCOME TO</div>
              <h1 style={{ fontSize: "clamp(64px, 12vw, 110px)", fontWeight: "700", fontFamily: "'Lora', serif", lineHeight: 1.05, marginBottom: "12px" }}>
                <span style={{ color: "#80EF80" }}>Alpha</span><span style={{ color: "#42D674" }}>Mind</span>
              </h1>
              <p style={{ fontSize: "22px", color: "#BADBA2", fontStyle: "italic", fontFamily: "'Lora', serif", marginBottom: "14px" }}>Your structured thinking partner</p>
              <p style={{ fontSize: "12px", color: "#BADBA2", letterSpacing: "3px", fontFamily: "monospace", marginBottom: "52px" }}>TYPE AN IDEA · DEEP DIVE · DOWNLOAD</p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", padding: "0 8px" }}>
                {starters.map(s => (
                  <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }} style={{
                    background: "#212121", border: "1.5px solid #3e3e3e", color: "#E3F0A3",
                    borderRadius: "20px", padding: "12px 20px", cursor: "pointer",
                    fontSize: "14px", fontFamily: "'Lora', serif", transition: "all 0.2s", lineHeight: 1.4
                  }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {sessions.map(session => (
            <div key={session.id}>
              <div style={{ fontSize: "12px", color: "#555", marginBottom: "6px", marginTop: "32px", fontFamily: "monospace" }}>
                <span style={{ color: "#42D674", fontWeight: "600" }}>YOU</span> → {session.input}
              </div>
              <Card session={session} feedback={session.feedback} onFeedback={v => handleFeedback(session.id, v)} />
            </div>
          ))}

          {loading && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "7px", marginBottom: "16px" }}>
                {[0,1,2].map(i => <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#42D674", animation: `blink 1.2s ${i*0.2}s infinite` }} />)}
              </div>
              <div style={{ fontSize: "10px", letterSpacing: "4px", color: "#555", fontFamily: "monospace" }}>ALPHAMIND IS THINKING</div>
            </div>
          )}

          {error && (
            <div style={{ background: "#0f1f0f", border: "1.5px solid #42D674", borderRadius: "12px", padding: "16px", marginTop: "20px", fontSize: "12px", color: "#80EF80", fontFamily: "monospace" }}>{error}</div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "rgba(26,26,26,0.98)", backdropFilter: "blur(16px)",
          borderTop: "1.5px solid #2e2e2e", padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 20px) clamp(14px, 3vw, 22px)"
        }}>
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
                  flex: 1, background: "#212121",
                  border: `1.5px solid ${input ? "#42D674" : "#2e2e2e"}`,
                  borderRadius: "14px", padding: "14px 18px", color: "#F5F5F5",
                  fontSize: "14px", fontFamily: "'Lora', serif", resize: "none", lineHeight: 1.6,
                  transition: "border-color 0.2s",
                  boxShadow: input ? "0 0 0 3px rgba(66,214,116,0.08)" : "none"
                }}
              />
              <button onClick={handleSubmit} disabled={loading || !input.trim()} style={{
                width: "52px", minHeight: "52px",
                background: loading || !input.trim() ? "#2e2e2e" : "#42D674",
                border: "none", color: loading || !input.trim() ? "#555" : "#0f1f0f",
                borderRadius: "14px", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                fontSize: "20px", transition: "all 0.2s", alignSelf: "stretch",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: loading || !input.trim() ? "none" : "0 4px 14px rgba(66,214,116,0.3)"
              }}>→</button>
            </div>
            <p style={{ textAlign: "center", fontSize: "9px", color: "#333", marginTop: "10px", letterSpacing: "2px", fontFamily: "monospace" }}>
             
            </p>
          </div>
        </div>
      </div>
    </>
  );
}