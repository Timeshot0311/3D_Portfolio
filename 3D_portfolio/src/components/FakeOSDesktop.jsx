"use client";
import React, { useState } from "react";
import { X, Minus, Square, FolderOpen, Monitor, Terminal } from "lucide-react";

// Simple apps config
const apps = {
  about: { title: "About", content: <p>This is a playful FakeOS for showcasing projects.</p>, icon: <Monitor size={14}/> },
  projects: { title: "Projects", content: <p>Embed your projects or portfolio here.</p>, icon: <FolderOpen size={14}/> },
  terminal: { title: "Terminal", content: <TerminalView/>, icon: <Terminal size={14}/> },
};

function Window({ app, onClose, onMin, onMax }) {
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);

  return (
    <div className={`absolute top-12 left-12 bg-slate-900/90 text-white rounded-md shadow-xl border border-slate-700 
                     ${minimized ? "hidden" : "w-80 h-52"} ${maximized ? "inset-2" : ""}`}>
      <div className="flex items-center justify-between px-2 py-1 bg-slate-800 border-b border-slate-600">
        <span className="flex items-center gap-1 text-xs">{apps[app].icon}{apps[app].title}</span>
        <div className="flex gap-1">
          <button onClick={() => setMinimized(!minimized)}><Minus size={12}/></button>
          <button onClick={() => setMaximized(!maximized)}><Square size={12}/></button>
          <button onClick={onClose}><X size={12}/></button>
        </div>
      </div>
      <div className="p-2 text-xs overflow-auto">{apps[app].content}</div>
    </div>
  );
}

function TerminalView() {
  const [lines, setLines] = useState(["fakeOS$ help"]);
  const [input, setInput] = useState("");

  const run = (cmd) => {
    if (cmd === "help") setLines([...lines, "commands: help, about, projects"]);
    else if (cmd === "about") setLines([...lines, "This portfolio runs on React + R3F"]);
    else if (cmd === "projects") setLines([...lines, "Opening Projects…"] );
    else setLines([...lines, `command not found: ${cmd}`]);
  };

  return (
    <div className="font-mono text-green-400">
      {lines.map((l, i) => <div key={i}>{l}</div>)}
      <form onSubmit={(e) => {e.preventDefault(); run(input); setInput("");}}>
        <span className="text-white">fakeOS$ </span>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          className="bg-transparent outline-none border-b border-green-400 text-white"/>
      </form>
    </div>
  );
}

export default function FakeOSDesktop() {
  const [openApps, setOpenApps] = useState(["about", "projects"]);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-black to-slate-800">
      {openApps.map((id) => (
        <Window key={id} app={id} onClose={() => setOpenApps(openApps.filter(a => a!==id))}/>
      ))}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-slate-800 flex gap-2 px-2 items-center text-xs">
        {Object.keys(apps).map((id) => (
          <button key={id} onClick={() => !openApps.includes(id) && setOpenApps([...openApps, id])}>
            {apps[id].title}
          </button>
        ))}
      </div>
    </div>
  );
}
