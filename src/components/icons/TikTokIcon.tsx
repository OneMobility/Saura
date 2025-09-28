import React from 'react';

interface TikTokIconProps extends React.SVGProps<SVGSVGElement> {}

const TikTokIcon: React.FC<TikTokIconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M12.525 0c-.148 0-.296.007-.444.021v14.716c0 1.773-1.437 3.21-3.21 3.21-1.773 0-3.21-1.437-3.21-3.21s1.437-3.21 3.21-3.21c.134 0 .267.009.4.026V7.917c-.133-.017-.266-.026-.4-.026-3.594 0-6.5 2.906-6.5 6.5s2.906 6.5 6.5 6.5c3.594 0 6.5-2.906 6.5-6.5V6.77c1.45-.812 2.437-2.418 2.437-4.291C15.437.99 14.147 0 12.525 0z"/>
  </svg>
);

export default TikTokIcon;