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

  // Update sound effects enabled state
  useEffect(() => {
    sounds.enabled = soundEnabled;
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      sounds.enabled = next;
      return next;
    });
  }, []);

  const pauseBgm = useCallback(() => {}, []);
  const resumeBgm = useCallback(() => {}, []);

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
