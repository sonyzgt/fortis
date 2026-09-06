'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { sounds } from '@/lib/soundEffects';

interface SoundContextType {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  playChip: () => void;
  playCardDeal: () => void;
  playCheck: () => void;
  playFold: () => void;
  playTick: () => void;
  playWin: () => void;
  playSuspenseRiser: () => void;
  playRollStart: () => void;
  playCoinToss: () => void;
  playCoinLand: () => void;
  playCoinVictory: () => void;
  playCoinClaim: () => void;
  playMineTileClick: () => void;
  playMineGemReveal: (gemIndex?: number) => void;
  playMineExplosion: () => void;
  playMineCashout: () => void;
  pauseBgm: () => void;
  resumeBgm: () => void;
}

const SoundContext = createContext<SoundContextType>({
  soundEnabled: true,
  setSoundEnabled: () => {},
  toggleSound: () => {},
  playChip: () => {},
  playCardDeal: () => {},
  playCheck: () => {},
  playFold: () => {},
  playTick: () => {},
  playWin: () => {},
  playSuspenseRiser: () => {},
  playRollStart: () => {},
  playCoinToss: () => {},
  playCoinLand: () => {},
  playCoinVictory: () => {},
  playCoinClaim: () => {},
  playMineTileClick: () => {},
  playMineGemReveal: () => {},
  playMineExplosion: () => {},
  playMineCashout: () => {},
  pauseBgm: () => {},
  resumeBgm: () => {},
});

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const activeGamesCountRef = useRef<number>(0);

  // Initialize and manage backsound.mp3
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio('/backsound.mp3');
    audio.loop = true;
    audio.volume = 0.35;
    bgmRef.current = audio;

    const tryPlayBgm = () => {
      if (sounds.enabled && activeGamesCountRef.current === 0 && bgmRef.current) {
        bgmRef.current.play().catch(() => {
          // Blocked by browser autoplay policy until user gesture
        });
      }
    };

    // Attempt to start on mount
    tryPlayBgm();

    // Unlock audio upon first user gesture anywhere on the window
    const handleGesture = () => {
      tryPlayBgm();
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };

    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('click', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
    };
  }, []);

  // Update sound effects and BGM when soundEnabled changes
  useEffect(() => {
    sounds.enabled = soundEnabled;
    if (!soundEnabled) {
      if (bgmRef.current) {
        bgmRef.current.pause();
      }
    } else {
      if (activeGamesCountRef.current === 0 && bgmRef.current) {
        bgmRef.current.play().catch(() => {});
      }
    }
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (next && activeGamesCountRef.current === 0 && bgmRef.current) {
        bgmRef.current.play().catch(() => {});
      } else if (!next && bgmRef.current) {
        bgmRef.current.pause();
      }
      return next;
    });
  }, []);

  const pauseBgm = useCallback(() => {
    activeGamesCountRef.current = Math.max(1, activeGamesCountRef.current + 1);
    if (bgmRef.current) {
      bgmRef.current.pause();
    }
  }, []);

  const resumeBgm = useCallback(() => {
    activeGamesCountRef.current = Math.max(0, activeGamesCountRef.current - 1);
    if (activeGamesCountRef.current === 0 && sounds.enabled && bgmRef.current) {
      bgmRef.current.play().catch(() => {});
    }
  }, []);

  const playChip = useCallback(() => sounds.playChip(), []);
  const playCardDeal = useCallback(() => sounds.playCardDeal(), []);
  const playCheck = useCallback(() => sounds.playCheck(), []);
  const playFold = useCallback(() => sounds.playFold(), []);
  const playTick = useCallback(() => sounds.playTick(), []);
  const playWin = useCallback(() => sounds.playWin(), []);
  const playSuspenseRiser = useCallback(() => sounds.playSuspenseRiser(), []);
  const playRollStart = useCallback(() => sounds.playRollStart(), []);
  const playCoinToss = useCallback(() => sounds.playCoinToss(), []);
  const playCoinLand = useCallback(() => sounds.playCoinLand(), []);
  const playCoinVictory = useCallback(() => sounds.playCoinVictory(), []);
  const playCoinClaim = useCallback(() => sounds.playCoinClaim(), []);
  const playMineTileClick = useCallback(() => sounds.playMineTileClick(), []);
  const playMineGemReveal = useCallback((gemIndex?: number) => sounds.playMineGemReveal(gemIndex), []);
  const playMineExplosion = useCallback(() => sounds.playMineExplosion(), []);
  const playMineCashout = useCallback(() => sounds.playMineCashout(), []);

  return (
    <SoundContext.Provider
      value={{
        soundEnabled,
        setSoundEnabled,
        toggleSound,
        playChip,
        playCardDeal,
        playCheck,
        playFold,
        playTick,
        playWin,
        playSuspenseRiser,
        playRollStart,
        playCoinToss,
        playCoinLand,
        playCoinVictory,
        playCoinClaim,
        playMineTileClick,
        playMineGemReveal,
        playMineExplosion,
        playMineCashout,
        pauseBgm,
        resumeBgm,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => useContext(SoundContext);
