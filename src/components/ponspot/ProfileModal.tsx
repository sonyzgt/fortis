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
          className="bg-[#060b17]/98 border-2 border-cyan-500/40 shadow-[0_0_50px_rgba(0,240,255,0.25)] rounded-2xl p-6 max-w-md w-full relative overflow-hidden backdrop-blur-2xl text-white select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.3)]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-wider font-orbitron text-neon-cyan">PLAYER IDENTITY DECK</h3>
                <p className="text-[10px] text-slate-400 font-mono">Customize your avatar & netrunner handle</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 py-4">
            {/* Live Profile Preview */}
            <div className="p-4 rounded-xl bg-[#091224] border border-cyan-500/30 flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-xl bg-black/60 p-1 border-2 border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.4)] flex-shrink-0 overflow-hidden flex items-center justify-center">
                <img
                  src={avatar || '/image/logo.png'}
                  alt="Profile Avatar Preview"
                  className="w-full h-full rounded-lg object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black truncate font-cyber text-white">{name || 'Player Name'}</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-[#00f0ff] text-[10px] font-mono font-bold">
                    LV. {levelInfo.level} ({levelInfo.currentXp} XP)
                  </span>
                </div>
                <div className="w-full bg-black/60 border border-cyan-500/20 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-[#00f0ff] h-full rounded-full transition-all shadow-[0_0_8px_#00f0ff]"
                    style={{ width: `${Math.min(100, Math.max(8, levelInfo.progressPercent))}%` }}
                  />
                </div>
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  {account ? `${account.slice(0, 8)}...${account.slice(-6)}` : 'Wallet not connected'} • {userStats.gamesPlayed} Rounds Played
                </p>
              </div>
            </div>

            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block font-mono">
                CALLSIGN // NICKNAME
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={20}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter callsign..."
                  className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#091224] border border-cyan-500/30 text-xs font-bold font-mono focus:outline-none focus:border-[#00f0ff] text-white focus:shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                />
                <button
                  type="button"
                  onClick={handleRandomizeName}
                  className="cyber-btn-glass px-3 py-2.5 rounded-lg text-xs font-bold text-cyan-300 flex items-center gap-1.5 shadow-sm font-mono"
                  title="Generate random name"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">RANDOM</span>
                </button>
              </div>
            </div>

            {/* Avatar Selection Tabs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block font-mono">
                  AVATAR SOURCE
                </label>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-cyan-500/20 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setActiveTab('presets')}
                    className={`px-2 py-1 rounded transition-all ${
                      activeTab === 'presets'
                        ? 'bg-[#00f0ff] text-black font-black shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    PRESETS
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('url')}
                    className={`px-2 py-1 rounded transition-all ${
                      activeTab === 'url'
                        ? 'bg-[#00f0ff] text-black font-black shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={`px-2 py-1 rounded transition-all ${
                      activeTab === 'upload'
                        ? 'bg-[#00f0ff] text-black font-black shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    UPLOAD
                  </button>
                </div>
              </div>

              {/* Tab: Presets */}
              {activeTab === 'presets' && (
                <div className="grid grid-cols-4 gap-2.5 p-2 rounded-xl bg-[#091224] border border-cyan-500/20">
                  {PRESET_AVATARS.map((pUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(pUrl)}
                      className={`relative w-full aspect-square rounded-lg p-1 border-2 transition-all overflow-hidden flex items-center justify-center ${
                        avatar === pUrl
                          ? 'border-[#00f0ff] bg-cyan-950/80 shadow-[0_0_12px_rgba(0,240,255,0.4)] scale-105'
                          : 'border-transparent bg-black/40 hover:border-cyan-500/40'
                      }`}
                    >
                      <img src={pUrl} alt="" className="w-full h-full object-cover rounded-md" />
                      {avatar === pUrl && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#00f0ff] flex items-center justify-center text-black">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Tab: URL */}
              {activeTab === 'url' && (
                <div className="space-y-2 p-3 rounded-xl bg-[#091224] border border-cyan-500/20">
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://example.com/avatar.png"
                      className="flex-1 px-3 py-2 rounded-lg bg-black/60 border border-cyan-500/30 text-xs font-mono text-white focus:outline-none focus:border-[#00f0ff]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customUrl.trim()) {
                          setAvatar(customUrl.trim());
                        }
                      }}
                      className="cyber-btn-cyan px-3 py-2 rounded-lg text-xs font-mono font-bold"
                    >
                      APPLY
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Direct link from Discord, X/Twitter, or Imgur.
                  </p>
                </div>
              )}

              {/* Tab: Upload File */}
              {activeTab === 'upload' && (
                <div className="p-4 rounded-xl bg-[#091224] border border-cyan-500/20 text-center">
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
                    className="w-full py-4 border-2 border-dashed border-cyan-500/30 rounded-lg hover:border-[#00f0ff] transition-colors flex flex-col items-center justify-center gap-1.5"
                  >
                    <Upload className="w-5 h-5 text-[#00f0ff]" />
                    <span className="text-xs font-bold text-white">Select image from local storage</span>
                    <span className="text-[10px] text-slate-400 font-mono">PNG, JPG, SVG max 2MB</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-3 border-t border-cyan-500/20">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono font-bold text-slate-300 transition-colors"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 cyber-btn-cyan py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md font-orbitron"
            >
              <Check className="w-4 h-4" />
              <span>SAVE PROFILE</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};


