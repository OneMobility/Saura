import Navbar from "@/components/Navbar";
import Slideshow from "@/components/Slideshow";
import SocialMediaBox from "@/components/SocialMediaBox";
import PromotionalStrip from "@/components/PromotionalStrip";
import LatestToursSection from "@/components/LatestToursSection";
import BlogSection from "@/components/BlogSection";
import CustomerReviewsSection from "@/components/CustomerReviewsSection";
import TourInquirySection from "@/components/TourInquirySection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import PromotionPopup from "@/components/PromotionPopup"; // NEW

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Popup publicitario */}
      <PromotionPopup />

      <Navbar />
      
      <div className="relative">
        <Slideshow />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20">
          <SocialMediaBox />
        </div>
      </div>
      
      <PromotionalStrip />
      <LatestToursSection />
      <BlogSection />
      <CustomerReviewsSection />
      <TourInquirySection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;