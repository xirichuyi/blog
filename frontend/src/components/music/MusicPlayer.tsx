import React, { useState, useRef, useEffect } from 'react';
import { formatDuration } from '../../utils/musicMetadata';
import type { MusicTrack } from '../../types';
import './MusicPlayer.css';

interface MusicPlayerProps {
  track: MusicTrack | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  className?: string;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  track,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Update audio element when track changes
  useEffect(() => {
    if (audioRef.current && track) {
      audioRef.current.src = track.fileUrl;
      audioRef.current.load();
    }
  }, [track]);

  // Handle play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Audio event handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const handleMuteToggle = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const handleEnded = () => {
    if (onNext) {
      onNext();
    }
  };

  if (!track) {
    return (
      <div className={`music-player empty ${className}`}>
        <div className="player-content">
          <md-icon class="music-icon">music_note</md-icon>
          <span className="md-typescale-body-medium">No track selected</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`music-player ${className}`}>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      <div className="player-content">
        {/* Track Info */}
        <div className="track-info">
          {track.coverUrl ? (
            <img src={track.coverUrl} alt={track.title} className="track-cover" />
          ) : (
            <div className="track-cover default">
              <md-icon>music_note</md-icon>
            </div>
          )}
          <div className="track-details">
            <h4 className="track-title md-typescale-title-medium">{track.title}</h4>
            <p className="track-artist md-typescale-body-medium">{track.artist}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="player-controls">
          {onPrevious && (
            <md-icon-button onClick={onPrevious}>
              <md-icon>skip_previous</md-icon>
            </md-icon-button>
          )}
          
          <md-icon-button onClick={onPlayPause} class="play-button">
            <md-icon>{isPlaying ? 'pause' : 'play_arrow'}</md-icon>
          </md-icon-button>
          
          {onNext && (
            <md-icon-button onClick={onNext}>
              <md-icon>skip_next</md-icon>
            </md-icon-button>
          )}
        </div>

        {/* Progress */}
        <div className="player-progress">
          <span className="time-current md-typescale-body-small">
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="progress-slider"
          />
          <span className="time-total md-typescale-body-small">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Volume */}
        <div className="player-volume">
          <md-icon-button onClick={handleMuteToggle}>
            <md-icon>
              {isMuted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
            </md-icon>
          </md-icon-button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
