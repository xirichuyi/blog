import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../../../services/api/base';
import { Button, Spin, Result } from 'antd';
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  DownloadOutlined,
  ExportOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
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
  height = 600,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Decode URL-encoded title
  const decodedTitle = React.useMemo(() => {
    try {
      // If title contains URL-encoded characters, decode it
      if (title.includes('%')) {
        return decodeURIComponent(title);
      }
      return title;
    } catch {
      return title;
    }
  }, [title]);

  // Build full PDF URL
  const fullPdfUrl = React.useMemo(() => {
    if (pdfUrl.startsWith('http')) {
      return pdfUrl;
    }
    if (pdfUrl.startsWith('/')) {
      return `${API_BASE_URL}${pdfUrl}`;
    }
    return `${API_BASE_URL}/uploads/pdfs/${pdfUrl}`;
  }, [pdfUrl]);

  // Handle fullscreen
  const handleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // Handle iframe error
  const handleIframeError = () => {
    setIsLoading(false);
    setLoadError(true);
  };

  // Retry loading
  const handleRetry = () => {
    setLoadError(false);
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = fullPdfUrl;
    }
  };

  // Open in new tab
  const handleOpenInNewTab = () => {
    window.open(fullPdfUrl, '_blank', 'noopener,noreferrer');
  };

  // Download PDF
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fullPdfUrl;
    link.download = decodedTitle.endsWith('.pdf') ? decodedTitle : `${decodedTitle}.pdf`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      ref={containerRef}
      className={`pdf-viewer-antd ${className} ${isFullscreen ? 'fullscreen' : ''}`}
    >
      {/* Toolbar */}
      <div className="pdf-viewer-toolbar">
        <span className="pdf-viewer-title" title={decodedTitle}>
          {decodedTitle.length > 50 ? decodedTitle.substring(0, 50) + '...' : decodedTitle}
        </span>
        <div className="pdf-viewer-actions">
          <Button
            type="text"
            icon={<ExportOutlined />}
            onClick={handleOpenInNewTab}
            title="在新标签页打开"
          />
          <Button
            type="text"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={handleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏查看'}
          />
        </div>
      </div>

      {/* Content */}
      <div
        className="pdf-viewer-content"
        style={{ height: isFullscreen ? 'calc(100vh - 100px)' : `${height}px` }}
      >
        {loadError ? (
          <Result
            status="warning"
            title="PDF 加载失败"
            subTitle="无法在此处显示PDF，请尝试在新窗口打开或下载"
            extra={[
              <Button key="retry" icon={<ReloadOutlined />} onClick={handleRetry}>
                重试
              </Button>,
              <Button key="open" type="primary" icon={<ExportOutlined />} onClick={handleOpenInNewTab}>
                在新窗口打开
              </Button>,
            ]}
          />
        ) : (
          <>
            {isLoading && (
              <div className="pdf-viewer-loading">
                <Spin size="large" tip="加载PDF中..." />
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={fullPdfUrl}
              className="pdf-viewer-iframe"
              title={decodedTitle}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ opacity: isLoading ? 0 : 1 }}
            />
          </>
        )}
      </div>

      {/* Download button */}
      <div className="pdf-viewer-footer">
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleDownload}
        >
          下载 PDF
        </Button>
      </div>
    </div>
  );
};

export default PdfViewer;
