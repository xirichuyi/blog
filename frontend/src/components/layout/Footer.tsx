import React from 'react';
import './Footer.css';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = "" }) => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { name: 'GitHub', url: 'https://github.com/xirichuyi', icon: 'code' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/%E5%88%9D%E4%B8%80-%E6%98%94%E6%97%A5-223012366/', icon: 'work' },
    { name: 'Telegram', url: 'https://t.me/xrcy97', icon: 'chat' },
    { name: 'Linux.do', url: 'https://linux.do/u/xirichuyi/summary', icon: 'forum' }
  ];

  const quickLinks = [
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Projects', href: '/projects' },
    { label: 'Contact', href: '/contact' }
  ];

  return (
    <footer className={`footer ${className}`}>
      <div className="footer-container">
        {/* Main Footer Content */}
        <div className="footer-main">
          {/* Brand Section */}
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="footer-logo-icon">person</span>
              <span className="footer-logo-text">Chuyi's Blog</span>
            </div>
            <p className="footer-description">
              Full-Stack Developer & Tech Enthusiast sharing thoughts on technology, development, and life.
            </p>
            <div className="footer-social">
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  className="footer-social-link"
                  aria-label={link.name}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="material-symbols-outlined">{link.icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-links">
            <div className="footer-links-section">
              <h3 className="footer-links-title">Quick Links</h3>
              <ul className="footer-links-list">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="footer-link">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <span className="footer-copyright">
              © {currentYear} Chuyi. Built with ❤️ using React & Material Design.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
