import React, { useState, useRef, useEffect } from 'react';
import '@material/web/all.js';
import './ClassicalMusicPlayer.css';

interface Track {
  id: number;
  title: string;
  artist: string;
  duration: string;
  src: string;
  cover?: string;
}

const tracks: Track[] = [
  {
    id: 1,
    title: 'Neon Dreams',
    artist: 'Synthwave Collective',
    duration: '3:42',
    src: '/audio/neon-dreams.mp3',
    cover: '🌆'
  },
  {
    id: 2,
    title: 'Digital Horizon',
    artist: 'Cyber Orchestra',
    duration: '4:15',
    src: '/audio/digital-horizon.mp3',
    cover: '🌌'
  },
  {
    id: 3,
    title: 'Electric Pulse',
    artist: 'Future Beats',
    duration: '3:28',
    src: '/audio/electric-pulse.mp3',
    cover: '⚡'
  }
];

const ClassicalMusicPlayer: React.FC = () => {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (currentTrack < tracks.length - 1) {
        setCurrentTrack(currentTrack + 1);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.7; // Fixed volume
    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % tracks.length);
  };

  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  return (
    <div className="futuristic-player">
      <audio
        ref={audioRef}
        src={tracks[currentTrack]?.src}
        preload="metadata"
      />

      {/* Main Player Container */}
      <div className="player-container">
        {/* Album Art with Audio Bars - 黄金分割上部分 */}
        <div className="album-art-container">
          <div className="album-art">
            {tracks[currentTrack]?.cover || '🌆'}

            {/* Audio Visualizer Bars - Only show when playing */}
            <div className={`audio-bars ${isPlaying ? 'playing' : ''}`}>
              <div className="audio-bar"></div>
              <div className="audio-bar"></div>
              <div className="audio-bar"></div>
              <div className="audio-bar"></div>
              <div className="audio-bar"></div>
              <div className="audio-bar"></div>
              <div className="audio-bar"></div>
              <div className="audio-bar"></div>
              <div className="audio-bar"></div>
              <div className="audio-bar"></div>
              <div className="audio-bar"></div>
              <div className="audio-bar"></div>
            </div>
          </div>
        </div>

        {/* Content Section - 黄金分割下部分 */}
        <div className="content-section">
          {/* Track Info */}
          <div className="track-info">
            <h2 className="track-title">{tracks[currentTrack]?.title}</h2>
            <p className="track-artist">{tracks[currentTrack]?.artist}</p>
          </div>

          {/* Controls with Previous/Next */}
          <div className="controls-section">
            <button
              className="control-btn"
              onClick={prevTrack}
            >
              <md-icon>skip_previous</md-icon>
            </button>

            <button
              className="play-btn"
              onClick={togglePlay}
            >
              <md-icon>{isPlaying ? 'pause' : 'play_arrow'}</md-icon>
            </button>

            <button
              className="control-btn"
              onClick={nextTrack}
            >
              <md-icon>skip_next</md-icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassicalMusicPlayer;
