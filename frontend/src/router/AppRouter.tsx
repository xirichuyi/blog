import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { DataProvider } from '../contexts/DataContext';

// Lazy load components for better performance
const BlogHome = lazy(() => import('../components/blog/BlogHome'));
const ArticleDetail = lazy(() => import('../components/blog/ArticleDetail'));
const CategoriesPage = lazy(() => import('../components/blog/CategoriesPage'));
const TagsPage = lazy(() => import('../components/blog/TagsPage'));
const ArticlesPage = lazy(() => import('../components/blog/ArticlesPage'));
const SearchResultsPage = lazy(() => import('../components/blog/SearchResultsPage'));
const AboutPage = lazy(() => import('../components/pages/AboutPage'));
const ContactPage = lazy(() => import('../components/pages/ContactPage'));
const PerformanceTest = lazy(() => import('../components/debug/PerformanceTest'));

// Admin components - lazy loaded
const LoginPage = lazy(() => import('../components/admin/LoginPage'));
const ProtectedRoute = lazy(() => import('../components/admin/ProtectedRoute'));
const Dashboard = lazy(() => import('../components/admin/Dashboard'));
const PostManagement = lazy(() => import('../components/admin/PostManagement'));
const PostEditor = lazy(() => import('../components/admin/PostEditor'));
const MusicManagement = lazy(() => import('../components/admin/MusicManagement'));
const MusicUpload = lazy(() => import('../components/admin/MusicUpload'));
const CategoriesTagsManagement = lazy(() => import('../components/admin/CategoriesTagsManagement'));
const AboutManagement = lazy(() => import('../components/admin/AboutManagement'));
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
                  <Layout title="Chuyi的博客 - 现代化个人博客">
                    <Suspense fallback={<LoadingSpinner />}>
                      <BlogHome />
                    </Suspense>
                  </Layout>
                } />

                <Route path="/articles" element={
                  <Layout title="所有文章 - Chuyi的博客">
                    <Suspense fallback={<LoadingSpinner />}>
                      <ArticlesPage />
                    </Suspense>
                  </Layout>
                } />

                <Route path="/search" element={
                  <Layout title="搜索结果 - Chuyi的博客">
                    <Suspense fallback={<LoadingSpinner />}>
                      <SearchResultsPage />
                    </Suspense>
                  </Layout>
                } />

                <Route path="/article/:id" element={
                  <Layout title="文章详情 - Chuyi的博客">
                    <Suspense fallback={<LoadingSpinner />}>
                      <ArticleDetailRoute />
                    </Suspense>
                  </Layout>
                } />

                <Route path="/categories" element={
                  <Layout title="分类 - Chuyi的博客">
                    <Suspense fallback={<LoadingSpinner />}>
                      <CategoriesPage />
                    </Suspense>
                  </Layout>
                } />

                <Route path="/tags" element={
                  <Layout title="标签 - Chuyi的博客">
                    <Suspense fallback={<LoadingSpinner />}>
                      <TagsPage />
                    </Suspense>
                  </Layout>
                } />

                <Route path="/about" element={
                  <Layout title="关于我 - Chuyi的博客">
                    <Suspense fallback={<LoadingSpinner />}>
                      <AboutPage />
                    </Suspense>
                  </Layout>
                } />

                <Route path="/contact" element={
                  <Layout title="联系我 - Chuyi的博客">
                    <Suspense fallback={<LoadingSpinner />}>
                      <ContactPage />
                    </Suspense>
                  </Layout>
                } />

                {/* Debug Routes */}
                <Route path="/debug/performance" element={
                  <Layout title="性能测试 - Chuyi的博客">
                    <Suspense fallback={<LoadingSpinner />}>
                      <PerformanceTest />
                    </Suspense>
                  </Layout>
                } />

                {/* Admin Routes */}
                <Route path="/admin/login" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <LoginPage />
                  </Suspense>
                } />

                <Route path="/admin/dashboard" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ProtectedRoute>
                      <AdminDashboard />
                    </ProtectedRoute>
                  </Suspense>
                } />

                <Route path="/admin/posts" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ProtectedRoute>
                      <AdminPosts />
                    </ProtectedRoute>
                  </Suspense>
                } />

                <Route path="/admin/posts/new" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ProtectedRoute>
                      <PostEditor />
                    </ProtectedRoute>
                  </Suspense>
                } />

                <Route path="/admin/posts/edit/:id" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ProtectedRoute>
                      <PostEditor />
                    </ProtectedRoute>
                  </Suspense>
                } />

                <Route path="/admin/music" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ProtectedRoute>
                      <AdminMusic />
                    </ProtectedRoute>
                  </Suspense>
                } />

                <Route path="/admin/music/upload" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ProtectedRoute>
                      <MusicUpload />
                    </ProtectedRoute>
                  </Suspense>
                } />

                <Route path="/admin/categories-tags" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ProtectedRoute>
                      <AdminCategoriesTags />
                    </ProtectedRoute>
                  </Suspense>
                } />

                <Route path="/admin/about" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ProtectedRoute>
                      <AboutManagement />
                    </ProtectedRoute>
                  </Suspense>
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
