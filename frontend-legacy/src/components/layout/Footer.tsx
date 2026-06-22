import React from 'react';
import './Footer.css';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = "" }) => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { name: 'GitHub', url: 'https://github.com/xirichuyi', icon: 'code' },
    { name: 'Telegram', url: 'https://t.me/xrcy97', icon: 'chat' }
  ];

  return (
    <footer className={`footer ${className}`}>
      <div className="footer-container">
        <div className="footer-content">
          <span className="footer-copyright">
            © {currentYear} Chuyi. Built with ❤️ using React & Material Design.
          </span>
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
      </div>
    </footer>
  );
};

export default Footer;
