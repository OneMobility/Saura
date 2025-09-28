import React from 'react';
import { Facebook, Instagram } from 'lucide-react';
import TikTokIcon from '@/components/icons/TikTokIcon'; // Import the new TikTokIcon

const SocialMediaBox = () => {
  return (
    <div className="bg-rosa-mexicano p-4 rounded-l-lg shadow-lg flex flex-col space-y-4">
      <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200 transition-colors">
        <Facebook className="h-8 w-8" />
      </a>
      <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200 transition-colors">
        <Instagram className="h-8 w-8" />
      </a>
      <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200 transition-colors">
        <TikTokIcon className="h-8 w-8" /> {/* Use TikTokIcon here */}
      </a>
    </div>
  );
};

export default SocialMediaBox;