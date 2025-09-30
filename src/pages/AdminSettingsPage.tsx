"use client";

import React from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SlideshowSettings from '@/components/admin/settings/SlideshowSettings';
import SeoSettings from '@/components/admin/settings/SeoSettings';
import SocialMediaSettings from '@/components/admin/settings/SocialMediaSettings';
import AgencySettings from '@/components/admin/settings/AgencySettings'; // Import the new AgencySettings component
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom'; // Corrected import statement
import AdminHeader from '@/components/admin/AdminHeader'; // Import the new AdminHeader

const AdminSettingsPage = () => {
  const { user, isAdmin, isLoading } = useSession();
  const navigate = useNavigate();

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
        <AdminHeader pageTitle="Configuración del Sitio" /> {/* Usando el nuevo AdminHeader */}
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <Tabs defaultValue="slideshow" className="w-full">
            <TabsList className="grid w-full grid-cols-4"> {/* Adjusted grid-cols to 4 */}
              <TabsTrigger value="slideshow">Slideshow</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="social-media">Redes Sociales</TabsTrigger>
              <TabsTrigger value="agency-info">Agencia</TabsTrigger> {/* New tab trigger */}
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
            <TabsContent value="agency-info"> {/* New tab content */}
              <AgencySettings />
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