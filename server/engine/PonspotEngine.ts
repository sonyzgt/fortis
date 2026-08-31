import { ProvablyFairEngine, ProvablyFairCommitment, ProvablyFairResult, VerificationReport } from './ProvablyFair';

export interface PonspotBet {
  id: string;
  txHash?: string;
  playerAddress: string;
  playerName: string;
  playerAvatar?: string;
  amountPons: number;
  startTicket: number;
  endTicket: number;
  timestamp: number;
}

export interface PonspotPlayer {
  address: string;
  name: string;
  avatar?: string;
  totalBetPons: number;
  ticketCount: number;
  startTicket: number;
  endTicket: number;
  odds: number; // Percentage (e.g. 62.50%)
}

export interface PonspotWinner {
  address: string;
  name: string;
  avatar?: string;
  winningTicket: number;
  ticketCount: number;
  odds: number;
  totalPoolPons: number;
  prizePons: number;      // 95% of pool
  feePons: number;        // 5% platform fee
  claimed: boolean;
  claimTxHash?: string;
}

export interface PonspotGameRound {
  gameId: string;
  gameHash: string;
  serverSeedHash: string;
  publicSeed: string;
  nonce: number;
  status: 'waiting' | 'open' | 'spinning' | 'complete';
  startTime: number;
  endTime: number;
  timeRemaining: number;
  totalPool: number;       // In PONSPOT
  totalTickets: number;    // 1 PONSPOT = 1 Ticket
  totalPlayers: number;
  players: PonspotPlayer[];
  bets: PonspotBet[];
  winner: PonspotWinner | null;
  revealedServerSeed?: string;
  winningHash?: string;
  winningTicket?: number;
  minPlayers: number;
  countdownDuration: number;
  totalBurnedPons?: number;
}

// Backward compatibility type aliases
export type PonscoreBet = PonspotBet;
export type PonscorePlayer = PonspotPlayer;
export type PonscoreWinner = PonspotWinner;
export type PonscoreGameRound = PonspotGameRound;

export class PonspotEngine {
  private currentNonce: number = 0;
  private currentCommitment: ProvablyFairCommitment | null = null;

  public gameId: string = '';
  public status: 'waiting' | 'open' | 'spinning' | 'complete' = 'waiting';
  public startTime: number = 0;
  public endTime: number = 0;
  public timeRemaining: number = 15;
  public totalPool: number = 0;
  public totalTickets: number = 0;
  public minPlayers: number = 2;
  public countdownDuration: number = 15;
  public totalBurnedPons: number = 0;

  private bets: PonspotBet[] = [];
  private playersMap: Map<string, PonspotPlayer> = new Map();
  public winner: PonspotWinner | null = null;
  public revealedServerSeed: string = '';
  public winningHash: string = '';
  public winningTicket: number = 0;

  private ticker: NodeJS.Timeout | null = null;
  private countdownStarted: boolean = false;
  private pastGames: PonspotGameRound[] = [];

  public onUpdate?: (game: PonspotGameRound) => void;
  public onSystemMessage?: (text: string) => void;
  public onWinner?: (winner: PonspotWinner, round: PonspotGameRound) => void;

  constructor() {
    this.startNewGame();
  }

  private generateGameId(): string {
    const chars = '0123456789ABCDEF';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return `PONSPOT-${code}`;
  }

  public startNewGame(): void {
    if (this.ticker) clearInterval(this.ticker);

    this.currentNonce++;
    this.gameId = this.generateGameId();
    this.status = 'waiting';
    this.countdownStarted = false;
    this.totalPool = 0;
    this.totalTickets = 0;
    this.bets = [];
    this.playersMap.clear();
    this.winner = null;
    this.revealedServerSeed = '';
    this.winningHash = '';
    this.winningTicket = 0;
    this.timeRemaining = this.countdownDuration;

    // 1. Create Pre-commitment (Provably Fair)
    this.currentCommitment = ProvablyFairEngine.createCommitment(
      this.gameId,
      this.currentNonce,
      'ponspot-2026'
    );

    this.startTime = Date.now();
    this.endTime = this.startTime + this.countdownDuration * 1000;

    this.ticker = setInterval(() => this.tick(), 1000);
    this.broadcast();

    if (this.onSystemMessage) {
      this.onSystemMessage(`🎮 New game ${this.gameId} opened! Waiting for at least 2 players to place PONSPOT bets...`);
    }
  }

  private tick(): void {
    if (this.status !== 'open' || !this.countdownStarted) {
      return;
    }

    const now = Date.now();
    this.timeRemaining = Math.max(0, Math.ceil((this.endTime - now) / 1000));

    if (this.timeRemaining <= 0) {
      this.triggerDraw();
    } else {
      this.broadcast();
    }
  }

  /**
   * Start 15s countdown when 2+ unique players enter
   */
  private startCountdown(): void {
    if (this.countdownStarted) return;
    this.countdownStarted = true;
    this.status = 'open';
    this.startTime = Date.now();
    this.endTime = Date.now() + this.countdownDuration * 1000;
    this.timeRemaining = this.countdownDuration;

    this.broadcast();

    if (this.onSystemMessage) {
      this.onSystemMessage(`⚡ 2 players have placed bets! ${this.countdownDuration}s countdown started — place your PONSPOT bets now!`);
    }
  }

  /**
   * Player places a bet with PONSPOT tokens
   */
  public placeBet(
    playerAddress: string,
    playerName: string,
    amountPons: number,
    playerAvatar?: string,
    txHash?: string
  ): { success: boolean; message: string; bet?: PonspotBet } {
    if (this.status === 'spinning' || this.status === 'complete') {
      return { success: false, message: 'Game is currently spinning or completed. Please wait for the next round.' };
    }

    if (amountPons < 100000) {
      return { success: false, message: 'Minimum bet is 100,000 PONSPOT.' };
    }

    const ticketCount = Math.floor(amountPons); // 1 PONSPOT = 1 Ticket
    const startTicket = this.totalTickets;
    const endTicket = startTicket + ticketCount - 1;

    const bet: PonspotBet = {
      id: `bet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      txHash,
      playerAddress,
      playerName,
      playerAvatar,
      amountPons,
      startTicket,
      endTicket,
      timestamp: Date.now(),
    };

    this.bets.push(bet);
    this.totalPool += amountPons;
    this.totalTickets += ticketCount;

    // Update / Aggregate player summary
    const normAddr = playerAddress.toLowerCase();
    const existing = this.playersMap.get(normAddr);
    if (existing) {
      existing.totalBetPons += amountPons;
      existing.ticketCount += ticketCount;
      existing.endTicket = endTicket;
      if (playerName) existing.name = playerName;
      if (playerAvatar) existing.avatar = playerAvatar || '/image/logo.png';
    } else {
      this.playersMap.set(normAddr, {
        address: playerAddress,
        name: playerName || `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}`,
        avatar: playerAvatar || '/image/logo.png',
        totalBetPons: amountPons,
        ticketCount,
        startTicket,
        endTicket,
        odds: 0,
      });
    }

    // Recalculate percentage odds
    const totalTix = this.totalTickets;
    this.playersMap.forEach((p) => {
      p.odds = parseFloat(((p.ticketCount / totalTix) * 100).toFixed(2));
    });

    // Check countdown trigger
    if (!this.countdownStarted && this.playersMap.size >= this.minPlayers) {
      this.startCountdown();
    } else {
      this.broadcast();
    }

    return { success: true, message: `Successfully placed ${amountPons.toLocaleString()} PONSPOT bet!`, bet };
  }

  /**
   * Trigger the provably fair draw
   */
  private triggerDraw(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.status = 'spinning';
    this.timeRemaining = 0;

    if (!this.currentCommitment || this.totalTickets <= 0 || this.playersMap.size === 0) {
      this.startNewGame();
      return;
    }

    // Determine deterministic winner using HMAC-SHA256
    const pfResult: ProvablyFairResult = ProvablyFairEngine.determineWinner(
      this.currentCommitment.serverSeed,
      this.currentCommitment.publicSeed,
      this.currentCommitment.gameId,
      this.currentCommitment.nonce,
      this.totalTickets
    );

    this.winningTicket = pfResult.winningTicket;
    this.winningHash = pfResult.winningHash;
    this.revealedServerSeed = pfResult.revealedServerSeed;

    // Find winning player whose ticket range covers winningTicket
    let winningPlayer: PonspotPlayer | null = null;
    for (const p of Array.from(this.playersMap.values())) {
      if (this.winningTicket >= p.startTicket && this.winningTicket <= p.endTicket) {
        winningPlayer = p;
        break;
      }
    }

    // Fallback if boundary rounding
    if (!winningPlayer) {
      winningPlayer = Array.from(this.playersMap.values())[0];
    }

    // Calculate 5% Platform Fee & 95% Winner Prize
    const feePons = Math.floor(this.totalPool * 0.05);
    const prizePons = this.totalPool - feePons;

    this.winner = {
      address: winningPlayer.address,
      name: winningPlayer.name,
      avatar: winningPlayer.avatar,
      winningTicket: this.winningTicket,
      ticketCount: winningPlayer.ticketCount,
      odds: winningPlayer.odds,
      totalPoolPons: this.totalPool,
      prizePons,
      feePons,
      claimed: false,
    };

    this.broadcast();

    if (this.onSystemMessage) {
      this.onSystemMessage(`🎲 Betting closed! Decelerating wheel is selecting the winner for ${this.gameId}...`);
    }

    // 13.0 seconds extended high-speed to zero slow-motion on client, then finalize
    setTimeout(() => {
      this.finalizeGame();
    }, 13000);
  }

  private finalizeGame(): void {
    if (!this.winner) return;

    this.status = 'complete';

    // 5% Deflationary Burn to Dead Address accumulator
    const roundBurn = this.winner.feePons || Math.floor(this.winner.totalPoolPons * 0.05);
    this.totalBurnedPons += roundBurn;

    const completedRound = this.getState();
    this.pastGames.unshift(completedRound);
    if (this.pastGames.length > 20) this.pastGames.pop();

    this.broadcast();

    if (this.onWinner) {
      this.onWinner(this.winner, completedRound);
    }

    if (this.onSystemMessage) {
      this.onSystemMessage(
        `🏆 ${this.winner.name} won ${this.winner.prizePons.toLocaleString()} PONSPOT! (${roundBurn.toLocaleString()} PONSPOT burned permanently 🔥)`
      );
    }

    setTimeout(() => {
      this.startNewGame();
    }, 2500);
  }

  /**
   * Mark winnings as claimed on-chain
   */
  public markWinningsClaimed(gameId: string, claimTxHash: string): boolean {
    if (this.gameId === gameId && this.winner) {
      this.winner.claimed = true;
      this.winner.claimTxHash = claimTxHash;
      this.broadcast();
      return true;
    }
    const past = this.pastGames.find((g) => g.gameId === gameId);
    if (past && past.winner) {
      past.winner.claimed = true;
      past.winner.claimTxHash = claimTxHash;
      this.broadcast();
      return true;
    }
    return false;
  }

  /**
   * Reset claim status so winners whose claims were not finalized on-chain can claim again
   */
  public resetClaims() {
    for (const g of this.pastGames) {
      if (g.winner) {
        g.winner.claimed = false;
        g.winner.claimTxHash = undefined;
      }
    }
    if (this.winner) {
      this.winner.claimed = false;
      this.winner.claimTxHash = undefined;
    }
    this.broadcast();
  }

  /**
   * Get all completed rounds won by a player that are still unclaimed
   */
  public getUnclaimedByPlayer(address: string): PonspotGameRound[] {
    if (!address) return [];
    const norm = address.toLowerCase();
    const list: PonspotGameRound[] = [];

    // Check current round winner if completed and unclaimed
    if (this.winner && this.winner.address.toLowerCase() === norm && !this.winner.claimed) {
      list.push(this.getState());
    }

    // Check past games
    for (const g of this.pastGames) {
      if (g.winner && g.winner.address.toLowerCase() === norm && !g.winner.claimed) {
        if (!list.some((item) => item.gameId === g.gameId)) {
          list.push(g);
        }
      }
    }
    return list;
  }

  public getState(): PonspotGameRound {
    return {
      gameId: this.gameId,
      gameHash: this.currentCommitment?.gameHash || '',
      serverSeedHash: this.currentCommitment?.serverSeedHash || '',
      publicSeed: this.currentCommitment?.publicSeed || 'ponspot-2026',
      nonce: this.currentNonce,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
      timeRemaining: this.timeRemaining,
      totalPool: this.totalPool,
      totalTickets: this.totalTickets,
      totalPlayers: this.playersMap.size,
      players: Array.from(this.playersMap.values()),
      bets: this.bets,
      winner: this.winner,
      revealedServerSeed: this.status === 'complete' ? this.revealedServerSeed : undefined,
      winningHash: this.status === 'complete' ? this.winningHash : undefined,
      winningTicket: this.status === 'complete' ? this.winningTicket : undefined,
      minPlayers: this.minPlayers,
      countdownDuration: this.countdownDuration,
      totalBurnedPons: this.totalBurnedPons,
    };
  }

  public getPastGames(): PonspotGameRound[] {
    return this.pastGames;
  }

  public getGameById(gameId: string): PonspotGameRound | null {
    if (this.gameId === gameId) return this.getState();
    return this.pastGames.find((g) => g.gameId === gameId) || null;
  }

  public verifyGameById(gameId: string): VerificationReport | null {
    const game = this.getGameById(gameId);
    if (!game || !game.revealedServerSeed || game.winningTicket === undefined) {
      return null;
    }

    return ProvablyFairEngine.verifyGame(
      game.revealedServerSeed,
      game.serverSeedHash,
      game.publicSeed,
      game.gameId,
      game.nonce,
      game.totalTickets,
      game.winningTicket
    );
  }

  // --- AIRDROP VAULT MANAGEMENT ---
  public airdropPoolBalance: number = 10000;
  public airdropRewardPerClaim: number = 100;
  public airdropContractAddress: string = '';
  public airdropClaims: Array<{
    playerAddress: string;
    playerName: string;
    amount: number;
    timestamp: number;
    signature?: string;
    txHash?: string;
  }> = [];

  public setAirdropContract(address: string): void {
    if (address && address.startsWith('0x')) {
      this.airdropContractAddress = address;
    }
  }

  public fundAirdropPool(amount: number, txHash?: string): number {
    this.airdropPoolBalance += Math.max(0, amount);
    return this.airdropPoolBalance;
  }

  public setAirdropReward(reward: number): void {
    if (reward > 0) this.airdropRewardPerClaim = reward;
  }

  public getAirdropState(): {
    poolBalance: number;
    rewardPerClaim: number;
    totalClaimsCount: number;
    airdropContractAddress: string;
    claimedAddresses: string[];
    recentClaims: any[];
  } {
    return {
      poolBalance: this.airdropPoolBalance,
      rewardPerClaim: this.airdropRewardPerClaim,
      totalClaimsCount: this.airdropClaims.length,
      airdropContractAddress: this.airdropContractAddress,
      claimedAddresses: this.airdropClaims.map((c) => c.playerAddress.toLowerCase()),
      recentClaims: this.airdropClaims.slice(-10),
    };
  }

  public claimAirdrop(
    playerAddress: string,
    playerName: string,
    signature?: string
  ): { success: boolean; amount: number; message: string; remainingPool: number } {
    if (!playerAddress) {
      return { success: false, amount: 0, message: 'Invalid wallet address', remainingPool: this.airdropPoolBalance };
    }

    const norm = playerAddress.toLowerCase();
    const now = Date.now();

    const alreadyClaimed = this.airdropClaims.some(
      (c) => c.playerAddress.toLowerCase() === norm
    );

    if (alreadyClaimed) {
      return {
        success: false,
        amount: 0,
        message: 'Your wallet has already claimed this airdrop (Maximum 1 claim per wallet).',
        remainingPool: this.airdropPoolBalance,
      };
    }

    const claimAmount = Math.min(this.airdropRewardPerClaim, this.airdropPoolBalance);
    if (claimAmount <= 0) {
      return {
        success: false,
        amount: 0,
        message: 'Airdrop pool is currently empty. Please wait for admin to deposit funds.',
        remainingPool: this.airdropPoolBalance,
      };
    }

    this.airdropPoolBalance -= claimAmount;
    this.airdropClaims.push({
      playerAddress,
      playerName: playerName || `${playerAddress.slice(0, 6)}...`,
      amount: claimAmount,
      timestamp: now,
      signature,
    });

    return {
      success: true,
      amount: claimAmount,
      message: `Successfully claimed ${claimAmount} PONSPOT from the Community Airdrop Vault!`,
      remainingPool: this.airdropPoolBalance,
    };
  }

  public resetAirdropClaims(): void {
    this.airdropClaims = [];
    this.airdropPoolBalance = 10000;
  }

  /**
   * Complete Factory Reset: purges all rounds, testing pots, claims, and resets to clean state for hosting
   */
  public factoryReset(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.currentNonce = 0;
    this.totalPool = 0;
    this.totalTickets = 0;
    this.totalBurnedPons = 0;
    this.bets = [];
    this.playersMap.clear();
    this.winner = null;
    this.revealedServerSeed = '';
    this.winningHash = '';
    this.winningTicket = 0;
    this.pastGames = [];
    this.airdropClaims = [];
    this.airdropPoolBalance = 0;
    this.airdropContractAddress = '';
    this.startNewGame();
  }

  private broadcast(): void {
    if (this.onUpdate) {
      this.onUpdate(this.getState());
    }
  }
}

// Alias class for backward compatibility
export const PonscoreEngine = PonspotEngine;
