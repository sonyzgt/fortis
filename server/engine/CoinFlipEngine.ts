import { CoinFlipGame } from '../types/jackpot';

export class CoinFlipEngine {
  private games: Map<string, CoinFlipGame> = new Map();
  private completedGames: CoinFlipGame[] = [];

  public onUpdate?: (games: CoinFlipGame[]) => void;
  public onGameComplete?: (game: CoinFlipGame) => void;
  public onSystemMessage?: (text: string) => void;

  public createGame(
    creatorId: string,
    creatorName: string,
    betAmount: number,
    side: 'heads' | 'tails',
    creatorAvatar?: string
  ): { success: boolean; game?: CoinFlipGame; message: string } {
    // Check if creator already has open game
    for (const g of this.games.values()) {
      if (g.creatorId === creatorId && g.status === 'waiting') {
        return { success: false, message: 'Kamu sudah punya permainan yang sedang menunggu lawan.' };
      }
    }

    if (betAmount < 50 || betAmount > 50000) {
      return { success: false, message: 'Taruhan harus antara 50 - 50,000 koin.' };
    }

    const game: CoinFlipGame = {
      id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      creatorId,
      creatorName,
      creatorAvatar,
      creatorSide: side,
      betAmount,
      status: 'waiting',
      createdAt: Date.now(),
    };

    this.games.set(game.id, game);
    this.broadcast();

    if (this.onSystemMessage) {
      this.onSystemMessage(`🪙 ${creatorName} membuat coinflip ${betAmount.toLocaleString()} koin (sisi: ${side === 'heads' ? '🦅 Heads' : '🔢 Tails'})`);
    }

    return { success: true, game, message: 'Permainan coinflip dibuat!' };
  }

  public joinGame(
    gameId: string,
    challengerId: string,
    challengerName: string,
    challengerAvatar?: string
  ): { success: boolean; message: string; game?: CoinFlipGame } {
    const game = this.games.get(gameId);
    if (!game) {
      return { success: false, message: 'Permainan tidak ditemukan.' };
    }
    if (game.status !== 'waiting') {
      return { success: false, message: 'Permainan sudah berlangsung atau selesai.' };
    }
    if (game.creatorId === challengerId) {
      return { success: false, message: 'Kamu tidak bisa menantang dirimu sendiri.' };
    }

    game.challengerId = challengerId;
    game.challengerName = challengerName;
    game.challengerAvatar = challengerAvatar;
    game.status = 'flipping';

    this.broadcast();

    if (this.onSystemMessage) {
      this.onSystemMessage(`⚡ ${challengerName} bergabung melawan ${game.creatorName}! Koin sedang dilempar...`);
    }

    // Flip after animation delay
    setTimeout(() => {
      this.resolveGame(game);
    }, 2500);

    return { success: true, message: 'Berhasil bergabung!', game };
  }

  private resolveGame(game: CoinFlipGame): void {
    const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
    game.result = result;

    const creatorWins = game.creatorSide === result;
    game.winnerId = creatorWins ? game.creatorId : game.challengerId;
    game.winnerName = creatorWins ? game.creatorName : game.challengerName;
    game.winAmount = game.betAmount * 2;
    game.status = 'complete';

    this.completedGames.unshift({ ...game });
    if (this.completedGames.length > 20) this.completedGames.pop();

    this.broadcast();
    if (this.onGameComplete) this.onGameComplete(game);

    if (this.onSystemMessage) {
      this.onSystemMessage(
        `🏆 ${game.winnerName} memenangkan coinflip ${game.winAmount?.toLocaleString()} koin! (Hasil: ${result === 'heads' ? '🦅 Heads' : '🔢 Tails'})`
      );
    }

    // Remove after 10 seconds
    setTimeout(() => {
      this.games.delete(game.id);
      this.broadcast();
    }, 10000);
  }

  public cancelGame(gameId: string, requesterId: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.creatorId !== requesterId || game.status !== 'waiting') {
      return false;
    }
    this.games.delete(gameId);
    this.broadcast();
    return true;
  }

  public getOpenGames(): CoinFlipGame[] {
    return Array.from(this.games.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getCompletedGames(): CoinFlipGame[] {
    return this.completedGames;
  }

  private broadcast(): void {
    if (this.onUpdate) {
      this.onUpdate(this.getOpenGames());
    }
  }
}
