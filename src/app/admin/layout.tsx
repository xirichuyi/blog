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
    <div className="min-h-screen bg-black text-white">
      <AdminSidebar />
      <div className="md:ml-64 lg:ml-72">
        <AdminHeader />
        <main className="p-4 md:p-6 lg:p-8 overflow-x-auto">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
