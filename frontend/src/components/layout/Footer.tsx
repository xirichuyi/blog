import React from 'react';
import './Footer.css';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = "" }) => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    about: [
      { label: 'About Material', href: '/about' },
      { label: 'Design Guidelines', href: '/guidelines' },
      { label: 'Accessibility', href: '/accessibility' },
      { label: 'Research', href: '/research' }
    ],
    develop: [
      { label: 'Getting Started', href: '/get-started' },
      { label: 'Components', href: '/components' },
      { label: 'Tokens', href: '/tokens' },
      { label: 'GitHub', href: 'https://github.com/material-components' }
    ],
    resources: [
      { label: 'Blog', href: '/blog' },
      { label: 'Case Studies', href: '/case-studies' },
      { label: 'Community', href: '/community' },
      { label: 'Support', href: '/support' }
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' }
    ]
  };

  return (
    <footer className={`footer ${className}`}>
      <div className="footer-container">
        {/* Main Footer Content */}
        <div className="footer-main">
          {/* Brand Section */}
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="footer-logo-icon">design_services</span>
              <span className="footer-logo-text">Material Design</span>
            </div>
            <p className="footer-description">
              Build beautiful, usable products with Material Design
            </p>
            <div className="footer-social">
              <a href="https://twitter.com/materialdesign" className="footer-social-link" aria-label="Twitter">
                <span className="material-symbols-outlined">alternate_email</span>
              </a>
              <a href="https://github.com/material-components" className="footer-social-link" aria-label="GitHub">
                <span className="material-symbols-outlined">code</span>
              </a>
              <a href="https://medium.com/google-design" className="footer-social-link" aria-label="Medium">
                <span className="material-symbols-outlined">article</span>
              </a>
            </div>
          </div>

          {/* Links Sections */}
          <div className="footer-links">
            <div className="footer-links-section">
              <h3 className="footer-links-title">About</h3>
              <ul className="footer-links-list">
                {footerLinks.about.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="footer-link">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-links-section">
              <h3 className="footer-links-title">Develop</h3>
              <ul className="footer-links-list">
                {footerLinks.develop.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="footer-link">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-links-section">
              <h3 className="footer-links-title">Resources</h3>
              <ul className="footer-links-list">
                {footerLinks.resources.map((link, index) => (
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
              © {currentYear} Google LLC. All rights reserved.
            </span>
            <div className="footer-legal-links">
              {footerLinks.legal.map((link, index) => (
                <a key={index} href={link.href} className="footer-legal-link">
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="footer-bottom-right">
            <div className="footer-language">
              <button className="footer-language-button">
                <span className="material-symbols-outlined">language</span>
                <span>English</span>
                <span className="material-symbols-outlined">expand_more</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
