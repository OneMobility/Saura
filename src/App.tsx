import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TourDetailsPage from "./pages/TourDetailsPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import ToursPage from "./pages/ToursPage";
import ContactPage from "./pages/ContactPage";
import BusTicketsPage from "./pages/BusTicketsPage";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminBlogPage from "./pages/AdminBlogPage";
import AdminReviewsPage from "./pages/AdminReviewsPage";
import AdminHotelsPage from "./pages/AdminHotelsPage";
import AdminProvidersPage from "./pages/AdminProvidersPage";
import AdminProviderFormPage from "./pages/AdminProviderFormPage";
import AdminClientsPage from "./pages/AdminClientsPage";
import AdminBusesPage from "./pages/AdminBusesPage";
import AdminBusFormPage from "./pages/AdminBusFormPage";
import AdminToursPage from "./pages/AdminToursPage";
import AdminTourFormPage from "./pages/AdminTourFormPage";
import AdminHotelFormPage from "./pages/AdminHotelFormPage";
import AdminClientFormPage from "./pages/AdminClientFormPage";
import AdminBusTicketsPage from "./pages/AdminBusTicketsPage";
import AdminBusDestinationsPage from "./pages/AdminBusDestinationsPage";
import AdminBusRoutesPage from "./pages/AdminBusRoutesPage";
import AdminBusRouteFormPage from "./pages/AdminBusRouteFormPage";
import AdminBusSchedulesPage from "./pages/AdminBusSchedulesPage";
import AdminBusPassengersPage from "./pages/AdminBusPassengersPage";
import AdminBusTicketValidationPage from "./pages/AdminBusTicketValidationPage";
import AdminContactMessagesPage from "./pages/AdminContactMessagesPage"; // NEW

// Bus Tickets Subdomain Pages
import DestinationsPage from "./pages/bus-tickets/DestinationsPage";
import AboutUsPage from "./pages/bus-tickets/AboutUsPage";
import PrivacyPolicyPage from "./pages/bus-tickets/PrivacyPolicyPage";
import TermsAndConditionsPage from "./pages/bus-tickets/TermsAndConditionsPage";
import FaqPage from "./pages/bus-tickets/FaqPage";
import BillingCenterPage from "./pages/bus-tickets/BillingCenterPage";
import BusContactPage from "./pages/bus-tickets/BusContactPage";
import AdditionalServicesPage from "./pages/bus-tickets/AdditionalServicesPage";
import HelpCenterPage from "./pages/bus-tickets/HelpCenterPage";
import BusSearchResultsPage from "./pages/bus-tickets/BusSearchResultsPage";
import BusTicketBookingPage from "./pages/bus-tickets/BusTicketBookingPage";
import BusTicketConfirmationPage from "./pages/bus-tickets/BusTicketConfirmationPage";

import { SessionContextProvider } from "./components/SessionContextProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import Login from "./pages/Login";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const fetchSiteSettings = async () => {
      const { data } = await supabase
        .from('agency_settings')
        .select('agency_name, favicon_url')
        .single();

      if (data) {
        if (data.agency_name) {
          document.title = data.agency_name;
        }
        if (data.favicon_url) {
          const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
          link.type = 'image/x-icon';
          link.rel = 'shortcut icon';
          link.href = data.favicon_url;
          document.getElementsByTagName('head')[0].appendChild(link);
        }
      }
    };
    fetchSiteSettings();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <SessionContextProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/tours" element={<ToursPage />} />
              <Route path="/tours/:id" element={<TourDetailsPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:id" element={<BlogPostPage />} />
              <Route path="/contact" element={<ContactPage />} />
              
              <Route path="/bus-tickets" element={<BusTicketsPage />} />
              <Route path="/bus-tickets/destinations" element={<DestinationsPage />} />
              <Route path="/bus-tickets/about" element={<AboutUsPage />} />
              <Route path="/bus-tickets/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/bus-tickets/terms-and-conditions" element={<TermsAndConditionsPage />} />
              <Route path="/bus-tickets/additional-services" element={<AdditionalServicesPage />} />
              <Route path="/bus-tickets/faq" element={<FaqPage />} />
              <Route path="/bus-tickets/billing-center" element={<BillingCenterPage />} />
              <Route path="/bus-tickets/help-center" element={<HelpCenterPage />} />
              <Route path="/bus-tickets/contact" element={<BusContactPage />} />
              <Route path="/bus-tickets/search-results" element={<BusSearchResultsPage />} />
              <Route path="/bus-tickets/book" element={<BusTicketBookingPage />} />
              <Route path="/bus-tickets/confirmation/:contractNumber" element={<BusTicketConfirmationPage />} />

              <Route path="/login" element={<Login />} />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminSettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/blog"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminBlogPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reviews"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminReviewsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/contacto"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminContactMessagesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/hotels"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminHotelsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/hotels/new"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminHotelFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/hotels/edit/:id"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminHotelFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/buses"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminBusesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/buses/new"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminBusFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/buses/edit/:id"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminBusFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/providers"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminProvidersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/providers/new"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminProviderFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/providers/edit/:id"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminProviderFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/clients"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminClientsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/clients/new"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminClientFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/clients/edit/:id"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminClientFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tours"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminToursPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tours/new"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminTourFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tours/edit/:id"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminTourFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bus-tickets"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminBusTicketsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bus-tickets/destinations"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminBusDestinationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bus-tickets/routes"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminBusRoutesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bus-tickets/routes/new"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminBusRouteFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bus-tickets/routes/edit/:id"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminBusRouteFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bus-tickets/schedules"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminBusSchedulesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bus-tickets/passengers"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminBusPassengersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bus-tickets/validate"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminBusTicketValidationPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SessionContextProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;