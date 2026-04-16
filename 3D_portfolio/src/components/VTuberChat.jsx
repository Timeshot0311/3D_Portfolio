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

function useMic(onTranscript) {
  const [listening, setListening] = useState(false);
  const recogRef = useRef(null);

  const toggle = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported in this browser.'); return; }

    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }

    const recog = new SR();
    recog.lang = 'en-US';
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript;
      if (text) onTranscript(text);
    };
    recog.onend   = () => setListening(false);
    recog.onerror = () => setListening(false);
    recogRef.current = recog;
    recog.start();
    setListening(true);
  };

  return { toggle, listening };
}

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

export default function VTuberChat({ onSpeakingChange, vtuberReady = false }) {
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState([]);   // { role, content }
  const [loading,  setLoading]  = useState(false);
  const [bubble,   setBubble]   = useState(INTRO_LINES[0]);

  const historyRef    = useRef([]);
  const inputRef      = useRef(null);
  const introRef      = useRef(false); // prevent double-run in strict mode
  const { speak, cancel } = useSpeech(onSpeakingChange ?? (() => {}));
  const { toggle: toggleMic, listening } = useMic((text) => {
    setInput(text);
    // Auto-send after a short delay so user sees what was transcribed
    setTimeout(() => {
      setInput('');
      const userMsg = { role: 'user', content: text };
      historyRef.current = [...historyRef.current, userMsg];
      setMessages((m) => [...m, { role: 'user', content: text }]);
      sendText(text);
    }, 600);
  });

  // Intro sequence — fires once when VTuber model is in the scene
  useEffect(() => {
    if (!vtuberReady || introRef.current) return;
    introRef.current = true;

    let cancelled = false;

    const runIntro = (idx = 0) => {
      if (cancelled || idx >= INTRO_LINES.length) {
        if (!cancelled) setBubble(IDLE_BUBBLE);
        return;
      }
      setBubble(INTRO_LINES[idx]);
      speak(INTRO_LINES[idx], () => {
        setTimeout(() => runIntro(idx + 1), 400);
      });
    };

    // Give browser a tick to paint the VTuber before speaking
    const start = () => runIntro(0);
    if (window.speechSynthesis?.getVoices().length > 0) {
      setTimeout(start, 300);
    } else {
      window.speechSynthesis?.addEventListener('voiceschanged', () => setTimeout(start, 300), { once: true });
    }

    return () => { cancelled = true; };
  }, [vtuberReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const sendText = async (text) => {
    if (!text || loading) return;
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
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }];
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

  const send = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: text };
    historyRef.current = [...historyRef.current, userMsg];
    setMessages((m) => [...m, { role: 'user', content: text }]);
    sendText(text);
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
      bottom: 70,           // above the camera-button bar
      left: '50%',
      transform: 'translateX(-58%)',  // nudge left to sit over the VTuber
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      fontFamily: FONT,
      pointerEvents: 'none',
    }}>
      {/* Comic speech bubble */}
      <div
        onClick={toggleOpen}
        style={{
          position: 'relative',
          maxWidth: 220,
          padding: '8px 13px',
          borderRadius: '16px',
          background: 'rgba(255,255,255,0.95)',
          border: '2.5px solid #333',
          color: '#111',
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.5,
          cursor: 'pointer',
          pointerEvents: 'auto',
          boxShadow: '3px 3px 0px #333',
          userSelect: 'none',
          textAlign: 'center',
        }}
      >
        {bubble}
        <div style={{ color: '#7c3aed', fontSize: 9, marginTop: 3, fontFamily: MONO, fontWeight: 400 }}>
          {open ? '▾ close chat' : '▸ click to chat'}
        </div>
        {/* Comic tail pointing down toward VTuber */}
        <div style={{
          position: 'absolute',
          bottom: -14,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '14px solid #333',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '11px solid rgba(255,255,255,0.95)',
        }} />
      </div>

      {/* Chat window — appears above the bubble */}
      {open && (
        <div style={{
          width: 280,
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: 'hidden',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          order: -1,  // renders above the speech bubble in flex column
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
              onClick={toggleMic}
              title={listening ? 'Stop listening' : 'Speak to Yuki'}
              style={{
                padding: '5px 8px',
                borderRadius: 6,
                background: listening ? 'rgba(239,68,68,0.35)' : 'rgba(124,58,237,0.2)',
                border: `1px solid ${listening ? 'rgba(239,68,68,0.6)' : C.border}`,
                color: listening ? '#f87171' : C.muted,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              🎤
            </button>
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
