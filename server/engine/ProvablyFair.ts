import crypto from 'crypto';

export interface ProvablyFairCommitment {
  serverSeed: string;         // Kept secret until game ends
  serverSeedHash: string;     // SHA256(serverSeed) — published publicly before bets
  publicSeed: string;         // e.g. "cashflip-2026"
  nonce: number;              // Incremented round counter
  gameId: string;             // e.g. "CASHFLIP-8F3A91"
  gameHash: string;           // SHA256(gameId + serverSeedHash + publicSeed + nonce)
}

export interface ProvablyFairResult {
  winningHash: string;        // HMAC_SHA256(serverSeed, publicSeed + ":" + gameId + ":" + nonce)
  winningTicket: number;      // winningHash as BigInt MOD totalTickets
  revealedServerSeed: string; // Original raw serverSeed
}

export interface VerificationReport {
  serverSeedValid: boolean;
  gameHashValid: boolean;
  winningHashValid: boolean;
  winningTicketValid: boolean;
  calculatedServerSeedHash: string;
  calculatedGameHash: string;
  calculatedWinningHash: string;
  calculatedWinningTicket: number;
  allPassed: boolean;
}

export class ProvablyFairEngine {
  /**
   * 1. Generate a cryptographically secure random serverSeed (32 bytes = 64 hex chars)
   */
  public static generateServerSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 2. Compute SHA256 hash of serverSeed: serverSeedHash = SHA256(serverSeed)
   */
  public static hashServerSeed(serverSeed: string): string {
    return crypto.createHash('sha256').update(serverSeed).digest('hex');
  }

  /**
   * 3. Compute Game Hash: SHA256(gameId + serverSeedHash + publicSeed + nonce)
   */
  public static generateGameHash(
    gameId: string,
    serverSeedHash: string,
    publicSeed: string,
    nonce: number
  ): string {
    const raw = `${gameId}${serverSeedHash}${publicSeed}${nonce}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * 4. Pre-game commitment: Prepares all public hashes before betting begins
   */
  public static createCommitment(
    gameId: string,
    nonce: number,
    publicSeed: string = 'cashflip-2026'
  ): ProvablyFairCommitment {
    const serverSeed = this.generateServerSeed();
    const serverSeedHash = this.hashServerSeed(serverSeed);
    const gameHash = this.generateGameHash(gameId, serverSeedHash, publicSeed, nonce);

    return {
      serverSeed,
      serverSeedHash,
      publicSeed,
      nonce,
      gameId,
      gameHash,
    };
  }

  /**
   * 5. Deterministic winning ticket calculation:
   *    randomHash = HMAC_SHA256(serverSeed, publicSeed + ":" + gameId + ":" + nonce)
   *    winningTicket = randomHash % totalTicketCount
   */
  public static determineWinner(
    serverSeed: string,
    publicSeed: string,
    gameId: string,
    nonce: number,
    totalTickets: number
  ): ProvablyFairResult {
    if (totalTickets <= 0) {
      throw new Error('totalTickets must be greater than 0');
    }

    const payload = `${publicSeed}:${gameId}:${nonce}`;
    const winningHash = crypto
      .createHmac('sha256', serverSeed)
      .update(payload)
      .digest('hex');

    const winningTicket = Number(BigInt('0x' + winningHash) % BigInt(totalTickets));

    return {
      winningHash,
      winningTicket,
      revealedServerSeed: serverSeed,
    };
  }

  /**
   * 6. Independent verification algorithm
   */
  public static verifyGame(
    serverSeed: string,
    serverSeedHash: string,
    publicSeed: string,
    nonce: number,
    gameId: string,
    gameHash: string,
    winningHash: string,
    winningTicket: number,
    totalTickets: number
  ): VerificationReport {
    // 1. Verify SHA256(serverSeed) == serverSeedHash
    const calcServerSeedHash = this.hashServerSeed(serverSeed);
    const serverSeedValid = calcServerSeedHash.toLowerCase() === serverSeedHash.toLowerCase();

    // 2. Verify Game Hash
    const calcGameHash = this.generateGameHash(gameId, serverSeedHash, publicSeed, nonce);
    const gameHashValid = calcGameHash.toLowerCase() === gameHash.toLowerCase();

    // 3. Verify HMAC-SHA256 Winning Hash
    const payload = `${publicSeed}:${gameId}:${nonce}`;
    const calcWinningHash = crypto
      .createHmac('sha256', serverSeed)
      .update(payload)
      .digest('hex');
    const winningHashValid = calcWinningHash.toLowerCase() === winningHash.toLowerCase();

    // 4. Verify Winning Ticket modulo totalTickets
    let calcWinningTicket = 0;
    if (totalTickets > 0) {
      calcWinningTicket = Number(BigInt('0x' + calcWinningHash) % BigInt(totalTickets));
    }
    const winningTicketValid = calcWinningTicket === winningTicket;

    const allPassed = serverSeedValid && gameHashValid && winningHashValid && winningTicketValid;

    return {
      serverSeedValid,
      gameHashValid,
      winningHashValid,
      winningTicketValid,
      calculatedServerSeedHash: calcServerSeedHash,
      calculatedGameHash: calcGameHash,
      calculatedWinningHash: calcWinningHash,
      calculatedWinningTicket: calcWinningTicket,
      allPassed,
    };
  }
}
