import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import RoutePreloader from '../components/ui/RoutePreloader';
import ResponsiveLayout from '../components/layout/ResponsiveLayout';
import ResponsiveRoute from '../components/routes/ResponsiveRoute';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';

// Admin components - lazy loaded with more granular code splitting
const AdminLogin = lazy(() => import('../pages/Admin/Login'));
const AdminDashboard = lazy(() => import('../pages/Admin/Dashboard'));
const ProtectedRoute = lazy(() => import('../pages/Admin/ProtectedRoute'));

// Lazy load public pages
const SearchResults = lazy(() => import('../pages/Search'));
const Archives = lazy(() => import('../pages/Archives'));

// Lazy load admin components directly
const LazyPostManagement = lazy(() => import('../pages/Admin/PostManagement'));
const LazyPostEditor = lazy(() => import('../pages/Admin/PostEditor'));
const LazyCategoriesTagsManagement = lazy(() => import('../pages/Admin/CategoriesTags'));
const LazyAboutManagement = lazy(() => import('../pages/Admin/About'));
const LazyResourceManagement = lazy(() => import('../pages/Admin/ResourceManagement'));
const LazySecurityManagement = lazy(() => import('../pages/Admin/Security'));
import NotificationContainer from '../components/ui/NotificationContainer';
import '../styles/page-placeholder.css';

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

// Article Detail Route Component with Responsive Support
const ArticleDetailRoute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const articleId = id || '1';

  return (
    <ResponsiveRoute 
      page="article-detail"
      articleId={articleId}
    />
  );
};


const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ErrorBoundary>
            <RoutePreloader />
            <Routes>
              {/* Main Layout Routes with Responsive Support */}
              <Route path="/" element={
                <ResponsiveLayout title="Chuyi的博客 - 现代化个人博客">
                  <ResponsiveRoute page="home" />
                </ResponsiveLayout>
              } />

              <Route path="/articles" element={
                <ResponsiveLayout title="所有文章 - Chuyi的博客">
                  <ResponsiveRoute page="articles" />
                </ResponsiveLayout>
              } />

              <Route path="/search" element={
                <ResponsiveLayout title="搜索结果 - Chuyi的博客">
                  <Suspense fallback={<LoadingSpinner />}>
                    <SearchResults />
                  </Suspense>
                </ResponsiveLayout>
              } />

              <Route path="/article/:id" element={
                <ResponsiveLayout 
                  title="文章详情 - Chuyi的博客"
                  showBottomNav={true}
                  showTopBar={false}
                >
                  <Suspense fallback={<LoadingSpinner />}>
                    <ArticleDetailRoute />
                  </Suspense>
                </ResponsiveLayout>
              } />

              <Route path="/archives" element={
                <ResponsiveLayout title="文章归档 - Chuyi的博客">
                  <Suspense fallback={<LoadingSpinner />}>
                    <Archives />
                  </Suspense>
                </ResponsiveLayout>
              } />

              <Route path="/about" element={
                <ResponsiveLayout title="关于我 - Chuyi的博客">
                  <ResponsiveRoute page="about" />
                </ResponsiveLayout>
              } />

              <Route path="/contact" element={
                <ResponsiveLayout title="联系我 - Chuyi的博客">
                  <ResponsiveRoute page="contact" />
                </ResponsiveLayout>
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
                    <LazyPostManagement />
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
                    <LazyCategoriesTagsManagement />
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

              <Route path="/admin/resources" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <ProtectedRoute>
                    <LazyResourceManagement />
                  </ProtectedRoute>
                </Suspense>
              } />

              <Route path="/admin/security" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <ProtectedRoute>
                    <LazySecurityManagement />
                  </ProtectedRoute>
                </Suspense>
              } />

              {/* Redirect admin root to dashboard */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

              {/* Redirect old paths */}
              <Route path="/home" element={<Navigate to="/" replace />} />

              {/* 404 Page */}
              <Route path="*" element={
                <ResponsiveLayout title="Page Not Found - Chuyi's Blog">
                  <NotFoundPage />
                </ResponsiveLayout>
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
