"use client";
import React, { useEffect, useRef, useState } from "react";

/** Load a <script src="..."> once and resolve when it’s ready */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    // Reuse if already loaded
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (window.V86Starter) return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", (e) => reject(e));
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = (e) => reject(e);
    document.head.appendChild(el);
  });
}

export default function EmulatorV86() {
  const screenRef = useRef(null);
  const [status, setStatus] = useState("Preparing…");

  useEffect(() => {
    let starter = null;
    let mounted = true;

    (async () => {
      try {
        setStatus("Booting…");
        // Load the public script as a global (NOT an import)
        // This must point to public/v86/libv86.js
        await loadScript("/v86/libv86.js");

        if (!mounted) return;
        if (typeof window.V86Starter !== "function") {
          throw new Error("V86Starter global not found after loading libv86.js");
        }

        // Create the emulator
        starter = new window.V86Starter({
          wasm_path: "/v86/v86.wasm",
          memory_size: 64 * 1024 * 1024,
          vga_memory_size: 2 * 1024 * 1024,
          screen_container: screenRef.current,
          autostart: true,
          bios: { url: "/v86/bios/seabios.bin" },
          vga_bios: { url: "/v86/bios/vgabios.bin" },
          cdrom: { url: "/v86/images/TinyCore-current.iso" },
          // boot_order: 0x132, // optional
        });

        setStatus("Running");
      } catch (err) {
        console.error(err);
        setStatus("Error");
      }
    })();

    return () => {
      mounted = false;
      if (starter && starter.stop) {
        try { starter.stop(); } catch {}
      }
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-black text-white text-xs">
      <div className="px-2 py-1 bg-slate-800 border-b border-slate-700 flex justify-between">
        <span>Emulator</span>
        <span>{status}</span>
      </div>
      <div ref={screenRef} className="flex-1 overflow-hidden" />
      <div className="px-2 py-1 bg-slate-800 border-t border-slate-700">
        <button onClick={() => window.location.reload()} className="px-2 py-1 bg-slate-600 rounded">
          Reset
        </button>
      </div>
    </div>
  );
}
