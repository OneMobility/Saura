import React from 'react';

const Navbar = () => {
  return (
    <nav className="bg-white shadow-sm w-full p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="text-lg font-bold text-gray-800">Mi Aplicación</div>
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