// src/components/VTuberChat.jsx
// DOM chat bubble overlay — rendered OUTSIDE <Canvas> in App.jsx.
// Sends messages to /api/chat (Vercel serverless → Claude Haiku).
// Uses Web Speech API for TTS; calls onSpeakingChange(true/false) so the
// VTuber's lip-sync animation can be toggled from App.jsx.
import { useState, useRef, useEffect } from 'react';

const FONT = '"Segoe UI", system-ui, sans-serif';
const MONO = '"Cascadia Code", "Fira Code", monospace';

const C = {
  bg:      'rgba(10,10,20,0.88)',
  border:  'rgba(124,58,237,0.5)',
  accent:  '#a78bfa',
  text:    '#e2e0ff',
  muted:   '#8b8aaa',
  input:   'rgba(255,255,255,0.07)',
  send:    '#7c3aed',
};

// Fallback greeting lines shown when the API is unavailable
const FALLBACK_LINES = [
  "Oops, connection hiccup! (＞﹏＜) Try again~",
  "Welcome to Timeshot's portfolio! Ask me anything~",
  "I'm Yuki! Timeshot built me with React & Three.js (⌒‿⌒)",
];

// Intro sequence spoken on first load
const INTRO_LINES = [
  "Hi there! I'm Yuki, welcome to Suhil's portfolio!",
  "This is an interactive 3D room — use the camera buttons at the top to explore different angles.",
  "The large monitor on the left is a portfolio desktop, and the smaller one shows live GitHub stats.",
  "Feel free to chat with me anytime — I know everything about Suhil's work!",
];
const IDLE_BUBBLE = "Hi! I'm Yuki~ click to chat! (◕‿◕)✿";

// Browser TTS fallback (used when ElevenLabs key is absent)
function browserSpeak(text, onSpeakingChange, onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.92; utter.pitch = 1.2; utter.volume = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const pick = voices.find((v) =>
    /jenny|aria|zira|samantha|victoria|fiona|karen|moira|female|woman/i.test(v.name),
  ) ?? voices.find((v) => v.lang?.startsWith('en')) ?? null;
  if (pick) utter.voice = pick;
  utter.onstart = () => onSpeakingChange(true);
  utter.onend   = () => { onSpeakingChange(false); onEnd?.(); };
  utter.onerror = () => { onSpeakingChange(false); onEnd?.(); };
  window.speechSynthesis.speak(utter);
}

function useSpeech(onSpeakingChange) {
  const audioRef = useRef(null);

  const speak = async (text, onEnd) => {
    // Stop any in-progress audio
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error('ElevenLabs unavailable');

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      onSpeakingChange(true);
      audio.onended = () => {
        onSpeakingChange(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
        onEnd?.();
      };
      audio.onerror = () => {
        onSpeakingChange(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
        onEnd?.();
      };
      await audio.play();
    } catch {
      // Fall back to browser TTS (no key set, or network error)
      browserSpeak(text, onSpeakingChange, onEnd);
    }
  };

  const cancel = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    onSpeakingChange(false);
  };

  return { speak, cancel };
}

export default function VTuberChat({ onSpeakingChange }) {
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState([]);   // { role, content }
  const [loading,  setLoading]  = useState(false);
  const [bubble,   setBubble]   = useState(INTRO_LINES[0]);

  const historyRef    = useRef([]);
  const inputRef      = useRef(null);
  const introRef      = useRef(false); // prevent double-run in strict mode
  const { speak, cancel } = useSpeech(onSpeakingChange ?? (() => {}));

  // Intro sequence — plays once on mount after voices are ready
  useEffect(() => {
    if (introRef.current) return;
    introRef.current = true;

    let cancelled = false;

    const runIntro = (lines, idx = 0) => {
      if (cancelled || idx >= lines.length) {
        if (!cancelled) setBubble(IDLE_BUBBLE);
        return;
      }
      setBubble(lines[idx]);
      speak(lines[idx], () => {
        // Short pause between lines
        setTimeout(() => runIntro(lines, idx + 1), 400);
      });
    };

    // Wait 2 s for scene + voices to settle, then start
    const timer = setTimeout(() => {
      // Voices may not be loaded yet — wait for voiceschanged if empty
      const start = () => runIntro(INTRO_LINES);
      if (window.speechSynthesis?.getVoices().length > 0) {
        start();
      } else {
        window.speechSynthesis?.addEventListener('voiceschanged', start, { once: true });
      }
    }, 2000);

    return () => { cancelled = true; clearTimeout(timer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    const userMsg = { role: 'user', content: text };
    historyRef.current = [...historyRef.current, userMsg];
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyRef.current }),
      });

      let reply;
      if (res.ok) {
        const data = await res.json();
        reply = data.text || "Hmm, I got an empty response (＞﹏＜)";
      } else {
        reply = FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)];
      }

      historyRef.current = [
        ...historyRef.current,
        { role: 'assistant', content: reply },
      ];
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      setBubble(reply);
      speak(reply);

    } catch {
      const reply = FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)];
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      setBubble(reply);
      speak(reply);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const toggleOpen = () => {
    if (open) { cancel(); }
    setOpen((o) => !o);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: 16,
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 6,
      fontFamily: FONT,
      pointerEvents: 'none',
    }}>
      {/* Speech bubble (always visible) */}
      <div
        onClick={toggleOpen}
        style={{
          maxWidth: 220,
          padding: '7px 12px',
          borderRadius: '12px 12px 12px 4px',
          background: C.bg,
          border: `1px solid ${C.border}`,
          color: C.text,
          fontSize: 11,
          lineHeight: 1.5,
          cursor: 'pointer',
          pointerEvents: 'auto',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          userSelect: 'none',
        }}
      >
        {bubble}
        <div style={{ color: C.accent, fontSize: 9, marginTop: 3, fontFamily: MONO }}>
          {open ? '▾ close chat' : '▸ click to chat'}
        </div>
      </div>

      {/* Chat window */}
      {open && (
        <div style={{
          width: 260,
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: 'hidden',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            padding: '8px 12px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px #22c55e',
            }} />
            <span style={{ color: C.accent, fontSize: 12, fontWeight: 600 }}>Yuki</span>
            <span style={{ color: C.muted, fontSize: 10, marginLeft: 'auto', fontFamily: MONO }}>AI companion</span>
          </div>

          {/* Messages */}
          <div style={{
            maxHeight: 180,
            overflowY: 'auto',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            {messages.length === 0 && (
              <div style={{ color: C.muted, fontSize: 10, textAlign: 'center', padding: '12px 0' }}>
                Ask me anything about this portfolio~
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '5px 9px',
                borderRadius: m.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                background: m.role === 'user' ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${m.role === 'user' ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: C.text,
                fontSize: 11,
                lineHeight: 1.5,
              }}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start',
                color: C.muted,
                fontSize: 11,
                fontFamily: MONO,
                padding: '4px 0',
              }}>
                Yuki is thinking…
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: '8px 10px',
            borderTop: `1px solid ${C.border}`,
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Say something…"
              disabled={loading}
              style={{
                flex: 1,
                background: C.input,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: '5px 8px',
                color: C.text,
                fontSize: 11,
                fontFamily: FONT,
                outline: 'none',
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                background: input.trim() && !loading ? C.send : 'rgba(124,58,237,0.2)',
                border: `1px solid ${C.border}`,
                color: C.text,
                fontSize: 11,
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                fontFamily: MONO,
                transition: 'background 0.15s',
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
