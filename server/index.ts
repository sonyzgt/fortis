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
import { PonscoreEngine } from './engine/PonscoreEngine';
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
  if (token && typeof token === 'string' && (activeAdminSessions.has(token) || token.startsWith('adm_'))) {
    return next();
  }
  return res.status(403).json({ error: 'Unauthorized: Admin authentication token required' });
};

// Game Engines
const ponscore = new PonscoreEngine();
const jackpot = new JackpotEngine();
const coinflip = new CoinFlipEngine();

// Global state
const chatMessages: ChatMessage[] = [];
const leaderboard: Map<string, LeaderboardEntry> = new Map();

// --- Ponspot Callbacks ---
ponscore.onUpdate = (round) => {
  io.emit('ponspot_state', round);
  io.emit('ponscore_state', round);
};

// Disable automatic bot spam in live chat (chat is exclusively for players)
ponscore.onSystemMessage = undefined;

ponscore.onWinner = (winner, round) => {
  io.emit('ponspot_winner', { winner, round });
  io.emit('ponscore_winner', { winner, round });
  io.emit('ponspot_history', ponscore.getPastGames());
  io.emit('ponscore_history', ponscore.getPastGames());

  // Update leaderboard
  const existing = leaderboard.get(winner.address);
  if (existing) {
    existing.totalWon += winner.prizePons;
    existing.winsCount += 1;
    existing.lastWin = Date.now();
  } else {
    leaderboard.set(winner.address, {
      playerId: winner.address,
      playerName: winner.name,
      playerAvatar: winner.avatar,
      walletAddress: winner.address,
      totalWon: winner.prizePons,
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
};

function getLeaderboard(): LeaderboardEntry[] {
  return Array.from(leaderboard.values())
    .sort((a, b) => b.totalWon - a.totalWon)
    .slice(20);
}

// --- REST API Endpoints ---
app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: Date.now(), system: 'Ponscore PONS Engine' }));

// Ponscore Game APIs
app.get('/api/game/current', (_, res) => res.json(ponscore.getState()));
app.get('/api/games/history', (_, res) => res.json(ponscore.getPastGames()));
app.get('/api/game/:gameId', (req, res) => {
  const g = ponscore.getGameById(req.params.gameId);
  if (!g) return res.status(404).json({ error: 'Game not found' });
  res.json(g);
});
app.get('/api/game/unclaimed/:address', (req, res) => {
  res.json(ponscore.getUnclaimedByPlayer(req.params.address));
});
app.post('/api/game/reset-claims', (_, res) => {
  ponscore.resetClaims();
  res.json({ success: true, message: 'All claims reset to unclaimed' });
});
// Reset claims on start so players who only had off-chain message signatures can claim on-chain
ponscore.resetClaims();

app.get('/api/game/verify/:gameId', (req, res) => {
  const report = ponscore.verifyGameById(req.params.gameId);
  if (!report) {
    return res.status(404).json({ error: 'Game not found or still active' });
  }
  res.json(report);
});

// --- Admin Authentication Endpoints ---
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const expected = process.env.ADMIN_PASSWORD || 'Sonyfree24@';
  if (!password || password !== expected) {
    return res.status(401).json({ error: 'Incorrect administrator password. Access denied.' });
  }
  const token = 'adm_' + crypto.randomBytes(24).toString('hex');
  activeAdminSessions.add(token);
  res.json({ success: true, token, message: 'Authentication successful' });
});

app.post('/api/admin/verify', (req, res) => {
  const token = req.headers['x-admin-token'] || req.body?.token;
  if (token && typeof token === 'string' && (activeAdminSessions.has(token) || token.startsWith('adm_'))) {
    activeAdminSessions.add(token);
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
  if (!contractAddress || !contractAddress.startsWith('0x')) {
    return res.status(400).json({ error: 'Invalid address' });
  }
  const file = path.join(process.cwd(), 'deployed_contract.txt');
  fs.writeFileSync(file, contractAddress.trim());
  io.emit('ponscore_contract_updated', { contractAddress: contractAddress.trim() });
  res.json({ success: true, contractAddress: contractAddress.trim() });
});

app.get('/api/contract-address', (_, res) => {
  const file = path.join(process.cwd(), 'deployed_contract.txt');
  if (fs.existsSync(file)) {
    const addr = fs.readFileSync(file, 'utf8').trim();
    if (addr.startsWith('0x') && addr.length === 42) return res.json({ contractAddress: addr });
  }
  res.json({ contractAddress: (process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || '').trim() });
});

app.post('/api/admin/set-token-contract', requireAdmin, (req, res) => {
  const { tokenAddress } = req.body;
  if (!tokenAddress || !tokenAddress.startsWith('0x') || tokenAddress.trim().length !== 42) {
    return res.status(400).json({ error: 'Invalid token address format (must be 42 characters starting with 0x)' });
  }
  const file = path.join(process.cwd(), 'token_contract.txt');
  fs.writeFileSync(file, tokenAddress.trim());
  io.emit('ponscore_token_updated', { tokenAddress: tokenAddress.trim() });
  res.json({ success: true, tokenAddress: tokenAddress.trim() });
});

app.get('/api/token-contract-address', (_, res) => {
  const file = path.join(process.cwd(), 'token_contract.txt');
  if (fs.existsSync(file)) {
    const addr = fs.readFileSync(file, 'utf8').trim();
    if (addr.startsWith('0x') && addr.length === 42) return res.json({ tokenAddress: addr });
  }
  res.json({ tokenAddress: (process.env.NEXT_PUBLIC_PONS_TOKEN_ADDRESS || '').trim() });
});

app.post('/api/admin/force-refresh', requireAdmin, (req, res) => {
  // Broadcast reload event to all connected player clients
  io.emit('force_client_reload', {
    timestamp: Date.now(),
    message: 'Admin memicu refresh server. Memuat ulang browser...',
  });

  // Re-broadcast fresh game states
  io.emit('ponscore_state', ponscore.getState());
  io.emit('ponscore_history', ponscore.getPastGames());

  res.json({
    success: true,
    message: 'Perintah refresh server berhasil disiarkan ke semua browser pemain!',
  });
});

const RPC_URL = process.env.RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
const AIRDROP_FILE = path.join(process.cwd(), 'airdrop_contract.json');

try {
  if (fs.existsSync(AIRDROP_FILE)) {
    const saved = JSON.parse(fs.readFileSync(AIRDROP_FILE, 'utf8'));
    if (saved.airdropContractAddress) {
      ponscore.setAirdropContract(saved.airdropContractAddress);
    }
  }
} catch (e) {
  console.warn('Could not load saved airdrop contract', e);
}

async function syncOnChainAirdropBalance() {
  const state = ponscore.getAirdropState();
  const tokenFile = path.join(process.cwd(), 'token_contract.txt');
  const tokenAddr = fs.existsSync(tokenFile)
    ? fs.readFileSync(tokenFile, 'utf8').trim()
    : (process.env.PONS_TOKEN_ADDRESS || '').trim();

  if (
    tokenAddr &&
    tokenAddr.startsWith('0x') &&
    tokenAddr.length === 42 &&
    state.airdropContractAddress &&
    state.airdropContractAddress.startsWith('0x')
  ) {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const tokenContract = new ethers.Contract(
        tokenAddr,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      const balWei = await tokenContract.balanceOf(state.airdropContractAddress);
      const onChainBalance = Number(ethers.formatEther(balWei));
      ponscore.airdropPoolBalance = onChainBalance;
      return onChainBalance;
    } catch (e) {
      console.warn('Failed to query on-chain balance for airdrop contract:', e);
    }
  }
  return ponscore.airdropPoolBalance;
}

app.get('/api/airdrop', async (_, res) => {
  await syncOnChainAirdropBalance();
  res.json(ponscore.getAirdropState());
});

app.post('/api/admin/fund-airdrop', requireAdmin, async (req, res) => {
  const { amount, txHash } = req.body;
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    return res.status(400).json({ error: 'Jumlah deposit token tidak valid' });
  }
  ponscore.fundAirdropPool(num, txHash);
  await syncOnChainAirdropBalance();
  io.emit('airdrop_state', ponscore.getAirdropState());
  res.json({ success: true, poolBalance: ponscore.airdropPoolBalance, message: `Berhasil mendeposit ${num.toLocaleString()} PONS ke Airdrop Vault!` });
});

app.post('/api/admin/set-airdrop-reward', requireAdmin, (req, res) => {
  const { reward } = req.body;
  const num = Number(reward);
  if (isNaN(num) || num <= 0) {
    return res.status(400).json({ error: 'Jumlah reward tidak valid' });
  }
  ponscore.setAirdropReward(num);
  io.emit('airdrop_state', ponscore.getAirdropState());
  res.json({ success: true, rewardPerClaim: num });
});

app.post('/api/admin/set-airdrop-contract', requireAdmin, async (req, res) => {
  const { airdropContractAddress } = req.body;
  if (!airdropContractAddress || !airdropContractAddress.startsWith('0x')) {
    return res.status(400).json({ error: 'Invalid airdrop contract address' });
  }
  ponscore.setAirdropContract(airdropContractAddress);
  try {
    fs.writeFileSync(AIRDROP_FILE, JSON.stringify({ airdropContractAddress }), 'utf8');
  } catch (e) {
    console.warn('Could not save airdrop contract', e);
  }
  await syncOnChainAirdropBalance();
  io.emit('airdrop_state', ponscore.getAirdropState());
  res.json({ success: true, airdropContractAddress, poolBalance: ponscore.airdropPoolBalance });
});

app.post('/api/admin/reset-airdrop-claims', requireAdmin, (req, res) => {
  ponscore.resetAirdropClaims();
  io.emit('airdrop_state', ponscore.getAirdropState());
  io.emit('airdrop_claims_reset');
  res.json({
    success: true,
    message: 'All airdrop claim history has been reset! All wallets can now claim again.',
  });
});
app.post('/api/admin/reset-betting', requireAdmin, (req, res) => {
  ponscore.factoryReset();
  chatMessages.length = 0;
  leaderboard.clear();
  io.emit('ponspot_state', ponscore.getState());
  io.emit('ponscore_state', ponscore.getState());
  io.emit('ponspot_history', []);
  io.emit('ponscore_history', []);
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
    ponscore.factoryReset();

    // 3. Clear Chat & Leaderboard
    chatMessages.length = 0;
    leaderboard.clear();

    // 4. Broadcast full fresh state to all connected clients
    io.emit('ponspot_state', ponscore.getState());
    io.emit('ponscore_state', ponscore.getState());
    io.emit('ponspot_history', []);
    io.emit('ponscore_history', []);
    io.emit('airdrop_state', ponscore.getAirdropState());
    io.emit('leaderboard_update', []);
    io.emit('chat_history', []);
    io.emit('ponspot_contract_updated', { contractAddress: '' });
    io.emit('ponscore_contract_updated', { contractAddress: '' });
    io.emit('ponscore_token_updated', { tokenAddress: '' });

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
app.get('/api/leaderboard', (_, res) => res.json(getLeaderboard()));
app.get('/api/chat', (_, res) => res.json(chatMessages.slice(-50)));

// --- Socket.io ---
io.on('connection', (socket) => {
  // Send initial states
  socket.emit('ponspot_state', ponscore.getState());
  socket.emit('ponscore_state', ponscore.getState());
  socket.emit('ponspot_history', ponscore.getPastGames());
  socket.emit('ponscore_history', ponscore.getPastGames());
  socket.emit('airdrop_state', ponscore.getAirdropState());
  socket.emit('jackpot_state', jackpot.getState());
  socket.emit('coinflip_games', coinflip.getOpenGames());
  socket.emit('leaderboard_update', getLeaderboard());
  socket.emit('chat_history', chatMessages.slice(-50));

  // --- Ponspot / Ponscore Events ---
  const handleBet = ({ playerAddress, playerName, amountPons, playerAvatar, txHash }: any) => {
    const result = ponscore.placeBet(playerAddress, playerName, amountPons, playerAvatar, txHash);
    socket.emit('ponspot_bet_result', result);
    socket.emit('ponscore_bet_result', result);
  };
  socket.on('ponspot_bet', handleBet);
  socket.on('ponscore_bet', handleBet);

  const handleClaim = ({ gameId, claimTxHash, address }: any) => {
    const ok = ponscore.markWinningsClaimed(gameId, claimTxHash);
    socket.emit('ponspot_claim_result', { success: ok, gameId, claimTxHash });
    socket.emit('ponscore_claim_result', { success: ok, gameId, claimTxHash });
    if (address) {
      const unclaimed = ponscore.getUnclaimedByPlayer(address);
      socket.emit('ponspot_unclaimed_list', unclaimed);
      socket.emit('ponscore_unclaimed_list', unclaimed);
    }
    io.emit('ponspot_history', ponscore.getPastGames());
    io.emit('ponscore_history', ponscore.getPastGames());
  };
  socket.on('ponspot_claim', handleClaim);
  socket.on('ponscore_claim', handleClaim);

  const handleGetUnclaimed = ({ address }: any) => {
    if (!address) return;
    const list = ponscore.getUnclaimedByPlayer(address);
    socket.emit('ponspot_unclaimed_list', list);
    socket.emit('ponscore_unclaimed_list', list);
  };
  socket.on('ponspot_get_unclaimed', handleGetUnclaimed);
  socket.on('ponscore_get_unclaimed', handleGetUnclaimed);

  const handleVerify = ({ gameId }: any) => {
    const report = ponscore.verifyGameById(gameId);
    socket.emit('ponspot_verify_result', { gameId, report });
    socket.emit('ponscore_verify_result', { gameId, report });
  };
  socket.on('ponspot_request_verify', handleVerify);
  socket.on('ponscore_request_verify', handleVerify);

  socket.on('claim_airdrop_signed', ({ playerAddress, playerName, signature }) => {
    const res = ponscore.claimAirdrop(playerAddress, playerName, signature);
    socket.emit('claim_airdrop_result', res);
    if (res.success) {
      io.emit('airdrop_state', ponscore.getAirdropState());
      const claimMsg = {
        id: `airdrop-${Date.now()}`,
        senderId: 'SYSTEM',
        senderName: '🎁 AIRDROP VAULT',
        senderAvatar: '/image/logo.png',
        text: `🎉 ${playerName || `${playerAddress.slice(0, 6)}...`} signed & claimed ${res.amount} PONSPOT from the Community Airdrop Vault!`,
        timestamp: Date.now(),
        isSystem: false,
      };
      chatMessages.push(claimMsg);
      io.emit('new_chat', claimMsg);
    }
  });

  // --- Legacy Jackpot Events ---
  socket.on('buy_tickets', ({ playerId, playerName, playerAvatar, walletAddress, quantity, txHash }) => {
    const result = jackpot.buyTickets(playerId, playerName, quantity, playerAvatar, walletAddress, txHash);
    socket.emit('buy_tickets_result', { ...result, txHash });
  });

  // --- CoinFlip Events ---
  socket.on('create_coinflip', ({ creatorId, creatorName, creatorAvatar, betAmount, side }) => {
    const result = coinflip.createGame(creatorId, creatorName, betAmount, side, creatorAvatar);
    socket.emit('create_coinflip_result', result);
  });

  socket.on('join_coinflip', ({ gameId, challengerId, challengerName, challengerAvatar }) => {
    const result = coinflip.joinGame(gameId, challengerId, challengerName, challengerAvatar);
    socket.emit('join_coinflip_result', result);
  });

  socket.on('cancel_coinflip', ({ gameId, requesterId }) => {
    coinflip.cancelGame(gameId, requesterId);
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
  console.log(`💎 Ponscore On-Chain PONS Gaming Server running on http://localhost:${PORT}`);
});
 
