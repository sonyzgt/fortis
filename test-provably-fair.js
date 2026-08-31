const crypto = require('crypto');

console.log('=== TEST 1: Provably Fair Seed Generation & Commitment ===');
const serverSeed = crypto.randomBytes(32).toString('hex');
const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
const gameId = 'PONS-8F3A91';
const publicSeed = 'ponscore-2026';
const nonce = 1;

const gameHash = crypto.createHash('sha256').update(`${gameId}${serverSeedHash}${publicSeed}${nonce}`).digest('hex');

console.log('Server Seed:', serverSeed);
console.log('Server Seed Hash:', serverSeedHash);
console.log('Game ID:', gameId);
console.log('Game Hash:', gameHash);

console.log('\n=== TEST 2: Weighted Ticket Allocation ===');
const playerA = { name: 'Player A', amount: 1000, startTicket: 0, endTicket: 999 };
const playerB = { name: 'Player B', amount: 5000, startTicket: 1000, endTicket: 5999 };
const playerC = { name: 'Player C', amount: 10000, startTicket: 6000, endTicket: 15999 };
const totalTickets = 16000;

console.log('Player A (1,000 PONS): Tickets 0 - 999 (Chance: 6.25%)');
console.log('Player B (5,000 PONS): Tickets 1,000 - 5,999 (Chance: 31.25%)');
console.log('Player C (10,000 PONS): Tickets 6,000 - 15,999 (Chance: 62.50%)');
console.log('Total Tickets:', totalTickets);

console.log('\n=== TEST 3: Deterministic HMAC-SHA256 Winning Ticket Calculation ===');
const payload = `${publicSeed}:${gameId}:${nonce}`;
const winningHash = crypto.createHmac('sha256', serverSeed).update(payload).digest('hex');
const winningTicket = Number(BigInt('0x' + winningHash) % BigInt(totalTickets));

console.log('Winning Hash (HMAC-SHA256):', winningHash);
console.log('Winning Ticket Number:', winningTicket);

let winner = null;
if (winningTicket >= playerA.startTicket && winningTicket <= playerA.endTicket) winner = playerA;
else if (winningTicket >= playerB.startTicket && winningTicket <= playerB.endTicket) winner = playerB;
else if (winningTicket >= playerC.startTicket && winningTicket <= playerC.endTicket) winner = playerC;

console.log('Winner Found:', winner.name, `(contains ticket #${winningTicket})`);

console.log('\n=== TEST 4: Mathematical Reproduction & Verification ===');
const checkSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
const isSeedMatch = checkSeedHash === serverSeedHash;

const checkGameHash = crypto.createHash('sha256').update(`${gameId}${serverSeedHash}${publicSeed}${nonce}`).digest('hex');
const isGameHashMatch = checkGameHash === gameHash;

const checkWinHash = crypto.createHmac('sha256', serverSeed).update(payload).digest('hex');
const checkWinningTicket = Number(BigInt('0x' + checkWinHash) % BigInt(totalTickets));
const isTicketMatch = checkWinningTicket === winningTicket;

console.log('✓ SERVER SEED VERIFIED:', isSeedMatch);
console.log('✓ GAME HASH VERIFIED:', isGameHashMatch);
console.log('✓ WINNING TICKET VERIFIED:', isTicketMatch);

if (isSeedMatch && isGameHashMatch && isTicketMatch) {
  console.log('\n>>> ALL PROVABLY FAIR TESTS PASSED PERFECTLY! <<<');
} else {
  throw new Error('Verification failed');
}
