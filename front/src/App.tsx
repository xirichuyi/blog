import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/admin/ProtectedRoute'
import { AdminAuthProvider } from '@/lib/admin-auth'

const Home = lazy(() => import('@/pages/Home'))
const Articles = lazy(() => import('@/pages/Articles'))
const ArticleDetail = lazy(() => import('@/pages/ArticleDetail'))
const Projects = lazy(() => import('@/pages/Projects'))
const Gitbook2Epub = lazy(() => import('@/pages/tools/Gitbook2Epub'))
const Mailbox = lazy(() => import('@/pages/tools/Mailbox'))
const Quant = lazy(() => import('@/pages/tools/Quant'))
const About = lazy(() => import('@/pages/About'))
const Guestbook = lazy(() => import('@/pages/Guestbook'))
const Books = lazy(() => import('@/pages/Books'))
const BookReader = lazy(() => import('@/pages/BookReader'))
const Changelog = lazy(() => import('@/pages/Changelog'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const AdminLogin = lazy(() => import('@/pages/admin/Login'))
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'))
const PostsList = lazy(() => import('@/pages/admin/PostsList'))
const PostEditor = lazy(() => import('@/pages/admin/PostEditor'))
const Taxonomy = lazy(() => import('@/pages/admin/Taxonomy'))
const AboutEditor = lazy(() => import('@/pages/admin/AboutEditor'))
const BooksManager = lazy(() => import('@/pages/admin/BooksManager'))
const ChangelogManager = lazy(() => import('@/pages/admin/ChangelogManager'))

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <Routes>
        {/* Admin — own chrome, no public Dock/Layout */}
        <Route
          path="/admin/login"
          element={
            <AdminAuthProvider>
              <AdminLogin />
            </AdminAuthProvider>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminAuthProvider>
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            </AdminAuthProvider>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="posts" element={<PostsList />} />
          <Route path="posts/new" element={<PostEditor />} />
          <Route path="posts/:id" element={<PostEditor />} />
          <Route path="taxonomy" element={<Taxonomy />} />
          <Route path="about" element={<AboutEditor />} />
          <Route path="books" element={<BooksManager />} />
          <Route path="changelog" element={<ChangelogManager />} />
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
          <Route path="/guestbook" element={<Guestbook />} />
          <Route path="/books" element={<Books />} />
          <Route path="/books/:id/read" element={<BookReader />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
