import React from 'react';
import logoImg from '../../assets/logo.png';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  imgClassName?: string;
  textClassName?: string;
  subtitle?: React.ReactNode;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  imgClassName = '',
  textClassName = '',
  subtitle,
}) => {
  const sizeMap = {
    xs: { img: 'w-6 h-6', text: 'text-sm' },
    sm: { img: 'w-7 h-7', text: 'text-base' },
    md: { img: 'w-8 h-8 sm:w-9 sm:h-9', text: 'text-lg' },
    lg: { img: 'w-10 h-10', text: 'text-xl' },
    xl: { img: 'w-12 h-12', text: 'text-2xl' },
  };

  const current = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src={logoImg}
        alt="CampusPrint Logo"
        className={`object-contain flex-shrink-0 drop-shadow-xs transition-transform duration-200 hover:scale-105 ${current.img} ${imgClassName}`}
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-extrabold tracking-tight ${current.text} ${textClassName}`}>
            <span className="text-black">Campus</span>
            <span className="text-blue-600">Print</span>
          </span>
          {subtitle && (
            <span className="mt-1 truncate">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
