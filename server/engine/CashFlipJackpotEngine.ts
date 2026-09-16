import { ProvablyFairEngine, ProvablyFairCommitment, ProvablyFairResult, VerificationReport } from './ProvablyFair';
import * as fs from 'fs';
import * as path from 'path';

const HISTORY_FILE = path.join(process.cwd(), 'jackpot_history.json');

export interface CashFlipBet {
  id: string;
  txHash?: string;
  playerAddress: string;
  playerName: string;
  playerAvatar?: string;
  amount: number;
  amountPons?: number;
  startTicket: number;
  endTicket: number;
  timestamp: number;
}

export interface CashFlipPlayer {
  address: string;
  name: string;
  avatar?: string;
  totalBet: number;
  totalBetPons?: number;
  ticketCount: number;
  startTicket: number;
  endTicket: number;
  odds: number; // Percentage (e.g. 62.50%)
}

export interface CashFlipWinner {
  address: string;
  name: string;
  avatar?: string;
  winningTicket: number;
  ticketCount: number;
  odds: number;
  totalPool: number;
  totalPoolPons?: number;
  prize: number;          // 98% of pool
  prizePons?: number;
  fee: number;            // 2% platform fee
  feePons?: number;
  claimed: boolean;
  claimTxHash?: string;
}

export interface CashFlipGameRound {
  gameId: string;
  gameHash: string;
  serverSeedHash: string;
  publicSeed: string;
  nonce: number;
  status: 'waiting' | 'open' | 'spinning' | 'complete';
  startTime: number;
  endTime: number;
  timeRemaining: number;
  totalPool: number;       // In USDG
  totalTickets: number;    // 1 USDG = 100 Tickets
  totalPlayers: number;
  players: CashFlipPlayer[];
  bets: CashFlipBet[];
  winner: CashFlipWinner | null;
  revealedServerSeed?: string;
  winningHash?: string;
  winningTicket?: number;
  minPlayers: number;
  countdownDuration: number;
  totalBurnedPons?: number;
}

export class CashFlipJackpotEngine {
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

  private bets: CashFlipBet[] = [];
  private playersMap: Map<string, CashFlipPlayer> = new Map();
  public winner: CashFlipWinner | null = null;
  public revealedServerSeed: string = '';
  public winningHash: string = '';
  public winningTicket: number = 0;

  private ticker: NodeJS.Timeout | null = null;
  private countdownStarted: boolean = false;
  private pastGames: CashFlipGameRound[] = [];
  private claimedGameIds: Set<string> = new Set();

  public onUpdate?: (game: CashFlipGameRound) => void;
  public onSystemMessage?: (text: string) => void;
  public onWinner?: (winner: CashFlipWinner, round: CashFlipGameRound) => void;

  constructor() {
    this.loadFromDisk();
    this.startNewGame();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.pastGames)) {
          this.pastGames = data.pastGames;
        }
        if (Array.isArray(data.claimedGameIds)) {
          this.claimedGameIds = new Set(
            data.claimedGameIds.map((id: string) => String(id).trim().toLowerCase())
          );
        }
      }
    } catch (e) {
      console.warn('Could not load jackpot history from disk:', e);
    }
  }

  private saveToDisk(): void {
    try {
      const data = {
        pastGames: this.pastGames.slice(0, 50),
        claimedGameIds: Array.from(this.claimedGameIds),
      };
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.warn('Could not save jackpot history to disk:', e);
    }
  }

  private generateGameId(): string {
    const chars = '0123456789ABCDEF';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return `FORTIS-${code}`;
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
    this.timeRemaining = 0;

    // 1. Create Pre-commitment (Provably Fair)
    this.currentCommitment = ProvablyFairEngine.createCommitment(
      this.gameId,
      this.currentNonce,
      'fortis-2026'
    );

    this.startTime = Date.now();
    this.endTime = 0;

    this.ticker = setInterval(() => this.tick(), 1000);
    this.broadcast();

    if (this.onSystemMessage) {
      this.onSystemMessage(`🎮 New game ${this.gameId} opened! Waiting for players to place USDG bets...`);
    }
  }

  private tick(): void {
    if (this.status === 'waiting') {
      // Pure PvP: do not tick countdown when waiting for 2nd player
      return;
    }

    if (this.status === 'open' && this.countdownStarted) {
      const now = Date.now();
      this.timeRemaining = Math.max(0, Math.ceil((this.endTime - now) / 1000));

      if (this.timeRemaining <= 0) {
        this.triggerDraw();
      } else {
        this.broadcast();
      }
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
      this.onSystemMessage(`⚡ 2 contenders have entered the pool! ${this.countdownDuration}s countdown initiated!`);
    }
  }

  /**
   * Player places a bet with USDG tokens
   */
  public placeBet(
    playerAddress: string,
    playerName: string,
    amountPons: number,
    playerAvatar?: string,
    txHash?: string
  ): { success: boolean; message: string; bet?: CashFlipBet } {
    if (this.status === 'spinning' || this.status === 'complete') {
      return { success: false, message: 'Game is currently spinning or completed. Please wait for the next round.' };
    }

    if (amountPons < 100000) {
      return { success: false, message: 'Minimum bet is 100,000 FORTIS.' };
    }

    const ticketCount = Math.max(1, Math.floor(amountPons)); // 1 FORTIS = 1 Ticket
    const startTicket = this.totalTickets;
    const endTicket = startTicket + ticketCount - 1;

    const bet: CashFlipBet = {
      id: `bet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      txHash,
      playerAddress,
      playerName,
      playerAvatar,
      amount: amountPons,
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
      existing.totalBet = (existing.totalBet || 0) + amountPons;
      existing.totalBetPons = existing.totalBet;
      existing.ticketCount += ticketCount;
      existing.endTicket = endTicket;
      if (playerName) existing.name = playerName;
      if (playerAvatar) existing.avatar = playerAvatar || '/image/logo.png';
    } else {
      this.playersMap.set(normAddr, {
        address: playerAddress,
        name: playerName || `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}`,
        avatar: playerAvatar || '/image/logo.png',
        totalBet: amountPons,
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
    if (!this.countdownStarted) {
      if (this.playersMap.size >= this.minPlayers) {
        this.startCountdown();
      } else {
        this.timeRemaining = 0;
        this.broadcast();
      }
    } else {
      this.broadcast();
    }

    return { success: true, message: `Successfully placed ${amountPons.toLocaleString()} USDG bet!`, bet };
  }

  /**
   * Trigger the provably fair draw
   */
  private triggerDraw(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.status = 'spinning';
    this.timeRemaining = 10;

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
    let winningPlayer: CashFlipPlayer | null = null;
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

    // Calculate 2% Platform Fee (Retained in smart contract for Admin) & 98% Winner Net Prize
    const feePons = parseFloat((this.totalPool * 0.02).toFixed(4));
    const prizePons = parseFloat((this.totalPool - feePons).toFixed(4));

    this.winner = {
      address: winningPlayer.address,
      name: winningPlayer.name,
      avatar: winningPlayer.avatar,
      winningTicket: this.winningTicket,
      ticketCount: winningPlayer.ticketCount,
      odds: winningPlayer.odds,
      totalPool: this.totalPool,
      totalPoolPons: this.totalPool,
      prize: prizePons,
      prizePons,
      fee: feePons,
      feePons,
      claimed: false,
    };

    this.broadcast();

    if (this.onSystemMessage) {
      this.onSystemMessage(`🎲 Betting closed! Decelerating wheel is selecting the winner for ${this.gameId}...`);
    }

    // 11.5 seconds server delay: 10.0s client slow-mo animation + 1.5s post-spin reveal before finalizing
    setTimeout(() => {
      this.finalizeGame();
    }, 11500);
  }

  private finalizeGame(): void {
    const winner = this.winner;
    if (!winner) return;

    this.status = 'complete';

    // 2% Platform Fee retained in smart contract for Admin
    const totalPool = winner.totalPoolPons ?? 0;
    const roundFee = winner.feePons || parseFloat((totalPool * 0.02).toFixed(4));
    this.totalBurnedPons += roundFee;

    const completedRound = this.getState();
    this.pastGames.unshift(completedRound);
    if (this.pastGames.length > 50) this.pastGames.pop();
    this.saveToDisk();

    this.broadcast();

    if (this.onWinner) {
      this.onWinner(winner, completedRound);
    }

    if (this.onSystemMessage) {
      const prizeStr = (winner.prizePons ?? 0).toLocaleString();
      this.onSystemMessage(
        `🏆 ${winner.name} won ${prizeStr} USDG! (2% Admin fee retained in contract 💎)`
      );
    }

    // 5 seconds celebration so players see winner highlight & modal before next round starts
    setTimeout(() => {
      this.startNewGame();
    }, 5000);
  }

  /**
   * Mark winnings as claimed on-chain
   */
  public markWinningsClaimed(gameId: string, claimTxHash: string): boolean {
    if (!gameId) return false;
    const target = String(gameId).trim().toLowerCase();
    this.claimedGameIds.add(target);

    let found = false;
    if (this.gameId && String(this.gameId).trim().toLowerCase() === target && this.winner) {
      this.winner.claimed = true;
      this.winner.claimTxHash = claimTxHash;
      found = true;
    }
    const past = this.pastGames.find((g) => String(g.gameId).trim().toLowerCase() === target);
    if (past && past.winner) {
      past.winner.claimed = true;
      past.winner.claimTxHash = claimTxHash;
      found = true;
    }
    this.saveToDisk();
    this.broadcast();
    return found || true;
  }

  /**
   * Reset claim status so winners whose claims were not finalized on-chain can claim again
   */
  public resetClaims() {
    this.claimedGameIds.clear();
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
    this.saveToDisk();
    this.broadcast();
  }

  /**
   * Get all completed rounds won by a player that are still unclaimed
   */
  public getUnclaimedByPlayer(address: string): CashFlipGameRound[] {
    if (!address) return [];
    const norm = address.toLowerCase();
    const list: CashFlipGameRound[] = [];

    // Check current round winner if completed and unclaimed
    if (
      this.winner &&
      this.winner.address.toLowerCase() === norm &&
      !this.winner.claimed &&
      !this.claimedGameIds.has(String(this.gameId).trim().toLowerCase())
    ) {
      list.push(this.getState());
    }

    // Check past games
    for (const g of this.pastGames) {
      const gId = String(g.gameId).trim().toLowerCase();
      if (
        g.winner &&
        g.winner.address.toLowerCase() === norm &&
        !g.winner.claimed &&
        !this.claimedGameIds.has(gId)
      ) {
        if (!list.some((item) => item.gameId === g.gameId)) {
          list.push(g);
        }
      }
    }
    return list;
  }

  public getState(): CashFlipGameRound {
    return {
      gameId: this.gameId,
      gameHash: this.currentCommitment?.gameHash || '',
      serverSeedHash: this.currentCommitment?.serverSeedHash || '',
      publicSeed: this.currentCommitment?.publicSeed || 'fortis-2026',
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

  public getPastGames(): CashFlipGameRound[] {
    return this.pastGames;
  }

  public getGameById(gameId: string): CashFlipGameRound | null {
    if (!gameId) return null;
    const target = String(gameId).trim().toLowerCase();
    if (this.gameId && String(this.gameId).trim().toLowerCase() === target) {
      return this.getState();
    }
    return (
      this.pastGames.find(
        (g) => String(g.gameId).trim().toLowerCase() === target
      ) || null
    );
  }

  public verifyGameById(gameId: string): VerificationReport | null {
    const game = this.getGameById(gameId);
    if (
      !game ||
      !game.revealedServerSeed ||
      game.winningTicket === undefined ||
      !game.winningHash ||
      !game.gameHash
    ) {
      return null;
    }

    return ProvablyFairEngine.verifyGame(
      game.revealedServerSeed,
      game.serverSeedHash,
      game.publicSeed,
      game.nonce,
      game.gameId,
      game.gameHash,
      game.winningHash,
      game.winningTicket,
      game.totalTickets
    );
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
    this.startNewGame();
  }

  /**
   * Clear all past historical games from memory and disk
   */
  public clearHistory(): void {
    this.pastGames = [];
    this.saveToDisk();
  }

  private broadcast(): void {
    if (this.onUpdate) {
      this.onUpdate(this.getState());
    }
  }
}

