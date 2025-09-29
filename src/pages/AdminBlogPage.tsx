"use client";

import React, { useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import BlogPostsTable from '@/components/admin/blog/BlogPostsTable';
import BlogFormDialog from '@/components/admin/blog/BlogFormDialog';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';

const AdminBlogPage = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Key to force re-fetch of blog posts
  const { user, isAdmin, isLoading } = useSession();
  const navigate = useNavigate();

  const handleBlogSave = () => {
    setRefreshKey(prev => prev + 1); // Increment key to trigger re-fetch in BlogPostsTable
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-700">Cargando...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Gestión de Blog">
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Crear Nueva Entrada
          </Button>
        </AdminHeader>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <BlogPostsTable key={refreshKey} /> {/* Use key to force re-render/re-fetch */}
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
      <BlogFormDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSave={handleBlogSave}
      />
    </div>
  );
};

export default AdminBlogPage;