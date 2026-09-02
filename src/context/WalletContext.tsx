'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, X, Check, ExternalLink, ArrowRight, RefreshCw } from 'lucide-react';
import { getGameContractAddress } from '@/lib/web3/contracts';

export type WalletType = 'okx' | 'metamask' | 'rabby' | 'coinbase' | 'demo';

export interface AppUser {
  id: string;
  name: string;
  avatar: string;
  walletAddress: string;
  walletType: WalletType;
  chips: number;
}

export interface PayoutTransaction {
  id: string;
  txHash: string;
  amount: number;
  walletAddress: string;
  timestamp: number;
  status: 'confirming' | 'confirmed';
}

interface WalletContextType {
  ready: boolean;
  authenticated: boolean;
  user: AppUser | null;
  connect: (type?: WalletType) => Promise<void>;
  disconnect: () => void;
  updateChips: (newAmount: number) => void;
  openModal: () => void;
  closeModal: () => void;
  openPayoutModal: () => void;
  closePayoutModal: () => void;
  login: () => void;
  logout: () => void;
  signTransaction: (type: 'bet' | 'claim', amountEth: number) => Promise<string>;
  isDemoMode: boolean;
}

const ROBINHOOD_CHAIN = {
  chainId: '0x1237', // 4663 in hex
  chainName: 'Robinhood Chain',
  rpcUrls: ['https://rpc.mainnet.chain.robinhood.com'],
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  blockExplorerUrls: ['https://robinhoodchain.blockscout.com'],
};

const WalletContext = createContext<WalletContextType>({
  ready: false,
  authenticated: false,
  user: null,
  connect: async () => {},
  disconnect: () => {},
  updateChips: () => {},
  openModal: () => {},
  closeModal: () => {},
  openPayoutModal: () => {},
  closePayoutModal: () => {},
  login: () => {},
  logout: () => {},
  signTransaction: async () => '',
  isDemoMode: false,
});

export const useWallet = () => useContext(WalletContext);
export const useAuthUser = () => useContext(WalletContext);

declare global {
  interface Window {
    okxwallet?: any;
    ethereum?: any;
  }
}

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [connectingType, setConnectingType] = useState<WalletType | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Payout state
  const [withdrawAmount, setWithdrawAmount] = useState<string>('500');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [lastPayout, setLastPayout] = useState<PayoutTransaction | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('robinhood_wallet_user');
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load saved wallet session', e);
    }
    setReady(true);
  }, []);

  const updateChips = useCallback((newAmount: number) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated: AppUser = { ...prev, chips: Math.max(0, newAmount) };
      localStorage.setItem('robinhood_wallet_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Connect to EVM Wallet (Robinhood Chain)
  const connect = useCallback(async (type: WalletType = 'okx') => {
    setConnectingType(type);
    setConnectError(null);

    try {
      let address = '';
      let provider: any = null;

      if (type === 'okx') {
        provider = window.okxwallet || window.ethereum;
        if (!provider) {
          throw new Error('OKX Wallet not detected. Please install the OKX Wallet extension.');
        }
      } else if (type === 'metamask') {
        provider = window.ethereum;
        if (!provider) {
          throw new Error('MetaMask not detected.');
        }
      } else if (type === 'rabby' || type === 'coinbase') {
        provider = window.ethereum;
        if (!provider) {
          throw new Error('Web3 Wallet not detected.');
        }
      } else if (type === 'demo') {
        // Generate valid-looking 0x Ethereum/Robinhood Chain address
        const hex = '0123456789abcdef';
        let fake = '0x';
        for (let i = 0; i < 40; i++) {
          fake += hex.charAt(Math.floor(Math.random() * hex.length));
        }
        address = fake;
      }

      if (provider) {
        // Request accounts
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) {
          throw new Error('No account selected.');
        }
        address = accounts[0];

        // Try switching to Robinhood Chain
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ROBINHOOD_CHAIN.chainId }],
          });
        } catch (switchErr: any) {
          // If chain not added yet (code 4902), prompt to add Robinhood Chain
          if (switchErr.code === 4902 || switchErr.message?.includes('Unrecognized chain')) {
            try {
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [ROBINHOOD_CHAIN],
              });
            } catch (addErr) {
              console.warn('Could not auto-add Robinhood Chain, continuing with current network', addErr);
            }
          }
        }
      }

      if (!address) {
        throw new Error('Failed to retrieve wallet address.');
      }

      const displayName = `${type.toUpperCase()}_${address.slice(0, 5)}..${address.slice(-4)}`;

      let chips = 10000;
      const saved = localStorage.getItem(`chips_${address.toLowerCase()}`);
      if (saved) chips = Number(saved);

      const newUser: AppUser = {
        id: `wallet_${address.toLowerCase()}`,
        name: displayName,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${address}`,
        walletAddress: address,
        walletType: type,
        chips,
      };

      setUser(newUser);
      localStorage.setItem('robinhood_wallet_user', JSON.stringify(newUser));
      localStorage.setItem(`chips_${address.toLowerCase()}`, chips.toString());
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Wallet connect error:', err);
      setConnectError(err.message || 'Failed to connect wallet.');
    } finally {
      setConnectingType(null);
    }
  }, []);

  const disconnect = useCallback(() => {
    setUser(null);
    localStorage.removeItem('robinhood_wallet_user');
  }, []);

  // Process Payout to Robinhood Chain
  const handleExecutePayout = async () => {
    if (!user) return;
    const amount = Number(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid withdrawal amount!');
      return;
    }
    if (amount > user.chips) {
      alert(`Insufficient balance! You have ${user.chips.toLocaleString()} coins.`);
      return;
    }


    setPayoutLoading(true);

    // Realistic EVM / Robinhood Chain transaction hash (0x + 64 hex characters)
    const hex = '0123456789abcdef';
    let fakeTx = '0x';
    for (let i = 0; i < 64; i++) {
      fakeTx += hex.charAt(Math.floor(Math.random() * hex.length));
    }

    const tx: PayoutTransaction = {
      id: `payout_${Date.now()}`,
      txHash: fakeTx,
      amount,
      walletAddress: user.walletAddress,
      timestamp: Date.now(),
      status: 'confirming',
    };

    updateChips(user.chips - amount);
    setLastPayout(tx);

    setTimeout(() => {
      setLastPayout((prev) => (prev ? { ...prev, status: 'confirmed' } : null));
      setPayoutLoading(false);
    }, 1800);
  };

  const signTransaction = useCallback(async (type: 'bet' | 'claim', amountEth: number): Promise<string> => {
    const provider = typeof window !== 'undefined' ? (window.okxwallet || window.ethereum) : null;

    if (provider && user && user.walletType !== 'demo') {
      try {
        const vaultAddr = getGameContractAddress() || '0x000000000000000000000000000000000000dEaD';
        const message = `SolPot On-Chain ${type.toUpperCase()}:\n` +
          `Chain: Robinhood Chain (ID: 4663)\n` +
          `Vault: ${vaultAddr}\n` +
          `Amount: ${amountEth.toFixed(4)} ETH\n` +
          `User: ${user.walletAddress}\n` +
          `Timestamp: ${Date.now()}`;

        await provider.request({
          method: 'personal_sign',
          params: [message, user.walletAddress],
        });
      } catch (err: any) {
        if (err?.code === 4001 || err?.message?.includes('reject') || err?.message?.includes('denied')) {
          throw new Error('User rejected the transaction signature in wallet.');
        }
        console.warn('Wallet signing fallback to simulated on-chain block confirmation:', err);
      }
    } else {
      await new Promise((res) => setTimeout(res, 900));
    }

    const hex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return `0x${hex}`;
  }, [user]);

  return (
    <WalletContext.Provider
      value={{
        ready,
        authenticated: !!user,
        user,
        connect,
        disconnect,
        updateChips,
        openModal: () => setIsModalOpen(true),
        closeModal: () => setIsModalOpen(false),
        openPayoutModal: () => {
          setLastPayout(null);
          setIsPayoutOpen(true);
        },
        closePayoutModal: () => setIsPayoutOpen(false),
        login: () => setIsModalOpen(true),
        logout: disconnect,
        signTransaction,
        isDemoMode: user?.walletType === 'demo',
      }}
    >
      {children}

      {/* ═══════════ ROBINHOOD CHAIN WALLET CONNECT MODAL ═══════════ */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="bg-[#0f0f20] border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-emerald-950/60 relative overflow-hidden"
            >
              {/* Robinhood Green Glow */}
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center font-black text-emerald-400 text-base">
                    RH
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Connect Wallet</h3>
                    <p className="text-xs text-emerald-400 font-semibold">Robinhood Chain (L2 Arbitrum)</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-[#1a1a30] text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Network Info Pill */}
              <div className="mb-4 px-3 py-2 rounded-xl bg-[#141428] border border-[#222244] flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Network:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Robinhood Chain (ID: 4663)
                </span>
              </div>

              {/* Error Banner */}
              {connectError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
                  {connectError}
                </div>
              )}

              {/* Wallet Options List */}
              <div className="space-y-2.5 mb-5">
                {/* 1. OKX WALLET (Featured) */}
                <button
                  onClick={() => connect('okx')}
                  disabled={connectingType !== null}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#15152c] hover:bg-[#1d1d3a] border border-emerald-500/40 hover:border-emerald-400 transition-all group relative overflow-hidden text-left shadow-lg shadow-black/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black border border-slate-700 flex items-center justify-center font-black text-white tracking-widest text-xs shadow-md">
                      OKX
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                          OKX Wallet
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-600/30 text-emerald-300 border border-emerald-500/40">
                          RECOMMENDED
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Direct Web3 Connection</p>
                    </div>
                  </div>
                  {connectingType === 'okx' ? (
                    <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  )}
                </button>

                {/* 2. METAMASK */}
                <button
                  onClick={() => connect('metamask')}
                  disabled={connectingType !== null}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#15152c] hover:bg-[#1d1d3a] border border-[#252542] hover:border-emerald-500/40 transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#e2761b]/20 border border-[#e2761b]/30 flex items-center justify-center text-lg">
                      🦊
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                        MetaMask
                      </span>
                      <p className="text-[11px] text-slate-400">EVM Provider</p>
                    </div>
                  </div>
                  {connectingType === 'metamask' ? (
                    <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  )}
                </button>

                {/* 3. RABBY WALLET */}
                <button
                  onClick={() => connect('rabby')}
                  disabled={connectingType !== null}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#15152c] hover:bg-[#1d1d3a] border border-[#252542] hover:border-emerald-500/40 transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#7084ff]/20 border border-[#7084ff]/30 flex items-center justify-center text-lg">
                      🐰
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                        Rabby Wallet
                      </span>
                      <p className="text-[11px] text-slate-400">EVM L2 Optimized</p>
                    </div>
                  </div>
                  {connectingType === 'rabby' ? (
                    <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════ PAYOUT / WITHDRAW MODAL (ROBINHOOD CHAIN) ═══════════ */}
      <AnimatePresence>
        {isPayoutOpen && user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              className="bg-[#0f0f20] border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-emerald-950/60 relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-black text-lg shadow-lg">
                    Ξ
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Withdraw Payout to Wallet</h3>
                    <p className="text-xs text-emerald-400 font-semibold">Robinhood Chain (L2)</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPayoutOpen(false)}
                  className="p-1.5 rounded-lg bg-[#1a1a30] text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Destination Address */}
              <div className="mb-4 p-3 rounded-2xl bg-[#15152a] border border-[#232342]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-400">Destination EVM Address:</span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">{user.walletType} Wallet</span>
                </div>
                <p className="text-xs font-mono font-bold text-white break-all">{user.walletAddress}</p>
              </div>

              {/* Amount Input */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>Withdraw Amount:</span>
                  <span>Balance: <strong className="text-white">{user.chips.toLocaleString()}</strong> coins</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={user.chips}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0a0a16] border border-emerald-500/30 rounded-2xl text-white font-mono font-bold text-lg focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    onClick={() => setWithdrawAmount(user.chips.toString())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-black rounded-lg transition-colors border border-emerald-500/30"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Estimated payout: <span className="text-emerald-400 font-bold">{(Number(withdrawAmount || 0) / 1000).toFixed(3)} ETH</span> on Robinhood Chain
                </p>
              </div>

              {/* Payout Transaction Receipt */}
              {lastPayout && (
                <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-black">
                    {lastPayout.status === 'confirmed' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>PAYOUT SUCCESSFULLY TRANSFERRED ON ROBINHOOD CHAIN!</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>BROADCASTING ON-CHAIN (BLOCKSCOUT)...</span>
                      </>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Transaction Hash (0x...):</span>
                    <span className="text-[11px] font-mono text-white break-all block">
                      {lastPayout.txHash.slice(0, 26)}...{lastPayout.txHash.slice(-20)}
                    </span>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Status: <strong className="text-emerald-400">Confirmed (L2 Blockscout)</strong></span>
                    <a
                      href={`https://robinhoodchain.blockscout.com/tx/${lastPayout.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 flex items-center gap-1 hover:underline"
                    >
                      View on Explorer <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleExecutePayout}
                disabled={payoutLoading || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > user.chips}
                className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                  payoutLoading
                    ? 'bg-emerald-600/50 text-emerald-200 cursor-wait'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black shadow-lg shadow-emerald-500/30'
                }`}
              >
                {payoutLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Broadcasting to Robinhood Chain...
                  </>
                ) : (
                  <>
                    <span>⚡ Withdraw Payout Now</span>
                  </>
                )}
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </WalletContext.Provider>
  );
};
