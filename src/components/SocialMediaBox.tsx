import React from 'react';
import { Facebook, Instagram, Twitter } from 'lucide-react'; // Import Twitter for TikTok placeholder

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
          Por ahora, se usa el icono de Twitter como marcador de posición para mantener la consistencia visual. */}
      <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200 transition-colors">
        <Twitter className="h-8 w-8" />
      </a>
    </div>
  );
};

export default SocialMediaBox;