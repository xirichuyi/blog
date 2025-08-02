import { Outlet, Navigate } from 'react-router-dom';
import { useAdminGuard } from '@/hooks/useAuth.tsx';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { LoadingSpinner } from '@/components/ui';

export default function AdminLayout() {
  const { isAuthenticated, isLoading, shouldRedirect } = useAdminGuard();

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // 重定向到登录页
  if (shouldRedirect) {
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
