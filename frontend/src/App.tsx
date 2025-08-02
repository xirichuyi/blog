import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { ChatProvider } from '@/context/ChatContext';
import { AuthProvider } from '@/hooks/useAuth.tsx';
import { ErrorBoundary } from '@/components/common';
import { ToastProvider } from '@/components/common/Toast';
import { createLazyComponent } from '@/components/common/LazyWrapper';
import { setupGlobalErrorHandling, handleReactError } from '@/services/errorReporting';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ChatAssistant from '@/components/ChatAssistant';

// 公共页面 - 立即加载
import Home from '@/pages/Home';
import NotFound from '@/pages/NotFound';

// 懒加载的公共页面
const Blog = createLazyComponent(() => import('@/pages/Blog'));
const BlogPost = createLazyComponent(() => import('@/pages/BlogPost'));
const Categories = createLazyComponent(() => import('@/pages/Categories'));
const About = createLazyComponent(() => import('@/pages/About'));

// 懒加载的管理员页面
const AdminLayout = createLazyComponent(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = createLazyComponent(() => import('@/pages/admin/AdminDashboard'));
const AdminPosts = createLazyComponent(() => import('@/pages/admin/AdminPosts'));
const AdminCategories = createLazyComponent(() => import('@/pages/admin/AdminCategories'));
const AdminMedia = createLazyComponent(() => import('@/pages/admin/AdminMedia'));
const AdminSettings = createLazyComponent(() => import('@/pages/admin/AdminSettings'));
const AdminLogin = createLazyComponent(() => import('@/pages/admin/AdminLogin'));
const AdminAIAssistant = createLazyComponent(() => import('@/pages/admin/AdminAIAssistant'));
const AdminPostEditor = createLazyComponent(() => import('@/pages/admin/AdminPostEditor'));

function App() {
  // 设置全局错误处理
  React.useEffect(() => {
    setupGlobalErrorHandling();
  }, []);

  return (
    <ErrorBoundary onError={handleReactError}>
      <AuthProvider>
        <ThemeProvider>
          <ChatProvider>
            <ToastProvider>
            <Router>
            <div className="flex flex-col min-h-screen">
              <Routes>
                {/* Admin routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/*" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="posts" element={<AdminPosts />} />
                  <Route path="posts/:slug" element={<AdminPostEditor />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="media" element={<AdminMedia />} />
                  <Route path="ai-assistant" element={<AdminAIAssistant />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>

                {/* Public routes */}
                <Route path="/*" element={
                  <>
                    <Header />
                    <main className="flex-grow">
                      <Routes>
                        <Route index element={<Home />} />
                        <Route path="blog" element={<Blog />} />
                        <Route path="blog/:slug" element={<BlogPost />} />
                        <Route path="categories" element={<Categories />} />
                        <Route path="categories/:category" element={<Categories />} />
                        <Route path="about" element={<About />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                    <Footer />
                    <ChatAssistant />
                  </>
                } />
              </Routes>
            </div>
            </Router>
          </ToastProvider>
        </ChatProvider>
      </ThemeProvider>
    </AuthProvider>
  </ErrorBoundary>
  );
}

export default App;
