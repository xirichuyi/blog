import React from 'react';
import './BlogHome.css';

const BlogHome: React.FC = () => {
  // 所有帖子数据 - 首页显示前7个
  const allPosts = [
    {
      id: 'post-1',
      title: "Start building with Material 3 Expressive",
      description: "Material's latest evolution helps you make products even more engaging and easier to use.",
      date: "Jan 20, 2025",
      gradient: "linear-gradient(135deg, #E1BEE7 0%, #F8BBD9 100%)",
      imageCollage: [
        { type: 'app-ui', color: '#6750A4' },
        { type: 'design-system', color: '#7C4DFF' },
        { type: 'components', color: '#9C27B0' },
        { type: 'mobile-ui', color: '#673AB7' }
      ]
    },
    {
      id: 'post-2',
      title: "Adding Motion Physics with Jetpack Compose",
      description: "Supercharge your Android transitions and animations with the new M3 Expressive motion theming system.",
      date: "Jan 15, 2025",
      gradient: "linear-gradient(135deg, #E1BEE7 0%, #F8BBD9 100%)"
    },
    {
      id: 'post-3',
      title: "Material Design for XR (Developer Preview)",
      description: "Building UI that adapts for XR with familiar frameworks and tools",
      date: "Jan 10, 2025",
      gradient: "linear-gradient(135deg, #B8C5D1 0%, #D6E3F0 100%)"
    },
    {
      id: 'post-4',
      title: "Material Design Components 1.12.0",
      description: "New components and improvements for better accessibility and developer experience",
      date: "Jan 5, 2025",
      gradient: "linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)"
    },
    {
      id: 'post-5',
      title: "Material Theme Builder Update",
      description: "Enhanced color palette generation and export options for design systems",
      date: "Dec 28, 2024",
      gradient: "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)"
    },
    {
      id: 'post-6',
      title: "Accessibility in Material Design",
      description: "Best practices for creating inclusive user interfaces with Material Design",
      date: "Dec 20, 2024",
      gradient: "linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)"
    },
    {
      id: 'post-7',
      title: "Design Tokens for Cross-Platform Consistency",
      description: "How to use design tokens to maintain consistency across web, mobile, and desktop",
      date: "Dec 15, 2024",
      gradient: "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)"
    }
  ];

  // 分配帖子到不同区域
  const featuredArticles = [allPosts[0]]; // 第1个帖子
  const secondaryArticles = allPosts.slice(1, 7); // 第2-7个帖子都使用secondary样式

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

        {/* Secondary Articles Section */}
        <section className="blog-secondary-section">
          <div className="blog-secondary-grid">
            {secondaryArticles.map((article) => (
              <div key={article.id} className="secondary-article-card">
                {/* 上方图片区域 */}
                <div className="secondary-article-image" style={{ background: article.gradient }}>
                  <div className="secondary-article-visual-content">
                    {/* 这里可以放置UI截图、设计图等视觉内容 */}
                    <div className="visual-placeholder">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
                {/* 下方内容区域 */}
                <div className="secondary-article-content">
                  <div className="secondary-article-meta">
                    <span className="secondary-article-date">{article.date}</span>
                  </div>
                  <h3 className="secondary-article-title">{article.title}</h3>
                  <p className="secondary-article-description">{article.description}</p>
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
