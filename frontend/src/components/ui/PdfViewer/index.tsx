import React, { useState } from 'react';
import './PdfViewer.css';

interface PdfViewerProps {
  pdfUrl: string;
  title?: string;
  className?: string;
  height?: number;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfUrl,
  title = 'PDF文档',
  className = '',
  height = 800,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const handleFullscreen = () => {
    if (!iframeRef.current) return;

    if (!isFullscreen) {
      // 进入全屏
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      } else if ((iframeRef.current as any).webkitRequestFullscreen) {
        (iframeRef.current as any).webkitRequestFullscreen();
      } else if ((iframeRef.current as any).mozRequestFullScreen) {
        (iframeRef.current as any).mozRequestFullScreen();
      } else if ((iframeRef.current as any).msRequestFullscreen) {
        (iframeRef.current as any).msRequestFullscreen();
      }
    } else {
      // 退出全屏
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  // 监听全屏状态变化
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement)
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // 构建完整的PDF URL（如果只是文件名，需要添加前缀）
  const fullPdfUrl = pdfUrl.startsWith('http') || pdfUrl.startsWith('/')
    ? pdfUrl
    : `/uploads/pdfs/${pdfUrl}`;

  return (
    <div className={`pdf-viewer ${className}`}>
      <div className="pdf-viewer__toolbar">
        <span className="pdf-viewer__title">{title}</span>
        <button
          className="pdf-viewer__fullscreen-btn"
          onClick={handleFullscreen}
          title={isFullscreen ? '退出全屏' : '全屏查看'}
        >
          {isFullscreen ? '⤓' : '⤢'}
        </button>
      </div>
      <div
        className="pdf-viewer__content"
        style={{ height: `${height}px` }}
      >
        <iframe
          ref={iframeRef}
          src={fullPdfUrl}
          className="pdf-viewer__iframe"
          title={title}
          allow="fullscreen"
        />
      </div>
    </div>
  );
};

export default PdfViewer;
