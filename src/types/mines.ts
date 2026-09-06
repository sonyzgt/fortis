export interface MinesGame {
  id: string;
  playerAddress: string;
  playerName: string;
  playerAvatar?: string;
  betAmount: number;
  mineCount: number;
  gridSize: number;                // 25 (5x5)
  minePositions?: number[];        // [0..24] (only populated after game completion)
  revealedIndices: number[];       // Tiles opened by player
  currentMultiplier: number;
  currentPayout: number;
  nextMultiplier: number;
  status: 'in_progress' | 'cashed_out' | 'busted';
  serverSeed?: string;             // Only revealed once game is over
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  createdAt: number;
  endedAt?: number;
  isClaimed: boolean;
  claimTxHash?: string;
  txHash?: string;
}

export interface MinesTileResult {
  index: number;
  isMine: boolean;
  multiplier: number;
  payout: number;
  nextMultiplier: number;
  gameOver: boolean;
  status: 'in_progress' | 'cashed_out' | 'busted';
  minePositions?: number[];
  serverSeed?: string;
  unclaimedGame?: MinesGame;
}

export interface MinesCashoutResult {
  success: boolean;
  gameId: string;
  payout: number;
  multiplier: number;
  minePositions: number[];
  serverSeed: string;
  unclaimedGame?: MinesGame;
}

export interface MinesVerifyReport {
  serverSeedValid: boolean;
  calculatedServerSeedHash: string;
  expectedServerSeedHash: string;
  calculatedMinePositions: number[];
  actualMinePositions: number[];
  allPassed: boolean;
}
