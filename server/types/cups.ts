export interface CupsGame {
  id: string;
  playerAddress: string;
  playerName: string;
  playerAvatar?: string;
  betAmount: number;
  cupsCount: number;         // Always 3
  maxPicks: number;          // 2 for standard (1.47x), 1 for high-risk (2.94x)
  logoPosition?: number;     // 0, 1, or 2 (hidden until game over)
  pickedIndices: number[];   // Cups chosen by player
  multiplier: number;
  payout: number;
  status: 'in_progress' | 'won' | 'lost';
  serverSeed?: string;       // Revealed upon completion
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  createdAt: number;
  endedAt?: number;
  isClaimed: boolean;
  claimTxHash?: string;
  txHash?: string;
}

export interface CupPickResult {
  cupIndex: number;
  hasLogo: boolean;
  gameOver: boolean;
  status: 'in_progress' | 'won' | 'lost';
  multiplier: number;
  payout: number;
  logoPosition?: number;
  serverSeed?: string;
  unclaimedGame?: CupsGame;
}

export interface CupsVerifyReport {
  serverSeedValid: boolean;
  calculatedServerSeedHash: string;
  expectedServerSeedHash: string;
  calculatedLogoPosition: number;
  actualLogoPosition: number;
  allPassed: boolean;
}
