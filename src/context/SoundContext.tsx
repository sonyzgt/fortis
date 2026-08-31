'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
});

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  useEffect(() => {
    sounds.enabled = soundEnabled;
  }, [soundEnabled]);

  const toggleSound = () => {
    setSoundEnabled((prev) => !prev);
  };

  return (
    <SoundContext.Provider
      value={{
        soundEnabled,
        setSoundEnabled,
        toggleSound,
        playChip: () => sounds.playChip(),
        playCardDeal: () => sounds.playCardDeal(),
        playCheck: () => sounds.playCheck(),
        playFold: () => sounds.playFold(),
        playTick: () => sounds.playTick(),
        playWin: () => sounds.playWin(),
        playSuspenseRiser: () => sounds.playSuspenseRiser(),
        playRollStart: () => sounds.playRollStart(),
      }}
    >
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => useContext(SoundContext);
