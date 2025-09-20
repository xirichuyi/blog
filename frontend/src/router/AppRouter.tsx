import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import RoutePreloader from '../components/ui/RoutePreloader';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';

// Lazy load components for better performance
const Home = lazy(() => import('../pages/Home'));
const ArticleDetail = lazy(() => import('../pages/Articles/components/ArticleDetail'));
// const CategoriesPage = lazy(() => import('../components/blog/CategoriesPage'));
// const TagsPage = lazy(() => import('../components/blog/TagsPage'));
const Articles = lazy(() => import('../pages/Articles'));
// const SearchResultsPage = lazy(() => import('../components/blog/SearchResultsPage'));
const About = lazy(() => import('../pages/About'));
const Contact = lazy(() => import('../pages/Contact'));

// Admin components - lazy loaded with more granular code splitting
const AdminLogin = lazy(() => import('../pages/Admin/Login'));
const AdminDashboard = lazy(() => import('../pages/Admin/Dashboard'));
const ProtectedRoute = lazy(() => import('../pages/Admin/ProtectedRoute'));

// Lazy load admin components directly
const LazyPostManagement = lazy(() => import('../pages/Admin/PostManagement'));
const LazyPostEditor = lazy(() => import('../pages/Admin/PostEditor'));
const LazyCategoriesTagsManagement = lazy(() => import('../pages/Admin/CategoriesTags'));
const LazyAboutManagement = lazy(() => import('../pages/Admin/About'));
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

// Admin placeholder components with lazy loading

const AdminPosts: React.FC = () => <LazyPostManagement />;

// const AdminMusic: React.FC = () => <LazyMusicManagement />;

const AdminCategoriesTags: React.FC = () => <LazyCategoriesTagsManagement />;

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ErrorBoundary>
            <RoutePreloader />
            <Routes>
              {/* Main Layout Routes */}
              <Route path="/" element={
                <Layout title="Chuyi的博客 - 现代化个人博客">
                  <Suspense fallback={<LoadingSpinner />}>
                    <Home />
                  </Suspense>
                </Layout>
              } />

              <Route path="/articles" element={
                <Layout title="所有文章 - Chuyi的博客">
                  <Suspense fallback={<LoadingSpinner />}>
                    <Articles />
                  </Suspense>
                </Layout>
              } />

              <Route path="/search" element={
                <Layout title="搜索结果 - Chuyi的博客">
                  <Suspense fallback={<LoadingSpinner />}>
                    {/* <SearchResults /> TODO: add search results page */}
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





              <Route path="/about" element={
                <Layout title="关于我 - Chuyi的博客">
                  <Suspense fallback={<LoadingSpinner />}>
                    <About />
                  </Suspense>
                </Layout>
              } />

              <Route path="/contact" element={
                <Layout title="联系我 - Chuyi的博客">
                  <Suspense fallback={<LoadingSpinner />}>
                    <Contact />
                  </Suspense>
                </Layout>
              } />


              {/* Admin Routes */}
              <Route path="/admin/login" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminLogin />
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
                    <LazyPostEditor />
                  </ProtectedRoute>
                </Suspense>
              } />

              <Route path="/admin/posts/edit/:id" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <ProtectedRoute>
                    <LazyPostEditor />
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
                    <LazyAboutManagement />
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
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRouter;
