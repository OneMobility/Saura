import React from 'react';

const Navbar = () => {
  return (
    <nav className="bg-white shadow-sm w-full flex items-stretch min-h-[64px]">
      {/* Caja rosa mexicano con corte diagonal */}
      <div
        className="bg-rosa-mexicano flex items-center pl-4 pr-12"
        style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)', minWidth: '200px' }}
      >
        <div className="text-lg font-bold text-white">Mi Aplicación</div>
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