export interface Ticket {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  walletAddress?: string;
  quantity: number;
  totalCost: number;
  txHash?: string;
  timestamp: number;
}

export interface PotParticipant {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  walletAddress?: string;
  ticketCount: number;
  totalSpent: number;
  odds: number;
}

export interface WinnerInfo {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  walletAddress?: string;
  ticketCount: number;
  potWon: number;
  odds: number;
  winningTicket: number;
  txHash?: string;
  timestamp: number;
}

export interface PastRound {
  roundNumber: number;
  winner: WinnerInfo;
  totalPot: number;
  totalPlayers: number;
  timestamp: number;
}

export interface JackpotRound {
  id: string;
  roundNumber: number;
  status: 'waiting' | 'open' | 'spinning' | 'complete';
  ticketPrice: number;
  totalTickets: number;
  totalPot: number;
  participants: PotParticipant[];
  recentEntries: Ticket[];
  endTime: number;
  timeRemaining: number;
  winner: WinnerInfo | null;
  previousRounds: PastRound[];
  countdownStarted: boolean;
  minPlayers: number;
}

export interface CoinFlipGame {
  id: string;
  roomNumber?: number;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  creatorSide: 'heads' | 'tails';
  betAmount: number;
  status: 'waiting' | 'flipping' | 'complete';
  challengerId?: string;
  challengerName?: string;
  challengerAvatar?: string;
  result?: 'heads' | 'tails';
  winnerId?: string;
  winnerName?: string;
  winAmount?: number;
  serverSeedHash?: string;
  serverSeed?: string;
  creatorTxHash?: string;
  challengerTxHash?: string;
  createdAt: number;
  isClaimed?: boolean;
  claimTxHash?: string;
  claimedAt?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  walletAddress?: string;
  totalWon: number;
  winsCount: number;
  lastWin: number;
}
