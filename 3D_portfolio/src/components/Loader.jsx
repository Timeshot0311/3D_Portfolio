import './loader.css';

export default function Loader({ progress, onEnter }) {
  const isComplete = progress >= 100;

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
                style={{ width: `${progress}%` }}
              />
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
