import React, { useState } from 'react';
import { Coins, Building2, Send } from 'lucide-react';

interface FlagIconProps {
  flagCode?: string;
  name: string;
  className?: string;
  fallbackType?: 'coins' | 'building' | 'send';
}

export function FlagIcon({ flagCode, name, className = "w-5 h-5", fallbackType = 'coins' }: FlagIconProps) {
  const [error, setError] = useState(false);

  const isValidFlag = flagCode && flagCode.trim() !== "" && flagCode !== "undefined" && flagCode !== "null";

  if (!isValidFlag || error) {
    const FallbackIcon = fallbackType === 'building' ? Building2 : fallbackType === 'send' ? Send : Coins;
    const bgClass = fallbackType === 'building' ? 'bg-blue-500/10 text-blue-400' : fallbackType === 'send' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400';
    
    return (
      <div className={`${className} rounded-full ${bgClass} flex items-center justify-center`}>
        <FallbackIcon className="w-3 h-3" />
      </div>
    );
  }

  return (
    <img 
      src={`https://flagcdn.com/w80/${flagCode.trim().toLowerCase()}.png`} 
      alt={name} 
      className={`${className} rounded-full object-cover drop-shadow-sm transition-transform group-hover:scale-110`}
      onError={() => setError(true)}
    />
  );
}
