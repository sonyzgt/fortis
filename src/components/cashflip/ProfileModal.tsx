'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Check, X, Shuffle, Upload, Shield } from 'lucide-react';
import { getUserStats } from '@/lib/levelSystem';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: string | null;
  currentName: string;
  currentAvatar: string;
  onSaveProfile: (name: string, avatar: string) => void;
}

const RANDOM_NAMES = [
  'AetherNode',
  'NocturneCipher',
  'VanguardFortis',
  'ZeroExOperator',
  'GildedOracle',
  'ArchonVault',
  'QuantObserver',
  'VeritasScalar',
  'SubZeroUnit',
  'SpectralApex',
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setAvatar(currentAvatar || '/image/logo.png');
    }
  }, [isOpen, currentName, currentAvatar]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const handleRandomizeName = () => {
    const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    setName(`${random}-${num}`);
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

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#030508]/85 backdrop-blur-xl select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="glass-capsule rounded-3xl text-[#F5F7FA] max-w-md w-full relative p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(205, 180, 134,0.1)] font-sans border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div className="space-y-0.5">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#00E701] block font-bold">
                OPERATOR PROFILE
              </span>
              <h3 className="font-heading text-lg font-bold text-[#F5F7FA] tracking-wide uppercase">
                EDIT IDENTITY
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8993A4] hover:text-[#F5F7FA] bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 py-4">
            {/* Live Profile Node Preview */}
            <div className="glass-capsule rounded-2xl p-3.5 flex items-center gap-3.5 relative">
              <div className="relative w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 p-0.5 flex-shrink-0 overflow-hidden shadow-inner">
                <img
                  src={avatar || '/image/logo.png'}
                  alt="Avatar"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-xs font-bold text-[#F5F7FA] truncate uppercase">
                  {name || 'INITIATE CIPHER'}
                </div>
                <div className="text-[11px] font-mono text-[#8993A4] truncate">
                  {account ? `${account.slice(0, 8)}...${account.slice(-6)}` : 'NO WALLET CONNECTED'}
                </div>
                <div className="text-[10px] font-mono tracking-wider uppercase text-[#00E701]">
                  DISPATCH COUNT: {userStats.gamesPlayed} ROUNDS
                </div>
              </div>
            </div>

            {/* Callsign Input */}
            <div className="space-y-2">
              <label className="text-[11px] tracking-[0.15em] uppercase text-[#8993A4] block font-bold font-mono">
                OPERATOR CALLSIGN
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={20}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter callsign..."
                  className="glass-input flex-1 px-4 py-2 text-xs text-[#F5F7FA] placeholder-[#8993A4]/50"
                />
                <button
                  type="button"
                  onClick={handleRandomizeName}
                  className="glass-btn-chip px-3.5 py-2 flex items-center gap-1.5 cursor-pointer text-[#00E701]"
                  title="Randomize callsign"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase font-bold font-mono">GEN</span>
                </button>
              </div>
            </div>

            {/* Avatar Upload */}
            <div className="space-y-2 pt-1">
              <label className="text-[11px] tracking-[0.15em] uppercase text-[#8993A4] block font-bold font-mono">
                AVATAR
              </label>
              <div className="p-3.5 glass-capsule rounded-2xl flex items-center gap-4 border border-white/[0.08]">
                {/* Current Avatar Preview */}
                <div className="relative w-14 h-14 rounded-xl bg-white/[0.04] border border-[#00E701]/30 p-1 flex-shrink-0 overflow-hidden shadow-[0_4px_16px_rgba(205,180,134,0.15)] flex items-center justify-center">
                  <img
                    src={avatar || '/image/logo.png'}
                    alt="Avatar Preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>

                {/* Upload Action */}
                <div className="flex-1 space-y-1.5">
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
                    className="glass-btn-inflated px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md hover:scale-[1.02] transition-transform"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>UPLOAD AVATAR</span>
                  </button>
                  <p className="text-[10px] text-[#8993A4] font-mono">
                    PNG, JPG, WEBP • Max 2MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 glass-btn-chip text-xs uppercase tracking-wider text-[#8993A4] hover:text-[#F5F7FA] transition-colors cursor-pointer"
            >
              DISCARD
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 glass-btn-inflated text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>COMMIT PROFILE</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
