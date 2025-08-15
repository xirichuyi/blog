import React, { useState } from 'react';
import './RadioCard.css';

interface RadioCardProps {
  className?: string;
}

const RadioCard: React.FC<RadioCardProps> = ({ className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // 电台信息
  const radioInfo = {
    title: "下午茶",
    subtitle: "慢慢来点儿音乐推荐神吧",
    coverImage: "/images/radio-cover.jpg", // 封面图片
    backgroundColor: "#C8B3FD" // 背景色
  };

  const handlePlayClick = () => {
    setIsPlaying(!isPlaying);
    // 这里可以添加实际的播放逻辑
    console.log(isPlaying ? 'Pausing radio...' : 'Playing radio...');
  };

  return (
    <div
      className={`radio-card ${className} ${isPlaying ? 'playing' : ''}`}
      style={{ backgroundColor: radioInfo.backgroundColor }}
    >
      <div className="radio-content">
        {/* 左侧文本内容 */}
        <div className="radio-text">
          <h3 className="radio-title">{radioInfo.title}</h3>
          <p className="radio-subtitle">{radioInfo.subtitle}</p>
          
          {/* 播放按钮 */}
          <md-fab
            className="radio-play-button"
            size="small"
            variant="primary"
            onClick={handlePlayClick}
            aria-label={isPlaying ? "Pause radio" : "Play radio"}
          >
            <md-icon slot="icon">{isPlaying ? 'pause' : 'play_arrow'}</md-icon>
          </md-fab>
        </div>

        {/* 右侧音乐图标 */}
        <div className="radio-music-icon">
          <md-icon className="music-note-icon">music_note</md-icon>
        </div>
      </div>
    </div>
  );
};

export default RadioCard;
