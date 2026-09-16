import { ethers } from 'ethers';
import CashFlipTokenABI from './abi/CashFlipTokenABI.json';
import CashFlipJackpotABI from './abi/CashFlipJackpotABI.json';
import { getApiBaseUrl } from '@/lib/apiConfig';

export const DEFAULT_TOKEN_ADDRESS = '';
export const TOKEN_SYMBOL = (process.env.NEXT_PUBLIC_TOKEN_SYMBOL || 'FORTIS').trim();
export const TOKEN_DECIMALS = parseInt(process.env.NEXT_PUBLIC_TOKEN_DECIMALS || '18', 10);

export function parseTokenAmount(amount: number | string): bigint {
  if (typeof amount === 'string') {
    const clean = amount.trim();
    if (!clean || isNaN(Number(clean)) || Number(clean) <= 0) return 0n;
    const parts = clean.split('.');
    if (parts.length === 2 && parts[1].length > TOKEN_DECIMALS) {
      return ethers.parseUnits(`${parts[0]}.${parts[1].slice(0, TOKEN_DECIMALS)}`, TOKEN_DECIMALS);
    }
    return ethers.parseUnits(clean, TOKEN_DECIMALS);
  }
  const num = amount;
  if (isNaN(num) || num <= 0) return 0n;
  const maxDec = Math.min(TOKEN_DECIMALS, 8);
  const fixedStr = Number(num).toFixed(maxDec);
  return ethers.parseUnits(fixedStr, TOKEN_DECIMALS);
}

export function formatTokenAmount(raw: bigint | string): number {
  try {
    return Number(ethers.formatUnits(raw, TOKEN_DECIMALS));
  } catch (e) {
    return 0;
  }
}

// --- Fortis / Web3 Environment Configuration ---
export function getCashFlipTokenAddress(): string {
  if (typeof window !== 'undefined') {
    const saved =
      localStorage.getItem('fortis_token_contract') ||
      localStorage.getItem('fortis_token_contract') ||
      localStorage.getItem('cashflip_token_contract');
    if (saved && saved.startsWith('0x') && saved.length === 42) {
      return saved;
    }
  }
  const envAddr = (
    process.env.NEXT_PUBLIC_FORTIS_TOKEN_ADDRESS ||
    process.env.NEXT_PUBLIC_FORTIS_TOKEN_ADDRESS ||
    process.env.NEXT_PUBLIC_CASHFLIP_TOKEN_ADDRESS ||
    process.env.NEXT_PUBLIC_PONSPOT_TOKEN_ADDRESS ||
    process.env.NEXT_PUBLIC_PONS_TOKEN_ADDRESS ||
    process.env.PONS_TOKEN_ADDRESS ||
    ''
  ).trim();
  if (envAddr && envAddr.startsWith('0x') && envAddr.length === 42) {
    return envAddr;
  }
  return DEFAULT_TOKEN_ADDRESS;
}

export const getFortisTokenAddress = getCashFlipTokenAddress;

export const CASHFLIP_TOKEN_ADDRESS =
  (
    process.env.NEXT_PUBLIC_FORTIS_TOKEN_ADDRESS ||
    process.env.NEXT_PUBLIC_CASHFLIP_TOKEN_ADDRESS ||
    process.env.NEXT_PUBLIC_PONSPOT_TOKEN_ADDRESS ||
    process.env.NEXT_PUBLIC_PONS_TOKEN_ADDRESS ||
    process.env.PONS_TOKEN_ADDRESS ||
    DEFAULT_TOKEN_ADDRESS
  ).trim();

export const FORTIS_TOKEN_ADDRESS = CASHFLIP_TOKEN_ADDRESS;

export const DEFAULT_GAME_CONTRACT_ADDRESS = '';

export function getGameContractAddress(): string {
  if (typeof window !== 'undefined') {
    const saved =
      localStorage.getItem('fortis_deployed_game_contract') ||
      localStorage.getItem('cashflip_deployed_game_contract');
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
  return DEFAULT_GAME_CONTRACT_ADDRESS;
}

export const GAME_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || DEFAULT_GAME_CONTRACT_ADDRESS).trim();

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
 * Get CashFlip (USDG) Token Contract instance
 */
export function getCashFlipContract(runner?: ethers.ContractRunner): ethers.Contract {
  const tokenAddress = getCashFlipTokenAddress();
  return new ethers.Contract(
    tokenAddress || DEFAULT_TOKEN_ADDRESS,
    CashFlipTokenABI,
    runner || getReadOnlyProvider()
  );
}


/**
 * Get CashFlip Jackpot Contract instance
 */
export function getGameContract(runner?: ethers.ContractRunner, customAddress?: string): ethers.Contract {
  const gameAddress = customAddress || getGameContractAddress();
  return new ethers.Contract(
    gameAddress,
    CashFlipJackpotABI,
    runner || getReadOnlyProvider()
  );
}

/**
 * Fetch CashFlip (USDG) token balance of an address
 */
export async function getCashFlipBalance(accountAddress: string): Promise<bigint> {
  try {
    if (!accountAddress || !accountAddress.startsWith('0x')) return 0n;
    const contract = getCashFlipContract();
    return await contract.balanceOf(accountAddress);
  } catch (e) {
    console.warn('Could not read balanceOf from token contract on Robinhood Chain:', e);
    return 0n;
  }
}


/**
 * Fetch CashFlip (USDG) token allowance
 */
export async function getCashFlipAllowance(
  ownerAddress: string,
  spenderAddress?: string
): Promise<bigint> {
  try {
    if (!ownerAddress || !ownerAddress.startsWith('0x')) return 0n;
    const targetSpender = spenderAddress || getGameContractAddress();
    if (!targetSpender || !targetSpender.startsWith('0x') || targetSpender.length !== 42) {
      return 0n;
    }
    const contract = getCashFlipContract();
    return await contract.allowance(ownerAddress, targetSpender);
  } catch (e) {
    return 0n;
  }
}


/**
 * Approve CashFlip (USDG) token spending by game contract
 */
export async function approveCashFlip(
  signer: ethers.Signer,
  amount?: bigint,
  spenderAddress?: string
): Promise<string> {
  const targetSpender = spenderAddress || getGameContractAddress();
  if (!targetSpender || !targetSpender.startsWith('0x') || targetSpender.length !== 42) {
    throw new Error('Game Contract address is not set or invalid.');
  }
  const tokenAddress = getCashFlipTokenAddress();
  if (!tokenAddress || !tokenAddress.startsWith('0x') || tokenAddress.length !== 42) {
    throw new Error('Invalid Token Contract address.');
  }

  const contract = getCashFlipContract(signer);
  const approveAmount = amount && amount > 0n ? amount : ethers.MaxUint256;
  const tx = await contract.approve(targetSpender, approveAmount);
  const receipt = await tx.wait();
  return receipt.hash || tx.hash;
}


/**
 * Place on-chain bet directly to game smart contract or vault
 * Executes the actual on-chain USDG token transfer on Robinhood Chain
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
  const tokenContract = getCashFlipContract(signer);
  const tx = await tokenContract.transfer(contractAddress, amount);
  const receipt = await tx.wait();
  return receipt.hash || tx.hash;
}

/**
 * Claim winnings from smart contract.
 * Fetches an ECDSA server authorization signature first, then calls claimWinnings(gameId, prizeAmount, signature).
 * The new contract verifies the signature on-chain — bots cannot steal funds.
 */
export async function claimWinningsOnChain(
  signer: ethers.Signer,
  gameId: string,
  prizeAmount?: number,
  _serverSeedHex?: string,    // kept for API compat, unused in new contract
  _serverSeedHashHex?: string  // kept for API compat, unused in new contract
): Promise<string> {
  const contract = getGameContract(signer);
  const prizeWei = parseTokenAmount(prizeAmount || 0);
  const winnerAddress = await signer.getAddress();

  // 1. Fetch ECDSA server signature from game server
  //    Server signs: keccak256(abi.encodePacked(gameId, winner, prizeAmount))
  const apiBase = getApiBaseUrl();
  let serverSignature: string;
  let claimAmountWei = prizeWei;
  try {
    const resp = await fetch(`${apiBase}/api/claim/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, winner: winnerAddress, prizeAmount: prizeWei.toString() }),
    });
    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      throw new Error(errBody?.error || `Server signature request failed: ${resp.status}`);
    }
    const data = await resp.json();
    if (!data.signature) throw new Error('Server did not return signature');
    serverSignature = data.signature;
    if (data.prizeAmount) {
      claimAmountWei = BigInt(data.prizeAmount);
    }
  } catch (fetchErr: any) {
    throw new Error(`Failed to obtain server claim signature: ${fetchErr?.message}`);
  }

  // 2. Call claimWinnings(gameId, claimAmountWei, serverSignature) on-chain
  try {
    const fn = contract.getFunction('claimWinnings(string,uint256,bytes)');
    const tx = await fn(gameId, claimAmountWei, serverSignature);
    const receipt = await tx.wait();
    return receipt.hash || tx.hash;
  } catch (err: any) {
    if (err?.code === 4001 || err?.message?.includes('user rejected') || err?.message?.includes('User denied')) {
      throw new Error('Claim transaction was cancelled in wallet.');
    }
    throw new Error(err?.reason || err?.message || 'Failed to execute claim on blockchain.');
  }
}

/**
 * Check if a specific gameId has already been claimed on-chain
 */
export async function isGameClaimedOnChain(gameId: string): Promise<boolean> {
  try {
    if (!gameId) return false;
    const contract = getGameContract();
    const isClaimed = await contract.claimedGames(gameId);
    return Boolean(isClaimed);
  } catch (e) {
    return false;
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

export async function withdrawBettingContractOnChain(
  signer: ethers.Signer,
  amountWei: bigint,
  customGameAddress?: string
): Promise<string> {
  const gameAddr = customGameAddress || getGameContractAddress();
  if (!gameAddr || !gameAddr.startsWith('0x') || gameAddr.length !== 42) {
    throw new Error('Game Smart Contract address is not configured or invalid. Please deploy or set the contract first.');
  }

  const signerAddr = await signer.getAddress();
  const contract = getGameContract(signer, gameAddr);

  // Check if signer is the contract admin
  try {
    const contractAdmin = await contract.admin();
    if (contractAdmin && signerAddr.toLowerCase() !== contractAdmin.toLowerCase()) {
      throw new Error(
        `Your connected wallet (${signerAddr.slice(0, 6)}...${signerAddr.slice(-4)}) is not the Contract Admin (${contractAdmin.slice(0, 6)}...${contractAdmin.slice(-4)}). Please switch to the contract deployer wallet in your browser extension to execute withdrawal.`
      );
    }
  } catch (err: any) {
    if (err.message?.includes('not the Contract Admin')) {
      throw err;
    }
  }

  let tx;
  try {
    // 1. Try adminWithdrawPool first (direct pool reserve withdrawal)
    tx = await contract.adminWithdrawPool(amountWei);
  } catch (poolErr: any) {
    console.warn('adminWithdrawPool failed, trying adminWithdraw with explicit token address:', poolErr);
    
    // Check if user rejected in wallet
    if (poolErr?.code === 'ACTION_REJECTED' || poolErr?.code === 4001) {
      throw poolErr;
    }

    // 2. Try adminWithdraw with explicit token address
    try {
      const tokenAddr = getCashFlipTokenAddress();
      tx = await contract.adminWithdraw(tokenAddr, amountWei);
    } catch (tokenErr: any) {
      if (tokenErr?.code === 'ACTION_REJECTED' || tokenErr?.code === 4001) {
        throw tokenErr;
      }
      const rawMsg =
        tokenErr?.reason ||
        tokenErr?.info?.error?.message ||
        tokenErr?.data?.message ||
        poolErr?.reason ||
        poolErr?.info?.error?.message ||
        poolErr?.data?.message ||
        poolErr?.message ||
        'Sanctuary withdrawal failed on-chain';
      throw new Error(rawMsg);
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
    throw new Error('Game Smart Contract address is invalid.');
  }
  const contract = getGameContract(signer, gameAddr);
  const tx = await contract.adminWithdraw(tokenAddress, amountWei);
  const receipt = await tx.wait();
  return receipt?.hash || tx.hash;
}

/**
 * Deposit liquidity / house bankroll into smart contract escrow pool
 */
export async function depositBankrollOnChain(
  signer: ethers.Signer,
  amountWei: bigint,
  contractAddress?: string
): Promise<string> {
  const targetContract = contractAddress || getGameContractAddress();
  const tokenContract = getCashFlipContract(signer);
  const userAddress = await signer.getAddress();

  // 1. Check & approve allowance if needed
  const currentAllowance: bigint = await tokenContract.allowance(userAddress, targetContract);
  if (currentAllowance < amountWei) {
    const approveTx = await tokenContract.approve(targetContract, ethers.MaxUint256);
    await approveTx.wait();
  }

  // 2. Call depositLiquidity on the game contract if available, otherwise direct transfer
  try {
    const gameContract = getGameContract(signer, targetContract);
    const fn = gameContract.getFunction('depositLiquidity(uint256)');
    const tx = await fn(amountWei);
    const receipt = await tx.wait();
    return receipt.hash || tx.hash;
  } catch (err: any) {
    console.warn('depositLiquidity function call failed, falling back to direct token transfer:', err);
    const tx = await tokenContract.transfer(targetContract, amountWei);
    const receipt = await tx.wait();
    return receipt.hash || tx.hash;
  }
}

