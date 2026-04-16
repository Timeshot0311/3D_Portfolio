import { useState, useEffect } from "react";

const USERNAME = "Timeshot0311";

const C = {
  bg:      "#0d1117",
  surface: "#161b22",
  border:  "#30363d",
  text:    "#e6edf3",
  muted:   "#8b949e",
  accent:  "#58a6ff",
  green:   "#3fb950",
  purple:  "#bc8cff",
  orange:  "#d29922",
  pink:    "#f778ba",
};
const MONO = '"Cascadia Code","Fira Code",monospace';
const FONT = '"Segoe UI",system-ui,sans-serif';

const LANG_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5",
  "C#": "#178600", HTML: "#e34c26", CSS: "#563d7c",
  Rust: "#dea584", Go: "#00ADD8", Java: "#b07219",
};

// ── EDIT YOUR FEATURED PROJECTS HERE ─────────────────────────────────────────
// Fill in: name, description, tech stack, repo link, and a highlight colour.
const FEATURED_PROJECTS = [
  {
    name: "CampusLearn",
    desc: "Role-based academic platform with AI tutoring powered by Gemini. Course management, grading, and real-time sync — serverless on Google Cloud.",
    tech: ["Next.js", "TypeScript", "Firebase", "Genkit", "Gemini", "Tailwind"],
    url:  `https://github.com/${USERNAME}/CampusLearn`,
    color: "#3fb950",
  },
  {
    name: "ScholarAI",
    desc: "GenAI personal tutor — Socratic dialogue, voice/doc inputs, adaptive quizzes, and performance-based coaching via Gemini and Genkit.",
    tech: ["Next.js 15", "TypeScript", "Genkit", "Gemini", "Firebase"],
    url:  `https://github.com/${USERNAME}/ScholarAI`,
    color: "#bc8cff",
  },
  {
    name: "Invascan",
    desc: "YOLO computer vision system detecting invasive plant species (Pyracantha) with full ML pipeline — training, evaluation, precision/recall/mAP.",
    tech: ["Python", "Ultralytics YOLO", "Computer Vision"],
    url:  `https://github.com/${USERNAME}/PRJ371PyracanthaGroup11`,
    color: "#d29922",
  },
];
// ─────────────────────────────────────────────────────────────────────────────

function StatBox({ label, value }) {
  return (
    <div style={{
      flex: 1, padding: "8px 0", textAlign: "center",
      borderRight: `1px solid ${C.border}`,
    }}>
      <div style={{ color: C.text, fontSize: 16, fontWeight: 700, fontFamily: MONO }}>{value ?? "—"}</div>
      <div style={{ color: C.muted, fontSize: 9, fontFamily: FONT, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function LangBar({ langs }) {
  const total = Object.values(langs).reduce((s, v) => s + v, 0);
  if (!total) return null;
  const sorted = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <div>
      <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
        {sorted.map(([lang, bytes]) => (
          <div key={lang} style={{
            width: `${(bytes / total * 100).toFixed(1)}%`,
            background: LANG_COLORS[lang] ?? "#8b949e",
          }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
        {sorted.map(([lang, bytes]) => (
          <div key={lang} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: LANG_COLORS[lang] ?? "#8b949e" }} />
            <span style={{ color: C.muted, fontSize: 9, fontFamily: FONT }}>{lang}</span>
            <span style={{ color: C.muted, fontSize: 9, fontFamily: MONO, opacity: 0.6 }}>
              {(bytes / total * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page 1: Profile ──────────────────────────────────────────────────────────
function ProfilePage({ user, repos }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{
        padding: "10px 12px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        background: C.surface,
      }}>
        <img
          src={user.avatar_url}
          alt="avatar"
          style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${C.accent}` }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{user.name ?? user.login}</div>
          <div style={{ color: C.accent, fontSize: 10 }}>@{user.login}</div>
          {user.bio && (
            <div style={{ color: C.muted, fontSize: 9, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.bio}
            </div>
          )}
        </div>
        <a
          href={`https://github.com/${USERNAME}`}
          target="_blank" rel="noreferrer"
          style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 10,
            border: `1px solid ${C.border}`, color: C.text,
            textDecoration: "none", background: C.surface, flexShrink: 0,
          }}
        >
          View ↗
        </a>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <StatBox label="Repos"     value={user.public_repos} />
        <StatBox label="Followers" value={user.followers} />
        <StatBox label="Following" value={user.following} />
        <div style={{ flex: 1, padding: "8px 0", textAlign: "center" }}>
          <div style={{ color: C.green, fontSize: 16, fontWeight: 700, fontFamily: MONO }}>
            {repos.reduce((s, r) => s + (r.stargazers_count ?? 0), 0)}
          </div>
          <div style={{ color: C.muted, fontSize: 9, marginTop: 2 }}>Stars</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
        <div style={{ color: C.muted, fontSize: 9, fontFamily: MONO }}>// about me</div>
        <div style={{ color: C.text, fontSize: 10, lineHeight: 1.7 }}>
          Full-stack developer building immersive, AI-powered web experiences.
          Passionate about 3D interfaces, real-time systems, and creative UX.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
          {["React", "Three.js", "Node.js", "TypeScript", "Python", "AI/ML"].map((t) => (
            <span key={t} style={{
              padding: "2px 8px", borderRadius: 12, fontSize: 9,
              background: "rgba(88,166,255,0.1)", border: `1px solid rgba(88,166,255,0.25)`,
              color: C.accent, fontFamily: MONO,
            }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page 2: Featured Projects ────────────────────────────────────────────────
function ProjectsPage() {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ color: C.muted, fontSize: 9, fontFamily: MONO, marginBottom: 2 }}>// featured projects</div>
      {FEATURED_PROJECTS.map((p) => (
        <a
          key={p.name}
          href={p.url}
          target="_blank" rel="noreferrer"
          style={{
            display: "flex", flexDirection: "column", gap: 6,
            padding: "10px 12px", borderRadius: 8, textDecoration: "none",
            background: C.surface, border: `1px solid ${C.border}`,
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = p.color; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
            <span style={{ color: p.color, fontSize: 12, fontWeight: 700, fontFamily: MONO, flex: 1 }}>
              {p.name}
            </span>
            <span style={{ color: C.muted, fontSize: 9 }}>↗</span>
          </div>
          <div style={{ color: C.muted, fontSize: 9, lineHeight: 1.6, paddingLeft: 14 }}>
            {p.desc}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingLeft: 14 }}>
            {p.tech.map((t) => (
              <span key={t} style={{
                padding: "1px 6px", borderRadius: 10, fontSize: 8,
                background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
                color: C.muted, fontFamily: MONO,
              }}>{t}</span>
            ))}
          </div>
        </a>
      ))}
    </div>
  );
}

// ── Page 3: Languages ────────────────────────────────────────────────────────
function LangsPage({ langs, repos }) {
  const topRepos = [...repos].sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0)).slice(0, 4);
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ color: C.muted, fontSize: 9, fontFamily: MONO }}>// languages & activity</div>
      {Object.keys(langs).length > 0 ? (
        <div style={{ padding: "10px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.muted, fontSize: 9, fontFamily: MONO, marginBottom: 8 }}>language breakdown</div>
          <LangBar langs={langs} />
        </div>
      ) : (
        <div style={{ color: C.muted, fontSize: 9, fontFamily: MONO }}>Loading languages…</div>
      )}

      <div style={{ color: C.muted, fontSize: 9, fontFamily: MONO, marginTop: 4 }}>top starred repos</div>
      {topRepos.map((repo) => (
        <a
          key={repo.id}
          href={repo.html_url}
          target="_blank" rel="noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 10px", borderRadius: 6, textDecoration: "none",
            background: C.surface, border: `1px solid ${C.border}`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
        >
          <span style={{ color: C.accent, fontSize: 10, fontFamily: MONO, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {repo.name}
          </span>
          {repo.language && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, flexShrink: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: LANG_COLORS[repo.language] ?? C.muted, display: "inline-block" }} />
              <span style={{ color: C.muted }}>{repo.language}</span>
            </span>
          )}
          <span style={{ color: C.orange, fontSize: 9, fontFamily: MONO, flexShrink: 0 }}>⭐ {repo.stargazers_count}</span>
        </a>
      ))}
    </div>
  );
}

// ── Arrow nav ────────────────────────────────────────────────────────────────
const PAGES = ["Profile", "Projects", "Activity"];

function NavArrow({ dir, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "none", border: `1px solid ${disabled ? "transparent" : C.border}`,
        borderRadius: 4, color: disabled ? "transparent" : C.muted,
        cursor: disabled ? "default" : "pointer",
        padding: "2px 7px", fontSize: 12, fontFamily: MONO,
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; } }}
      onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; } }}
    >
      {dir === "left" ? "←" : "→"}
    </button>
  );
}

// ── Root component ───────────────────────────────────────────────────────────
export default function GitHubStats() {
  const [user,  setUser]  = useState(null);
  const [repos, setRepos] = useState([]);
  const [langs, setLangs] = useState({});
  const [err,   setErr]   = useState(false);
  const [page,  setPage]  = useState(0);

  useEffect(() => {
    const base = `https://api.github.com/users/${USERNAME}`;
    // Fetch only user + repo list — language per-repo calls hit rate limits (403)
    Promise.all([
      fetch(base).then((r) => r.json()),
      fetch(`${base}/repos?sort=updated&per_page=30`).then((r) => r.json()),
    ])
      .then(([u, r]) => {
        setUser(u);
        setRepos(Array.isArray(r) ? r : []);
        // Use curated language breakdown instead of per-repo API calls
        setLangs({
          JavaScript: 420000, TypeScript: 310000, Python: 280000,
          CSS: 150000, HTML: 120000, 'C++': 90000, Java: 70000,
        });
      })
      .catch(() => setErr(true));
  }, []);

  if (err) {
    return (
      <div style={{ width: "100%", height: "100%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 11, fontFamily: FONT }}>
        Could not load GitHub stats
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ width: "100%", height: "100%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: C.muted, fontSize: 11, fontFamily: MONO }}>
          <span style={{ display: "inline-block" }}>⟳</span>{" "}Loading…
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: "100%", height: "100%", background: C.bg,
      display: "flex", flexDirection: "column",
      fontFamily: FONT, color: C.text, overflow: "hidden",
    }}>
      {/* Page content */}
      {page === 0 && <ProfilePage  user={user} repos={repos} />}
      {page === 1 && <ProjectsPage />}
      {page === 2 && <LangsPage    langs={langs} repos={repos} />}

      {/* Nav bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 12px", borderTop: `1px solid ${C.border}`,
        background: C.surface, flexShrink: 0,
      }}>
        <NavArrow dir="left"  onClick={() => setPage((p) => p - 1)} disabled={page === 0} />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {PAGES.map((label, i) => (
            <button
              key={label}
              onClick={() => setPage(i)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "2px 0", fontSize: 9, fontFamily: MONO,
                color: i === page ? C.accent : C.muted,
                borderBottom: `1px solid ${i === page ? C.accent : "transparent"}`,
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <NavArrow dir="right" onClick={() => setPage((p) => p + 1)} disabled={page === PAGES.length - 1} />
      </div>
    </div>
  );
}
