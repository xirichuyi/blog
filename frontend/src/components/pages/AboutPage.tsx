import React from 'react';
import './AboutPage.css';

const AboutPage: React.FC = () => {


  return (
    <div className="about-page">
      {/* Hero Section - Left Right Layout */}
      <section className="about-hero">
        <div className="about-hero-content">
          {/* Left Side - Content */}
          <div className="about-content">
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
            <p className="about-description md-typescale-body-large">
              With years of experience in both frontend and backend development, I enjoy
              building scalable solutions and exploring the latest trends in web technology.
              This blog serves as a platform to share my insights, tutorials, and discoveries
              in the ever-evolving world of software development.
            </p>

          </div>

          {/* Right Side - Photo */}
          <div className="about-photo">
            <div className="photo-container">
              <img
                src="/api/placeholder/300/400"
                alt="Cyrus - Full-Stack Developer"
                className="profile-photo"
              />
              <div className="photo-overlay">
                <md-icon className="camera-icon">photo_camera</md-icon>
              </div>
            </div>
          </div>
        </div>
      </section>




    </div>
  );
};

export default AboutPage;
