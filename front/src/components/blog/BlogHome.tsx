import React from 'react';
import './BlogHome.css';

const BlogHome: React.FC = () => {
  // Static featured articles data
  const featuredArticles = [
    {
      id: 'motion-physics',
      title: "Start building with Material 3 Expressive",
      description: "Material's latest evolution helps you make products even more engaging and easier to use.",
      date: "May 13, 2025",
      gradient: "linear-gradient(135deg, #E1BEE7 0%, #F8BBD9 100%)",
      imageCollage: [
        { type: 'app-ui', color: '#6750A4' },
        { type: 'design-system', color: '#7C4DFF' },
        { type: 'components', color: '#9C27B0' },
        { type: 'mobile-ui', color: '#673AB7' }
      ]
    }
  ];

  const latestReleases = [
    {
      id: 'release-1',
      title: "Material Design Components 1.12.0",
      description: "New components and improvements for better accessibility",
      date: "Jan 15, 2025",
      version: "1.12.0"
    },
    {
      id: 'release-2',
      title: "Material Theme Builder Update",
      description: "Enhanced color palette generation and export options",
      date: "Jan 10, 2025",
      version: "2.1.0"
    }
  ];

  const years = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018'];

  return (
    <div className="blog-home">
      <div className="blog-main-content">
        {/* Featured Articles Grid */}
        <section className="blog-featured-section">
          <div className="blog-featured-grid">
            {featuredArticles.map((article) => (
              <div key={article.id} className="featured-article-card">
                {/* Left side - Image collage area */}
                <div className="featured-article-image-area">
                  <div className="image-collage-grid">
                    {article.imageCollage?.map((item, index) => (
                      <div
                        key={index}
                        className={`collage-item collage-item-${index + 1}`}
                        style={{ backgroundColor: item.color }}
                      >
                        <div className="collage-content">
                          {/* Placeholder for app UI mockups */}
                          <div className="ui-mockup">
                            <div className="mockup-header"></div>
                            <div className="mockup-content"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right side - Content area */}
                <div className="featured-article-content">
                  <div className="featured-article-meta">
                    <span className="featured-article-date">{article.date}</span>
                  </div>
                  <h2 className="featured-article-title">{article.title}</h2>
                  <p className="featured-article-description">{article.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Latest Releases Section */}
        <section className="blog-releases-section">
          <h2 className="blog-section-title">Latest releases</h2>
          <div className="blog-releases-grid">
            {latestReleases.map((release) => (
              <div key={release.id} className="release-card">
                <div className="release-card-content">
                  <div className="release-meta">
                    <span className="release-date">{release.date}</span>
                    <span className="release-version">{release.version}</span>
                  </div>
                  <h3 className="release-title">{release.title}</h3>
                  <p className="release-description">{release.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Right Sidebar */}
      <aside className="blog-sidebar">
        <div className="sidebar-section">
          <h3 className="sidebar-title">On this page</h3>
          <div className="sidebar-content">
            <p className="sidebar-page-title">Material Design Blog</p>
            <div className="sidebar-tag">Featured</div>
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-title">Latest releases</h3>
          <div className="sidebar-years">
            {years.map((year) => (
              <button key={year} className="sidebar-year-button">
                {year}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default BlogHome;
