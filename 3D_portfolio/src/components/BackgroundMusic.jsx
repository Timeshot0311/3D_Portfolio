import { useRef, useEffect, useState } from 'react';

export default function BackgroundMusic() {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;

    const tryPlay = () => {
      audio.play().catch((err) => {
        console.warn('Autoplay blocked:', err);
      });
    };

    document.addEventListener('click', tryPlay, { once: true });

    return () => {
      document.removeEventListener('click', tryPlay);
    };
  }, []);

  const toggleMute = () => {
    const audio = audioRef.current;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  return (
    <>
      <audio ref={audioRef} src="/music/bgm.mp3" loop autoPlay />
      <button
        onClick={toggleMute}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 10000,
          background: '#222',
          color: '#fff',
          border: 'none',
          padding: '8px 12px',
          cursor: 'pointer',
          borderRadius: '4px',
        }}
      >
        {muted ? '🔇 Unmute' : '🔊 Mute'}
      </button>
    </>
  );
}
