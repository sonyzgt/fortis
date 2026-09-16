import React from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';

interface StakeGameCardProps {
  title: string;
  description: string;
  href: string;
  imageSrc: string;
  badge?: 'HOT' | 'NEW' | null;
  accentColor?: string;
}

export function StakeGameCard({
  title,
  description,
  href,
  imageSrc,
  badge,
  accentColor = '#00E701',
}: StakeGameCardProps) {
  return (
    <Link href={href} className="group block">
      <div className="relative bg-[#1A2C38] border border-[#213743] rounded-xl overflow-hidden transition-all duration-200 group-hover:border-[#2A4658] group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-black/50">
        {/* Badge */}
        {badge && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider ${
                badge === 'HOT' ? 'bg-[#E74C3C] text-white' : 'bg-[#00E701] text-[#071824]'
              }`}
            >
              {badge}
            </span>
          </div>
        )}

        {/* Thumbnail Container - Portrait Aspect Ratio (3/4) matching Stake original game covers */}
        <div className="relative w-full aspect-[3/4] bg-[#0F212E] overflow-hidden">
          <img
            src={imageSrc}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Subtle gradient overlay at bottom for smooth transition into text */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#1A2C38] to-transparent opacity-60" />

          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-transform transform group-hover:scale-110 active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              <Play className="w-5 h-5 text-[#071824] fill-current ml-0.5" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-3.5 bg-[#1A2C38]">
          <h3 className="text-white font-bold text-sm tracking-wide group-hover:text-[#00E701] transition-colors">{title}</h3>
          <p className="text-[#557086] text-xs mt-0.5 line-clamp-2 leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );
}

