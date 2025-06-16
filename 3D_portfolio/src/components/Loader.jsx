// src/components/Loader.jsx
import { useProgress } from '@react-three/drei';
import './loader.css';

export default function Loader() {
  const { progress } = useProgress();

  return (
    <div id="loading-overlay">
      <img
        id="loader-bg"
        src="/loading/peakpx.jpg"
        alt="Loading background"
      />
      <div className="loader-content">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p>{Math.floor(progress)}%</p>
      </div>
    </div>
  );
}
