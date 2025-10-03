"use client";

import React from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SlideshowSettings from '@/components/admin/settings/SlideshowSettings';
import SeoSettings from '@/components/admin/settings/SeoSettings';
import SocialMediaSettings from '@/components/admin/settings/SocialMediaSettings';
import AgencySettings from '@/components/admin/settings/AgencySettings';
import AboutUsSettings from '@/components/admin/settings/AboutUsSettings';
import PolicyTermsSettings from '@/components/admin/settings/PolicyTermsSettings';
import FaqSettings from '@/components/admin/settings/FaqSettings'; // NEW: Import FaqSettings
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import AdminHeader from '@/components/admin/AdminHeader';

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
        <AdminHeader pageTitle="Configuración del Sitio" />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <Tabs defaultValue="slideshow" className="w-full">
            <TabsList className="grid w-full grid-cols-7"> {/* Adjusted grid-cols to 7 */}
              <TabsTrigger value="slideshow">Slideshow</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="social-media">Redes Sociales</TabsTrigger>
              <TabsTrigger value="agency-info">Agencia</TabsTrigger>
              <TabsTrigger value="about-us">Sobre Nosotros</TabsTrigger>
              <TabsTrigger value="policies-terms">Políticas y Términos</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger> {/* NEW: Tab trigger for FAQ */}
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
            <TabsContent value="agency-info">
              <AgencySettings />
            </TabsContent>
            <TabsContent value="about-us">
              <AboutUsSettings />
            </TabsContent>
            <TabsContent value="policies-terms">
              <PolicyTermsSettings />
            </TabsContent>
            <TabsContent value="faq"> {/* NEW: Tab content for FAQ */}
              <FaqSettings />
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