import React, {useState} from "react";
import './MusicPlayer.css';

interface MusicPlayerProps {
  className?: string;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({className = ''}) => {
  const [liked, setLiked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(33);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleLike = () => {
    setLiked(!liked);
  };

  return (
    <md-elevated-card className={`music-player ${className}`}>
      <div className="music-player-content">
        <div className="music-player-media">
          <img
            src="https://heroui.com/images/album-cover.png"
            alt="Album cover"
            className="music-player-image"
          />
        </div>

        <div className="music-player-info">
          <div className="music-player-header">
            <div className="music-player-text">
              <h3 className="music-player-title md-typescale-title-medium">Daily Mix</h3>
              <p className="music-player-subtitle md-typescale-body-small">12 Tracks</p>
              <h1 className="music-player-artist md-typescale-title-large">Frontend Radio</h1>
            </div>
            <md-icon-button
              className="music-player-like-btn"
              onClick={handleLike}
              aria-label={liked ? "Unlike" : "Like"}
            >
              <md-icon>{liked ? 'favorite' : 'favorite_border'}</md-icon>
            </md-icon-button>
          </div>

          <div className="music-player-progress">
            <md-linear-progress
              value={progress}
              max={100}
              className="music-player-progress-bar"
            />
            <div className="music-player-time">
              <span className="md-typescale-body-small">1:23</span>
              <span className="md-typescale-body-small">4:32</span>
            </div>
          </div>

          <div className="music-player-controls">
            <md-icon-button aria-label="Repeat">
              <md-icon>repeat</md-icon>
            </md-icon-button>
            <md-icon-button aria-label="Previous">
              <md-icon>skip_previous</md-icon>
            </md-icon-button>
            <md-filled-icon-button
              className="music-player-play-btn"
              onClick={handlePlayPause}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              <md-icon>{isPlaying ? 'pause' : 'play_arrow'}</md-icon>
            </md-filled-icon-button>
            <md-icon-button aria-label="Next">
              <md-icon>skip_next</md-icon>
            </md-icon-button>
            <md-icon-button aria-label="Shuffle">
              <md-icon>shuffle</md-icon>
            </md-icon-button>
          </div>
        </div>
      </div>
    </md-elevated-card>
  );
};
