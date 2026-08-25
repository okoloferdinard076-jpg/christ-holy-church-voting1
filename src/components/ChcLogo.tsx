import React from 'react';

interface ChcLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showText?: boolean;
}

export const ChcLogo: React.FC<ChcLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
}) => {
  const sizeMap = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12 sm:w-14 sm:h-14',
    lg: 'w-16 h-16 sm:w-20 sm:h-20',
    xl: 'w-24 h-24 sm:w-28 sm:h-28',
    hero: 'w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`} id="chc-official-brand">
      <div className={`relative shrink-0 flex items-center justify-center p-1 rounded-xl bg-white/95 shadow-xs ring-1 ring-slate-200/80 ${sizeMap[size]}`}>
        <img
          src="/logo.svg"
          alt="Christ Holy Church International No. 2 Benin Official Emblem"
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <div className="flex flex-col text-left">
          <span className="text-xs md:text-sm font-bold tracking-tight text-blue-950 uppercase leading-tight">
            Christ Holy Church International
          </span>
          <span className="text-[11px] md:text-xs font-semibold text-red-600 tracking-wider">
            No. 2 Benin Ambassadorship
          </span>
        </div>
      )}
    </div>
  );
};

