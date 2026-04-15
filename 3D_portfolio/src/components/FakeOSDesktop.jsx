import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// YOUR PROJECTS — edit this array.
// images: array of /public paths, e.g. ["/screenshots/proj.png"]
// Leave images:[] for a placeholder card.
// ─────────────────────────────────────────────────────────────────────────────
const PROJECTS = [
  {
    id: "portfolio-3d",
    title: "3D Portfolio",
    description: "An immersive room-scale 3D portfolio built with React Three Fiber. Features a VTuber desktop companion pinned to the camera, interactive monitor screens, first-person free-camera, and mobile touch controls.",
    stack: ["React", "Three.js", "R3F", "VRM", "Vite", "Tailwind"],
    images: [],
    github: "https://github.com/Timeshot0311/3D_Portfolio",
    live: "#",
    color: "#7c3aed",
  },
  {
    id: "project-2",
    title: "Project Two",
    description: "Replace with your real project description. Explain what it does, what problem it solves, and any interesting technical challenges.",
    stack: ["TypeScript", "Node.js", "PostgreSQL"],
    images: [],
    github: "#",
    live: "#",
    color: "#0891b2",
  },
  {
    id: "project-3",
    title: "Project Three",
    description: "Another standout project. Add your real description, stack, and links here.",
    stack: ["Python", "FastAPI", "React"],
    images: [],
    github: "#",
    live: "#",
    color: "#059669",
  },
  {
    id: "project-4",
    title: "Project Four",
    description: "Yet another project. Add as many entries as you like to the PROJECTS array at the top of FakeOSDesktop.jsx.",
    stack: ["Next.js", "Prisma", "Tailwind"],
    images: [],
    github: "#",
    live: "#",
    color: "#d97706",
  },
];

// ── Shared style tokens ────────────────────────────────────────────────────
const C = {
  bg:       "#0d0d14",
  surface:  "#13131f",
  border:   "#2a2a40",
  accent:   "#7c3aed",
  accentLo: "rgba(124,58,237,0.15)",
  accentHi: "rgba(124,58,237,0.4)",
  text:     "#e2e0ff",
  muted:    "#6b6b8a",
  red:      "#ef4444",
  yellow:   "#f59e0b",
  green:    "#22c55e",
};
const FONT = '"Segoe UI", system-ui, sans-serif';
const MONO = '"Cascadia Code", "Fira Code", monospace';

const s = {
  fill:   { width: "100%", height: "100%" },
  col:    { display: "flex", flexDirection: "column" },
  row:    { display: "flex", flexDirection: "row", alignItems: "center" },
  titlebar: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "5px 10px", background: "#0a0a12",
    borderBottom: `1px solid ${C.border}`, flexShrink: 0,
  },
  dot: (color) => ({
    width: 9, height: 9, borderRadius: "50%", background: color,
  }),
};

// ── Clock ──────────────────────────────────────────────────────────────────
function Clock() {
  const [t, setT] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  useEffect(() => {
    const id = setInterval(() => setT(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })), 10000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ color: C.muted, fontSize: 10, fontFamily: MONO }}>{t}</span>;
}

// ── Image carousel ─────────────────────────────────────────────────────────
function Carousel({ images, color }) {
  const [idx, setIdx] = useState(0);
  if (!images?.length) {
    return (
      <div style={{
        height: 110, borderRadius: 6, background: `${color}22`,
        border: `1px solid ${color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: `${color}88`, fontSize: 22, flexShrink: 0,
      }}>🗂</div>
    );
  }
  return (
    <div style={{ position: "relative", height: 110, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
      <img src={images[idx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      {images.length > 1 && (
        <>
          <button onClick={() => setIdx((idx - 1 + images.length) % images.length)}
            style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 12 }}>‹</button>
          <button onClick={() => setIdx((idx + 1) % images.length)}
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 12 }}>›</button>
        </>
      )}
    </div>
  );
}

// ── Project detail window ──────────────────────────────────────────────────
function ProjectWindow({ project, onBack, onClose }) {
  return (
    <div style={{ ...s.fill, ...s.col, background: C.surface, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: `0 8px 32px rgba(0,0,0,0.6)` }}>
      {/* title bar */}
      <div style={s.titlebar}>
        <div style={s.dot(C.red)} onClick={onClose} title="Close" />
        <div style={s.dot(C.yellow)} onClick={onBack} title="Back" />
        <div style={s.dot(C.green)} />
        <span style={{ color: C.muted, fontSize: 10, fontFamily: MONO, marginLeft: 4, flex: 1 }}>
          ~/projects/{project.id}
        </span>
        <button onClick={onBack} style={{
          background: "none", border: `1px solid ${C.border}`, color: C.muted,
          borderRadius: 4, padding: "1px 8px", fontSize: 10, cursor: "pointer", fontFamily: MONO,
        }}>← back</button>
      </div>

      {/* content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12, ...s.col, gap: 10 }}>
        <Carousel images={project.images} color={project.color} />

        <div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 14, fontFamily: FONT, marginBottom: 4 }}>
            {project.title}
          </div>
          <div style={{ color: C.muted, fontSize: 11, lineHeight: 1.6, fontFamily: FONT }}>
            {project.description}
          </div>
        </div>

        {/* stack tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {project.stack.map((tag) => (
            <span key={tag} style={{
              padding: "2px 8px", borderRadius: 4,
              fontSize: 10, fontFamily: MONO,
              background: C.accentLo, color: "#a78bfa",
              border: `1px solid ${C.accentHi}`,
            }}>{tag}</span>
          ))}
        </div>

        {/* links */}
        <div style={{ ...s.row, gap: 8, marginTop: "auto" }}>
          {project.github !== "#" && (
            <a href={project.github} target="_blank" rel="noreferrer" style={{
              flex: 1, textAlign: "center", padding: "6px 0",
              borderRadius: 6, border: `1px solid ${C.border}`,
              color: C.muted, fontSize: 11, textDecoration: "none", fontFamily: FONT,
              background: C.bg,
            }}>GitHub ↗</a>
          )}
          {project.live !== "#" && (
            <a href={project.live} target="_blank" rel="noreferrer" style={{
              flex: 1, textAlign: "center", padding: "6px 0",
              borderRadius: 6, border: `1px solid ${C.accentHi}`,
              color: "#a78bfa", fontSize: 11, textDecoration: "none", fontFamily: FONT,
              background: C.accentLo,
            }}>Live Demo ↗</a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Projects folder window ─────────────────────────────────────────────────
function FolderWindow({ onSelect, onClose }) {
  return (
    <div style={{ ...s.fill, ...s.col, background: C.surface, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: `0 8px 32px rgba(0,0,0,0.6)` }}>
      <div style={s.titlebar}>
        <div style={s.dot(C.red)} onClick={onClose} />
        <div style={s.dot(C.yellow)} onClick={onClose} />
        <div style={s.dot(C.green)} />
        <span style={{ color: C.muted, fontSize: 10, fontFamily: MONO, marginLeft: 4 }}>
          ~/projects
        </span>
        <span style={{ marginLeft: "auto", color: C.muted, fontSize: 10 }}>{PROJECTS.length} items</span>
      </div>

      <div style={{
        flex: 1, overflowY: "auto", padding: 10,
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignContent: "start",
      }}>
        {PROJECTS.map((p) => (
          <button key={p.id} onClick={() => onSelect(p)} style={{
            textAlign: "left", padding: 10, borderRadius: 8,
            background: `${p.color}11`,
            border: `1px solid ${p.color}33`,
            cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${p.color}22`; e.currentTarget.style.borderColor = `${p.color}66`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${p.color}11`; e.currentTarget.style.borderColor = `${p.color}33`; }}
          >
            {/* mini preview */}
            <div style={{
              width: "100%", height: 52, borderRadius: 4, marginBottom: 6,
              background: p.images[0] ? "none" : `${p.color}22`,
              border: `1px solid ${p.color}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, overflow: "hidden",
            }}>
              {p.images[0]
                ? <img src={p.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : "🗂️"}
            </div>
            <div style={{ color: C.text, fontSize: 11, fontWeight: 600, fontFamily: FONT, marginBottom: 2 }}>
              {p.title}
            </div>
            <div style={{ color: C.muted, fontSize: 9, fontFamily: MONO }}>
              {p.stack.slice(0, 3).join(" · ")}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Desktop ────────────────────────────────────────────────────────────────
function Desktop({ onOpenFolder }) {
  return (
    <div style={{
      ...s.fill, ...s.col,
      background: `radial-gradient(ellipse at 30% 40%, #1a0a2e 0%, #0d0d1a 60%, #050508 100%)`,
      position: "relative", overflow: "hidden",
    }}>
      {/* subtle grid overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
        backgroundSize: "32px 32px", opacity: 0.3,
      }} />

      {/* icons */}
      <div style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start", position: "relative" }}>
        <DesktopIcon icon="🗂️" label="My Projects" onClick={onOpenFolder} />
        <DesktopIcon icon="📄" label="Resume.pdf" onClick={() => {}} />
        <DesktopIcon icon="📬" label="Contact" onClick={() => {}} />
      </div>

      {/* taskbar */}
      <div style={{
        height: 28, ...s.row, justifyContent: "space-between",
        padding: "0 12px", flexShrink: 0,
        background: "rgba(10,10,20,0.9)",
        backdropFilter: "blur(12px)",
        borderTop: `1px solid ${C.border}`,
        position: "relative",
      }}>
        <div style={{ ...s.row, gap: 6 }}>
          <div style={{
            width: 14, height: 14, borderRadius: 3,
            background: `linear-gradient(135deg, ${C.accent}, #3b0a8a)`,
          }} />
          <span style={{ color: C.muted, fontSize: 10, fontFamily: FONT }}>TimeshotOS</span>
        </div>
        <Clock />
      </div>
    </div>
  );
}

function DesktopIcon({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      padding: "6px 8px", borderRadius: 6, background: "none",
      border: "1px solid transparent", cursor: "pointer", width: 64,
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = C.accentLo; e.currentTarget.style.borderColor = C.accentHi; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "transparent"; }}
    >
      <span style={{ fontSize: 26 }}>{icon}</span>
      <span style={{ color: C.text, fontSize: 9, fontFamily: FONT, textAlign: "center", lineHeight: 1.3, textShadow: "0 1px 3px #000" }}>
        {label}
      </span>
    </button>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function FakeOSDesktop() {
  const [view, setView] = useState("desktop"); // 'desktop' | 'folder' | project

  return (
    <div style={{ ...s.fill, fontFamily: FONT, color: C.text, background: C.bg }}>
      {view === "desktop" && <Desktop onOpenFolder={() => setView("folder")} />}
      {view === "folder"  && (
        <FolderWindow
          onSelect={(p) => setView(p)}
          onClose={() => setView("desktop")}
        />
      )}
      {view !== "desktop" && view !== "folder" && (
        <ProjectWindow
          project={view}
          onBack={() => setView("folder")}
          onClose={() => setView("desktop")}
        />
      )}
    </div>
  );
}
