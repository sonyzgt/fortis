'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Sparkles, Check, X, Shuffle, Upload } from 'lucide-react';

import { getUserStats, getUserLevelInfo } from '@/lib/levelSystem';

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
  'https://api.dicebear.com/7.x/bottts/svg?seed=PonspotKing',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberChad',
  'https://api.dicebear.com/7.x/bottts/svg?seed=EmeraldMaster',
  'https://api.dicebear.com/7.x/bottts/svg?seed=DegenAce',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CryptoNinja',
  'https://api.dicebear.com/7.x/bottts/svg?seed=RobinhoodBull',
];

const RANDOM_NAMES = [
  'PonspotKing',
  'LuckyWhale',
  'DegenChad',
  'EmeraldAce',
  'CryptoNinja',
  'RobinhoodBull',
  'MintLord',
  'JackpotMaster',
  'AlphaDegen',
  'MoonShooter',
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

      // Automatically crop & compress uploaded photo into optimized 200x200 avatar (fast & lightweight)
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

        // Center square crop
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        // Convert to crisp, lightweight JPEG base64 (<20KB)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);
        setAvatar(compressedBase64);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const finalName = name.trim() || (account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Player');
    const finalAvatar = avatar.trim() || '/image/logo.png';
    onSaveProfile(finalName, finalAvatar);
    onClose();
  };

  const userStats = getUserStats(account);
  const levelInfo = getUserLevelInfo(userStats.gamesPlayed, userStats.totalVolumePons);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="bg-[#F5F8F3]/95 dark:bg-[#0c1611]/95 border-2 border-white/90 dark:border-[#718D76]/40 rounded-3xl p-6 shadow-2xl max-w-md w-full relative overflow-hidden backdrop-blur-2xl text-[#243329] dark:text-[#F5F8F3] select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#718D76]/20 dark:bg-emerald-500/20 flex items-center justify-center text-[#718D76] dark:text-emerald-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight">EDIT PROFIL PEMAIN</h3>
                <p className="text-[10px] text-[#526256] dark:text-slate-400 font-mono">Ganti nama & avatar akun Anda</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-[#526256] dark:text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 py-4">
            {/* Live Profile Preview */}
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-2xl bg-white/90 dark:bg-black/50 p-1 border-2 border-[#718D76] dark:border-emerald-400 shadow-md flex-shrink-0 overflow-hidden flex items-center justify-center">
                <img
                  src={avatar || '/image/logo.png'}
                  alt="Profile Avatar Preview"
                  className="w-full h-full rounded-xl object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black truncate">{name || 'Nama Pemain'}</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#718D76]/20 dark:bg-emerald-500/20 text-[#718D76] dark:text-emerald-400 text-[10px] font-mono font-bold">
                    Lv. {levelInfo.level} ({levelInfo.currentXp} XP)
                  </span>
                </div>
                <div className="w-full bg-black/10 dark:bg-black/40 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#718D76] dark:bg-emerald-400 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(8, levelInfo.progressPercent))}%` }}
                  />
                </div>
                <p className="text-[10px] font-mono text-[#526256] dark:text-slate-400 truncate">
                  {account ? `${account.slice(0, 8)}...${account.slice(-6)}` : 'Wallet belum terhubung'} • {userStats.gamesPlayed} Game Dimainkan
                </p>
              </div>
            </div>

            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-[#526256] dark:text-slate-300 uppercase tracking-wider block">
                NAMA TAMPILAN (NICKNAME)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={20}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama pemain..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-[#101c16] border border-black/15 dark:border-[#718D76]/35 text-xs font-bold font-mono focus:outline-none focus:border-[#718D76] dark:focus:border-emerald-400 text-[#243329] dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleRandomizeName}
                  className="tactile-btn px-3 py-2.5 rounded-xl bg-white/70 hover:bg-white dark:bg-[#14241d] dark:hover:bg-[#1c3328] border border-black/10 dark:border-[#718D76]/30 text-xs font-bold text-[#718D76] dark:text-emerald-400 flex items-center gap-1.5 shadow-sm"
                  title="Acak nama keren"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Acak</span>
                </button>
              </div>
            </div>

            {/* Avatar Selection Tabs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-[#526256] dark:text-slate-300 uppercase tracking-wider block">
                  PILIH AVATAR
                </label>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/5 dark:bg-white/5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('presets')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      activeTab === 'presets'
                        ? 'bg-white dark:bg-[#14241d] text-[#718D76] dark:text-emerald-400 shadow-sm'
                        : 'text-[#526256] dark:text-slate-400'
                    }`}
                  >
                    Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('url')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      activeTab === 'url'
                        ? 'bg-white dark:bg-[#14241d] text-[#718D76] dark:text-emerald-400 shadow-sm'
                        : 'text-[#526256] dark:text-slate-400'
                    }`}
                  >
                    URL Gambar
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      activeTab === 'upload'
                        ? 'bg-white dark:bg-[#14241d] text-[#718D76] dark:text-emerald-400 shadow-sm'
                        : 'text-[#526256] dark:text-slate-400'
                    }`}
                  >
                    Upload
                  </button>
                </div>
              </div>

              {/* Tab: Presets */}
              {activeTab === 'presets' && (
                <div className="grid grid-cols-4 gap-2.5 p-2 rounded-2xl bg-white/40 dark:bg-[#101c16]/50 border border-black/5 dark:border-white/5">
                  {PRESET_AVATARS.map((pUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(pUrl)}
                      className={`relative w-full aspect-square rounded-xl p-1 border-2 transition-all overflow-hidden flex items-center justify-center ${
                        avatar === pUrl
                          ? 'border-[#718D76] dark:border-emerald-400 bg-white/90 dark:bg-[#1b3127] shadow-[0_0_12px_rgba(52,211,153,0.3)] scale-105'
                          : 'border-transparent bg-white/60 dark:bg-black/30 hover:border-black/20 dark:hover:border-white/20'
                      }`}
                    >
                      <img src={pUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                      {avatar === pUrl && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#718D76] dark:bg-emerald-400 flex items-center justify-center text-white dark:text-black">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Tab: URL */}
              {activeTab === 'url' && (
                <div className="space-y-2 p-3 rounded-2xl bg-white/40 dark:bg-[#101c16]/50 border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://example.com/avatar.png"
                      className="flex-1 px-3 py-2 rounded-xl bg-white/80 dark:bg-[#101c16] border border-black/15 dark:border-[#718D76]/35 text-xs font-mono text-[#243329] dark:text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customUrl.trim()) {
                          setAvatar(customUrl.trim());
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-[#718D76] dark:bg-emerald-500 text-white dark:text-black font-black text-xs shadow-sm"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-[10px] text-[#526256] dark:text-slate-400">
                    Paste an avatar image link from Discord, X/Twitter, or Imgur.
                  </p>
                </div>
              )}

              {/* Tab: Upload File */}
              {activeTab === 'upload' && (
                <div className="p-4 rounded-2xl bg-white/40 dark:bg-[#101c16]/50 border border-black/5 dark:border-white/5 text-center">
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
                    className="w-full py-4 border-2 border-dashed border-black/20 dark:border-white/20 rounded-xl hover:border-[#718D76] dark:hover:border-emerald-400 transition-colors flex flex-col items-center justify-center gap-1.5"
                  >
                    <Upload className="w-5 h-5 text-[#718D76] dark:text-emerald-400" />
                    <span className="text-xs font-bold">Pilih file gambar dari komputer</span>
                    <span className="text-[10px] text-[#526256] dark:text-slate-400">PNG, JPG, SVG maks 2MB</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-3 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 btn-primary-sage py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>SIMPAN PROFIL</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};