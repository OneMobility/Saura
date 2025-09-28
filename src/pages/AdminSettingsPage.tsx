"use client";

import React from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SlideshowSettings from '@/components/admin/settings/SlideshowSettings';
import SeoSettings from '@/components/admin/settings/SeoSettings';
import SocialMediaSettings from '@/components/admin/settings/SocialMediaSettings';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button'; // Import Button for logout
import { supabase } from '@/integrations/supabase/client'; // Import supabase for logout

const AdminSettingsPage = () => {
  const { user, isAdmin, isLoading } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
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
        <header className="bg-white shadow-sm p-4 flex justify-end items-center">
          {/* Title removed from here */}
          <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white">
            Cerrar Sesión
          </Button>
        </header>
        {/* Page title moved here, below the Navbar/Header */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 px-4 pt-8 pb-4">Configuración del Sitio</h1>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <Tabs defaultValue="slideshow" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="slideshow">Slideshow</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="social-media">Redes Sociales</TabsTrigger>
            </TabsList>
            <TabsContent value="slideshow">
              <SlideshowSettings />
            </TabsContent>
            <TabsContent value="seo">
              <SeoSettings />
            </TabsContent>
            <TabsContent value="social-media">
              <SocialMediaSettings />
            </TabsContent>
          </Tabs>
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminSettingsPage;