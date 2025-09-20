import React from 'react';
import './AuthorCard.css';

interface AuthorCardProps {
    className?: string;
}

const AuthorCard: React.FC<AuthorCardProps> = ({ className = '' }) => {
    // 作者信息数据 - 可以后续从props或context中获取
    const authorInfo = {
        name: "chuyi",
        title: "Full Stack Developer & UI/UX Designer",
        bio: "Passionate about creating beautiful and functional web experiences with modern technologies. Specializing in React, TypeScript, and Material Design.",
        avatar: "", // 头像图片路径 - 留空使用默认头像
        location: "San Francisco, CA",
        experience: "5+ years",
        socialLinks: {
            github: "https://github.com/xirichuyi",
            telegram: "https://t.me/xrcy97",
            linkedin: "https://www.linkedin.com/in/%E5%88%9D%E4%B8%80-%E6%98%94%E6%97%A5-223012366/",
            linuxdo: "https://linux.do/u/xirichuyi/summary",
            email: "xrcy123@gmail.com"
        },
        stats: {
            articles: 42,
            followers: 1200,
            likes: 3400
        }
    };

    const handleSocialClick = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleEmailClick = () => {
        window.location.href = `mailto:${authorInfo.socialLinks.email}`;
    };

    return (
        <md-elevated-card className={`author-card ${className}`}>
            <div className="author-card-content">
                {/* 头像和基本信息 */}
                <div className="author-header">
                    <div className="author-avatar">
                        {authorInfo.avatar ? (
                            <img
                                src={authorInfo.avatar}
                                alt={authorInfo.name}
                                onError={(e) => {
                                    // 如果头像加载失败，隐藏图片显示默认图标
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    const parent = (e.target as HTMLImageElement).parentElement;
                                    if (parent && !parent.querySelector('.default-avatar-icon')) {
                                        const icon = document.createElement('md-icon');
                                        icon.className = 'default-avatar-icon';
                                        icon.textContent = 'person';
                                        parent.appendChild(icon);
                                    }
                                }}
                            />
                        ) : (
                            <md-icon className="default-avatar-icon">person</md-icon>
                        )}
                    </div>
                    <div className="author-info">
                        <h3 className="author-name md-typescale-title-large">{authorInfo.name}</h3>
                        <p className="author-title md-typescale-body-medium">{authorInfo.title}</p>
                    </div>
                </div>



                {/* 社交媒体链接 */}
                <div className="author-social">
                    <md-icon-button
                        className="social-button"
                        onClick={() => handleSocialClick(authorInfo.socialLinks.github)}
                        aria-label="GitHub Profile"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                        </svg>
                    </md-icon-button>

                    <md-icon-button
                        className="social-button"
                        onClick={() => handleSocialClick(authorInfo.socialLinks.telegram)}
                        aria-label="Telegram Profile"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-.962 6.502-.812 1.424-1.204 1.424-1.504 1.424-.696-.002-1.624-.58-2.572-1.113l-1.74-1.229c-.693-.436-1.121-.783-.926-1.237.105-.244.331-.462 1.12-1.195l2.867-2.555c.393-.349.233-.464-.124-.464-.288 0-.694.327-1.153.662l-3.735 2.49-.947-.299s-.31-.137-.31-.423c0-.286.353-.46.353-.46l9.177-3.635s.848-.361.848.097z" />
                        </svg>
                    </md-icon-button>

                    <md-icon-button
                        className="social-button"
                        onClick={() => handleSocialClick(authorInfo.socialLinks.linkedin)}
                        aria-label="LinkedIn Profile"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                    </md-icon-button>

                    <md-icon-button
                        className="social-button"
                        onClick={() => handleSocialClick(authorInfo.socialLinks.linuxdo)}
                        aria-label="Linux.do Profile"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                        </svg>
                    </md-icon-button>

                    <md-icon-button
                        className="social-button"
                        onClick={handleEmailClick}
                        aria-label="Email Contact"
                    >
                        <md-icon>mail</md-icon>
                    </md-icon-button>
                </div>


            </div>
        </md-elevated-card>
    );
};

export default AuthorCard;
