"use client";
import React, { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// YOUR PROJECTS — edit this array to add/update your portfolio items.
// images: array of URL strings (absolute or relative to /public)
// Leave images: [] for a styled placeholder card.
// ─────────────────────────────────────────────────────────────────────────────
const PROJECTS = [
  {
    id: "portfolio-3d",
    title: "3D Portfolio",
    description:
      "An immersive, room-scale 3D portfolio built with React Three Fiber. Features a VTuber desktop companion, interactive monitor screens rendered via WebGL render textures, first-person camera controls, and mobile touch support.",
    stack: ["React", "Three.js", "React Three Fiber", "VRM", "Vite", "Tailwind"],
    images: [], // e.g. ["/screenshots/portfolio-1.png", "/screenshots/portfolio-2.png"]
    github: "#",
    live: "#",
    accent: "#1a4a7a",
  },
  {
    id: "project-2",
    title: "Project Two",
    description: "Replace this with your actual project description. Explain what it does, what problem it solves, and any interesting technical challenges you overcame.",
    stack: ["TypeScript", "Node.js", "PostgreSQL"],
    images: [],
    github: "#",
    live: "#",
    accent: "#1a5a3a",
  },
  {
    id: "project-3",
    title: "Project Three",
    description: "Another standout project. Add your real description, stack, and links here.",
    stack: ["Python", "FastAPI", "React"],
    images: [],
    github: "#",
    live: "#",
    accent: "#4a1a5a",
  },
  {
    id: "project-4",
    title: "Project Four",
    description: "Yet another project. You can add as many entries as you like to this PROJECTS array.",
    stack: ["Next.js", "Prisma", "Tailwind"],
    images: [],
    github: "#",
    live: "#",
    accent: "#5a3a1a",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Image Carousel
// ─────────────────────────────────────────────────────────────────────────────
function Carousel({ images, accent }) {
  const [idx, setIdx] = useState(0);
  const hasImages = images?.length > 0;

  if (!hasImages) {
    return (
      <div
        className="w-full h-full flex items-center justify-center rounded-lg"
        style={{ background: accent, minHeight: 160 }}
      >
        <div className="text-center text-white/40 text-xs">
          <div className="text-2xl mb-1">🖼️</div>
          <div>Add image URLs to PROJECTS</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden" style={{ minHeight: 160 }}>
      <img
        src={images[idx]}
        alt={`screenshot ${idx + 1}`}
        className="w-full h-full object-cover"
        style={{ minHeight: 160 }}
      />
      {images.length > 1 && (
        <>
          <button
            onClick={() => setIdx((idx - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80"
          >
            ‹
          </button>
          <button
            onClick={() => setIdx((idx + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Project detail window
// ─────────────────────────────────────────────────────────────────────────────
function ProjectWindow({ project, onBack, onClose }) {
  return (
    <div className="absolute inset-2 bg-slate-900 rounded-lg flex flex-col overflow-hidden border border-slate-700 shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white text-sm px-2 py-0.5 rounded hover:bg-slate-700 transition-colors"
          >
            ← Back
          </button>
          <span className="text-white text-xs font-medium truncate">{project.title}</span>
        </div>
        <button
          onClick={onClose}
          className="w-4 h-4 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center text-xs leading-none"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* Screenshot carousel */}
        <Carousel images={project.images} accent={project.accent} />

        {/* Info */}
        <div>
          <h2 className="text-white font-semibold text-sm mb-1">{project.title}</h2>
          <p className="text-slate-400 text-xs leading-relaxed">{project.description}</p>
        </div>

        {/* Stack */}
        <div className="flex flex-wrap gap-1">
          {project.stack.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded text-xs font-mono text-cyan-300 border border-cyan-800 bg-cyan-950/50"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Links */}
        <div className="flex gap-2 mt-auto pt-1">
          <a
            href={project.github}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center text-xs py-1.5 rounded border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            GitHub ↗
          </a>
          {project.live !== "#" && (
            <a
              href={project.live}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center text-xs py-1.5 rounded border border-cyan-700 text-cyan-300 hover:bg-cyan-900/40 transition-colors"
            >
              Live Demo ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Folder window — grid of project cards
// ─────────────────────────────────────────────────────────────────────────────
function FolderWindow({ onSelectProject, onClose }) {
  return (
    <div className="absolute inset-2 bg-slate-900 rounded-lg flex flex-col overflow-hidden border border-slate-700 shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
        <span className="text-white text-xs font-medium flex items-center gap-1.5">
          <span>📁</span> My Standout Projects
        </span>
        <button
          onClick={onClose}
          className="w-4 h-4 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center text-xs leading-none"
        >
          ×
        </button>
      </div>

      {/* Project grid */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
        {PROJECTS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectProject(p)}
            className="text-left rounded-lg p-2 border border-slate-700 hover:border-slate-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: `${p.accent}33` }}
          >
            {/* Mini preview */}
            <div
              className="w-full h-16 rounded mb-2 flex items-center justify-center text-lg"
              style={{ background: p.accent }}
            >
              {p.images[0]
                ? <img src={p.images[0]} alt="" className="w-full h-full object-cover rounded" />
                : "🗂️"
              }
            </div>
            <div className="text-white text-xs font-medium truncate">{p.title}</div>
            <div className="text-slate-500 text-xs mt-0.5 truncate">
              {p.stack.slice(0, 3).join(" · ")}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop — icons on wallpaper
// ─────────────────────────────────────────────────────────────────────────────
function Desktop({ onOpenFolder }) {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex flex-col">
      {/* Desktop icons */}
      <div className="flex-1 p-4 flex flex-col gap-3 items-start justify-start">
        {/* Projects folder */}
        <button
          onClick={onOpenFolder}
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors group w-20"
        >
          <div className="text-4xl group-hover:scale-110 transition-transform">📁</div>
          <span className="text-white text-xs text-center leading-tight">
            My Standout<br />Projects
          </span>
        </button>
      </div>

      {/* Taskbar */}
      <div className="h-7 bg-slate-800/90 border-t border-slate-700 flex items-center px-3 gap-2 shrink-0">
        <div className="text-white/40 text-xs">🖥️ Portfolio OS</div>
        <div className="ml-auto text-white/30 text-xs">
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export — state machine: desktop → folder → project
// ─────────────────────────────────────────────────────────────────────────────
export default function FakeOSDesktop() {
  const [view, setView] = useState("desktop"); // 'desktop' | 'folder' | project object
  const isProject = view !== "desktop" && view !== "folder";

  return (
    <div className="relative w-full h-full overflow-hidden text-white select-none">
      {view === "desktop" && (
        <Desktop onOpenFolder={() => setView("folder")} />
      )}
      {view === "folder" && (
        <FolderWindow
          onSelectProject={(p) => setView(p)}
          onClose={() => setView("desktop")}
        />
      )}
      {isProject && (
        <ProjectWindow
          project={view}
          onBack={() => setView("folder")}
          onClose={() => setView("desktop")}
        />
      )}
    </div>
  );
}
