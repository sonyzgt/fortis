import {
  JackpotRound,
  PotParticipant,
  Ticket,
  WinnerInfo,
  PastRound,
} from '../types/jackpot';

const COUNTDOWN_SECONDS = 15;  // Countdown starts when 2+ players join (15 seconds)
const MIN_PLAYERS_TO_START = 2; // Minimum unique players to trigger countdown
const TICKET_PRICE = 50;        // chips per ticket
const MAX_RECENT_ENTRIES = 30;
const MAX_PAST_ROUNDS = 10;

type RoundStatus = 'waiting' | 'open' | 'spinning' | 'complete';

export class JackpotEngine {
  public roundNumber: number = 0;
  private status: RoundStatus = 'waiting';
  private tickets: Ticket[] = [];
  private participants: Map<string, PotParticipant> = new Map();
  private endTime: number = 0;
  private timeRemaining: number = 0;        // 0 when waiting
  private winner: WinnerInfo | null = null;
  private pastRounds: PastRound[] = [];
  private ticker: NodeJS.Timeout | null = null;
  private countdownStarted: boolean = false;
  private roundId: string = '';

  public onUpdate?: (round: JackpotRound) => void;
  public onSystemMessage?: (text: string) => void;
  public onWinner?: (winner: WinnerInfo) => void;

  constructor() {
    this.startNewRound();
  }

  private startNewRound(): void {
    this.roundNumber++;
    this.roundId = `round_${this.roundNumber}_${Date.now()}`;
    this.status = 'waiting';  // Start in waiting mode
    this.tickets = [];
    this.participants = new Map();
    this.winner = null;
    this.endTime = 0;
    this.timeRemaining = 0;
    this.countdownStarted = false;

    if (this.ticker) clearInterval(this.ticker);

    // Start a tick loop (to update timeRemaining when countdown is active)
    this.ticker = setInterval(() => this.tick(), 1000);

    this.broadcast();
    if (this.onSystemMessage) {
      this.onSystemMessage(`🎰 Round #${this.roundNumber} dibuka! Menunggu minimal ${MIN_PLAYERS_TO_START} player masuk pot...`);
    }
  }

  /** Called every second — only counts down if countdown has been triggered */
  private tick(): void {
    if (this.status !== 'open' || !this.countdownStarted) {
      // Still waiting — just broadcast current state (so clients get fresh data)
      this.broadcast();
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

  /** Triggered when 2nd unique player joins the pot */
  private startCountdown(): void {
    if (this.countdownStarted) return; // Only start once
    this.countdownStarted = true;
    this.status = 'open';
    this.endTime = Date.now() + COUNTDOWN_SECONDS * 1000;
    this.timeRemaining = COUNTDOWN_SECONDS;

    this.broadcast();

    if (this.onSystemMessage) {
      this.onSystemMessage(`⚡ 2 player sudah masuk! Countdown ${COUNTDOWN_SECONDS} detik dimulai — masuk sekarang atau ketinggalan!`);
    }
  }

  private triggerDraw(): void {
    if (this.ticker) clearInterval(this.ticker);

    if (this.participants.size === 0) {
      if (this.onSystemMessage) {
        this.onSystemMessage('Round berakhir tanpa peserta. Memulai round baru...');
      }
      setTimeout(() => this.startNewRound(), 3000);
      return;
    }

    const totalTickets = this.tickets.length;
    if (totalTickets === 0) {
      this.startNewRound();
      return;
    }

    // Predetermine winning ticket & winner so client can run smooth deceleration animation
    const winningTicketIndex = Math.floor(Math.random() * totalTickets);
    const winningTicket = this.tickets[winningTicketIndex];
    const winner = this.participants.get(winningTicket.playerId);
    if (!winner) {
      this.startNewRound();
      return;
    }

    const totalPot = this.getTotalPot();

    this.winner = {
      playerId: winningTicket.playerId,
      playerName: winningTicket.playerName,
      playerAvatar: winningTicket.playerAvatar,
      walletAddress: winningTicket.walletAddress,
      ticketCount: winner.ticketCount,
      potWon: totalPot,
      odds: parseFloat(((winner.ticketCount / totalTickets) * 100).toFixed(1)),
      winningTicket: winningTicketIndex + 1,
      timestamp: Date.now(),
    };

    this.status = 'spinning';
    this.broadcast();

    if (this.onSystemMessage) {
      this.onSystemMessage('🎲 Time is up! Wheel is spinning to select the winner...');
    }

    // 8.5 seconds of dramatic slow-motion deceleration animation on client
    setTimeout(() => {
      this.finalizeWinner();
    }, 8500);
  }

  private finalizeWinner(): void {
    if (!this.winner) {
      this.startNewRound();
      return;
    }

    const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    this.winner.txHash = txHash;

    this.status = 'complete';

    const pastRound: PastRound = {
      roundNumber: this.roundNumber,
      winner: this.winner,
      totalPot: this.winner.potWon,
      totalPlayers: this.participants.size,
      timestamp: Date.now(),
    };

    this.pastRounds.unshift(pastRound);
    if (this.pastRounds.length > MAX_PAST_ROUNDS) this.pastRounds.pop();

    this.broadcast();
    if (this.onWinner) this.onWinner(this.winner);
    if (this.onSystemMessage) {
      this.onSystemMessage(
        `🏆 ${this.winner.playerName} won ${this.winner.potWon.toLocaleString()} coins with ${this.winner.odds}% odds!`
      );
    }

    setTimeout(() => this.startNewRound(), 8000);
  }

  public buyTickets(
    playerId: string,
    playerName: string,
    quantity: number,
    playerAvatar?: string,
    walletAddress?: string,
    txHash?: string
  ): { success: boolean; message: string; cost: number; txHash?: string } {
    if (this.status === 'spinning' || this.status === 'complete') {
      return { success: false, message: 'Round is spinning or completed. Please wait for the next round.', cost: 0 };
    }

    if (quantity < 1 || quantity > 500) {
      return { success: false, message: 'Ticket quantity must be between 1 - 500', cost: 0 };
    }

    const cost = quantity * TICKET_PRICE;

    // Add ticket entries
    for (let i = 0; i < quantity; i++) {
      this.tickets.push({
        id: `t_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        playerId,
        playerName,
        playerAvatar,
        walletAddress,
        quantity: 1,
        totalCost: TICKET_PRICE,
        txHash,
        timestamp: Date.now(),
      });
    }

    const wasNewPlayer = !this.participants.has(playerId);

    // Update participant summary
    const existing = this.participants.get(playerId);
    if (existing) {
      existing.ticketCount += quantity;
      existing.totalSpent += cost;
    } else {
      this.participants.set(playerId, {
        playerId,
        playerName,
        playerAvatar,
        walletAddress,
        ticketCount: quantity,
        totalSpent: cost,
        odds: 0,
      });
    }

    // Recalculate odds
    const totalTickets = this.tickets.length;
    this.participants.forEach((p) => {
      p.odds = parseFloat(((p.ticketCount / totalTickets) * 100).toFixed(1));
    });

    // ★ Trigger countdown when MIN_PLAYERS_TO_START unique players have joined ★
    if (
      !this.countdownStarted &&
      this.participants.size >= MIN_PLAYERS_TO_START
    ) {
      this.startCountdown();
    }

    this.broadcast();

    if (this.onSystemMessage) {
      this.onSystemMessage(
        `🎟️ ${playerName} bought ${quantity} tickets (${cost.toLocaleString()} coins)`
      );
    }

    return { success: true, message: `Successfully bought ${quantity} tickets!`, cost };

  }

  public getState(): JackpotRound {
    return {
      id: this.roundId,
      roundNumber: this.roundNumber,
      status: this.status as JackpotRound['status'],
      ticketPrice: TICKET_PRICE,
      totalTickets: this.tickets.length,
      totalPot: this.getTotalPot(),
      participants: Array.from(this.participants.values()).sort(
        (a, b) => b.ticketCount - a.ticketCount
      ),
      recentEntries: this.getRecentGrouped(),
      endTime: this.endTime,
      timeRemaining: this.timeRemaining,
      winner: this.winner,
      previousRounds: this.pastRounds,
      countdownStarted: this.countdownStarted,
      minPlayers: MIN_PLAYERS_TO_START,
    };
  }

  private getRecentGrouped(): Ticket[] {
    const grouped: Ticket[] = [];
    const seenInWindow = new Map<string, Ticket>();

    const recent = this.tickets.slice(-100).reverse();
    for (const t of recent) {
      const bucket = Math.floor(t.timestamp / 5000);
      const key = `${t.playerId}_${bucket}`;

      if (seenInWindow.has(key)) {
        const existing = seenInWindow.get(key)!;
        existing.quantity++;
        existing.totalCost += TICKET_PRICE;
      } else {
        const copy: Ticket = { ...t };
        seenInWindow.set(key, copy);
        grouped.push(copy);
      }

      if (grouped.length >= MAX_RECENT_ENTRIES) break;
    }

    return grouped;
  }

  private getTotalPot(): number {
    return this.tickets.length * TICKET_PRICE;
  }

  private broadcast(): void {
    if (this.onUpdate) {
      this.onUpdate(this.getState());
    }
  }

  public destroy(): void {
    if (this.ticker) clearInterval(this.ticker);
  }
}
