import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Server } from 'socket.io';
import cors from 'cors';
import { ethers } from 'ethers';
import { JackpotEngine } from './engine/JackpotEngine';
import { CoinFlipEngine } from './engine/CoinFlipEngine';
import { CashFlipJackpotEngine } from './engine/CashFlipJackpotEngine';
import { MinesEngine } from './engine/MinesEngine';
import { ChatMessage, LeaderboardEntry, WinnerInfo } from './types/jackpot';

// Load .env and .env.local variables
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const p = path.join(process.cwd(), file);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          process.env[key] = val;
        }
      });
    }
  }
}
loadEnv();

const app = express();
app.use(cors());
app.use(express.json());
app.use((_, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e8,
});

const PORT = process.env.PORT || 4000;

// Active Admin Authentication Sessions
const activeAdminSessions = new Set<string>();

// Middleware: Verify Admin Access Token
const requireAdmin = (req: any, res: any, next: any) => {
  const token = req.headers['x-admin-token'] || req.body?.adminToken || req.body?.token;
  if (token && typeof token === 'string' && activeAdminSessions.has(token)) {
    return next();
  }
  return res.status(403).json({ error: 'Unauthorized: Admin authentication token required' });
};

// --- Persistent Replay Protection for On-Chain Transaction Hashes ---
const USED_TX_HASHES_FILE = path.join(process.cwd(), 'used_tx_hashes.json');
const usedTxHashes = new Set<string>();

function loadUsedTxHashes() {
  try {
    if (fs.existsSync(USED_TX_HASHES_FILE)) {
      const data = JSON.parse(fs.readFileSync(USED_TX_HASHES_FILE, 'utf8'));
      if (Array.isArray(data)) {
        for (const h of data) {
          if (typeof h === 'string' && h.trim()) {
            usedTxHashes.add(h.toLowerCase().trim());
          }
        }
      }
    }
  } catch (e) {
    console.warn('[SECURITY] Could not load used tx hashes:', e);
  }
}

function saveUsedTxHashes() {
  try {
    const list = Array.from(usedTxHashes).slice(-10000);
    fs.writeFileSync(USED_TX_HASHES_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.warn('[SECURITY] Could not save used tx hashes:', e);
  }
}

loadUsedTxHashes();

function isValidTxHash(txHash: unknown): boolean {
  if (typeof txHash !== 'string') return false;
  return /^0x[0-9a-fA-F]{64}$/.test(txHash.trim());
}

function isTxHashUsed(txHash: string): boolean {
  return usedTxHashes.has(txHash.trim().toLowerCase());
}

function markTxHashUsed(txHash: string): boolean {
  const norm = txHash.trim().toLowerCase();
  if (usedTxHashes.has(norm)) return false;
  usedTxHashes.add(norm);
  saveUsedTxHashes();
  return true;
}

// Game Engines
const cashflipJackpot = new CashFlipJackpotEngine();
const jackpot = new JackpotEngine();
const coinflip = new CoinFlipEngine();
const mines = new MinesEngine();

// Global state
const chatMessages: ChatMessage[] = [];
const leaderboard: Map<string, LeaderboardEntry> = new Map();

// --- CashFlip Jackpot Callbacks ---
cashflipJackpot.onUpdate = (round) => {
  io.emit('cashflip_jackpot_state', round);
};

// Disable automatic bot spam in live chat (chat is exclusively for players)
cashflipJackpot.onSystemMessage = undefined;

cashflipJackpot.onWinner = (winner, round) => {
  io.emit('cashflip_jackpot_winner', { winner, round });
  io.emit('cashflip_jackpot_history', cashflipJackpot.getPastGames());

  // Update leaderboard
  const winPrize = winner.prize !== undefined ? winner.prize : (winner.prizePons || 0);
  const existing = leaderboard.get(winner.address);
  if (existing) {
    existing.totalWon += winPrize;
    existing.winsCount += 1;
    existing.lastWin = Date.now();
  } else {
    leaderboard.set(winner.address, {
      playerId: winner.address,
      playerName: winner.name,
      playerAvatar: winner.avatar,
      walletAddress: winner.address,
      totalWon: winPrize,
      winsCount: 1,
      lastWin: Date.now(),
    });
  }
  io.emit('leaderboard_update', getLeaderboard());
};

// --- Legacy Jackpot Callbacks ---
jackpot.onUpdate = (round) => {
  io.emit('jackpot_state', round);
};
jackpot.onSystemMessage = undefined;

jackpot.onWinner = (winner: WinnerInfo) => {
  io.emit('jackpot_winner', winner);
};

// --- CoinFlip Callbacks ---
coinflip.onUpdate = (games) => {
  io.emit('coinflip_games', games);
};
coinflip.onSystemMessage = undefined;

coinflip.onGameComplete = (game) => {
  io.emit('coinflip_complete', game);
  io.emit('coinflip_completed_games', coinflip.getCompletedGames());
  if (game.winnerId) {
    io.emit('unclaimed_coinflip_alert', {
      winnerId: game.winnerId,
      game,
    });
  }
};

function getLeaderboard(): LeaderboardEntry[] {
  return Array.from(leaderboard.values())
    .sort((a, b) => b.totalWon - a.totalWon)
    .slice(20);
}

// --- REST API Endpoints ---
app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: Date.now(), system: 'Kofuku Engine' }));

// CashFlip Game APIs
app.get('/api/game/current', (_, res) => res.json(cashflipJackpot.getState()));
app.get('/api/game/state', (_, res) => res.json(cashflipJackpot.getState()));
app.get('/api/game/history', (_, res) => res.json(cashflipJackpot.getPastGames()));
app.get('/api/games/history', (_, res) => res.json(cashflipJackpot.getPastGames()));
app.get('/api/coinflip/open', (_, res) => res.json(coinflip.getOpenGames()));
app.get('/api/game/:gameId', (req, res) => {
  const g = cashflipJackpot.getGameById(req.params.gameId);
  if (!g) return res.status(404).json({ error: 'Game not found' });
  res.json(g);
});
app.get('/api/game/unclaimed/:address', (req, res) => {
  res.json(cashflipJackpot.getUnclaimedByPlayer(req.params.address));
});
app.post('/api/game/claim', (req, res) => {
  const { gameId, claimTxHash, address } = req.body;
  if (!gameId) {
    return res.status(400).json({ error: 'gameId required' });
  }
  const ok = cashflipJackpot.markWinningsClaimed(gameId, claimTxHash || 'on-chain');
  if (address) {
    const unclaimed = cashflipJackpot.getUnclaimedByPlayer(address);
    io.emit('cashflip_jackpot_unclaimed', unclaimed);
  }
  io.emit('cashflip_jackpot_history', cashflipJackpot.getPastGames());
  res.json({ success: ok, gameId, claimTxHash: claimTxHash || 'on-chain' });
});
app.post('/api/game/reset-claims', (_, res) => {
  cashflipJackpot.resetClaims();
  res.json({ success: true, message: 'All claims reset to unclaimed' });
});

app.get('/api/game/verify/:gameId', (req, res) => {
  const report = cashflipJackpot.verifyGameById(req.params.gameId);
  if (!report) {
    return res.status(404).json({ error: 'Game not found or still active' });
  }
  res.json(report);
});

// --- Mines Game APIs ---
app.post('/api/mines/start', (req, res) => {
  const { playerAddress, playerName, betAmount, mineCount, playerAvatar, clientSeed, gridSize, gameId, txHash } = req.body;
  if (!isValidTxHash(txHash)) {
    return res.status(400).json({ success: false, message: 'Valid on-chain transaction hash (txHash) is required to start a game.' });
  }
  if (isTxHashUsed(txHash)) {
    return res.status(400).json({ success: false, message: 'Transaction hash has already been used. Replay detected.' });
  }
  const result = mines.startGame(
    playerAddress,
    playerName,
    Number(betAmount),
    Number(mineCount),
    playerAvatar,
    clientSeed,
    gridSize ? Number(gridSize) : 25,
    gameId,
    txHash
  );
  if (!result.success) return res.status(400).json(result);
  markTxHashUsed(txHash);
  res.json(result);
});

app.post('/api/mines/reveal', (req, res) => {
  const { gameId, playerAddress, tileIndex } = req.body;
  try {
    const result = mines.revealTile(gameId, playerAddress, Number(tileIndex));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to reveal tile' });
  }
});

app.post('/api/mines/cashout', (req, res) => {
  const { gameId, playerAddress } = req.body;
  try {
    const result = mines.cashOut(gameId, playerAddress);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to cash out' });
  }
});

app.get('/api/mines/active/:address', (req, res) => {
  const g = mines.getActiveGame(req.params.address);
  res.json(g ? mines.sanitizeGame(g) : null);
});

app.get('/api/mines/unclaimed/:address', (req, res) => {
  res.json(mines.getUnclaimedByPlayer(req.params.address));
});

app.get('/api/mines/history', (_, res) => {
  res.json(mines.getHistory());
});

app.get('/api/mines/verify/:gameId', (req, res) => {
  const rep = mines.verifyGame(req.params.gameId);
  if (!rep) return res.status(404).json({ error: 'Game not found or round still ongoing' });
  res.json(rep);
});

// --- Admin Authentication Endpoints ---
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(500).json({ error: 'Admin password is not configured on the server. Set ADMIN_PASSWORD in .env.local' });
  }
  if (!password || password !== expected) {
    return res.status(401).json({ error: 'Incorrect administrator password. Access denied.' });
  }
  const token = 'adm_' + crypto.randomBytes(24).toString('hex');
  activeAdminSessions.add(token);
  res.json({ success: true, token, message: 'Authentication successful' });
});

app.post('/api/admin/verify', (req, res) => {
  const token = req.headers['x-admin-token'] || req.body?.token;
  if (token && typeof token === 'string' && activeAdminSessions.has(token)) {
    return res.json({ valid: true });
  }
  res.status(401).json({ valid: false, error: 'Session expired or invalid' });
});

app.post('/api/admin/logout', (req, res) => {
  const token = req.headers['x-admin-token'] || req.body?.token;
  if (token) {
    activeAdminSessions.delete(token as string);
  }
  res.json({ success: true });
});

app.post('/api/admin/set-contract', requireAdmin, (req, res) => {
  const { contractAddress } = req.body;
  if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.trim().length !== 42) {
    return res.status(400).json({ error: 'Invalid address (must be 42 characters starting with 0x)' });
  }
  const file = path.join(process.cwd(), 'deployed_contract.txt');
  fs.writeFileSync(file, contractAddress.trim());
  io.emit('cashflip_contract_updated', { contractAddress: contractAddress.trim() });
  res.json({ success: true, contractAddress: contractAddress.trim() });
});

app.get('/api/contract-address', (_, res) => {
  const file = path.join(process.cwd(), 'deployed_contract.txt');
  if (fs.existsSync(file)) {
    const addr = fs.readFileSync(file, 'utf8').trim();
    if (addr.startsWith('0x') && addr.length === 42) return res.json({ contractAddress: addr });
  }
  res.json({ contractAddress: (process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || '0xa626b74Ac9CDbD22Bb6fA5e0F1e7FCce859a4834').trim() });
});

app.post('/api/admin/set-token-contract', requireAdmin, (req, res) => {
  const { tokenAddress } = req.body;
  if (!tokenAddress || !tokenAddress.startsWith('0x') || tokenAddress.trim().length !== 42) {
    return res.status(400).json({ error: 'Invalid token address format (must be 42 characters starting with 0x)' });
  }
  const file = path.join(process.cwd(), 'token_contract.txt');
  fs.writeFileSync(file, tokenAddress.trim());
  io.emit('cashflip_token_updated', { tokenAddress: tokenAddress.trim() });
  res.json({ success: true, tokenAddress: tokenAddress.trim() });
});

app.get('/api/token-contract-address', (_, res) => {
  const file = path.join(process.cwd(), 'token_contract.txt');
  if (fs.existsSync(file)) {
    const addr = fs.readFileSync(file, 'utf8').trim();
    if (addr.startsWith('0x') && addr.length === 42) return res.json({ tokenAddress: addr });
  }
  res.json({
    tokenAddress: (
      process.env.NEXT_PUBLIC_CASHFLIP_TOKEN_ADDRESS ||
      process.env.NEXT_PUBLIC_PONSPOT_TOKEN_ADDRESS ||
      process.env.NEXT_PUBLIC_PONS_TOKEN_ADDRESS ||
      process.env.PONS_TOKEN_ADDRESS ||
      '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168'
    ).trim(),
  });
});

app.get('/api/admin/contract-balance', async (_, res) => {
  try {
    let gameAddr = '';
    const file = path.join(process.cwd(), 'deployed_contract.txt');
    if (fs.existsSync(file)) {
      gameAddr = fs.readFileSync(file, 'utf8').trim();
    }
    if (!gameAddr || !gameAddr.startsWith('0x') || gameAddr.length !== 42) {
      gameAddr = (process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || '0xa626b74Ac9CDbD22Bb6fA5e0F1e7FCce859a4834').trim();
    }

    let tokenAddr = '';
    const tokenFile = path.join(process.cwd(), 'token_contract.txt');
    if (fs.existsSync(tokenFile)) {
      tokenAddr = fs.readFileSync(tokenFile, 'utf8').trim();
    }
    if (!tokenAddr || !tokenAddr.startsWith('0x') || tokenAddr.length !== 42) {
      tokenAddr = (
        process.env.NEXT_PUBLIC_CASHFLIP_TOKEN_ADDRESS ||
        process.env.NEXT_PUBLIC_PONSPOT_TOKEN_ADDRESS ||
        '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168'
      ).trim();
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
    const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
    const tokenContract = new ethers.Contract(
      tokenAddr,
      ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
      rpcProvider
    );

    const rawBal = await tokenContract.balanceOf(gameAddr);
    const decimals = 6;
    const formatted = ethers.formatUnits(rawBal, decimals);

    let contractAdmin = '';
    try {
      const gameContract = new ethers.Contract(gameAddr, ['function admin() view returns (address)'], rpcProvider);
      contractAdmin = await gameContract.admin();
    } catch {}

    res.json({
      success: true,
      contractAddress: gameAddr,
      tokenAddress: tokenAddr,
      balance: formatted,
      rawBalance: rawBal.toString(),
      admin: contractAdmin,
    });
  } catch (e: any) {
    console.error('Error in /api/admin/contract-balance:', e);
    res.status(500).json({ error: e.message || 'Failed to fetch contract balance', balance: '0' });
  }
});

app.post('/api/admin/force-refresh', requireAdmin, (req, res) => {
  // Broadcast reload event to all connected player clients
  io.emit('force_client_reload', {
    timestamp: Date.now(),
    message: 'Admin triggered server refresh. Reloading browser...',
  });

  // Re-broadcast fresh game states
  io.emit('cashflip_jackpot_state', cashflipJackpot.getState());
  io.emit('cashflip_jackpot_history', cashflipJackpot.getPastGames());

  res.json({
    success: true,
    message: 'Server refresh command successfully broadcasted to all player browsers!',
  });
});

app.post('/api/admin/clear-history', requireAdmin, (req, res) => {
  cashflipJackpot.clearHistory();
  coinflip.clearHistory();
  mines.clearHistory();
  io.emit('cashflip_jackpot_history', []);
  io.emit('coinflip_completed_games', []);
  res.json({
    success: true,
    message: 'Historical epochs & coinflip duel manifests have been successfully purged from database!',
  });
});

app.post('/api/admin/reset-betting', requireAdmin, (req, res) => {
  cashflipJackpot.factoryReset();
  chatMessages.length = 0;
  leaderboard.clear();
  io.emit('cashflip_jackpot_state', cashflipJackpot.getState());
  io.emit('cashflip_jackpot_history', []);
  io.emit('cashflip_jackpot_history', []);
  io.emit('chat_history', []);
  io.emit('force_client_reload', {
    timestamp: Date.now(),
    isFactoryReset: true,
    message: 'Betting rounds & pots have been reset by Admin.',
  });
  res.json({
    success: true,
    message: 'All active bets, current pot, and round histories have been completely reset!',
  });
});

app.post('/api/admin/factory-reset', requireAdmin, (req, res) => {
  try {
    // 1. Delete saved contract text and json files
    const filesToDelete = [
      'deployed_contract.txt',
      'token_contract.txt',
      'airdrop_contract.json',
      'deployed_airdrop_contract.txt',
    ];
    for (const f of filesToDelete) {
      const fullPath = path.join(process.cwd(), f);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (e) {
          console.warn(`Could not delete ${f}`, e);
        }
      }
    }

    // 2. Perform factory reset on engine
    cashflipJackpot.factoryReset();
    mines.clearHistory();
    coinflip.clearHistory();
    usedTxHashes.clear();
    if (fs.existsSync(USED_TX_HASHES_FILE)) {
      try { fs.unlinkSync(USED_TX_HASHES_FILE); } catch {}
    }

    // 3. Clear Chat & Leaderboard
    chatMessages.length = 0;
    leaderboard.clear();

    // 4. Broadcast full fresh state to all connected clients
    io.emit('cashflip_jackpot_state', cashflipJackpot.getState());
    io.emit('cashflip_jackpot_history', []);
    io.emit('cashflip_jackpot_history', []);
    io.emit('leaderboard_update', []);
    io.emit('chat_history', []);
    io.emit('cashflip_contract_updated', { contractAddress: '' });
    io.emit('cashflip_contract_updated', { contractAddress: '' });
    io.emit('cashflip_token_updated', { tokenAddress: '' });

    // 5. Broadcast force reload with factory reset flag
    io.emit('force_client_reload', {
      timestamp: Date.now(),
      isFactoryReset: true,
      message: 'Factory reset initiated by Admin. All data has been purged for hosting.',
    });

    res.json({
      success: true,
      message: 'Factory Reset Complete! All saved contracts, token configurations, rounds, claims, and storage have been purged.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Factory reset failed' });
  }
});

app.get('/api/jackpot', (_, res) => res.json(jackpot.getState()));
app.get('/api/coinflip', (_, res) => res.json(coinflip.getOpenGames()));
app.get('/api/coinflip/completed', (_, res) => res.json(coinflip.getCompletedGames()));
app.get('/api/coinflip/unclaimed/:address', (req, res) => {
  res.json(coinflip.getUnclaimedByPlayer(req.params.address));
});
app.get('/api/coinflip/game/:gameId', (req, res) => {
  const game = coinflip.getGameById(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game);
});
app.get('/api/leaderboard', (_, res) => res.json(getLeaderboard()));
app.get('/api/chat', (_, res) => res.json(chatMessages.slice(-50)));

/**
/**
 * POST /api/coinflip/sign-claim & POST /api/claim/sign
 * Game server validates the winner address for Coinflip or Jackpot, then signs the claim with ECDSA.
 * The signature is used by the smart contract to authorize payout to ONLY the winner.
 */
const handleSignClaim = async (req: express.Request, res: express.Response) => {
  try {
    const { gameId, winner, prizeAmount } = req.body;

    if (!gameId || !winner || !prizeAmount) {
      return res.status(400).json({ error: 'Missing required fields: gameId, winner, prizeAmount' });
    }

    const normWinner = winner.toLowerCase();

    // 1. Try finding in Coinflip engine
    let matchedType: 'coinflip' | 'jackpot' | 'mines' | null = null;
    const cfGame = coinflip.getGameById(gameId);
    let jpGame: any = null;
    let minesGame: any = null;

    if (cfGame) {
      matchedType = 'coinflip';
      if (cfGame.isClaimed) {
        return res.status(400).json({ error: `Room #${cfGame.roomNumber || ''} winnings have already been claimed.` });
      }
      if (cfGame.winnerId?.toLowerCase() !== normWinner) {
        return res.status(403).json({ error: 'Address is not the verified winner of this duel' });
      }
    } else {
      // 2. Try finding in Jackpot engine
      jpGame = cashflipJackpot.getGameById(gameId);
      if (jpGame && jpGame.winner) {
        matchedType = 'jackpot';
        if (jpGame.winner.claimed) {
          return res.status(400).json({ error: `Epoch #${jpGame.gameId} winnings have already been claimed.` });
        }
        if (jpGame.winner.address?.toLowerCase() !== normWinner) {
          return res.status(403).json({ error: 'Address is not the verified winner of this epoch' });
        }
      } else {
        // 3. Try finding in Mines engine
        minesGame = mines.getGameById(gameId);
        if (minesGame) {
          matchedType = 'mines';
          if (minesGame.isClaimed) {
            return res.status(400).json({ error: `Mines round #${minesGame.id} winnings have already been claimed.` });
          }
          if (minesGame.playerAddress.toLowerCase() !== normWinner) {
            return res.status(403).json({ error: 'Address is not the verified player of this mines excavation' });
          }
          if (minesGame.status !== 'cashed_out') {
            return res.status(400).json({ error: 'Mines round did not complete with successful cashout' });
          }
        }
      }
    }

    if (!matchedType) {
      return res.status(404).json({ error: 'Game not found or not yet completed' });
    }

    // Enforce exact server-authoritative prize calculation directly from database records
    let actualPrizeWei = 0n;

    if (matchedType === 'coinflip' && cfGame) {
      if (!cfGame.creatorTxHash) {
        return res.status(400).json({ error: 'Coinflip room has no verified deposit transaction' });
      }
      if (cfGame.challengerId !== 'ai_oracle' && !cfGame.challengerTxHash) {
        return res.status(400).json({ error: 'Coinflip opponent has no verified deposit transaction' });
      }
      actualPrizeWei = BigInt(Math.round(cfGame.winAmount * 1_000_000));
      if (requestedPrizeWei > actualPrizeWei) {
        return res.status(400).json({ error: 'Requested prize amount exceeds calculated duel winnings' });
      }
    } else if (matchedType === 'jackpot' && jpGame) {
      const grossPool = jpGame.winner?.totalPoolPons || jpGame.winner?.totalPool || jpGame.totalPool || 0;
      actualPrizeWei = BigInt(Math.round(grossPool * 1_000_000));
      if (requestedPrizeWei > actualPrizeWei && actualPrizeWei > 0n) {
        return res.status(400).json({ error: 'Requested prize amount exceeds jackpot epoch pool' });
      }
    } else if (matchedType === 'mines' && minesGame) {
      if (!minesGame.txHash) {
        return res.status(400).json({ error: 'Mines excavation has no verified wager transaction' });
      }
      actualPrizeWei = BigInt(Math.round(minesGame.currentPayout * 1_000_000));
      if (requestedPrizeWei > actualPrizeWei && actualPrizeWei > 0n) {
        return res.status(400).json({ error: 'Requested prize amount exceeds calculated mines payout' });
      }
    }

    if (actualPrizeWei <= 0n) {
      return res.status(400).json({ error: 'Calculated prize amount is zero or invalid' });
    }

    // Always sign the exact server-calculated amount
    const finalPrizeWei = actualPrizeWei;

    // Load the game server signer wallet
    const signerPrivateKey = process.env.GAME_SERVER_SIGNER_PRIVATE_KEY || '';
    if (!signerPrivateKey || signerPrivateKey.length < 60) {
      return res.status(500).json({ error: 'Game server signer not configured' });
    }

    // Sign: keccak256(abi.encodePacked(gameId, winner, prizeAmount))
    // This is the exact same hash the Solidity contract will verify on-chain
    const { ethers } = await import('ethers');
    const signerWallet = new ethers.Wallet(signerPrivateKey);
    const messageHash = ethers.keccak256(
      ethers.solidityPacked(
        ['string', 'address', 'uint256'],
        [gameId, winner, finalPrizeWei]
      )
    );
    // ethers.signMessage prepends "\x19Ethereum Signed Message:\n32" and signs — matching the contract
    const signature = await signerWallet.signMessage(ethers.getBytes(messageHash));

    console.log(
      `[SIGN-CLAIM] Type: ${matchedType.toUpperCase()} | Game: ${gameId} | Winner: ${winner} | Prize: ${ethers.formatUnits(finalPrizeWei, 6)} USDG | Sig: ${signature.slice(0, 20)}...`
    );

    return res.json({
      signature,
      gameId,
      roomNumber: cfGame?.roomNumber || undefined,
      winner,
      prizeAmount: finalPrizeWei.toString(),
    });
  } catch (err: any) {
    console.error('[SIGN-CLAIM] Error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to sign claim' });
  }
};

app.post('/api/coinflip/sign-claim', handleSignClaim);
app.post('/api/claim/sign', handleSignClaim);


// --- Socket.io ---
io.on('connection', (socket) => {
  // Send initial states
  socket.emit('cashflip_jackpot_state', cashflipJackpot.getState());
  socket.emit('cashflip_jackpot_history', cashflipJackpot.getPastGames());
  socket.emit('coinflip_games', coinflip.getOpenGames());
  socket.emit('coinflip_completed_games', coinflip.getCompletedGames());
  socket.emit('leaderboard_update', getLeaderboard());
  socket.emit('chat_history', chatMessages.slice(-50));

  // --- CashFlip Jackpot Events ---
  const handleBet = ({ playerAddress, playerName, amount, amountPons, playerAvatar, txHash }: any) => {
    if (!isValidTxHash(txHash)) {
      socket.emit('cashflip_jackpot_bet_result', { success: false, message: 'Valid on-chain transaction hash (txHash) is required for jackpot bets.' });
      return;
    }
    if (isTxHashUsed(txHash)) {
      socket.emit('cashflip_jackpot_bet_result', { success: false, message: 'Transaction hash has already been used. Replay detected.' });
      return;
    }
    const betAmount = amount !== undefined ? amount : (amountPons || 0);
    const result = cashflipJackpot.placeBet(playerAddress, playerName, betAmount, playerAvatar, txHash);
    if (result.success) {
      markTxHashUsed(txHash);
    }
    socket.emit('cashflip_jackpot_bet_result', result);
  };
  socket.on('cashflip_jackpot_bet', handleBet);

  const handleClaim = ({ gameId, claimTxHash, address }: any) => {
    const ok = cashflipJackpot.markWinningsClaimed(gameId, claimTxHash);
    socket.emit('cashflip_jackpot_claim_result', { success: ok, gameId, claimTxHash });
    if (address) {
      const unclaimed = cashflipJackpot.getUnclaimedByPlayer(address);
      socket.emit('cashflip_jackpot_unclaimed', unclaimed);
    }
    io.emit('cashflip_jackpot_history', cashflipJackpot.getPastGames());
  };
  socket.on('cashflip_jackpot_claim', handleClaim);

  const handleGetUnclaimed = ({ address }: any) => {
    if (!address) return;
    const list = cashflipJackpot.getUnclaimedByPlayer(address);
    socket.emit('cashflip_jackpot_unclaimed', list);
  };
  socket.on('cashflip_jackpot_get_unclaimed', handleGetUnclaimed);

  const handleVerify = ({ gameId }: any) => {
    const report = cashflipJackpot.verifyGameById(gameId);
    socket.emit('cashflip_jackpot_verify_result', { gameId, report });
  };
  socket.on('cashflip_jackpot_verify', handleVerify);

  // --- Legacy Jackpot Events ---
  socket.on('buy_tickets', ({ playerId, playerName, playerAvatar, walletAddress, quantity, txHash }) => {
    const result = jackpot.buyTickets(playerId, playerName, quantity, playerAvatar, walletAddress, txHash);
    socket.emit('buy_tickets_result', { ...result, txHash });
  });

  // --- CoinFlip Events ---
  socket.on('create_coinflip', ({ creatorId, creatorName, creatorAvatar, betAmount, side, customId, txHash }) => {
    if (!isValidTxHash(txHash)) {
      socket.emit('create_coinflip_result', { success: false, message: 'Valid on-chain transaction hash is required to create a duel room.' });
      return;
    }
    if (isTxHashUsed(txHash)) {
      socket.emit('create_coinflip_result', { success: false, message: 'Transaction hash has already been used. Replay detected.' });
      return;
    }
    const result = coinflip.createGame(creatorId, creatorName, betAmount, side, creatorAvatar, customId, txHash);
    if (result.success) {
      markTxHashUsed(txHash);
    }
    socket.emit('create_coinflip_result', result);
  });

  socket.on('join_coinflip', ({ gameId, challengerId, challengerName, challengerAvatar, txHash }) => {
    if (!isValidTxHash(txHash)) {
      socket.emit('join_coinflip_result', { success: false, message: 'Valid on-chain transaction hash is required to join a duel.' });
      return;
    }
    if (isTxHashUsed(txHash)) {
      socket.emit('join_coinflip_result', { success: false, message: 'Transaction hash has already been used. Replay detected.' });
      return;
    }
    const result = coinflip.joinGame(gameId, challengerId, challengerName, challengerAvatar, txHash);
    if (result.success) {
      markTxHashUsed(txHash);
    }
    socket.emit('join_coinflip_result', result);
  });

  socket.on('cancel_coinflip', ({ gameId, requesterId }) => {
    const result = coinflip.cancelGame(gameId, requesterId);
    socket.emit('cancel_coinflip_result', result);
  });

  socket.on('get_unclaimed_coinflips', ({ address }: { address: string }) => {
    if (!address) return;
    const list = coinflip.getUnclaimedByPlayer(address);
    socket.emit('unclaimed_coinflips', list);
  });

  socket.on('mark_coinflip_claimed', ({ gameId, claimTxHash, address }: any) => {
    const ok = coinflip.markGameClaimed(gameId, claimTxHash);
    io.emit('coinflip_claim_confirmed', { success: ok, gameId, claimTxHash, address });
    if (address) {
      const list = coinflip.getUnclaimedByPlayer(address);
      socket.emit('unclaimed_coinflips', list);
    }
  });

  socket.on('play_coinflip_room_ai', ({ gameId, requesterId }: { gameId: string; requesterId: string }, callback) => {
    const result = coinflip.playAgainstAiInRoom(gameId, requesterId);
    if (typeof callback === 'function') callback(result);
    socket.emit('play_coinflip_room_ai_result', result);
  });

  // --- Mines Events ---
  socket.on('mines_start', ({ playerAddress, playerName, betAmount, mineCount, playerAvatar, clientSeed, gridSize, gameId, txHash }, callback) => {
    if (!isValidTxHash(txHash)) {
      const err = { success: false, message: 'Valid on-chain transaction hash is required to start a Mines game.' };
      if (typeof callback === 'function') callback(err);
      socket.emit('mines_start_result', err);
      return;
    }
    if (isTxHashUsed(txHash)) {
      const err = { success: false, message: 'Transaction hash has already been used. Replay detected.' };
      if (typeof callback === 'function') callback(err);
      socket.emit('mines_start_result', err);
      return;
    }
    const result = mines.startGame(
      playerAddress,
      playerName,
      Number(betAmount),
      Number(mineCount),
      playerAvatar,
      clientSeed,
      gridSize ? Number(gridSize) : 25,
      gameId,
      txHash
    );
    if (result.success) {
      markTxHashUsed(txHash);
    }
    if (typeof callback === 'function') callback(result);
    socket.emit('mines_start_result', result);
  });

  socket.on('mines_reveal', ({ gameId, playerAddress, tileIndex }, callback) => {
    try {
      const result = mines.revealTile(gameId, playerAddress, Number(tileIndex));
      if (typeof callback === 'function') callback({ success: true, result });
      socket.emit('mines_reveal_result', { success: true, result });
      if (result.gameOver && result.unclaimedGame) {
        socket.emit('mines_unclaimed', mines.getUnclaimedByPlayer(playerAddress));
      }
    } catch (err: any) {
      if (typeof callback === 'function') callback({ success: false, error: err?.message });
      socket.emit('mines_reveal_result', { success: false, error: err?.message });
    }
  });

  socket.on('mines_cashout', ({ gameId, playerAddress }, callback) => {
    try {
      const result = mines.cashOut(gameId, playerAddress);
      if (typeof callback === 'function') callback({ success: true, result });
      socket.emit('mines_cashout_result', { success: true, result });
      socket.emit('mines_unclaimed', mines.getUnclaimedByPlayer(playerAddress));
    } catch (err: any) {
      if (typeof callback === 'function') callback({ success: false, error: err?.message });
      socket.emit('mines_cashout_result', { success: false, error: err?.message });
    }
  });

  socket.on('mines_get_active', ({ address }: { address: string }, callback) => {
    if (!address) return;
    const g = mines.getActiveGame(address);
    const sanitized = g ? mines.sanitizeGame(g) : null;
    if (typeof callback === 'function') callback(sanitized);
    socket.emit('mines_active_game', sanitized);
  });

  socket.on('mines_get_unclaimed', ({ address }: { address: string }) => {
    if (!address) return;
    const list = mines.getUnclaimedByPlayer(address);
    socket.emit('mines_unclaimed', list);
  });

  socket.on('mines_mark_claimed', ({ gameId, claimTxHash, address }: any) => {
    const ok = mines.markGameClaimed(gameId, claimTxHash);
    socket.emit('mines_claim_confirmed', { success: ok, gameId, claimTxHash });
    if (address) {
      const list = mines.getUnclaimedByPlayer(address);
      socket.emit('mines_unclaimed', list);
    }
  });

  // --- Chat ---
  socket.on('send_chat', ({ senderId, senderName, senderAvatar, text }) => {
    if (!text || !text.trim() || text.length > 150) return;
    const msg: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId,
      senderName,
      senderAvatar,
      text: text.trim(),
      timestamp: Date.now(),
    };
    chatMessages.push(msg);
    if (chatMessages.length > 100) chatMessages.shift();
    io.emit('chat_message', msg);
  });
});

server.listen(PORT, () => {
  console.log(`💎 CashFlip On-Chain USDG Gaming Server running on http://localhost:${PORT}`);
});
 
