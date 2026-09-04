'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  CASHFLIP_TOKEN_ADDRESS,
  GAME_CONTRACT_ADDRESS,
  ROBINHOOD_CHAIN_CONFIG,
  getCashFlipBalance,
  getCashFlipAllowance,
  approveCashFlip,
  placeBetOnChain,
  claimWinningsOnChain,
  getGameContractAddress,
  getCashFlipTokenAddress,
  formatTokenAmount,
  parseTokenAmount,
} from '@/lib/web3/contracts';

export type TxState = 'idle' | 'approving' | 'betting' | 'claiming' | 'confirmed' | 'failed';

function getWalletProvider(walletType: 'okx' | 'metamask' | 'rabby' | 'bitget' | null) {
  if (typeof window === 'undefined') return null;
  const win = window as any;
  if (walletType === 'okx' && win.okxwallet) return win.okxwallet;
  if (walletType === 'rabby' && win.rabby) return win.rabby;
  if (walletType === 'bitget' && win.bitkeep?.ethereum) return win.bitkeep.ethereum;
  if (walletType === 'metamask' && win.ethereum) return win.ethereum;
  return win.ethereum || win.okxwallet || win.rabby || win.bitkeep?.ethereum || null;
}

interface CashFlipWeb3ContextType {
  account: string | null;
  walletType: 'okx' | 'metamask' | 'rabby' | 'bitget' | null;
  isConnected: boolean;
  usdgBalance: number;       // Number of USDG
  cashflipBalance: number;
  usdgAllowance: number;     // Number of USDG approved
  cashflipAllowance: number;
  isApproved: (amount: number) => boolean;
  txState: TxState;
  lastTxHash: string | null;
  errorMessage: string | null;
  connectWallet: (type?: 'okx' | 'metamask' | 'rabby' | 'bitget') => Promise<void>;
  disconnectWallet: () => void;
  approveTokens: (amount?: number) => Promise<string | null>;
  placeBet: (gameId: string, amount: number) => Promise<string | null>;
  claimWinnings: (
    gameId: string,
    prizeAmount?: number,
    serverSeedHex?: string,
    serverSeedHashHex?: string
  ) => Promise<string | null>;
  signAirdropMessage: (message: string) => Promise<string>;
  refreshBalances: () => Promise<void>;
  faucet: () => void;
}

const CashFlipWeb3Context = createContext<CashFlipWeb3ContextType>({
  account: null,
  walletType: null,
  isConnected: false,
  usdgBalance: 0,
  cashflipBalance: 0,
  usdgAllowance: 0,
  cashflipAllowance: 0,
  isApproved: () => false,
  txState: 'idle',
  lastTxHash: null,
  errorMessage: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  approveTokens: async () => null,
  placeBet: async () => null,
  claimWinnings: async () => null,
  signAirdropMessage: async () => '',
  refreshBalances: async () => {},
  faucet: () => {},
});

export const useCashFlipWeb3 = () => useContext(CashFlipWeb3Context);

export const CashFlipWeb3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<'okx' | 'metamask' | 'rabby' | 'bitget' | null>(null);
  const [usdgBalance, setUsdgBalance] = useState<number>(0);
  const [usdgAllowance, setUsdgAllowance] = useState<number>(0);
  const [txState, setTxState] = useState<TxState>('idle');
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load saved CashFlip session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('cashflip_user_session') || localStorage.getItem('cashflip_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        setAccount(parsed.account);
        setWalletType(parsed.walletType);
        if (parsed.usdgBalance !== undefined) setUsdgBalance(parsed.usdgBalance);
        if (parsed.usdgAllowance !== undefined) setUsdgAllowance(parsed.usdgAllowance);
      }
    } catch (e) {
      console.error('Failed to load cashflip session', e);
    }
  }, []);

  const saveSession = useCallback((acc: string | null, type: any, bal: number, allow: number) => {
    if (!acc) {
      localStorage.removeItem('cashflip_user_session');
      localStorage.removeItem('cashflip_user_session');
      return;
    }
    const sessionData = JSON.stringify({ account: acc, walletType: type, usdgBalance: bal, usdgAllowance: allow });
    localStorage.setItem('cashflip_user_session', sessionData);
    localStorage.setItem('cashflip_user_session', sessionData);
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!account) return;
    try {
      const rawBal = await getCashFlipBalance(account);
      const balNum = formatTokenAmount(rawBal);
      if (rawBal > 0n || balNum > 0) {
        setUsdgBalance(balNum);
      }

      const localApproved = typeof window !== 'undefined' && (
        localStorage.getItem(`cashflip_approved_${account.toLowerCase()}`) === 'true' ||
        localStorage.getItem(`cashflip_approved_${account.toLowerCase()}`) === 'true'
      );

      const gameAddr = getGameContractAddress();
      let allowNum = localApproved ? Math.max(usdgAllowance, 1000000000) : usdgAllowance;
      if (gameAddr && gameAddr.startsWith('0x') && gameAddr.length === 42) {
        const rawAllow = await getCashFlipAllowance(account, gameAddr);
        const onChainAllow = formatTokenAmount(rawAllow);
        if (onChainAllow > 0) {
          allowNum = onChainAllow;
          setUsdgAllowance(allowNum);
        } else if (localApproved) {
          allowNum = Math.max(usdgAllowance, 1000000000);
          setUsdgAllowance(allowNum);
        } else {
          allowNum = 0;
          setUsdgAllowance(0);
        }
      } else if (localApproved) {
        allowNum = Math.max(usdgAllowance, 1000000000);
        setUsdgAllowance(allowNum);
      }

      saveSession(account, walletType, balNum, allowNum);
    } catch (e) {
      console.warn('Could not read balances from contract, keeping local state');
    }
  }, [account, walletType, usdgAllowance, saveSession]);

  useEffect(() => {
    if (account) {
      refreshBalances();
    }
  }, [account, refreshBalances]);

  const connectWallet = useCallback(async (type: 'okx' | 'metamask' | 'rabby' | 'bitget' = 'okx') => {
    setErrorMessage(null);

    try {
      let selectedAccount = '';
      const providerObj = getWalletProvider(type);

      if (providerObj) {
        // Request account
        const accounts = await providerObj.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts selected');
        }
        selectedAccount = accounts[0];

        // Switch or add Robinhood Chain
        try {
          await providerObj.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ROBINHOOD_CHAIN_CONFIG.chainHexId }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain')) {
            await providerObj.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: ROBINHOOD_CHAIN_CONFIG.chainHexId,
                  chainName: ROBINHOOD_CHAIN_CONFIG.name,
                  rpcUrls: [ROBINHOOD_CHAIN_CONFIG.rpcUrl],
                  nativeCurrency: ROBINHOOD_CHAIN_CONFIG.nativeCurrency,
                  blockExplorerUrls: [ROBINHOOD_CHAIN_CONFIG.blockExplorer],
                },
              ],
            });
          }
        }
      } else {
        throw new Error('Web3 Provider not found. Please make sure your wallet extension is active.');
      }

      setAccount(selectedAccount);
      setWalletType(type);

      const localApproved = typeof window !== 'undefined' && (
        localStorage.getItem(`cashflip_approved_${selectedAccount.toLowerCase()}`) === 'true' ||
        localStorage.getItem(`cashflip_approved_${selectedAccount.toLowerCase()}`) === 'true'
      );

      let initialBal = 0;
      let initialAllow = localApproved ? 1000000000 : 0;

      try {
        const rawBal = await getCashFlipBalance(selectedAccount);
        initialBal = formatTokenAmount(rawBal);
        const gameAddr = getGameContractAddress();
        if (gameAddr && gameAddr.startsWith('0x') && gameAddr.length === 42) {
          const rawAllow = await getCashFlipAllowance(selectedAccount, gameAddr);
          const onChainAllow = formatTokenAmount(rawAllow);
          if (onChainAllow > 0) {
            initialAllow = onChainAllow;
          } else if (localApproved) {
            initialAllow = 1000000000;
          }
        } else if (localApproved) {
          initialAllow = 1000000000;
        } else {
          const saved = localStorage.getItem('cashflip_user_session') || localStorage.getItem('cashflip_user_session');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.usdgAllowance !== undefined) initialAllow = parsed.usdgAllowance;
          }
        }
      } catch (e) {
        console.warn('Could not read real on-chain balance on connect:', e);
        if (localApproved) initialAllow = 1000000000;
      }

      setUsdgBalance(initialBal);
      setUsdgAllowance(initialAllow);
      saveSession(selectedAccount, type, initialBal, initialAllow);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to connect wallet');
      console.error(err);
      throw err;
    }
  }, [saveSession]);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setWalletType(null);
    setUsdgBalance(0);
    setUsdgAllowance(0);
    setLastTxHash(null);
    localStorage.removeItem('cashflip_user_session');
    localStorage.removeItem('cashflip_user_session');
  }, []);

  const isApproved = useCallback((amount: number) => {
    if (!account) return false;
    const gameAddr = getGameContractAddress();
    if (!gameAddr || !gameAddr.startsWith('0x') || gameAddr.length !== 42) {
      return false;
    }
    const localApproved = typeof window !== 'undefined' && (
      localStorage.getItem(`cashflip_approved_${account.toLowerCase()}`) === 'true' ||
      localStorage.getItem(`cashflip_approved_${account.toLowerCase()}`) === 'true'
    );
    return localApproved || usdgAllowance >= amount || usdgAllowance >= 999999;
  }, [account, usdgAllowance]);

  /**
   * Approve USDG spending
   */
  const approveTokens = useCallback(async (amountPons?: number): Promise<string | null> => {
    if (!account) throw new Error('Wallet not connected');
    setTxState('approving');
    setErrorMessage(null);

    try {
      const providerObj = getWalletProvider(walletType);
      const gameAddr = getGameContractAddress();
      const tokenAddr = getCashFlipTokenAddress();

      if (!gameAddr || !gameAddr.startsWith('0x') || gameAddr.length !== 42) {
        throw new Error('Game Smart Contract is not deployed on Robinhood Chain. Please deploy the smart contract first.');
      }

      if (!providerObj) {
        throw new Error('OKX / Web3 Wallet provider not found. Please make sure your wallet extension is active.');
      }

      const browserProvider = new ethers.BrowserProvider(providerObj);
      const signer = await browserProvider.getSigner();
      const amountWei = amountPons && amountPons > 0
        ? parseTokenAmount(amountPons)
        : ethers.MaxUint256;

      // Real on-chain approve -> Pops up OKX Wallet for transaction signature
      const txHash = await approveCashFlip(signer, amountWei, gameAddr);

      // Persist approval flag per account in localStorage
      if (typeof window !== 'undefined' && account) {
        localStorage.setItem(`cashflip_approved_${account.toLowerCase()}`, 'true');
        localStorage.setItem(`cashflip_approved_${account.toLowerCase()}`, 'true');
      }

      // Immediately grant high allowance so place bet button unlocks instantly
      const grantedAllowance = amountPons ? Math.max(amountPons, 1000000000) : 1000000000;
      setUsdgAllowance(grantedAllowance);
      saveSession(account, walletType, usdgBalance, grantedAllowance);

      setLastTxHash(txHash);
      setTxState('confirmed');

      // Refresh on-chain balances safely without wiping approved state
      try {
        await refreshBalances();
      } catch {}

      setTimeout(() => setTxState('idle'), 2500);
      return txHash;
    } catch (e: any) {
      setTxState('failed');
      const errMsg = e?.reason || e?.message || 'Approval failed';
      setErrorMessage(errMsg);
      setTimeout(() => setTxState('idle'), 4000);
      throw e;
    }
  }, [account, walletType, usdgBalance, refreshBalances, saveSession]);

  /**
   * Place Bet directly on-chain
   */
  const placeBet = useCallback(async (gameId: string, amountPons: number): Promise<string | null> => {
    if (!account) throw new Error('Wallet not connected');
    if (usdgBalance < amountPons) {
      throw new Error(`Insufficient USDG balance. You have ${usdgBalance.toLocaleString()} USDG in your wallet.`);
    }


    setTxState('betting');
    setErrorMessage(null);

    try {
      const providerObj = getWalletProvider(walletType);

      let txHash = '';
      if (providerObj) {
        const browserProvider = new ethers.BrowserProvider(providerObj);
        const signer = await browserProvider.getSigner();
        const amountWei = parseTokenAmount(amountPons);
        // Executes real on-chain token transfer on Robinhood Chain!
        txHash = await placeBetOnChain(signer, gameId, amountWei);
        // Refresh real on-chain balance immediately!
        await refreshBalances();
      } else {
        txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      }

      setLastTxHash(txHash);
      setTxState('confirmed');
      setTimeout(() => setTxState('idle'), 2500);
      return txHash;
    } catch (e: any) {
      setTxState('failed');
      setErrorMessage(e?.message || 'Bet placement failed');
      setTimeout(() => setTxState('idle'), 4000);
      throw e;
    }
  }, [account, walletType, usdgBalance, refreshBalances]);

  /**
   * Claim Winnings directly from smart contract
   */
  const claimWinnings = useCallback(
    async (
      gameId: string,
      prizeAmountPons?: number,
      serverSeedHex?: string,
      serverSeedHashHex?: string
    ): Promise<string | null> => {
      if (!account) throw new Error('Wallet not connected');
      setTxState('claiming');
      setErrorMessage(null);

      try {
        const providerObj = getWalletProvider(walletType);

        let txHash = '';
        if (providerObj) {
          const browserProvider = new ethers.BrowserProvider(providerObj);
          const signer = await browserProvider.getSigner();
          txHash = await claimWinningsOnChain(
            signer,
            gameId,
            prizeAmountPons,
            serverSeedHex,
            serverSeedHashHex
          );
        }

        setLastTxHash(txHash);
        setTxState('confirmed');
        await refreshBalances();
        setTimeout(() => setTxState('idle'), 4000);
        return txHash;
      } catch (e: any) {
        setTxState('failed');
        setErrorMessage(e?.message || 'Claim failed');
        setTimeout(() => setTxState('idle'), 4000);
        throw e;
      }
    },
    [account, walletType, refreshBalances]
  );

  const signAirdropMessage = useCallback(async (message: string): Promise<string> => {
    if (!account) throw new Error('Wallet not connected');
    const providerObj = getWalletProvider(walletType);

    if (providerObj) {
      const browserProvider = new ethers.BrowserProvider(providerObj);
      const signer = await browserProvider.getSigner();
      return await signer.signMessage(message);
    }

    throw new Error('Web3 provider not available for signing');
  }, [account, walletType]);

  const faucet = useCallback(() => {
    setUsdgBalance((prev) => {
      const updated = prev + 10;
      if (account) saveSession(account, walletType, updated, usdgAllowance);
      return updated;
    });
  }, [account, walletType, usdgAllowance, saveSession]);

  return (
    <CashFlipWeb3Context.Provider
      value={{
        account,
        walletType,
        isConnected: !!account,
        usdgBalance,
        cashflipBalance: usdgBalance,
        usdgAllowance,
        cashflipAllowance: usdgAllowance,
        isApproved,
        txState,
        lastTxHash,
        errorMessage,
        connectWallet,
        disconnectWallet,
        approveTokens,
        placeBet,
        claimWinnings,
        signAirdropMessage,
        refreshBalances,
        faucet,
      }}
    >
      {children}
    </CashFlipWeb3Context.Provider>
  );
};

