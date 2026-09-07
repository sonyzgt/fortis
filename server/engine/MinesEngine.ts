import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  MinesGame,
  MinesTileResult,
  MinesCashoutResult,
  MinesVerifyReport,
} from '../types/mines';

const HISTORY_FILE = path.join(process.cwd(), 'mines_history.json');
const DEFAULT_GRID_SIZE = 25; // 5x5 grid (25 tiles total)

export class MinesEngine {
  private activeGames: Map<string, MinesGame> = new Map();
  private completedGames: MinesGame[] = [];
  private unclaimedGames: Map<string, MinesGame> = new Map();
  private secretMinesMap: Map<string, number[]> = new Map(); // Hidden mine positions until round ends
  private secretSeedsMap: Map<string, string> = new Map();   // Hidden serverSeed until round ends

  public onUpdate?: (game: MinesGame) => void;

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
          data.unclaimedGames.forEach((g: MinesGame) => {
            this.unclaimedGames.set(g.id, g);
          });
        }
      }
    } catch (e) {
      console.warn('Could not load mines history from disk:', e);
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
      console.warn('Could not save mines history to disk:', e);
    }
  }

  /**
   * Deterministic calculation of fair multiplier with 98% platform disbursement charter (2% house edge)
   */
  public static calculateMultiplier(mineCount: number, revealedGemsCount: number, gridSize: number = DEFAULT_GRID_SIZE): number {
    if (revealedGemsCount <= 0) return 1.0;
    const safeGems = gridSize - mineCount;
    if (revealedGemsCount > safeGems) return 0;

    let fairMultiplier = 1.0;
    for (let i = 0; i < revealedGemsCount; i++) {
      fairMultiplier *= (gridSize - i) / (safeGems - i);
    }

    const houseEdge = 0.98; // 98% return to player
    const result = Math.floor(fairMultiplier * houseEdge * 100) / 100;
    return Math.max(1.01, result);
  }

  /**
   * Cryptographically generate mine positions from seeds using HMAC-SHA256
   */
  public static generateMinePositions(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    gameId: string,
    mineCount: number,
    gridSize: number = DEFAULT_GRID_SIZE
  ): number[] {
    const tiles = Array.from({ length: gridSize }, (_, i) => i);
    for (let i = gridSize - 1; i > 0; i--) {
      const hmac = crypto.createHmac('sha256', serverSeed);
      hmac.update(`${clientSeed}:${nonce}:${gameId}:${i}`);
      const hash = hmac.digest();
      const val = hash.readUInt32BE(0);
      const j = val % (i + 1);
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    return tiles.slice(0, mineCount).sort((a, b) => a - b);
  }

  /**
   * Start a new Mines round
   */
  public startGame(
    playerAddress: string,
    playerName: string,
    betAmount: number,
    mineCount: number,
    playerAvatar?: string,
    clientSeed?: string,
    gridSize: number = DEFAULT_GRID_SIZE,
    customGameId?: string,
    txHash?: string
  ): { success: boolean; game?: MinesGame; message?: string } {
    if (!playerAddress) {
      return { success: false, message: 'Player address is required' };
    }
    if (betAmount < 100000 || betAmount > 100000000) {
      return { success: false, message: 'Wager must be between 100,000 and 100,000,000 KOFUKU' };
    }
    const maxMines = gridSize - 1;
    if (mineCount < 1 || mineCount > maxMines) {
      return { success: false, message: `Mines count must be between 1 and ${maxMines}` };
    }

    const normAddress = playerAddress.toLowerCase();

    // Check if player has an active game already
    const existing = this.getActiveGame(normAddress);
    if (existing) {
      return { success: true, game: this.sanitizeGame(existing), message: 'Resumed existing active game' };
    }

    const gameId = customGameId || `mines_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const actualClientSeed = clientSeed || Math.random().toString(36).substring(2, 10);
    const nonce = 1;

    const actualGridSize = gridSize > 0 ? gridSize : DEFAULT_GRID_SIZE;

    const minePositions = MinesEngine.generateMinePositions(
      serverSeed,
      actualClientSeed,
      nonce,
      gameId,
      mineCount,
      actualGridSize
    );

    const nextMultiplier = MinesEngine.calculateMultiplier(mineCount, 1, actualGridSize);

    const game: MinesGame = {
      id: gameId,
      playerAddress: normAddress,
      playerName: playerName || `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}`,
      playerAvatar,
      betAmount,
      mineCount,
      gridSize: actualGridSize,
      revealedIndices: [],
      currentMultiplier: 1.0,
      currentPayout: betAmount,
      nextMultiplier,
      status: 'in_progress',
      serverSeedHash,
      clientSeed: actualClientSeed,
      nonce,
      createdAt: Date.now(),
      isClaimed: false,
      txHash,
    };

    this.activeGames.set(gameId, game);
    this.secretMinesMap.set(gameId, minePositions);
    this.secretSeedsMap.set(gameId, serverSeed);

    return { success: true, game: this.sanitizeGame(game) };
  }

  /**
   * Reveal a tile on the 5x5 grid
   */
  public revealTile(
    gameId: string,
    playerAddress: string,
    tileIndex: number
  ): MinesTileResult {
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
    const gridSize = game.gridSize || DEFAULT_GRID_SIZE;
    if (tileIndex < 0 || tileIndex >= gridSize) {
      throw new Error(`Invalid tile index (must be 0 to ${gridSize - 1})`);
    }
    if (game.revealedIndices.includes(tileIndex)) {
      throw new Error('Tile has already been revealed');
    }

    const minePositions = this.secretMinesMap.get(gameId) || [];
    const serverSeed = this.secretSeedsMap.get(gameId) || '';
    const isMine = minePositions.includes(tileIndex);

    game.revealedIndices.push(tileIndex);

    if (isMine) {
      // BUST! Player stepped on a mine
      game.status = 'busted';
      game.endedAt = Date.now();
      game.serverSeed = serverSeed;
      game.minePositions = minePositions;

      this.activeGames.delete(gameId);
      this.completedGames.unshift({ ...game });
      this.saveToDisk();

      return {
        index: tileIndex,
        isMine: true,
        multiplier: 0,
        payout: 0,
        nextMultiplier: 0,
        gameOver: true,
        status: 'busted',
        minePositions,
        serverSeed,
      };
    } else {
      // SAFE! Gem uncovered
      const revealedCount = game.revealedIndices.length;
      const totalSafeGems = gridSize - game.mineCount;
      const currentMultiplier = MinesEngine.calculateMultiplier(game.mineCount, revealedCount, gridSize);
      const currentPayout = Math.round(game.betAmount * currentMultiplier * 100) / 100;
      game.currentMultiplier = currentMultiplier;
      game.currentPayout = currentPayout;

      // Check if all safe gems have been discovered (Max Win / Auto Cashout)
      if (revealedCount >= totalSafeGems) {
        game.status = 'cashed_out';
        game.endedAt = Date.now();
        game.serverSeed = serverSeed;
        game.minePositions = minePositions;

        this.activeGames.delete(gameId);
        this.completedGames.unshift({ ...game });
        this.unclaimedGames.set(gameId, { ...game });
        this.saveToDisk();

        return {
          index: tileIndex,
          isMine: false,
          multiplier: currentMultiplier,
          payout: currentPayout,
          nextMultiplier: 0,
          gameOver: true,
          status: 'cashed_out',
          minePositions,
          serverSeed,
          unclaimedGame: { ...game },
        };
      }

      const nextMultiplier = MinesEngine.calculateMultiplier(game.mineCount, revealedCount + 1, gridSize);
      game.nextMultiplier = nextMultiplier;

      return {
        index: tileIndex,
        isMine: false,
        multiplier: currentMultiplier,
        payout: currentPayout,
        nextMultiplier,
        gameOver: false,
        status: 'in_progress',
      };
    }
  }

  /**
   * Cash out current winnings
   */
  public cashOut(gameId: string, playerAddress: string): MinesCashoutResult {
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
    if (game.revealedIndices.length === 0) {
      throw new Error('Must reveal at least one safe gem before cashing out');
    }

    const minePositions = this.secretMinesMap.get(gameId) || [];
    const serverSeed = this.secretSeedsMap.get(gameId) || '';

    game.status = 'cashed_out';
    game.endedAt = Date.now();
    game.serverSeed = serverSeed;
    game.minePositions = minePositions;

    this.activeGames.delete(gameId);
    this.completedGames.unshift({ ...game });
    this.unclaimedGames.set(gameId, { ...game });
    this.saveToDisk();

    return {
      success: true,
      gameId,
      payout: game.currentPayout,
      multiplier: game.currentMultiplier,
      minePositions,
      serverSeed,
      unclaimedGame: { ...game },
    };
  }

  /**
   * Find active in-progress game for an address
   */
  public getActiveGame(playerAddress: string): MinesGame | null {
    const norm = playerAddress.toLowerCase();
    for (const g of this.activeGames.values()) {
      if (g.playerAddress.toLowerCase() === norm && g.status === 'in_progress') {
        return g;
      }
    }
    return null;
  }

  public getGameById(gameId: string): MinesGame | undefined {
    return (
      this.activeGames.get(gameId) ||
      this.unclaimedGames.get(gameId) ||
      this.completedGames.find((g) => g.id === gameId)
    );
  }

  public getUnclaimedByPlayer(playerAddress: string): MinesGame[] {
    const norm = playerAddress.toLowerCase();
    const list: MinesGame[] = [];
    for (const g of this.unclaimedGames.values()) {
      if (g.playerAddress.toLowerCase() === norm && !g.isClaimed && g.status === 'cashed_out') {
        list.push(g);
      }
    }
    return list;
  }

  public markGameClaimed(gameId: string, claimTxHash: string): boolean {
    const g = this.unclaimedGames.get(gameId) || this.completedGames.find((x) => x.id === gameId);
    if (!g) return false;
    g.isClaimed = true;
    g.claimTxHash = claimTxHash;
    this.unclaimedGames.delete(gameId);
    this.saveToDisk();
    return true;
  }

  public getHistory(): MinesGame[] {
    return this.completedGames.slice(0, 50);
  }

  public clearHistory(): void {
    this.completedGames = [];
    this.unclaimedGames.clear();
    this.saveToDisk();
  }

  /**
   * Provably fair verification for any completed game
   */
  public verifyGame(gameId: string): MinesVerifyReport | null {
    const game = this.getGameById(gameId);
    if (!game || !game.serverSeed) return null;

    const calcHash = crypto.createHash('sha256').update(game.serverSeed).digest('hex');
    const serverSeedValid = calcHash.toLowerCase() === game.serverSeedHash.toLowerCase();

    const gridSize = game.gridSize || DEFAULT_GRID_SIZE;
    const calculatedMines = MinesEngine.generateMinePositions(
      game.serverSeed,
      game.clientSeed,
      game.nonce,
      game.id,
      game.mineCount,
      gridSize
    );

    const actualMines = game.minePositions || [];
    const minesMatch =
      calculatedMines.length === actualMines.length &&
      calculatedMines.every((val, idx) => val === actualMines[idx]);

    return {
      serverSeedValid,
      calculatedServerSeedHash: calcHash,
      expectedServerSeedHash: game.serverSeedHash,
      calculatedMinePositions: calculatedMines,
      actualMinePositions: actualMines,
      allPassed: serverSeedValid && minesMatch,
    };
  }

  /**
   * Strip secret server information from ongoing games to prevent client-side inspection
   */
  public sanitizeGame(game: MinesGame): MinesGame {
    if (game.status === 'in_progress') {
      const sanitized = { ...game };
      delete sanitized.serverSeed;
      delete sanitized.minePositions;
      return sanitized;
    }
    return game;
  }
}
