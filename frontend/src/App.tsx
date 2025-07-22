import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider } from './context/ChatContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Categories from './pages/Categories';
import About from './pages/About';

import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPosts from './pages/admin/AdminPosts';
import AdminLogin from './pages/admin/AdminLogin';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ThemeProvider>
      <ChatProvider>
        <Router>
          <div className="flex flex-col min-h-screen">
            <Routes>
              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/*" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="posts" element={<AdminPosts />} />
                <Route path="posts/:slug" element={<div>Admin Post Editor</div>} />
                <Route path="categories" element={<div>Admin Categories</div>} />
                <Route path="ai-assistant" element={<div>Admin AI Assistant</div>} />
                <Route path="settings" element={<div>Admin Settings</div>} />
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
                </>
              } />
            </Routes>
          </div>
        </Router>
      </ChatProvider>
    </ThemeProvider>
  );
}

export default App;
