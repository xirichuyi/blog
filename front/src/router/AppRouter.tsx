import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import BlogHome from '../components/blog/BlogHome';
import ArticleDetail from '../components/blog/ArticleDetail';
import ErrorBoundary from '../components/ui/ErrorBoundary';

// Placeholder components for other routes
const ArticlesPage: React.FC = () => (
  <div className="page-placeholder">
    <h1 className="md-typescale-display-small">All Articles</h1>
    <p className="md-typescale-body-large">Browse all articles in the blog.</p>
  </div>
);

const CategoriesPage: React.FC = () => (
  <div className="page-placeholder">
    <h1 className="md-typescale-display-small">Categories</h1>
    <p className="md-typescale-body-large">Explore articles by category.</p>
  </div>
);

const TagsPage: React.FC = () => (
  <div className="page-placeholder">
    <h1 className="md-typescale-display-small">Tags</h1>
    <p className="md-typescale-body-large">Find articles by tags.</p>
  </div>
);

const AboutPage: React.FC = () => (
  <div className="page-placeholder">
    <h1 className="md-typescale-display-small">About</h1>
    <p className="md-typescale-body-large">Learn more about this blog and its author.</p>
  </div>
);

const ContactPage: React.FC = () => (
  <div className="page-placeholder">
    <h1 className="md-typescale-display-small">Contact</h1>
    <p className="md-typescale-body-large">Get in touch with us.</p>
  </div>
);

const NotFoundPage: React.FC = () => (
  <div className="page-placeholder">
    <md-icon style={{ fontSize: '64px', color: 'var(--md-sys-color-error)', marginBottom: 'var(--md-sys-spacing-4)' }}>
      error_outline
    </md-icon>
    <h1 className="md-typescale-display-small">Page Not Found</h1>
    <p className="md-typescale-body-large">The page you're looking for doesn't exist.</p>
    <md-filled-button onClick={() => window.history.back()}>
      <md-icon slot="icon">arrow_back</md-icon>
      Go Back
    </md-filled-button>
  </div>
);

// Article Detail Route Component
const ArticleDetailRoute: React.FC = () => {
  const articleId = window.location.pathname.split('/').pop() || '1';
  
  const handleBack = () => {
    window.history.back();
  };

  return (
    <ArticleDetail 
      articleId={articleId} 
      onBack={handleBack}
    />
  );
};

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {/* Main Layout Routes */}
          <Route path="/" element={
            <Layout title="Cyrus Blog - Modern Web Development & Design">
              <BlogHome />
            </Layout>
          } />
          
          <Route path="/articles" element={
            <Layout title="All Articles - Cyrus Blog">
              <ArticlesPage />
            </Layout>
          } />
          
          <Route path="/article/:id" element={
            <Layout title="Article - Cyrus Blog">
              <ArticleDetailRoute />
            </Layout>
          } />
          
          <Route path="/categories" element={
            <Layout title="Categories - Cyrus Blog">
              <CategoriesPage />
            </Layout>
          } />
          
          <Route path="/tags" element={
            <Layout title="Tags - Cyrus Blog">
              <TagsPage />
            </Layout>
          } />
          
          <Route path="/about" element={
            <Layout title="About - Cyrus Blog">
              <AboutPage />
            </Layout>
          } />
          
          <Route path="/contact" element={
            <Layout title="Contact - Cyrus Blog">
              <ContactPage />
            </Layout>
          } />
          
          {/* Redirect old paths */}
          <Route path="/home" element={<Navigate to="/" replace />} />
          
          {/* 404 Page */}
          <Route path="*" element={
            <Layout title="Page Not Found - Cyrus Blog">
              <NotFoundPage />
            </Layout>
          } />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default AppRouter;
