import { Outlet, Navigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminSidebar from '../../components/admin/AdminSidebar';

export default function AdminLayout() {
  // Check if user is authenticated
  if (!adminApi.isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AdminSidebar />
      <div className="md:ml-64 lg:ml-72">
        <AdminHeader />
        <main className="p-4 md:p-6 lg:p-8 overflow-x-auto">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
