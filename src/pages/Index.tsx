import Navbar from "@/components/Navbar";
import Slideshow from "@/components/Slideshow"; // Importa el nuevo componente Slideshow

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Slideshow /> {/* Renderiza el Slideshow debajo del Navbar */}
      <div className="flex-grow flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to Your Blank App</h1>
          <p className="text-xl text-gray-600">
            Start building your amazing project here!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;