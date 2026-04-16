import { useEffect, useRef } from 'react';
import './loader.css';

// Pixel-block rain animation — cyberpunk data-stream aesthetic
function usePixelRain(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const BLOCK  = 14;
    const TRAIL  = 8;

    let cols, heads, speeds, tails;

    const init = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      cols   = Math.ceil(canvas.width  / BLOCK);
      heads  = Array.from({ length: cols }, () => -Math.random() * (canvas.height / BLOCK));
      speeds = Array.from({ length: cols }, () => 0.25 + Math.random() * 0.55);
      tails  = Array.from({ length: cols }, () => 0); // brightness memory
    };

    init();
    window.addEventListener('resize', init);

    // Colour palette: cyan head → purple mid → dark teal tail
    const C = {
      head:  [  0, 220, 255 ],
      mid:   [ 80,  40, 180 ],
      tail:  [  0,  30,  60 ],
    };

    const lerp = (a, b, t) => a + (b - a) * t;

    let raf;
    const draw = () => {
      // Persistent fade — keeps ghost trails
      ctx.fillStyle = 'rgba(5,10,16,0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const rows = Math.ceil(canvas.height / BLOCK);

      heads.forEach((h, c) => {
        const x  = c * BLOCK;
        const hr = Math.floor(h);

        for (let t = 0; t <= TRAIL; t++) {
          const row = hr - t;
          if (row < 0 || row >= rows) continue;
          const y   = row * BLOCK;
          const fac = 1 - t / TRAIL; // 1 at head, 0 at tail

          const r = Math.round(lerp(C.tail[0], t === 0 ? C.head[0] : C.mid[0], fac));
          const g = Math.round(lerp(C.tail[1], t === 0 ? C.head[1] : C.mid[1], fac));
          const b = Math.round(lerp(C.tail[2], t === 0 ? C.head[2] : C.mid[2], fac));
          const a = fac * (t === 0 ? 1.0 : 0.75);

          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
          ctx.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);

          // Head glow
          if (t === 0 && row >= 0) {
            ctx.shadowColor = '#00d4ff';
            ctx.shadowBlur  = 10;
            ctx.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
            ctx.shadowBlur  = 0;
          }
        }

        heads[c] += speeds[c];
        if (heads[c] - TRAIL > rows) {
          heads[c]  = -Math.random() * rows * 0.4;
          speeds[c] = 0.25 + Math.random() * 0.55;
        }
      });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', init); };
  }, []);
}

const STATUS_MSGS = [
  'INITIALIZING RUNTIME…',
  'LOADING SCENE ASSETS…',
  'CALIBRATING NEURAL LINK…',
  'SPAWNING COMPANION AI…',
  'FINALIZING SYSTEMS…',
];

export default function Loader({ progress, vrmPreloaded, onEnter }) {
  const canvasRef = useRef(null);
  usePixelRain(canvasRef);

  const isComplete = progress >= 100 && vrmPreloaded;
  const pct        = Math.min(Math.round(progress), 100);
  const statusIdx  = Math.min(Math.floor(pct / 20), STATUS_MSGS.length - 1);

  return (
    <div id="loading-overlay">
      <canvas ref={canvasRef} id="cp-canvas" />

      {/* Corner brackets */}
      <div className="cp-corner tl" />
      <div className="cp-corner tr" />
      <div className="cp-corner bl" />
      <div className="cp-corner br" />

      {/* Horizontal accent lines */}
      <div className="cp-rule top" />
      <div className="cp-rule bottom" />

      <div className="loader-content">
        <div className="cp-title">TIMESHOT</div>
        <div className="cp-subtitle">PORTFOLIO.EXE &nbsp;// &nbsp;v2.0</div>

        {!isComplete ? (
          <div className="progress-wrap">
            <div className="progress-label">
              <span>SYS LOAD</span>
              <span>{pct}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="progress-status" key={statusIdx}>
              {pct >= 100 ? 'FINALIZING SYSTEMS…' : STATUS_MSGS[statusIdx]}
            </div>
          </div>
        ) : (
          <button className="enter-btn" onClick={onEnter}>
            <span>◈ &nbsp;JACK IN &nbsp;◈</span>
          </button>
        )}
      </div>
    </div>
  );
}
