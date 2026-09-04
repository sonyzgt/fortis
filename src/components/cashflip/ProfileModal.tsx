'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Check, X, Shuffle, Upload, Sparkles, Compass } from 'lucide-react';
import { getUserStats, getUserLevelInfo } from '@/lib/levelSystem';
import { BookplateCorner, CelestialFlourish } from '@/components/ui/CelestialFlourish';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: string | null;
  currentName: string;
  currentAvatar: string;
  onSaveProfile: (name: string, avatar: string) => void;
}

const PRESET_AVATARS = [
  '/image/logo.png',
  'https://api.dicebear.com/7.x/bottts/svg?seed=LuckyWhale',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CashFlipKing',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberChad',
  'https://api.dicebear.com/7.x/bottts/svg?seed=EmeraldMaster',
  'https://api.dicebear.com/7.x/bottts/svg?seed=DegenAce',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CryptoNinja',
  'https://api.dicebear.com/7.x/bottts/svg?seed=RobinhoodBull',
];

const RANDOM_NAMES = [
  'AetherVoyager',
  'NocturneSeeker',
  'CelestialAce',
  'AstrolabeLord',
  'GildedOracle',
  'LunarArchon',
  'AlchemistCashFlip',
  'VeritasScholar',
  'OccultObserver',
  'ZephyrPatron',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  account,
  currentName,
  currentAvatar,
  onSaveProfile,
}) => {
  const [name, setName] = useState(currentName);
  const [avatar, setAvatar] = useState(currentAvatar || '/image/logo.png');
  const [customUrl, setCustomUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'presets' | 'url' | 'upload'>('presets');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setAvatar(currentAvatar || '/image/logo.png');
    }
  }, [isOpen, currentName, currentAvatar]);

  if (!isOpen) return null;

  const handleRandomizeName = () => {
    const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    setName(`${random}${num}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setAvatar(src);
          return;
        }

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);
        setAvatar(compressedBase64);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const finalName = name.trim() || (account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Initiate');
    const finalAvatar = avatar.trim() || '/image/logo.png';
    onSaveProfile(finalName, finalAvatar);
    onClose();
  };

  const userStats = getUserStats(account);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0908]/75 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          className="editorial-frame bg-[#E8DFD1] text-[#171513] max-w-md w-full relative p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.5)] select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <BookplateCorner />

          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[#171513]/15">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 border border-[#9E8055]/50 bg-[#F4EFE6] flex items-center justify-center text-[#9E8055]">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] tracking-[0.25em] font-serif uppercase text-[#9E8055] block">
                  Registry of Personae
                </span>
                <h3 className="text-base font-serif tracking-[0.1em] font-semibold text-[#171513]">
                  INSCRIBE IDENTITY
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 border border-[#171513]/10 text-[#171513]/60 hover:text-[#171513] hover:border-[#171513]/30 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 py-4">
            {/* Live Profile Preview */}
            <div className="p-3.5 bg-[#F4EFE6] border border-[#171513]/15 flex items-center gap-3.5 relative">
              <div className="relative w-14 h-14 border border-[#9E8055] p-0.5 bg-[#E8DFD1] flex-shrink-0">
                <img
                  src={avatar || '/image/logo.png'}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-sm font-serif font-semibold text-[#171513] truncate">
                  {name || 'Initiate Persona'}
                </div>
                <div className="text-[10px] font-mono text-[#171513]/60 truncate">
                  {account ? `${account.slice(0, 8)}...${account.slice(-6)}` : 'No Ledger Bound'}
                </div>
                <div className="text-[9px] tracking-wider uppercase font-serif text-[#9E8055]">
                  Observatory Exp: {userStats.gamesPlayed} Epochs
                </div>
              </div>
            </div>

            {/* Inscribe Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.2em] font-serif uppercase text-[#171513]/70 block font-medium">
                PERSONA CALLSIGN / NICKNAME
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={20}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Inscribe title or name..."
                  className="flex-1 px-3 py-2 bg-[#F4EFE6] border border-[#171513]/25 text-xs font-serif text-[#171513] placeholder-[#171513]/40 focus:outline-none focus:border-[#9E8055]"
                />
                <button
                  type="button"
                  onClick={handleRandomizeName}
                  className="px-3 py-2 bg-[#E8DFD1] hover:bg-[#F4EFE6] border border-[#171513]/25 text-xs font-serif text-[#171513] flex items-center gap-1.5 transition-colors"
                  title="Draw random celestial name"
                >
                  <Shuffle className="w-3 h-3 text-[#9E8055]" />
                  <span className="text-[10px] tracking-wider uppercase">Cast</span>
                </button>
              </div>
            </div>

            {/* Avatar Selection Tabs */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] tracking-[0.2em] font-serif uppercase text-[#171513]/70 block font-medium">
                  SELECT SEAL PORTRAIT
                </label>
                <div className="flex items-center gap-1 text-[9px] font-serif tracking-wider uppercase">
                  <button
                    type="button"
                    onClick={() => setActiveTab('presets')}
                    className={`px-2 py-1 border transition-colors ${
                      activeTab === 'presets'
                        ? 'bg-[#171513] text-[#F4EFE6] border-[#171513]'
                        : 'bg-[#F4EFE6] text-[#171513]/70 border-[#171513]/20 hover:text-[#171513]'
                    }`}
                  >
                    Archives
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('url')}
                    className={`px-2 py-1 border transition-colors ${
                      activeTab === 'url'
                        ? 'bg-[#171513] text-[#F4EFE6] border-[#171513]'
                        : 'bg-[#F4EFE6] text-[#171513]/70 border-[#171513]/20 hover:text-[#171513]'
                    }`}
                  >
                    URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={`px-2 py-1 border transition-colors ${
                      activeTab === 'upload'
                        ? 'bg-[#171513] text-[#F4EFE6] border-[#171513]'
                        : 'bg-[#F4EFE6] text-[#171513]/70 border-[#171513]/20 hover:text-[#171513]'
                    }`}
                  >
                    Upload
                  </button>
                </div>
              </div>

              {/* Tab: Presets */}
              {activeTab === 'presets' && (
                <div className="grid grid-cols-4 gap-2 p-2.5 bg-[#F4EFE6] border border-[#171513]/15">
                  {PRESET_AVATARS.map((pUrl, idx) => {
                    const isSelected = avatar === pUrl;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatar(pUrl)}
                        className={`relative aspect-square p-1 border transition-all flex items-center justify-center ${
                          isSelected
                            ? 'border-[#9E8055] bg-[#E8DFD1] shadow-inner ring-1 ring-[#9E8055]'
                            : 'border-[#171513]/15 bg-[#F4EFE6] hover:border-[#171513]/40'
                        }`}
                      >
                        <img src={pUrl} alt="" className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#171513] text-[#F4EFE6] flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tab: URL */}
              {activeTab === 'url' && (
                <div className="space-y-2 p-3 bg-[#F4EFE6] border border-[#171513]/15">
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://... (direct image link)"
                      className="flex-1 px-3 py-1.5 bg-[#E8DFD1] border border-[#171513]/20 text-xs font-mono text-[#171513] focus:outline-none focus:border-[#9E8055]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customUrl.trim()) setAvatar(customUrl.trim());
                      }}
                      className="px-3 py-1.5 bg-[#171513] text-[#F4EFE6] font-serif text-[11px] tracking-wider uppercase"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-[10px] font-serif italic text-[#171513]/60">
                    Provide a public portrait link from Discord, X, or IPFS.
                  </p>
                </div>
              )}

              {/* Tab: Upload */}
              {activeTab === 'upload' && (
                <div className="p-4 bg-[#F4EFE6] border border-[#171513]/15 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 border border-dashed border-[#171513]/30 hover:border-[#9E8055] transition-colors flex flex-col items-center justify-center gap-1.5"
                  >
                    <Upload className="w-4 h-4 text-[#9E8055]" />
                    <span className="text-xs font-serif text-[#171513]">Select portrait from local archives</span>
                    <span className="text-[10px] font-mono text-[#171513]/50">PNG, JPG, WebP max 2MB</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-3 border-t border-[#171513]/15">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-[#171513]/20 hover:bg-[#171513]/5 text-xs font-serif tracking-wider uppercase text-[#171513]/70 transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2 bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] text-xs font-serif tracking-wider uppercase border border-[#9E8055]/50 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Check className="w-3.5 h-3.5 text-[#9E8055]" />
              <span>Record Changes</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
