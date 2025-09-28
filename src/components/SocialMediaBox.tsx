import React from 'react';
import { Facebook, Instagram } from 'lucide-react';

const SocialMediaBox = () => {
  return (
    <div className="bg-rosa-mexicano p-4 rounded-l-lg shadow-lg flex flex-col space-y-4">
      <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200 transition-colors">
        <Facebook className="h-8 w-8" />
      </a>
      <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200 transition-colors">
        <Instagram className="h-8 w-8" />
      </a>
      {/* El icono de TikTok no está disponible directamente en lucide-react.
          Por ahora, se usa un enlace de texto. Si se necesita un icono, se puede
          añadir un SVG personalizado o integrar otra librería de iconos. */}
      <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200 transition-colors flex items-center justify-center h-8 w-8 text-sm font-bold">
        TikTok
      </a>
    </div>
  );
};

export default SocialMediaBox;