import Navbar from "@/components/Navbar";
import Slideshow from "@/components/Slideshow";
import SocialMediaBox from "@/components/SocialMediaBox";
import PromotionalStrip from "@/components/PromotionalStrip"; // Importa el nuevo componente

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar />
      <Slideshow />
      
      {/* Franja promocional debajo del slideshow */}
      <PromotionalStrip />

      {/* SocialMediaBox posicionado a la derecha y centrado verticalmente */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20">
        <SocialMediaBox />
      </div>
    </div>
  );
};

export default Index;