import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { CoinFlipGame } from '../types/jackpot';

const HISTORY_FILE = path.join(process.cwd(), 'coinflip_history.json');

export class CoinFlipEngine {
  private games: Map<string, CoinFlipGame> = new Map();
  private completedGames: CoinFlipGame[] = [];
  private unclaimedGames: Map<string, CoinFlipGame> = new Map();
  private secretSeeds: Map<string, string> = new Map();
  private nextRoomNumber: number = 1001;

  public onUpdate?: (games: CoinFlipGame[]) => void;
  public onGameComplete?: (game: CoinFlipGame) => void;
  public onSystemMessage?: (text: string) => void;

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.completedGames)) {
          this.completedGames = data.completedGames;
        }
        if (Array.isArray(data.unclaimedGames)) {
          data.unclaimedGames.forEach((g: CoinFlipGame) => {
            this.unclaimedGames.set(g.id, g);
          });
        }
        if (typeof data.nextRoomNumber === 'number' && data.nextRoomNumber >= 1001) {
          this.nextRoomNumber = data.nextRoomNumber;
        }
      }
    } catch (e) {
      console.warn('Could not load coinflip history from disk:', e);
    }
  }

  private saveToDisk(): void {
    try {
      const data = {
        nextRoomNumber: this.nextRoomNumber,
        completedGames: this.completedGames.slice(0, 100),
        unclaimedGames: Array.from(this.unclaimedGames.values()),
      };
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.warn('Could not save coinflip history to disk:', e);
    }
  }

  public createGame(
    creatorId: string,
    creatorName: string,
    betAmount: number,
    side: 'heads' | 'tails',
    creatorAvatar?: string,
    customId?: string,
    txHash?: string
  ): { success: boolean; game?: CoinFlipGame; message: string } {
    // Check if creator already has open game
    for (const g of this.games.values()) {
      if (g.creatorId?.toLowerCase() === creatorId.toLowerCase() && g.status === 'waiting') {
        return { success: false, message: 'You already have an active game waiting for an opponent.' };
      }
    }

    if (betAmount < 100000 || betAmount > 100000000) {
      return { success: false, message: 'Bet amount must be between 100,000 - 100,000,000 FORTIS.' };
    }

    const roomNumber = this.nextRoomNumber++;
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');

    const game: CoinFlipGame = {
      id: customId || `cf_${roomNumber}_${Date.now()}`,
      roomNumber,
      creatorId,
      creatorName,
      creatorAvatar,
      creatorSide: side,
      betAmount,
      status: 'waiting',
      serverSeedHash,
      creatorTxHash: txHash,
      createdAt: Date.now(),
      isClaimed: false,
    };
    this.secretSeeds.set(game.id, serverSeed);

    this.games.set(game.id, game);
    this.saveToDisk();
    this.broadcast();

    if (this.onSystemMessage) {
      this.onSystemMessage(`🪙 [Room #${roomNumber}] ${creatorName} paid ${betAmount.toLocaleString()} USDG and created a coinflip room (side: ${side === 'heads' ? '🦅 Heads' : '🔢 Tails'})`);
    }

    return { success: true, game, message: `Coinflip Room #${roomNumber} created successfully!` };
  }

  public joinGame(
    gameId: string,
    challengerId: string,
    challengerName: string,
    challengerAvatar?: string,
    txHash?: string
  ): { success: boolean; message: string; game?: CoinFlipGame } {
    const game = this.games.get(gameId);
    if (!game) {
      return { success: false, message: 'Game not found.' };
    }
    if (game.status !== 'waiting') {
      return { success: false, message: 'Game is already in progress or completed.' };
    }
    if (game.creatorId?.toLowerCase() === challengerId.toLowerCase()) {
      return { success: false, message: 'You cannot challenge yourself.' };
    }

    // Deterministic provably fair outcome based on committed serverSeed
    const seed = this.secretSeeds.get(game.id) || (game as any)._serverSeedSecret || crypto.randomBytes(32).toString('hex');
    const hmac = crypto.createHmac('sha256', seed).update(`${game.id}:${game.creatorId}:${challengerId}`).digest('hex');
    const result: 'heads' | 'tails' = (parseInt(hmac.slice(0, 8), 16) % 2 === 0) ? 'heads' : 'tails';
    game.result = result;
    const creatorWins = game.creatorSide === result;
    game.winnerId = creatorWins ? game.creatorId : challengerId;
    game.winnerName = creatorWins ? game.creatorName : challengerName;
    game.winAmount = game.betAmount * 2;

    game.challengerId = challengerId;
    game.challengerName = challengerName;
    game.challengerAvatar = challengerAvatar;
    game.challengerTxHash = txHash;
    game.status = 'flipping';

    this.broadcast();

    if (this.onSystemMessage) {
      this.onSystemMessage(`⚡ [Room #${game.roomNumber || 'Duel'}] ${challengerName} matched ${game.betAmount.toLocaleString()} USDG bet against ${game.creatorName}! Flipping coin...`);
    }

    // Flip after animation delay (3200ms matching client deceleration curve)
    setTimeout(() => {
      this.resolveGame(game);
    }, 3200);

    return { success: true, message: 'Payment confirmed & joined game!', game };
  }

  public playAgainstAiInRoom(
    gameId: string,
    requesterId: string
  ): { success: boolean; message: string; game?: CoinFlipGame } {
    const game = this.games.get(gameId);
    if (!game) {
      return { success: false, message: 'Game not found.' };
    }
    if (game.status !== 'waiting') {
      return { success: false, message: 'Game is no longer waiting for an opponent.' };
    }
    if (game.creatorId?.toLowerCase() !== requesterId.toLowerCase()) {
      return { success: false, message: 'Only the room creator can summon the AI.' };
    }

    // Pre-calculate provably fair result deterministically from committed serverSeed
    const seed = this.secretSeeds.get(game.id) || crypto.randomBytes(32).toString('hex');
    const hmac = crypto.createHmac('sha256', seed).update(`${game.id}:${game.creatorId}:ai_oracle`).digest('hex');
    const result: 'heads' | 'tails' = (parseInt(hmac.slice(0, 8), 16) % 2 === 0) ? 'heads' : 'tails';
    game.result = result;
    const creatorWins = game.creatorSide === result;
    game.winnerId = creatorWins ? game.creatorId : 'ai_oracle';
    game.winnerName = creatorWins ? game.creatorName : 'AI Oracle';
    game.winAmount = game.betAmount * 2;

    game.challengerId = 'ai_oracle';
    game.challengerName = 'AI Oracle';
    game.challengerAvatar = '/image/logo.png';
    game.status = 'flipping';

    this.broadcast();

    if (this.onSystemMessage) {
      this.onSystemMessage(`🤖 AI Oracle joined [Room #${game.roomNumber || 'Duel'}] against ${game.creatorName}! Flipping coin...`);
    }

    // Flip after animation delay (3200ms matching client deceleration curve)
    setTimeout(() => {
      this.resolveGame(game);
    }, 3200);

    return { success: true, message: 'AI Oracle joined the duel!', game };
  }

  private resolveGame(game: CoinFlipGame): void {
    const serverSeed = this.secretSeeds.get(game.id) || (game as any)._serverSeedSecret || crypto.randomBytes(32).toString('hex');
    if (!game.result) {
      const hmac = crypto.createHmac('sha256', serverSeed).update(`${game.id}:${game.creatorId}:${game.challengerId || 'ai_oracle'}`).digest('hex');
      const result: 'heads' | 'tails' = (parseInt(hmac.slice(0, 8), 16) % 2 === 0) ? 'heads' : 'tails';
      game.result = result;
      const creatorWins = game.creatorSide === result;
      game.winnerId = creatorWins ? game.creatorId : game.challengerId;
      game.winnerName = creatorWins ? game.creatorName : game.challengerName;
      game.winAmount = game.betAmount * 2;
    }
    const result = game.result;
    game.status = 'complete';
    game.isClaimed = false;
    game.serverSeed = serverSeed;
    this.secretSeeds.delete(game.id);
    delete (game as any)._serverSeedSecret;

    // Register as unclaimed game so player can claim anytime even if disconnected
    this.unclaimedGames.set(game.id, { ...game });

    this.completedGames.unshift({ ...game });
    if (this.completedGames.length > 100) this.completedGames.pop();

    this.saveToDisk();
    this.broadcast();
    if (this.onGameComplete) this.onGameComplete(game);

    if (this.onSystemMessage) {
      this.onSystemMessage(
        `🏆 [Room #${game.roomNumber || 'Duel'}] ${game.winnerName} won the coinflip duel for ${game.winAmount?.toLocaleString()} USDG! (Result: ${result === 'heads' ? '🦅 Heads' : '🔢 Tails'})`
      );
    }

    // Remove from active open list after 10 seconds, but game remains safe in completedGames and unclaimedGames!
    setTimeout(() => {
      this.games.delete(game.id);
      this.broadcast();
    }, 10000);
  }

  public cancelGame(
    gameId: string,
    requesterId: string
  ): { success: boolean; refundAmount?: number; message: string } {
    const game = this.games.get(gameId);
    if (!game || game.creatorId?.toLowerCase() !== requesterId.toLowerCase() || game.status !== 'waiting') {
      return { success: false, message: 'Game cannot be cancelled.' };
    }
    // If stake payment is already confirmed on-chain, room cannot be cancelled
    if (game.creatorTxHash) {
      return {
        success: false,
        message: 'Stake payment is already confirmed on-chain. Room cannot be cancelled. You can challenge the AI Oracle if you prefer not to wait.',
      };
    }
    const refundAmount = game.betAmount;
    this.games.delete(gameId);
    this.saveToDisk();
    this.broadcast();
    return { success: true, refundAmount, message: `Room #${game.roomNumber || ''} cancelled.` };
  }

  public markGameClaimed(gameId: string, claimTxHash: string): boolean {
    let found = false;

    // Check active games
    const active = this.games.get(gameId);
    if (active) {
      active.isClaimed = true;
      active.claimTxHash = claimTxHash;
      active.claimedAt = Date.now();
      found = true;
    }

    // Check completed games
    const comp = this.completedGames.find((g) => g.id === gameId);
    if (comp) {
      comp.isClaimed = true;
      comp.claimTxHash = claimTxHash;
      comp.claimedAt = Date.now();
      found = true;
    }

    // Remove from unclaimed map
    if (this.unclaimedGames.has(gameId)) {
      const ug = this.unclaimedGames.get(gameId)!;
      ug.isClaimed = true;
      ug.claimTxHash = claimTxHash;
      ug.claimedAt = Date.now();
      this.unclaimedGames.delete(gameId);
      found = true;
    }

    this.saveToDisk();
    this.broadcast();
    return found;
  }

  public getUnclaimedByPlayer(playerAddress: string): CoinFlipGame[] {
    if (!playerAddress) return [];
    const addr = playerAddress.toLowerCase();

    // Combine from unclaimedGames map and any unflagged in completedGames
    const results: CoinFlipGame[] = [];
    const seenIds = new Set<string>();

    for (const game of this.unclaimedGames.values()) {
      if (game.winnerId?.toLowerCase() === addr && !game.isClaimed && game.status === 'complete') {
        results.push({ ...game });
        seenIds.add(game.id);
      }
    }

    for (const game of this.completedGames) {
      if (!seenIds.has(game.id) && game.winnerId?.toLowerCase() === addr && !game.isClaimed && game.status === 'complete') {
        results.push({ ...game });
        seenIds.add(game.id);
      }
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  public getGameById(gameId: string): CoinFlipGame | undefined {
    return this.games.get(gameId) || this.unclaimedGames.get(gameId) || this.completedGames.find((g) => g.id === gameId);
  }

  public getOpenGames(): CoinFlipGame[] {
    return Array.from(this.games.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getCompletedGames(): CoinFlipGame[] {
    return this.completedGames;
  }


  public clearHistory(): void {
    this.completedGames = [];
    this.saveToDisk();
  }

  private broadcast(): void {
    if (this.onUpdate) {
      this.onUpdate(this.getOpenGames());
    }
  }
}

