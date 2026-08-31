export interface UserLevelInfo {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  prevLevelXp: number;
  progressPercent: number;
  gamesPlayed: number;
  totalVolumePons: number;
  isChatUnlocked: boolean; // Level >= 5
  isAirdropUnlocked: boolean; // Level >= 5
}

// XP thresholds for Level 1 to 10 (Scaled for 100,000 PONSPOT minimum bets)
export const LEVEL_THRESHOLDS = [
  0,      // Level 1: Initial
  200,    // Level 2: ~1 game with 100k bet
  600,    // Level 3: ~3 games with 100k bet
  1200,   // Level 4: ~6 games with 100k bet
  2000,   // Level 5: ~10 games or 2M volume (CHAT & AIRDROP UNLOCKED!)
  3500,   // Level 6: ~15-20 games
  6000,   // Level 7: ~30 games
  10000,  // Level 8: ~50 games
  16000,  // Level 9: ~80 games
  25000,  // Level 10: ~120+ games (Mythic Legend)
];

export function getUserLevelInfo(gamesPlayed: number, totalVolumePons: number): UserLevelInfo {
  // Formula: 1 Game = 100 XP, 100,000 PONSPOT volume = 100 XP (1 XP per 1,000 PONSPOT)
  const xpFromGames = Math.max(0, gamesPlayed) * 100;
  const xpFromVolume = Math.floor(Math.max(0, totalVolumePons) / 1000);
  const totalXp = xpFromGames + xpFromVolume;

  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const prevLevelXp = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextLevelXp = LEVEL_THRESHOLDS[level] || (prevLevelXp + 10000);
  const range = Math.max(1, nextLevelXp - prevLevelXp);
  const progressInLevel = Math.max(0, totalXp - prevLevelXp);
  const progressPercent = Math.min(100, Math.floor((progressInLevel / range) * 100));

  return {
    level,
    currentXp: totalXp,
    nextLevelXp,
    prevLevelXp,
    progressPercent,
    gamesPlayed,
    totalVolumePons,
    isChatUnlocked: level >= 5,
    isAirdropUnlocked: level >= 5,
  };
}

export function getUserStats(accountAddress?: string | null): {
  gamesPlayed: number;
  totalVolumePons: number;
  hasClaimedAirdrop: boolean;
  lastAirdropClaim: number;
} {
  if (typeof window === 'undefined' || !accountAddress) {
    return { gamesPlayed: 0, totalVolumePons: 0, hasClaimedAirdrop: false, lastAirdropClaim: 0 };
  }
  try {
    const key = `ponspot_user_stats_${accountAddress.toLowerCase()}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        hasClaimedAirdrop: !!parsed.hasClaimedAirdrop || (parsed.lastAirdropClaim > 0),
      };
    }
  } catch (e) {
    console.error('Failed to load user stats:', e);
  }
  return { gamesPlayed: 0, totalVolumePons: 0, hasClaimedAirdrop: false, lastAirdropClaim: 0 };
}

export function recordUserBet(
  accountAddress: string,
  amountPons: number
): { gamesPlayed: number; totalVolumePons: number } {
  if (typeof window === 'undefined' || !accountAddress) {
    return { gamesPlayed: 0, totalVolumePons: 0 };
  }
  const current = getUserStats(accountAddress);
  const updated = {
    ...current,
    gamesPlayed: current.gamesPlayed + 1,
    totalVolumePons: current.totalVolumePons + amountPons,
  };
  try {
    const key = `ponspot_user_stats_${accountAddress.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save user stats:', e);
  }
  return updated;
}

export function recordAirdropClaim(accountAddress: string): void {
  if (typeof window === 'undefined' || !accountAddress) return;
  const current = getUserStats(accountAddress);
  const updated = {
    ...current,
    hasClaimedAirdrop: true,
    lastAirdropClaim: Date.now(),
  };
  try {
    const key = `ponspot_user_stats_${accountAddress.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save airdrop claim:', e);
  }
}
