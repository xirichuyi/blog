import { Metadata } from 'next';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata: Metadata = {
  title: 'Blog Admin | Cyrus',
  description: 'Admin dashboard for managing blog content',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-apple-gray-100 dark:bg-apple-gray-900">
      <AdminSidebar />
      <div className="flex-1">
        <AdminHeader />
        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
