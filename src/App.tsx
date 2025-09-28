import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TourDetailsPage from "./pages/TourDetailsPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import ToursPage from "./pages/ToursPage";
import ContactPage from "./pages/ContactPage";
import ScrollToTop from "./components/ScrollToTop";
import Login from "./pages/Login"; // Import Login page
import AdminDashboard from "./pages/AdminDashboard"; // Import AdminDashboard page
import { SessionContextProvider } from "./components/SessionContextProvider"; // Import SessionContextProvider
import ProtectedRoute from "./components/ProtectedRoute"; // Import ProtectedRoute

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <SessionContextProvider> {/* Wrap routes with SessionContextProvider */}
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/tours" element={<ToursPage />} />
            <Route path="/tours/:id" element={<TourDetailsPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:id" element={<BlogPostPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<Login />} /> {/* New login route */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute adminOnly> {/* Protect admin dashboard */}
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;