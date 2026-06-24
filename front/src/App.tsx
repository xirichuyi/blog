import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import Home from '@/pages/Home'
import Articles from '@/pages/Articles'
import ArticleDetail from '@/pages/ArticleDetail'
import Projects from '@/pages/Projects'
import Gitbook2Epub from '@/pages/tools/Gitbook2Epub'
import Mailbox from '@/pages/tools/Mailbox'
import Quant from '@/pages/tools/Quant'
import About from '@/pages/About'
import Contact from '@/pages/Contact'
import NotFound from '@/pages/NotFound'
import { ProtectedRoute } from '@/components/admin/ProtectedRoute'
import AdminLogin from '@/pages/admin/Login'
import AdminLayout from '@/pages/admin/AdminLayout'
import Dashboard from '@/pages/admin/Dashboard'
import PostsList from '@/pages/admin/PostsList'
import PostEditor from '@/pages/admin/PostEditor'
import Taxonomy from '@/pages/admin/Taxonomy'
import AboutEditor from '@/pages/admin/AboutEditor'

export default function App() {
  return (
    <Routes>
      {/* Admin — own chrome, no public Dock/Layout */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="posts" element={<PostsList />} />
        <Route path="posts/new" element={<PostEditor />} />
        <Route path="posts/:id" element={<PostEditor />} />
        <Route path="taxonomy" element={<Taxonomy />} />
        <Route path="about" element={<AboutEditor />} />
      </Route>

      {/* Public */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/tools/gitbook2epub" element={<Gitbook2Epub />} />
        <Route path="/tools/mailbox" element={<Mailbox />} />
        <Route path="/tools/quant" element={<Quant />} />
        <Route path="/article/:id" element={<ArticleDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
