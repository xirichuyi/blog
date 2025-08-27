import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import BlogHome from '../components/blog/BlogHome';
import ArticleDetail from '../components/blog/ArticleDetail';
import CategoriesPage from '../components/blog/CategoriesPage';
import TagsPage from '../components/blog/TagsPage';
import ArticlesPage from '../components/blog/ArticlesPage';
import SearchResultsPage from '../components/blog/SearchResultsPage';
import AboutPage from '../components/pages/AboutPage';
import ContactPage from '../components/pages/ContactPage';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import PerformanceTest from '../components/debug/PerformanceTest';
import LoginPage from '../components/admin/LoginPage';
import ProtectedRoute from '../components/admin/ProtectedRoute';
import Dashboard from '../components/admin/Dashboard';
import PostManagement from '../components/admin/PostManagement';
import PostEditor from '../components/admin/PostEditor';
import MusicManagement from '../components/admin/MusicManagement';
import MusicUpload from '../components/admin/MusicUpload';
import CategoriesTagsManagement from '../components/admin/CategoriesTagsManagement';
import AboutManagement from '../components/admin/AboutManagement';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { DataProvider } from '../contexts/DataContext';
import NotificationContainer from '../components/ui/NotificationContainer';
import '../styles/page-placeholder.css';

// ArticlesPage is now imported from components

// CategoriesPage is now imported from components

// TagsPage is now imported from components

// AboutPage is now imported from components

// ContactPage is now imported from components

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
  const { id } = useParams<{ id: string }>();
  const articleId = id || '1';

  return (
    <ArticleDetail
      articleId={articleId}
    />
  );
};

// Admin placeholder components (keeping for other routes)
const AdminDashboard: React.FC = () => <Dashboard />;

const AdminPosts: React.FC = () => <PostManagement />;

const AdminMusic: React.FC = () => <MusicManagement />;

const AdminCategoriesTags: React.FC = () => <CategoriesTagsManagement />;

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <DataProvider>
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

                <Route path="/search" element={
                  <Layout title="Search Results - Cyrus Blog">
                    <SearchResultsPage />
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

                {/* Debug Routes */}
                <Route path="/debug/performance" element={
                  <Layout title="Performance Test - Cyrus Blog">
                    <PerformanceTest />
                  </Layout>
                } />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<LoginPage />} />

                <Route path="/admin/dashboard" element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/admin/posts" element={
                  <ProtectedRoute>
                    <AdminPosts />
                  </ProtectedRoute>
                } />

                <Route path="/admin/posts/new" element={
                  <ProtectedRoute>
                    <PostEditor />
                  </ProtectedRoute>
                } />

                <Route path="/admin/posts/edit/:id" element={
                  <ProtectedRoute>
                    <PostEditor />
                  </ProtectedRoute>
                } />

                <Route path="/admin/music" element={
                  <ProtectedRoute>
                    <AdminMusic />
                  </ProtectedRoute>
                } />

                <Route path="/admin/music/upload" element={
                  <ProtectedRoute>
                    <MusicUpload />
                  </ProtectedRoute>
                } />

                <Route path="/admin/categories-tags" element={
                  <ProtectedRoute>
                    <AdminCategoriesTags />
                  </ProtectedRoute>
                } />

                <Route path="/admin/about" element={
                  <ProtectedRoute>
                    <AboutManagement />
                  </ProtectedRoute>
                } />

                {/* Redirect admin root to dashboard */}
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

                {/* Redirect old paths */}
                <Route path="/home" element={<Navigate to="/" replace />} />

                {/* 404 Page */}
                <Route path="*" element={
                  <Layout title="Page Not Found - Cyrus Blog">
                    <NotFoundPage />
                  </Layout>
                } />
              </Routes>
              <NotificationContainer />
            </ErrorBoundary>
          </DataProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRouter;
