'use client';

import React from 'react';

interface CelestialEmblemProps {
  className?: string;
  size?: number;
}

/**
 * Platform Brand Logo Component
 * Renders the official /image/logo.png
 */
export const CelestialEmblem: React.FC<CelestialEmblemProps> = ({
  className = '',
  size,
}) => {
  return (
    <img
      src="/image/logo.png"
      alt="Kofuku Logo"
      width={size}
      height={size}
      className={`object-contain select-none transition-all ${className}`}
    />
  );
};
