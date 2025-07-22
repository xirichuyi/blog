import { Outlet, Navigate } from 'react-router-dom';
import { adminApi } from '../../services/api';

export default function AdminLayout() {
  // Check if user is authenticated
  if (!adminApi.isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-apple-gray-800 min-h-screen p-6">
          <h1 className="text-xl font-bold text-primary mb-8">Blog Admin</h1>
          <nav>
            <ul className="space-y-2">
              <li>
                <a href="/admin" className="block py-2 px-4 rounded hover:bg-apple-gray-700">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/admin/posts" className="block py-2 px-4 rounded hover:bg-apple-gray-700">
                  Posts
                </a>
              </li>
              <li>
                <a href="/admin/categories" className="block py-2 px-4 rounded hover:bg-apple-gray-700">
                  Categories
                </a>
              </li>
              <li>
                <a href="/admin/ai-assistant" className="block py-2 px-4 rounded hover:bg-apple-gray-700">
                  AI Assistant
                </a>
              </li>
              <li>
                <a href="/admin/settings" className="block py-2 px-4 rounded hover:bg-apple-gray-700">
                  Settings
                </a>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
