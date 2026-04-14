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
};
const MONO = '"Cascadia Code","Fira Code",monospace';
const FONT = '"Segoe UI",system-ui,sans-serif';

// Language colours (subset)
const LANG_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5",
  "C#": "#178600", HTML: "#e34c26", CSS: "#563d7c",
  Rust: "#dea584", Go: "#00ADD8", Java: "#b07219",
};

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
      {/* bar */}
      <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
        {sorted.map(([lang, bytes]) => (
          <div key={lang} style={{
            width: `${(bytes / total * 100).toFixed(1)}%`,
            background: LANG_COLORS[lang] ?? "#8b949e",
          }} />
        ))}
      </div>
      {/* legend */}
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

export default function GitHubStats() {
  const [user,  setUser]  = useState(null);
  const [repos, setRepos] = useState([]);
  const [langs, setLangs] = useState({});
  const [err,   setErr]   = useState(false);

  useEffect(() => {
    const base = `https://api.github.com/users/${USERNAME}`;

    Promise.all([
      fetch(base).then((r) => r.json()),
      fetch(`${base}/repos?sort=stars&per_page=6`).then((r) => r.json()),
    ])
      .then(([u, r]) => {
        setUser(u);
        const validRepos = Array.isArray(r) ? r : [];
        setRepos(validRepos);

        // Aggregate languages from top repos
        const langCounts = {};
        const langFetches = validRepos.slice(0, 4).map((repo) =>
          fetch(repo.languages_url)
            .then((res) => res.json())
            .then((data) => {
              Object.entries(data).forEach(([l, b]) => {
                langCounts[l] = (langCounts[l] ?? 0) + b;
              });
            })
            .catch(() => {}),
        );
        Promise.all(langFetches).then(() => setLangs({ ...langCounts }));
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
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
          {" "}Loading stats…
        </div>
      </div>
    );
  }

  const topRepos = repos.slice(0, 3);

  return (
    <div style={{
      width: "100%", height: "100%", background: C.bg,
      display: "flex", flexDirection: "column",
      fontFamily: FONT, color: C.text, overflow: "hidden",
    }}>
      {/* Header */}
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
          View Profile ↗
        </a>
      </div>

      {/* Stats row */}
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

      {/* Top repos */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ color: C.muted, fontSize: 9, fontFamily: MONO, marginBottom: 2 }}>
          ★ top repositories
        </div>
        {topRepos.map((repo) => (
          <a
            key={repo.id}
            href={repo.html_url}
            target="_blank" rel="noreferrer"
            style={{
              display: "flex", flexDirection: "column", gap: 3,
              padding: "7px 10px", borderRadius: 6, textDecoration: "none",
              background: C.surface, border: `1px solid ${C.border}`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: C.accent, fontSize: 11, fontWeight: 600, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {repo.name}
              </span>
              <span style={{ color: C.orange, fontSize: 9, fontFamily: MONO }}>⭐ {repo.stargazers_count}</span>
              {repo.language && (
                <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: LANG_COLORS[repo.language] ?? C.muted, display: "inline-block" }} />
                  <span style={{ color: C.muted }}>{repo.language}</span>
                </span>
              )}
            </div>
            {repo.description && (
              <div style={{ color: C.muted, fontSize: 9, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {repo.description}
              </div>
            )}
          </a>
        ))}

        {/* Language breakdown */}
        {Object.keys(langs).length > 0 && (
          <div style={{ marginTop: 4, padding: "8px 10px", borderRadius: 6, background: C.surface, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.muted, fontSize: 9, fontFamily: MONO, marginBottom: 6 }}>languages</div>
            <LangBar langs={langs} />
          </div>
        )}
      </div>
    </div>
  );
}
