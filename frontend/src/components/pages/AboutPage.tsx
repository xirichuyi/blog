import React from 'react';
import './AboutPage.css';

const AboutPage: React.FC = () => {
  const skills = [
    { name: 'React', icon: 'code' },
    { name: 'TypeScript', icon: 'code' },
    { name: 'Rust', icon: 'memory' },
    { name: 'Node.js', icon: 'dns' },
    { name: 'Python', icon: 'psychology' },
    { name: 'UI/UX Design', icon: 'palette' },
  ];

  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-hero-content">
          <div className="about-avatar">
            <md-icon className="avatar-icon">person</md-icon>
          </div>
          <div className="about-intro">
            <h1 className="about-title md-typescale-display-medium">
              Hi, I'm Cyrus
            </h1>
            <p className="about-subtitle md-typescale-headline-small">
              Full-Stack Developer & Tech Enthusiast
            </p>
            <p className="about-description md-typescale-body-large">
              Passionate about creating innovative web applications and sharing knowledge 
              through this blog. I love exploring new technologies, especially Rust, React, 
              and modern web development practices.
            </p>

          </div>
        </div>
      </section>

      {/* About Blog Section */}
      <section className="about-section">
        <div className="section-header">
          <h2 className="section-title md-typescale-headline-large">About This Blog</h2>
          <p className="section-subtitle md-typescale-body-large">
            I write about web development, share tutorials, and document my learning journey with modern technologies like React, TypeScript, and Rust.
          </p>
        </div>
      </section>

      {/* Skills Section */}
      <section className="about-section">
        <div className="section-header">
          <h2 className="section-title md-typescale-headline-large">Technologies I Use</h2>
        </div>
        <div className="skills-simple">
          {skills.map((skill, index) => (
            <span key={index} className="skill-tag">
              {skill.name}
            </span>
          ))}
        </div>
      </section>


    </div>
  );
};

export default AboutPage;
