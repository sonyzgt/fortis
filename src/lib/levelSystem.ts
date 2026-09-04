export interface UserLevelInfo {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  prevLevelXp: number;
  progressPercent: number;
  gamesPlayed: number;
  totalVolumeUsdg: number;
  totalVolumePons?: number;
  isChatUnlocked: boolean; // Level >= 5
  isAirdropUnlocked: boolean; // Level >= 5
}

// XP thresholds for Level 1 to 10
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

export function getUserLevelInfo(gamesPlayed: number, totalVolumeUsdg: number): UserLevelInfo {
  // Formula: 1 Game = 100 XP, 100 USDG volume = 100 XP
  const xpFromGames = Math.max(0, gamesPlayed) * 100;
  const xpFromVolume = Math.floor(Math.max(0, totalVolumeUsdg) / 1000);
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
    totalVolumeUsdg,
    totalVolumePons: totalVolumeUsdg,
    isChatUnlocked: true,
    isAirdropUnlocked: true,
  };
}

export function getUserStats(accountAddress?: string | null): {
  gamesPlayed: number;
  totalVolumeUsdg: number;
  totalVolumePons: number;
  hasClaimedAirdrop: boolean;
  totalAirdropClaimed: number;
  lastAirdropClaim: number;
} {
  if (typeof window === 'undefined' || !accountAddress) {
    return { gamesPlayed: 0, totalVolumeUsdg: 0, totalVolumePons: 0, hasClaimedAirdrop: false, totalAirdropClaimed: 0, lastAirdropClaim: 0 };
  }
  try {
    const key = `cashflip_user_stats_${accountAddress.toLowerCase()}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      const vol = parsed.totalVolumeUsdg ?? parsed.totalVolumePons ?? 0;
      return {
        gamesPlayed: parsed.gamesPlayed || 0,
        totalVolumeUsdg: vol,
        totalVolumePons: vol,
        totalAirdropClaimed: parsed.totalAirdropClaimed || (parsed.hasClaimedAirdrop ? 100 : 0),
        hasClaimedAirdrop: !!parsed.hasClaimedAirdrop || (parsed.lastAirdropClaim > 0),
        lastAirdropClaim: parsed.lastAirdropClaim || 0,
      };
    }
  } catch (e) {
    console.error('Failed to load user stats:', e);
  }
  return { gamesPlayed: 0, totalVolumeUsdg: 0, totalVolumePons: 0, hasClaimedAirdrop: false, totalAirdropClaimed: 0, lastAirdropClaim: 0 };
}

export function recordUserBet(
  accountAddress: string,
  amount: number
): ReturnType<typeof getUserStats> {
  if (typeof window === 'undefined' || !accountAddress) {
    return getUserStats(accountAddress);
  }
  const current = getUserStats(accountAddress);
  const newVol = current.totalVolumeUsdg + amount;
  const updated = {
    ...current,
    gamesPlayed: current.gamesPlayed + 1,
    totalVolumeUsdg: newVol,
    totalVolumePons: newVol,
  };
  try {
    const key = `cashflip_user_stats_${accountAddress.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save user stats:', e);
  }
  return updated;
}

export function recordAirdropClaim(accountAddress: string, amountClaimed: number = 0): void {
  if (typeof window === 'undefined' || !accountAddress) return;
  const current = getUserStats(accountAddress);
  const newTotal = (current.totalAirdropClaimed || 0) + (amountClaimed || 0);
  const updated = {
    ...current,
    totalAirdropClaimed: newTotal,
    hasClaimedAirdrop: true,
    lastAirdropClaim: Date.now(),
  };
  try {
    const key = `cashflip_user_stats_${accountAddress.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save airdrop claim:', e);
  }
}
