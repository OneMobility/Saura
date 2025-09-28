import Navbar from "@/components/Navbar";
import Slideshow from "@/components/Slideshow";
import SocialMediaBox from "@/components/SocialMediaBox";
import PromotionalStrip from "@/components/PromotionalStrip";
import LatestToursSection from "@/components/LatestToursSection";
import BlogSection from "@/components/BlogSection";
import CustomerReviewsSection from "@/components/CustomerReviewsSection";
import TourInquirySection from "@/components/TourInquirySection"; // Import the new TourInquirySection
import ContactSection from "@/components/ContactSection"; // Import the new ContactSection
import Footer from "@/components/Footer"; // Import the new Footer

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar />
      
      {/* Nuevo contenedor para el Slideshow y SocialMediaBox */}
      <div className="relative">
        <Slideshow />
        {/* SocialMediaBox posicionado a la derecha y centrado verticalmente respecto al Slideshow */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20">
          <SocialMediaBox />
        </div>
      </div>
      
      {/* Franja promocional debajo del slideshow */}
      <PromotionalStrip />

      {/* Sección de los últimos tours */}
      <LatestToursSection />

      {/* Nueva sección de blog */}
      <BlogSection />

      {/* Nueva sección de opiniones de clientes */}
      <CustomerReviewsSection />

      {/* Nueva sección de consulta de tour */}
      <TourInquirySection />

      {/* Nueva sección de contacto */}
      <ContactSection />

      {/* Nuevo pie de página */}
      <Footer />
    </div>
  );
};

export default Index;