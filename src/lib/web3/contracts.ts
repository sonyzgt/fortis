import { ethers } from 'ethers';
import PonspotTokenABI from './abi/PonspotTokenABI.json';
import PonspotJackpotABI from './abi/PonspotJackpotABI.json';
import PonspotAirdropABI from './abi/PonspotAirdropABI.json';

export const DEFAULT_TOKEN_ADDRESS = '0x5cc01710b1c710d94703fb0e81f3c21ccb047e22';

// --- Environment Configuration ---
export function getPonspotTokenAddress(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ponspot_token_contract') || localStorage.getItem('ponscore_token_contract');
    if (saved && saved.startsWith('0x') && saved.length === 42) {
      return saved;
    }
  }
  const envAddr = (process.env.NEXT_PUBLIC_PONSPOT_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_PONS_TOKEN_ADDRESS || '').trim();
  if (envAddr && envAddr.startsWith('0x') && envAddr.length === 42) {
    return envAddr;
  }
  return DEFAULT_TOKEN_ADDRESS;
}

export const getPonsTokenAddress = getPonspotTokenAddress;

export const PONSPOT_TOKEN_ADDRESS =
  (process.env.NEXT_PUBLIC_PONSPOT_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_PONS_TOKEN_ADDRESS || DEFAULT_TOKEN_ADDRESS).trim();
export const PONS_TOKEN_ADDRESS = PONSPOT_TOKEN_ADDRESS;

export function getGameContractAddress(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ponspot_deployed_game_contract') || localStorage.getItem('ponscore_deployed_game_contract');
    if (
      saved &&
      saved.startsWith('0x') &&
      saved.length === 42 &&
      saved.toLowerCase() !== '0x71c7656ec7ab88b098defb751b7401b5f6d8976f'
    ) {
      return saved;
    }
  }
  const envAddr = (process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || '').trim();
  if (
    envAddr &&
    envAddr.startsWith('0x') &&
    envAddr.length === 42 &&
    envAddr.toLowerCase() !== '0x71c7656ec7ab88b098defb751b7401b5f6d8976f'
  ) {
    return envAddr;
  }
  return '';
}

export const GAME_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || '').trim();

export const ROBINHOOD_CHAIN_CONFIG = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 4663),
  chainHexId: '0x1237',
  name: 'Robinhood Chain',
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com',
  blockExplorer: 'https://robinhoodchain.blockscout.com',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
};

/**
 * Get read-only provider for Robinhood Chain
 */
export function getReadOnlyProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(ROBINHOOD_CHAIN_CONFIG.rpcUrl);
}

/**
 * Get PONSPOT Token Contract instance
 */
export function getPonspotContract(runner?: ethers.ContractRunner): ethers.Contract {
  const tokenAddress = getPonspotTokenAddress();
  return new ethers.Contract(
    tokenAddress || DEFAULT_TOKEN_ADDRESS,
    PonspotTokenABI,
    runner || getReadOnlyProvider()
  );
}

export const getPonsContract = getPonspotContract;

/**
 * Get Ponspot Jackpot Contract instance
 */
export function getGameContract(runner?: ethers.ContractRunner, customAddress?: string): ethers.Contract {
  const gameAddress = customAddress || getGameContractAddress();
  return new ethers.Contract(
    gameAddress,
    PonspotJackpotABI,
    runner || getReadOnlyProvider()
  );
}

/**
 * Fetch PONSPOT token balance of an address
 */
export async function getPonspotBalance(accountAddress: string): Promise<bigint> {
  try {
    if (!accountAddress || !accountAddress.startsWith('0x')) return 0n;
    const contract = getPonspotContract();
    return await contract.balanceOf(accountAddress);
  } catch (e) {
    console.warn('Could not read balanceOf from token contract on Robinhood Chain:', e);
    return 0n;
  }
}

export const getPonsBalance = getPonspotBalance;

/**
 * Fetch PONSPOT token allowance
 */
export async function getPonspotAllowance(
  ownerAddress: string,
  spenderAddress?: string
): Promise<bigint> {
  try {
    if (!ownerAddress || !ownerAddress.startsWith('0x')) return 0n;
    const targetSpender = spenderAddress || getGameContractAddress();
    if (!targetSpender || !targetSpender.startsWith('0x') || targetSpender.length !== 42) {
      return 0n;
    }
    const contract = getPonspotContract();
    return await contract.allowance(ownerAddress, targetSpender);
  } catch (e) {
    return 0n;
  }
}

export const getPonsAllowance = getPonspotAllowance;

/**
 * Approve PONSPOT token spending by game contract
 */
export async function approvePonspot(
  signer: ethers.Signer,
  amount?: bigint,
  spenderAddress?: string
): Promise<string> {
  const targetSpender = spenderAddress || getGameContractAddress();
  if (!targetSpender || !targetSpender.startsWith('0x') || targetSpender.length !== 42) {
    throw new Error('Alamat Smart Contract Game belum diset atau tidak valid. Harap pastikan game contract sudah dideploy.');
  }
  const tokenAddress = getPonspotTokenAddress();
  if (!tokenAddress || !tokenAddress.startsWith('0x') || tokenAddress.length !== 42) {
    throw new Error('Alamat Token Contract tidak valid.');
  }

  const contract = getPonspotContract(signer);
  const approveAmount = amount && amount > 0n ? amount : ethers.MaxUint256;
  const tx = await contract.approve(targetSpender, approveAmount);
  const receipt = await tx.wait();
  return receipt.hash || tx.hash;
}

export const approvePons = approvePonspot;

/**
 * Place on-chain bet directly to game smart contract or vault
 * Executes the actual on-chain PONS token transfer on Robinhood Chain
 */
export async function placeBetOnChain(
  signer: ethers.Signer,
  gameId: string,
  amount: bigint
): Promise<string> {
  const contractAddress = getGameContractAddress();
  const provider = signer.provider || getReadOnlyProvider();
  let code = '0x';
  try {
    code = await provider.getCode(contractAddress);
  } catch (e) {
    code = '0x';
  }
  const isContractDeployed = code && code !== '0x';

  if (isContractDeployed) {
    try {
      const contract = getGameContract(signer);
      const tx = await contract.bet(gameId, amount);
      const receipt = await tx.wait();
      return receipt.hash || tx.hash;
    } catch (err) {
      console.warn('contract.bet failed or reverted, falling back to direct token transfer:', err);
    }
  }

  // Direct ERC-20 token transfer on Robinhood Chain!
  // This GUARANTEES the PONS (marcopolo) tokens are ACTUALLY transferred on-chain!
  const ponsContract = getPonsContract(signer);
  const tx = await ponsContract.transfer(contractAddress, amount);
  const receipt = await tx.wait();
  return receipt.hash || tx.hash;
}

/**
 * Claim winnings directly from game smart contract with provably fair proof
 */
export async function claimWinningsOnChain(
  signer: ethers.Signer,
  gameId: string,
  prizeAmountPons?: number,
  serverSeedHex?: string,
  serverSeedHashHex?: string
): Promise<string> {
  const contract = getGameContract(signer);
  const prizeWei = ethers.parseEther((prizeAmountPons || 1000).toString());

  // 1. Primary call: claimWinnings(string,uint256)
  // This sends an actual on-chain transaction that executes ponsToken.transfer(winner, prize)!
  try {
    const fn = contract.getFunction('claimWinnings(string,uint256)');
    const tx = await fn(gameId, prizeWei);
    const receipt = await tx.wait();
    return receipt.hash || tx.hash;
  } catch (err0: any) {
    console.warn('claimWinnings(string,uint256) failed:', err0);
    if (err0?.code === 4001 || err0?.message?.includes('user rejected') || err0?.message?.includes('User denied')) {
      throw new Error('Transaksi klaim dibatalkan di wallet.');
    }
  }

  // 2. Try claimWinnings with proof (4 arguments)
  try {
    let seedBytes32 = ethers.ZeroHash;
    if (serverSeedHex && serverSeedHex.length >= 64) {
      seedBytes32 = serverSeedHex.startsWith('0x') ? serverSeedHex : '0x' + serverSeedHex;
    }
    let seedHashBytes32 = ethers.ZeroHash;
    if (serverSeedHashHex && serverSeedHashHex.length >= 64) {
      seedHashBytes32 = serverSeedHashHex.startsWith('0x') ? serverSeedHashHex : '0x' + serverSeedHashHex;
    }
    const fnProof = contract.getFunction('claimWinnings(string,uint256,bytes32,bytes32)');
    const tx = await fnProof(gameId, prizeWei, seedBytes32, seedHashBytes32);
    const receipt = await tx.wait();
    return receipt.hash || tx.hash;
  } catch (err1: any) {
    console.warn('claimWinnings with proof failed:', err1);
    if (err1?.code === 4001 || err1?.message?.includes('user rejected') || err1?.message?.includes('User denied')) {
      throw new Error('Transaksi klaim dibatalkan di wallet.');
    }
  }

  // 3. Try legacy claimWinnings(string)
  try {
    const fnLegacy = contract.getFunction('claimWinnings(string)');
    const tx = await fnLegacy(gameId);
    const receipt = await tx.wait();
    return receipt.hash || tx.hash;
  } catch (err2: any) {
    console.error('All claim attempts failed on-chain:', err2);
    throw new Error(err2?.reason || err2?.message || 'Gagal mengeksekusi transfer klaim di blockchain.');
  }
}

/**
 * Client-side Provably Fair Verification
 */
export async function verifyGameClientSide(
  serverSeed: string,
  serverSeedHash: string,
  publicSeed: string,
  nonce: number,
  gameId: string,
  gameHash: string,
  winningHash: string,
  winningTicket: number,
  totalTickets: number
) {
  // 1. Calculate SHA256(serverSeed)
  const calcServerSeedHash = ethers.sha256(ethers.toUtf8Bytes(serverSeed)).slice(2); // remove 0x
  const serverSeedValid = calcServerSeedHash.toLowerCase() === serverSeedHash.toLowerCase();

  // 2. Calculate Game Hash: SHA256(gameId + serverSeedHash + publicSeed + nonce)
  const gamePayload = `${gameId}${serverSeedHash}${publicSeed}${nonce}`;
  const calcGameHash = ethers.sha256(ethers.toUtf8Bytes(gamePayload)).slice(2);
  const gameHashValid = calcGameHash.toLowerCase() === gameHash.toLowerCase();

  // 3. Calculate HMAC-SHA256
  // Using Web Crypto API
  let winningHashValid = false;
  let calcWinningHash = '';
  let calcWinningTicket = 0;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(serverSeed);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const msgData = encoder.encode(`${publicSeed}:${gameId}:${nonce}`);
    const signature = await crypto.subtle.sign('HMAC', key, msgData);
    calcWinningHash = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    winningHashValid = calcWinningHash.toLowerCase() === winningHash.toLowerCase();

    if (totalTickets > 0) {
      calcWinningTicket = Number(BigInt('0x' + calcWinningHash) % BigInt(totalTickets));
    }
  } catch (e) {
    console.error('Web Crypto HMAC calculation error:', e);
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

export function getAirdropContractAddress(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ponspot_airdrop_contract') || localStorage.getItem('ponscore_airdrop_contract');
    if (saved && saved.startsWith('0x') && saved.length === 42) {
      return saved;
    }
  }
  return process.env.NEXT_PUBLIC_AIRDROP_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
}

export function getAirdropContract(
  signerOrProvider?: ethers.Signer | ethers.Provider,
  customAddress?: string
): ethers.Contract {
  const address = customAddress || getAirdropContractAddress();
  const provider = signerOrProvider || getReadOnlyProvider();
  return new ethers.Contract(address, PonspotAirdropABI, provider);
}

export async function claimAirdropOnChain(
  signer: ethers.Signer,
  customAirdropAddress?: string
): Promise<string> {
  const contract = getAirdropContract(signer, customAirdropAddress);
  const tx = await contract.claim();
  const receipt = await tx.wait();
  return receipt.hash || tx.hash;
}

export async function depositAirdropOnChain(
  signer: ethers.Signer,
  amountWei: bigint,
  customAirdropAddress?: string
): Promise<string> {
  const airdropAddr = customAirdropAddress || getAirdropContractAddress();
  const tokenContract = getPonsContract(signer);
  const approveTx = await tokenContract.approve(airdropAddr, amountWei);
  await approveTx.wait();

  const airdropContract = getAirdropContract(signer, airdropAddr);
  const tx = await airdropContract.deposit(amountWei);
  const receipt = await tx.wait();
  return receipt.hash || tx.hash;
}

export async function fetchOnChainAirdropBalance(customAirdropAddress?: string): Promise<number> {
  try {
    const airdropAddr = customAirdropAddress || getAirdropContractAddress();
    if (!airdropAddr || !airdropAddr.startsWith('0x') || airdropAddr === '0x0000000000000000000000000000000000000000') {
      return 0;
    }
    const provider = getReadOnlyProvider();
    const token = getPonsContract(provider);
    const balanceWei = await token.balanceOf(airdropAddr);
    return Number(ethers.formatEther(balanceWei));
  } catch (e) {
    console.warn('Failed to fetch on-chain airdrop balance:', e);
    return 0;
  }
}

export async function withdrawBettingContractOnChain(
  signer: ethers.Signer,
  amountWei: bigint,
  customGameAddress?: string
): Promise<string> {
  const gameAddr = customGameAddress || getGameContractAddress();
  if (!gameAddr || !gameAddr.startsWith('0x') || gameAddr.length !== 42) {
    throw new Error('Alamat Smart Contract Game belum diset atau tidak valid. Silakan set atau deploy contract terlebih dahulu.');
  }

  const contract = getGameContract(signer, gameAddr);
  
  // Try adminWithdrawPool first (new contract has this — admin-only, no pool balance restriction)
  let tx;
  try {
    if (typeof contract['adminWithdrawPool'] === 'function') {
      tx = await contract.adminWithdrawPool(amountWei);
    } else {
      throw new Error('NO_ADMIN_WITHDRAW');
    }
  } catch (e: any) {
    // Fallback: old contract without adminWithdrawPool, use claimWinnings
    if (e?.message === 'NO_ADMIN_WITHDRAW' || e?.code === 'CALL_EXCEPTION') {
      const withdrawGameId = `admin-withdraw-${Date.now()}`;
      if (typeof contract['claimWinnings(string,uint256)'] === 'function') {
        tx = await contract['claimWinnings(string,uint256)'](withdrawGameId, amountWei);
      } else {
        tx = await contract.claimWinnings(withdrawGameId, amountWei);
      }
    } else {
      throw e;
    }
  }

  const receipt = await tx.wait();
  return receipt?.hash || tx.hash;
}

/**
 * Rescue any ERC20 token stuck in the game contract (using adminWithdraw)
 * Only works with new contract that has adminWithdraw function
 */
export async function rescueTokenFromContract(
  signer: ethers.Signer,
  tokenAddress: string,
  amountWei: bigint,
  customGameAddress?: string
): Promise<string> {
  const gameAddr = customGameAddress || getGameContractAddress();
  if (!gameAddr || !gameAddr.startsWith('0x') || gameAddr.length !== 42) {
    throw new Error('Alamat Smart Contract Game tidak valid.');
  }
  const contract = getGameContract(signer, gameAddr);
  const tx = await contract.adminWithdraw(tokenAddress, amountWei);
  const receipt = await tx.wait();
  return receipt?.hash || tx.hash;
}

export async function withdrawAirdropContractOnChain(
  signer: ethers.Signer,
  amountWei: bigint,
  customAirdropAddress?: string
): Promise<string> {
  const airdropAddr = customAirdropAddress || getAirdropContractAddress();
  if (!airdropAddr || !airdropAddr.startsWith('0x') || airdropAddr.length !== 42) {
    throw new Error('Alamat Smart Contract Airdrop belum diset atau tidak valid. Silakan set atau deploy contract terlebih dahulu.');
  }

  const contract = getAirdropContract(signer, airdropAddr);
  const tx = await contract.emergencyWithdraw(amountWei);
  const receipt = await tx.wait();
  return receipt?.hash || tx.hash;
}
