import React from 'react';
import './BlogHome.css';

const BlogHome: React.FC = () => {
  // Static featured articles data
  const featuredArticles = [
    {
      id: 'motion-physics',
      title: "Adding Motion Physics with Jetpack Compose",
      description: "Supercharge your Android transitions and animations with the new M3 Expressive motion theming system.",
      date: "May 20, 2025",
      gradient: "linear-gradient(135deg, #E1BEE7 0%, #F8BBD9 100%)"
    },
    {
      id: 'xr-preview',
      title: "Material Design for XR (Developer Preview)",
      description: "Building UI that adapts for XR with familiar frameworks and tools",
      date: "Dec 12, 2024",
      gradient: "linear-gradient(135deg, #B8C5D1 0%, #D6E3F0 100%)"
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
              <div key={article.id} className="featured-article-card" style={{ background: article.gradient }}>
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
