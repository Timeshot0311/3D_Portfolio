"use client";
// AboutScreen.jsx — lightweight "large monitor" content.
// Replaces the heavy v86 emulator. Terminal / about-me aesthetic.
// Edit the constants below to personalise.

const NAME    = "Timeshot";
const HANDLE  = "@Timeshot0311";
const TAGLINE = "Full-stack dev · 3D enthusiast · VTuber tech nerd";
const BIO     = "Building immersive web experiences at the intersection of 3D graphics, React, and creative code. This portfolio runs entirely in your browser — no server-side rendering, no tricks.";

const SKILLS = [
  ["Languages",  "TypeScript · JavaScript · Python · C#"],
  ["3D / XR",    "Three.js · React Three Fiber · Blender · VRM"],
  ["Frontend",   "React · Next.js · Tailwind · Vite"],
  ["Backend",    "Node.js · FastAPI · PostgreSQL · Prisma"],
  ["Tools",      "Git · Docker · Vercel · Figma"],
];

const LINKS = [
  { label: "GitHub",   href: "https://github.com/Timeshot0311", icon: "⌨" },
  { label: "Twitter",  href: "#",                               icon: "✦" },
  { label: "LinkedIn", href: "#",                               icon: "◈" },
];

// ── Typing cursor blink via CSS animation injected once ────────────────────
const STYLE = `
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  .ts-cursor { display:inline-block; animation:blink 1s step-end infinite; }
  .ts-link:hover { background:rgba(99,102,241,0.2) !important; color:#a5b4fc !important; }
`;

export default function AboutScreen() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#0b0d12',
      color: '#c9d1d9',
      fontFamily: '"Cascadia Code", "Fira Code", "Courier New", monospace',
      fontSize: 13,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      <style>{STYLE}</style>

      {/* Title bar */}
      <div style={{
        background: '#161b22', borderBottom: '1px solid #30363d',
        padding: '6px 14px',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        <span style={{ color: '#ef4444', fontSize: 10 }}>●</span>
        <span style={{ color: '#f59e0b', fontSize: 10 }}>●</span>
        <span style={{ color: '#22c55e', fontSize: 10 }}>●</span>
        <span style={{ color: '#8b949e', fontSize: 11, marginLeft: 8 }}>
          timeshot@portfolio:~
        </span>
        <span className="ts-cursor" style={{ color: '#58a6ff', marginLeft: 2 }}>█</span>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>

        {/* Prompt + name */}
        <div>
          <span style={{ color: '#58a6ff' }}>$ </span>
          <span style={{ color: '#79c0ff' }}>whoami</span>
          <div style={{ marginTop: 6, paddingLeft: 12 }}>
            <div style={{ color: '#e6edf3', fontSize: 18, fontWeight: 700, letterSpacing: '0.04em' }}>
              {NAME}
            </div>
            <div style={{ color: '#58a6ff', fontSize: 11, marginTop: 2 }}>{HANDLE}</div>
            <div style={{ color: '#8b949e', fontSize: 11, marginTop: 4 }}>{TAGLINE}</div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <span style={{ color: '#58a6ff' }}>$ </span>
          <span style={{ color: '#79c0ff' }}>cat bio.txt</span>
          <div style={{
            marginTop: 6, paddingLeft: 12,
            color: '#adbac7', lineHeight: 1.65, fontSize: 12,
            borderLeft: '2px solid #30363d', paddingLeft: 14,
          }}>
            {BIO}
          </div>
        </div>

        {/* Skills */}
        <div>
          <span style={{ color: '#58a6ff' }}>$ </span>
          <span style={{ color: '#79c0ff' }}>ls skills/</span>
          <div style={{
            marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 12,
          }}>
            {SKILLS.map(([cat, items]) => (
              <div key={cat} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ color: '#d2a8ff', minWidth: 80, fontSize: 11 }}>{cat}</span>
                <span style={{ color: '#8b949e', fontSize: 11 }}>→</span>
                <span style={{ color: '#adbac7', fontSize: 11 }}>{items}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Links */}
        <div>
          <span style={{ color: '#58a6ff' }}>$ </span>
          <span style={{ color: '#79c0ff' }}>open links/</span>
          <div style={{
            marginTop: 8, paddingLeft: 12, display: 'flex', gap: 8, flexWrap: 'wrap',
          }}>
            {LINKS.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="ts-link"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 6, textDecoration: 'none',
                  border: '1px solid #30363d',
                  background: 'rgba(88,166,255,0.06)',
                  color: '#58a6ff', fontSize: 12,
                  transition: 'all 0.15s',
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Footer prompt */}
        <div style={{ marginTop: 'auto', paddingTop: 8, color: '#3d444d', fontSize: 11 }}>
          <span style={{ color: '#58a6ff' }}>$ </span>
          <span className="ts-cursor" style={{ color: '#58a6ff' }}>█</span>
        </div>
      </div>
    </div>
  );
}
