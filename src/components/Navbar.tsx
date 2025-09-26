import React from 'react';
import { PalmTree } from 'lucide-react'; // Importa el icono de palmera

const Navbar = () => {
  return (
    <nav className="bg-white shadow-sm w-full flex items-stretch min-h-[64px]">
      {/* Caja rosa mexicano con corte diagonal */}
      <div
        className="bg-rosa-mexicano flex items-center pl-4 pr-12"
        style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)', minWidth: '200px' }}
      >
        <div className="flex items-center space-x-2"> {/* Contenedor para el icono y el texto */}
          <PalmTree className="text-white h-6 w-6" /> {/* Icono de palmera */}
          <div className="text-lg font-bold text-white">Saura Tours</div>
        </div>
      </div>

      {/* Enlaces de navegación */}
      <div className="flex-grow flex items-center justify-end pr-4">
        <ul className="flex space-x-4">
          <li><a href="#" className="text-gray-600 hover:text-gray-900">Inicio</a></li>
          <li><a href="#" className="text-gray-600 hover:text-gray-900">Acerca de</a></li>
          <li><a href="#" className="text-gray-600 hover:text-gray-900">Servicios</a></li>
          <li><a href="#" className="text-gray-600 hover:text-gray-900">Contacto</a></li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;