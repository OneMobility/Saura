import Navbar from "@/components/Navbar";
import Slideshow from "@/components/Slideshow"; // Importa el nuevo componente Slideshow

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Slideshow /> {/* Renderiza el Slideshow debajo del Navbar */}
      {/* El contenido de bienvenida ha sido eliminado */}
    </div>
  );
};

export default Index;