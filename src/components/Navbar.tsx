import React from 'react';
import { TreePalm } from 'lucide-react'; // Importa el icono correcto de palmera

const Navbar = () => {
  return (
    <nav className="bg-white shadow-sm w-full flex items-stretch min-h-[64px]">
      {/* Caja rosa mexicano con corte diagonal */}
      <div
        className="bg-rosa-mexicano flex items-center pl-4 pr-12"
        style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)', minWidth: '200px' }}
      >
        <div className="flex items-center space-x-2"> {/* Contenedor para el icono y el texto */}
          <TreePalm className="text-white h-6 w-6" /> {/* Icono de palmera */}
          <div className="text-lg font-bold text-white">Saura Tours</div>
        </div>
      </div>

      {/* Enlaces de navegación (ahora vacíos) */}
      <div className="flex-grow flex items-center justify-end pr-4">
        {/* Aquí construiremos el menú poco a poco */}
      </div>
    </nav>
  );
};

export default Navbar;