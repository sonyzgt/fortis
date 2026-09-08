import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  CupsGame,
  CupPickResult,
  CupsVerifyReport,
} from '../types/cups';

const HISTORY_FILE = path.join(process.cwd(), 'cups_history.json');
const DEFAULT_CUPS_COUNT = 3;

export class CupsEngine {
  private activeGames: Map<string, CupsGame> = new Map();
  private completedGames: CupsGame[] = [];
  private unclaimedGames: Map<string, CupsGame> = new Map();
  private secretLogoMap: Map<string, number> = new Map();   // Hidden logo position [0..2] until game over
  private secretSeedsMap: Map<string, string> = new Map();  // Hidden serverSeed until game over

  public onUpdate?: (game: CupsGame) => void;

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
          data.unclaimedGames.forEach((g: CupsGame) => {
            this.unclaimedGames.set(g.id, g);
          });
        }
      }
    } catch (e) {
      console.warn('Could not load cups history from disk:', e);
    }
  }

  private saveToDisk(): void {
    try {
      const data = {
        completedGames: this.completedGames.slice(0, 100),
        unclaimedGames: Array.from(this.unclaimedGames.values()),
      };
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.warn('Could not save cups history to disk:', e);
    }
  }

  /**
   * Deterministic calculation of multiplier with 98% platform RTP (2% house edge)
   * 2 picks from 3 cups: fair = 3/2 = 1.50 -> 1.50 * 0.98 = 1.47x
   * 1 pick from 3 cups: fair = 3/1 = 3.00 -> 3.00 * 0.98 = 2.94x
   */
  public static calculateMultiplier(maxPicks: number): number {
    if (maxPicks === 1) return 2.94;
    return 1.47;
  }

  /**
   * Cryptographically generate winning cup position (0, 1, or 2) using HMAC-SHA256
   */
  public static generateLogoPosition(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    gameId: string
  ): number {
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}:${gameId}:cups`);
    const hash = hmac.digest();
    const val = hash.readUInt32BE(0);
    return val % DEFAULT_CUPS_COUNT;
  }

  /**
   * Start a new Cups round
   */
  public startGame(
    playerAddress: string,
    playerName: string,
    betAmount: number,
    maxPicks: number = 2,
    playerAvatar?: string,
    clientSeed?: string,
    customGameId?: string,
    txHash?: string
  ): { success: boolean; game?: CupsGame; message?: string } {
    if (!playerAddress) {
      return { success: false, message: 'Player address is required' };
    }
    if (betAmount < 100000 || betAmount > 100000000) {
      return { success: false, message: 'Wager must be between 100,000 and 100,000,000 KOFUKU' };
    }
    const safeMaxPicks = maxPicks === 1 ? 1 : 2;
    const normAddress = playerAddress.toLowerCase();

    // Check if player already has an active in-progress round
    const existing = this.getActiveGame(normAddress);
    if (existing) {
      return { success: true, game: this.sanitizeGame(existing), message: 'Resumed existing active game' };
    }

    const gameId = customGameId || `cups_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const actualClientSeed = clientSeed || Math.random().toString(36).substring(2, 10);
    const nonce = 1;

    const logoPosition = CupsEngine.generateLogoPosition(
      serverSeed,
      actualClientSeed,
      nonce,
      gameId
    );

    const multiplier = CupsEngine.calculateMultiplier(safeMaxPicks);
    const payout = Math.round(betAmount * multiplier * 100) / 100;

    const game: CupsGame = {
      id: gameId,
      playerAddress: normAddress,
      playerName: playerName || `${normAddress.slice(0, 6)}...${normAddress.slice(-4)}`,
      playerAvatar,
      betAmount,
      cupsCount: DEFAULT_CUPS_COUNT,
      maxPicks: safeMaxPicks,
      pickedIndices: [],
      multiplier,
      payout,
      status: 'in_progress',
      serverSeedHash,
      clientSeed: actualClientSeed,
      nonce,
      createdAt: Date.now(),
      isClaimed: false,
      txHash,
    };

    this.activeGames.set(gameId, game);
    this.secretLogoMap.set(gameId, logoPosition);
    this.secretSeedsMap.set(gameId, serverSeed);

    return { success: true, game: this.sanitizeGame(game) };
  }

  /**
   * Pick a cup in the active game
   */
  public pickCup(
    gameId: string,
    playerAddress: string,
    cupIndex: number
  ): CupPickResult {
    const game = this.activeGames.get(gameId);
    if (!game) {
      throw new Error('Active game not found');
    }
    if (game.playerAddress.toLowerCase() !== playerAddress.toLowerCase()) {
      throw new Error('Unauthorized: address does not own this game');
    }
    if (game.status !== 'in_progress') {
      throw new Error('Game is not in progress');
    }
    if (cupIndex < 0 || cupIndex >= DEFAULT_CUPS_COUNT) {
      throw new Error('Invalid cup index (must be 0, 1, or 2)');
    }
    if (game.pickedIndices.includes(cupIndex)) {
      throw new Error('Cup has already been selected');
    }

    const logoPosition = this.secretLogoMap.get(gameId) ?? 0;
    const serverSeed = this.secretSeedsMap.get(gameId) || '';
    const hasLogo = cupIndex === logoPosition;

    game.pickedIndices.push(cupIndex);

    if (hasLogo) {
      // SUCCESS! Player found the KOFUKU logo
      game.status = 'won';
      game.endedAt = Date.now();
      game.serverSeed = serverSeed;
      game.logoPosition = logoPosition;

      this.activeGames.delete(gameId);
      this.completedGames.unshift({ ...game });
      this.unclaimedGames.set(gameId, { ...game });
      this.saveToDisk();

      return {
        cupIndex,
        hasLogo: true,
        gameOver: true,
        status: 'won',
        multiplier: game.multiplier,
        payout: game.payout,
        logoPosition,
        serverSeed,
        unclaimedGame: { ...game },
      };
    } else {
      // Cup is empty (missed)
      const picksRemaining = game.maxPicks - game.pickedIndices.length;

      if (picksRemaining > 0) {
        // Player still has a remaining chance
        return {
          cupIndex,
          hasLogo: false,
          gameOver: false,
          status: 'in_progress',
          multiplier: game.multiplier,
          payout: game.payout,
        };
      } else {
        // Out of chances, player lost
        game.status = 'lost';
        game.endedAt = Date.now();
        game.serverSeed = serverSeed;
        game.logoPosition = logoPosition;
        game.payout = 0;
        game.multiplier = 0;

        this.activeGames.delete(gameId);
        this.completedGames.unshift({ ...game });
        this.saveToDisk();

        return {
          cupIndex,
          hasLogo: false,
          gameOver: true,
          status: 'lost',
          multiplier: 0,
          payout: 0,
          logoPosition,
          serverSeed,
        };
      }
    }
  }

  /**
   * Find active in-progress game for an address
   */
  public getActiveGame(playerAddress: string): CupsGame | null {
    const norm = playerAddress.toLowerCase();
    for (const g of this.activeGames.values()) {
      if (g.playerAddress.toLowerCase() === norm && g.status === 'in_progress') {
        return g;
      }
    }
    return null;
  }

  public getGameById(gameId: string): CupsGame | undefined {
    return (
      this.activeGames.get(gameId) ||
      this.unclaimedGames.get(gameId) ||
      this.completedGames.find((g) => g.id === gameId)
    );
  }

  public getUnclaimedByPlayer(playerAddress: string): CupsGame[] {
    const norm = playerAddress.toLowerCase();
    const list: CupsGame[] = [];
    for (const g of this.unclaimedGames.values()) {
      if (g.playerAddress.toLowerCase() === norm && !g.isClaimed && g.status === 'won') {
        list.push(g);
      }
    }
    return list;
  }

  public markGameClaimed(gameId: string, claimTxHash: string): boolean {
    let found = false;
    const gUnclaimed = this.unclaimedGames.get(gameId);
    if (gUnclaimed) {
      gUnclaimed.isClaimed = true;
      gUnclaimed.claimTxHash = claimTxHash;
      this.unclaimedGames.delete(gameId);
      found = true;
    }
    const gCompleted = this.completedGames.find((x) => x.id === gameId);
    if (gCompleted) {
      gCompleted.isClaimed = true;
      gCompleted.claimTxHash = claimTxHash;
      found = true;
    }
    if (found) {
      this.saveToDisk();
    }
    return found;
  }

  public getHistory(): CupsGame[] {
    return this.completedGames.slice(0, 50);
  }

  /**
   * Provably fair verification for completed rounds
   */
  public verifyGame(gameId: string): CupsVerifyReport | null {
    const g = this.getGameById(gameId);
    if (!g || !g.serverSeed || g.logoPosition === undefined) {
      return null;
    }

    const calculatedHash = crypto.createHash('sha256').update(g.serverSeed).digest('hex');
    const hashMatch = calculatedHash.toLowerCase() === g.serverSeedHash.toLowerCase();

    const calculatedLogoPosition = CupsEngine.generateLogoPosition(
      g.serverSeed,
      g.clientSeed,
      g.nonce,
      g.id
    );

    const posMatch = calculatedLogoPosition === g.logoPosition;

    return {
      serverSeedValid: hashMatch,
      calculatedServerSeedHash: calculatedHash,
      expectedServerSeedHash: g.serverSeedHash,
      calculatedLogoPosition,
      actualLogoPosition: g.logoPosition,
      allPassed: hashMatch && posMatch,
    };
  }

  /**
   * Strip secret server seed and logo position before returning to active players
   */
  public sanitizeGame(game: CupsGame): CupsGame {
    const copy = { ...game };
    if (copy.status === 'in_progress') {
      delete copy.serverSeed;
      delete copy.logoPosition;
    }
    return copy;
  }
}
