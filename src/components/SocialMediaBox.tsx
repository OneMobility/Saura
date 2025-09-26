import React from 'react';
import { Facebook, Instagram } from 'lucide-react'; // Eliminado TikTok

const SocialMediaBox = () => {
  return (
    <div className="bg-rosa-mexicano p-4 rounded-l-lg shadow-lg flex flex-col space-y-4">
      <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200 transition-colors">
        <Facebook className="h-8 w-8" />
      </a>
      <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200 transition-colors">
        <Instagram className="h-8 w-8" />
      </a>
      {/* El enlace a TikTok ha sido eliminado temporalmente */}
      {/* <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200 transition-colors">
        <TikTok className="h-8 w-8" />
      </a> */}
    </div>
  );
};

export default SocialMediaBox;