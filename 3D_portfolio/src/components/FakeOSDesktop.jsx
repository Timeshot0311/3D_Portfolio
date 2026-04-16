import { useState, useEffect } from "react";

// ── Projects — add logo path (e.g. "/screenshots/lexdesk-logo.png") or leave as emoji ──
const PROJECTS = [
  {
    id: "lexdesk",
    title: "LexDesk",
    logo: "⚖️",
    description: "Cloud-first PWA case management platform for legal practitioners. Centralises case files, financial tracking, automated PDF generation (invoices, pleadings), smart templates, an integrated calendar with .ics export, and secure team collaboration — with full offline persistence via Firestore.",
    stack: ["Next.js 15", "Firebase", "Firestore", "Shadcn UI", "Tailwind", "jsPDF", "PWA"],
    images: [],
    github: "#",
    live: "#",
    color: "#c9a84c",
  },
  {
    id: "campuslearn",
    title: "CampusLearn",
    logo: "🎓",
    description: "Secure, role-based academic platform for students, tutors, lecturers, and admins. Features course management, assignment grading, and an AI tutor powered by Gemini — all on a fully serverless Google Cloud stack with real-time Firestore sync.",
    stack: ["Next.js", "TypeScript", "Firebase", "Genkit", "Gemini", "Cypress", "Tailwind"],
    images: ["/screenshots/campuslearn-1.png", "/screenshots/campuslearn-2.png", "/screenshots/campuslearn-3.png", "/screenshots/campuslearn-4.png"],
    github: "https://github.com/Timeshot0311/CampusLearn",
    live: "#",
    color: "#0891b2",
  },
  {
    id: "scholarai",
    title: "ScholarAI",
    logo: "🧠",
    description: "GenAI personal tutor using Socratic dialogue, multi-modal inputs (text, voice, documents), adaptive quiz generation, and personalised coaching based on performance history. Built with Gemini via Genkit for context-aware sessions.",
    stack: ["Next.js 15", "TypeScript", "Genkit", "Gemini", "Zustand", "Firebase"],
    images: ["/screenshots/scholarai-1.svg", "/screenshots/scholarai-2.svg", "/screenshots/scholarai-3.svg"],
    github: "https://github.com/Timeshot0311/ScholarAI",
    live: "#",
    color: "#059669",
  },
  {
    id: "edusphere",
    title: "EduSphere",
    logo: "🌐",
    description: "Production client website for an industrial relations consultancy. Fully responsive, SEO-optimised site with animated hero sections, service showcases, and contact flows — built and deployed for a real business.",
    stack: ["Next.js", "Tailwind CSS", "Shadcn UI"],
    images: [],
    github: "#",
    live: "https://www.edu-sphere.co.za",
    color: "#6366f1",
  },
  {
    id: "invascan",
    title: "Invascan",
    logo: "🔬",
    description: "YOLO-based computer vision system (capstone, team lead) for detecting invasive Pyracantha species from images. Led a cross-functional team of 11 including 4 industry professionals across the full ML pipeline — dataset prep, YOLO training, API integration, Docker orchestration, and stakeholder reporting.",
    stack: ["Python", "Ultralytics YOLOv8", "Docker", "Computer Vision", "OpenCV", "NumPy"],
    images: ["/screenshots/invascan-1.jpg", "/screenshots/invascan-2.jpg", "/screenshots/invascan-3.jpg", "/screenshots/invascan-4.jpg"],
    github: "https://github.com/Timeshot0311/PRJ371PyracanthaGroup11",
    live: "#",
    color: "#d97706",
  },
  {
    id: "portfolio-3d",
    title: "3D Portfolio",
    logo: "🎮",
    description: "Immersive room-scale 3D portfolio with a VTuber AI companion (ElevenLabs TTS + LLM), interactive monitor screens with a fake OS and GitHub stats, first-person free-camera, and mobile touch controls.",
    stack: ["React", "Three.js", "R3F", "VRM", "Vite", "Tailwind", "Vercel"],
    images: [],
    github: "https://github.com/Timeshot0311/3D_Portfolio",
    live: "#",
    color: "#7c3aed",
  },
];

// ── Colour tokens ─────────────────────────────────────────────────────────────
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
  dot: (color) => ({ width: 9, height: 9, borderRadius: "50%", background: color }),
};

// ── Clock ──────────────────────────────────────────────────────────────────────
function Clock() {
  const [t, setT] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  useEffect(() => {
    const id = setInterval(() => setT(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })), 10000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ color: C.muted, fontSize: 10, fontFamily: MONO }}>{t}</span>;
}

// ── Image carousel ─────────────────────────────────────────────────────────────
function Carousel({ images, color, logo }) {
  const [idx, setIdx] = useState(0);
  if (!images?.length) {
    return (
      <div style={{
        flex: 1, borderRadius: 6, background: `${color}18`,
        border: `1px solid ${color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: `${color}99`, fontSize: 48,
      }}>
        {logo}
      </div>
    );
  }
  return (
    <div style={{ flex: 1, borderRadius: 6, overflow: "hidden", position: "relative", minHeight: 0 }}>
      <img
        src={images[idx]} alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      {images.length > 1 && (
        <>
          <button onClick={() => setIdx((idx - 1 + images.length) % images.length)}
            style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", borderRadius: 4, padding: "3px 7px", cursor: "pointer", fontSize: 14, zIndex: 1 }}>‹</button>
          <button onClick={() => setIdx((idx + 1) % images.length)}
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", borderRadius: 4, padding: "3px 7px", cursor: "pointer", fontSize: 14, zIndex: 1 }}>›</button>
          <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
            {images.map((_, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{ width: 5, height: 5, borderRadius: "50%", background: i === idx ? "#fff" : "rgba(255,255,255,0.35)", cursor: "pointer" }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Project detail window — two-column ─────────────────────────────────────────
function ProjectWindow({ project, onBack, onClose }) {
  return (
    <div style={{ ...s.fill, ...s.col, background: C.surface, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
      {/* title bar */}
      <div style={s.titlebar}>
        <div style={s.dot(C.red)}    onClick={onClose} title="Close" />
        <div style={s.dot(C.yellow)} onClick={onBack}  title="Back"  />
        <div style={s.dot(C.green)} />
        <span style={{ color: C.muted, fontSize: 10, fontFamily: MONO, marginLeft: 4, flex: 1 }}>
          ~/projects/{project.id}
        </span>
        <button onClick={onBack} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 4, padding: "1px 8px", fontSize: 10, cursor: "pointer", fontFamily: MONO }}>← back</button>
      </div>

      {/* two-column body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "row", minHeight: 0, overflow: "hidden" }}>

        {/* LEFT — image panel */}
        <div style={{
          width: "48%", flexShrink: 0, padding: 10, display: "flex", flexDirection: "column",
          borderRight: `1px solid ${C.border}`, background: C.bg,
        }}>
          <Carousel images={project.images} color={project.color} logo={project.logo} />
        </div>

        {/* RIGHT — info panel */}
        <div style={{ flex: 1, padding: "12px 14px", ...s.col, gap: 10, overflowY: "auto" }}>
          {/* project title with colour dot */}
          <div style={{ ...s.row, gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: project.color, flexShrink: 0 }} />
            <span style={{ color: project.color, fontWeight: 700, fontSize: 14, fontFamily: MONO }}>{project.title}</span>
          </div>

          <div style={{ color: C.muted, fontSize: 11, lineHeight: 1.7, fontFamily: FONT }}>
            {project.description}
          </div>

          {/* stack tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {project.stack.map((tag) => (
              <span key={tag} style={{
                padding: "2px 8px", borderRadius: 4, fontSize: 10, fontFamily: MONO,
                background: C.accentLo, color: "#a78bfa", border: `1px solid ${C.accentHi}`,
              }}>{tag}</span>
            ))}
          </div>

          {/* links */}
          <div style={{ ...s.row, gap: 8, marginTop: "auto", paddingTop: 8 }}>
            {project.github !== "#" && (
              <a href={project.github} target="_blank" rel="noreferrer" style={{
                flex: 1, textAlign: "center", padding: "6px 0", borderRadius: 6,
                border: `1px solid ${C.border}`, color: C.muted, fontSize: 11,
                textDecoration: "none", background: C.bg,
              }}>GitHub ↗</a>
            )}
            {project.live !== "#" && (
              <a href={project.live} target="_blank" rel="noreferrer" style={{
                flex: 1, textAlign: "center", padding: "6px 0", borderRadius: 6,
                border: `1px solid ${C.accentHi}`, color: "#a78bfa", fontSize: 11,
                textDecoration: "none", background: C.accentLo,
              }}>Live Demo ↗</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Projects folder window ─────────────────────────────────────────────────────
function FolderWindow({ onSelect, onClose }) {
  return (
    <div style={{ ...s.fill, ...s.col, background: C.surface, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
      <div style={s.titlebar}>
        <div style={s.dot(C.red)}    onClick={onClose} />
        <div style={s.dot(C.yellow)} onClick={onClose} />
        <div style={s.dot(C.green)} />
        <span style={{ color: C.muted, fontSize: 10, fontFamily: MONO, marginLeft: 4 }}>~/projects</span>
        <span style={{ marginLeft: "auto", color: C.muted, fontSize: 10 }}>{PROJECTS.length} items</span>
      </div>

      <div style={{
        flex: 1, overflowY: "auto", padding: 10,
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignContent: "start",
      }}>
        {PROJECTS.map((p) => (
          <button key={p.id} onClick={() => onSelect(p)} style={{
            textAlign: "left", padding: 10, borderRadius: 8,
            background: `${p.color}11`, border: `1px solid ${p.color}33`, cursor: "pointer",
            transition: "all 0.15s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${p.color}22`; e.currentTarget.style.borderColor = `${p.color}66`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${p.color}11`; e.currentTarget.style.borderColor = `${p.color}33`; }}
          >
            {/* logo thumbnail */}
            <div style={{
              width: "100%", height: 52, borderRadius: 4, marginBottom: 6,
              background: `${p.color}18`, border: `1px solid ${p.color}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, overflow: "hidden",
            }}>
              {p.logo?.startsWith("/")
                ? <img src={p.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
                : p.logo}
            </div>
            <div style={{ color: C.text, fontSize: 11, fontWeight: 600, fontFamily: FONT, marginBottom: 2 }}>{p.title}</div>
            <div style={{ color: C.muted, fontSize: 9, fontFamily: MONO }}>{p.stack.slice(0, 3).join(" · ")}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Contact window ─────────────────────────────────────────────────────────────
function ContactWindow({ onClose }) {
  const links = [
    { icon: "✉️", label: "Email",    value: "suhil0311@gmail.com",                          href: "mailto:suhil0311@gmail.com" },
    { icon: "💼", label: "LinkedIn", value: "linkedin.com/in/suhil-jugroop-443a7b26a",       href: "https://linkedin.com/in/suhil-jugroop-443a7b26a" },
    { icon: "🐙", label: "GitHub",   value: "github.com/Timeshot0311",                       href: "https://github.com/Timeshot0311" },
    { icon: "📍", label: "Location", value: "Edenvale, South Africa",                        href: null },
  ];
  return (
    <div style={{ ...s.fill, ...s.col, background: C.surface, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
      <div style={s.titlebar}>
        <div style={s.dot(C.red)} onClick={onClose} title="Close" />
        <div style={s.dot(C.yellow)} onClick={onClose} />
        <div style={s.dot(C.green)} />
        <span style={{ color: C.muted, fontSize: 10, fontFamily: MONO, marginLeft: 4 }}>~/contact</span>
      </div>

      <div style={{ flex: 1, padding: "18px 16px", ...s.col, gap: 14, justifyContent: "center" }}>
        <div style={{ color: C.accent, fontSize: 13, fontWeight: 700, fontFamily: FONT, marginBottom: 4 }}>
          Let's connect 👋
        </div>
        <div style={{ color: C.muted, fontSize: 10, fontFamily: FONT, lineHeight: 1.6, marginBottom: 8 }}>
          Open to full-stack, AI, and cloud roles. Feel free to reach out!
        </div>
        {links.map(({ icon, label, value, href }) => (
          <div key={label} style={{ ...s.row, gap: 10, padding: "8px 12px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <div style={{ ...s.col, gap: 1, flex: 1, minWidth: 0 }}>
              <span style={{ color: C.muted, fontSize: 9, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
              {href ? (
                <a href={href} target="_blank" rel="noreferrer" style={{ color: C.text, fontSize: 11, fontFamily: FONT, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#a78bfa"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = C.text; }}
                >{value}</a>
              ) : (
                <span style={{ color: C.text, fontSize: 11, fontFamily: FONT }}>{value}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Desktop ────────────────────────────────────────────────────────────────────
function Desktop({ onOpenFolder, onOpenContact }) {
  return (
    <div style={{
      ...s.fill, ...s.col,
      background: "radial-gradient(ellipse at 30% 40%, #1a0a2e 0%, #0d0d1a 60%, #050508 100%)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
        backgroundSize: "32px 32px", opacity: 0.3,
      }} />

      <div style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start", position: "relative" }}>
        <DesktopIcon icon="🗂️" label="My Projects" onClick={onOpenFolder} />
        <DesktopIcon icon="📄" label="Resume.pdf"  onClick={() => window.open('/Suhil_Jugroop_CV.pdf', '_blank')} />
        <DesktopIcon icon="📬" label="Contact"     onClick={onOpenContact} />
      </div>

      <div style={{
        height: 28, ...s.row, justifyContent: "space-between",
        padding: "0 12px", flexShrink: 0,
        background: "rgba(10,10,20,0.9)", backdropFilter: "blur(12px)",
        borderTop: `1px solid ${C.border}`, position: "relative",
      }}>
        <div style={{ ...s.row, gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: `linear-gradient(135deg, ${C.accent}, #3b0a8a)` }} />
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
      onMouseLeave={(e) => { e.currentTarget.style.background = "none";     e.currentTarget.style.borderColor = "transparent"; }}
    >
      <span style={{ fontSize: 26 }}>{icon}</span>
      <span style={{ color: C.text, fontSize: 9, fontFamily: FONT, textAlign: "center", lineHeight: 1.3, textShadow: "0 1px 3px #000" }}>{label}</span>
    </button>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function FakeOSDesktop() {
  const [view, setView] = useState("desktop"); // 'desktop' | 'folder' | 'contact' | project obj

  return (
    <div style={{ ...s.fill, fontFamily: FONT, color: C.text, background: C.bg }}>
      {view === "desktop" && <Desktop onOpenFolder={() => setView("folder")} onOpenContact={() => setView("contact")} />}
      {view === "folder"  && <FolderWindow onSelect={(p) => setView(p)} onClose={() => setView("desktop")} />}
      {view === "contact" && <ContactWindow onClose={() => setView("desktop")} />}
      {view !== "desktop" && view !== "folder" && view !== "contact" && (
        <ProjectWindow project={view} onBack={() => setView("folder")} onClose={() => setView("desktop")} />
      )}
    </div>
  );
}
