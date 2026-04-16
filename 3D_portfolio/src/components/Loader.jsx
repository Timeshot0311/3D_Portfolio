import './loader.css';

export default function Loader({ progress, vrmPreloaded, onEnter }) {
  const isComplete = progress >= 100 && vrmPreloaded;
  const pct = Math.min(Math.round(progress), 100);

  return (
    <div id="loading-overlay">
      <img
        id="loader-bg"
        src="/loading/peakpx.jpg"
        alt="Loading background"
      />
      <div className="loader-content">
        {!isComplete ? (
          <>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div style={{ color: '#a78bfa', fontSize: 12, marginTop: 8, fontFamily: 'system-ui' }}>
              {pct < 100 ? `Loading… ${pct}%` : 'Finishing up…'}
            </div>
          </>
        ) : (
          <button className="enter-btn" onClick={onEnter}>
            Enter
          </button>
        )}
      </div>
    </div>
  );
}
