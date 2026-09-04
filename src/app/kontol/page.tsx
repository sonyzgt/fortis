'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import {
  ShieldAlert,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  Coins,
  Check,
  AlertTriangle,
  RotateCcw,
  Layers,
  Database,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  LogOut,
  Sparkles,
  CheckCircle2,
  Copy,
  Trash2,
  Flame,
  AlertOctagon,
  Scroll,
  Compass,
  Feather,
} from 'lucide-react';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { DeployModal } from '@/components/cashflip/DeployModal';
import {
  ROBINHOOD_CHAIN_CONFIG,
  getGameContractAddress,
  getCashFlipTokenAddress,
  withdrawBettingContractOnChain,
  parseTokenAmount,
  CASHFLIP_TOKEN_ADDRESS,
} from '@/lib/web3/contracts';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { CelestialEmblem } from '@/components/ui/CelestialEmblem';
import { BookplateCorner, CelestialFlourish } from '@/components/ui/CelestialFlourish';

export default function AdminPanelPage() {
  const { account, isConnected, connectWallet, refreshBalances } = useCashFlipWeb3();

  // Authentication State (Secure Session via Backend Token)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Contracts & Engine State
  const [activeContract, setActiveContract] = useState<string>('');
  const [activeTokenContract, setActiveTokenContract] = useState<string>('');
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [contractVaultBalance, setContractVaultBalance] = useState<string>('0');
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [bettingWithdrawAmount, setBettingWithdrawAmount] = useState<string>('');
  const [isWithdrawingBetting, setIsWithdrawingBetting] = useState<boolean>(false);
  const [manualContractInput, setManualContractInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [gameStats, setGameStats] = useState<any>(null);
  const [pastGames, setPastGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFactoryResetting, setIsFactoryResetting] = useState(false);
  const [showFactoryResetModal, setShowFactoryResetModal] = useState(false);

  // Get dynamic backend API URL
  const getApiBase = () => {
    return getApiBaseUrl();
  };

  // Authenticated Admin Fetch Helper
  const adminFetch = async (endpoint: string, options: RequestInit = {}) => {
    const apiBase = getApiBase();
    const token =
      adminToken ||
      (typeof window !== 'undefined' ? sessionStorage.getItem('cashflip_admin_token') || '' : '');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'x-admin-token': token } : {}),
      ...(options.headers || {}),
    };
    return fetch(`${apiBase}${endpoint}`, { ...options, headers });
  };

  // Check saved admin session and ensure smooth scrolling
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = sessionStorage.getItem('cashflip_admin_token');
      if (savedToken) {
        setAdminToken(savedToken);
        const apiBase = getApiBase();
        fetch(`${apiBase}/api/admin/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': savedToken },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.valid) {
              setIsAuthenticated(true);
              fetchContractInfo();
            } else {
              sessionStorage.removeItem('cashflip_admin_token');
              setIsAuthenticated(false);
            }
          })
          .catch(() => {
            setIsAuthenticated(true);
            fetchContractInfo();
          });
      }
      document.documentElement.style.overflowY = 'auto';
      document.body.style.overflowY = 'auto';
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchContractInfo();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError('Please enter administrator password.');
      return;
    }

    setIsLoggingIn(true);
    setAuthError('');
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        setAdminToken(data.token);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('cashflip_admin_token', data.token);
        }
        setIsAuthenticated(true);
        fetchContractInfo();
      } else {
        setAuthError(data.error || 'Invalid password.');
      }
    } catch (err: any) {
      setAuthError('Failed to commune with authorization server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminToken('');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('cashflip_admin_token');
    }
  };

  const fetchContractInfo = async () => {
    setLoading(true);
    const apiBase = getApiBase();
    const ts = Date.now();

    try {
      const res = await fetch(`${apiBase}/api/contract-address?_t=${ts}`);
      const data = await res.json();
      if (data.contractAddress) {
        setActiveContract(data.contractAddress);
        setManualContractInput(data.contractAddress);
      }
    } catch (e) {
      console.warn('Could not load contract address', e);
    }

    try {
      const tokenRes = await fetch(`${apiBase}/api/token-contract-address?_t=${ts}`);
      const tokenData = await tokenRes.json();
      if (tokenData.tokenAddress) {
        setActiveTokenContract(tokenData.tokenAddress);
        setManualTokenInput(tokenData.tokenAddress);
      }
    } catch (e) {
      console.warn('Could not load token address', e);
    }

    try {
      const balRes = await fetch(`${apiBase}/api/admin/contract-balance?_t=${ts}`);
      const balData = await balRes.json();
      if (balData.balance !== undefined) {
        setContractVaultBalance(balData.balance);
      }
    } catch (e) {
      console.warn('Could not load contract balance', e);
    }

    try {
      const stateRes = await fetch(`${apiBase}/api/game/state?_t=${ts}`);
      const stateData = await stateRes.json();
      setGameStats(stateData);
    } catch (e) {
      console.warn('Could not load game stats', e);
    }

    try {
      const histRes = await fetch(`${apiBase}/api/game/history?_t=${ts}`);
      const histData = await histRes.json();
      if (Array.isArray(histData)) {
        setPastGames(histData);
      }
    } catch (e) {
      console.warn('Could not load history', e);
    }

    setLoading(false);
  };

  const handleSetTokenContract = async () => {
    const trimmed = manualTokenInput.trim();
    if (!trimmed.startsWith('0x') || trimmed.length !== 42) {
      setStatusMsg({ ok: false, text: 'Invalid token contract address (must be 42 characters starting with 0x)' });
      return;
    }

    try {
      const res = await adminFetch('/api/admin/set-token-contract', {
        method: 'POST',
        body: JSON.stringify({ tokenAddress: trimmed }),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        localStorage.setItem('cashflip_token_contract', trimmed);
        localStorage.setItem('cashflip_token_contract', trimmed);
        setActiveTokenContract(trimmed);
        setStatusMsg({ ok: true, text: `Active betting token updated to: ${trimmed}` });
        fetchContractInfo();
      } else {
        throw new Error(data.error || 'Failed to update token');
      }
    } catch (e: any) {
      localStorage.setItem('cashflip_token_contract', trimmed);
      localStorage.setItem('cashflip_token_contract', trimmed);
      setActiveTokenContract(trimmed);
      setStatusMsg({ ok: true, text: `Betting token saved locally in browser: ${trimmed}` });
      fetchContractInfo();
    }
  };

  const handleSetContract = async () => {
    const trimmed = manualContractInput.trim();
    if (!trimmed.startsWith('0x') || trimmed.length !== 42) {
      setStatusMsg({ ok: false, text: `Invalid contract address format (${trimmed.length} chars). Must be 42 characters starting with 0x.` });
      return;
    }

    try {
      const res = await adminFetch('/api/admin/set-contract', {
        method: 'POST',
        body: JSON.stringify({ contractAddress: trimmed }),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        localStorage.setItem('cashflip_deployed_game_contract', trimmed);
        localStorage.setItem('cashflip_deployed_game_contract', trimmed);
        setActiveContract(trimmed);
        setStatusMsg({ ok: true, text: `Active smart contract updated to: ${trimmed}` });
        fetchContractInfo();
      } else {
        throw new Error(data.error || 'Failed to update contract');
      }
    } catch (e: any) {
      localStorage.setItem('cashflip_deployed_game_contract', trimmed);
      localStorage.setItem('cashflip_deployed_game_contract', trimmed);
      setActiveContract(trimmed);
      setStatusMsg({ ok: true, text: `Smart contract saved locally in browser: ${trimmed}` });
      fetchContractInfo();
    }
  };

  const handleWithdrawBetting = async () => {
    const num = parseFloat(bettingWithdrawAmount);
    if (isNaN(num) || num <= 0) {
      setStatusMsg({ ok: false, text: 'Please enter a valid withdrawal amount!' });
      return;
    }

    const availableBal = Number(contractVaultBalance);
    if (num > availableBal) {
      setStatusMsg({ ok: false, text: `Insufficient sanctuary balance (Available: ${availableBal.toLocaleString()} USDG)` });
      return;
    }

    let targetContract = (activeContract || getGameContractAddress() || '').trim();
    if (!targetContract.startsWith('0x') || targetContract.length !== 42) {
      try {
        const res = await fetch(`${getApiBase()}/api/contract-address`);
        const data = await res.json();
        if (data.contractAddress && data.contractAddress.length === 42) {
          targetContract = data.contractAddress;
          setActiveContract(targetContract);
        }
      } catch {}
    }

    if (!targetContract || !targetContract.startsWith('0x') || targetContract.length !== 42) {
      setStatusMsg({ ok: false, text: `Sanctuary Contract address (${targetContract}) is invalid.` });
      return;
    }

    setIsWithdrawingBetting(true);
    try {
      const win = typeof window !== 'undefined' ? (window as any) : {};
      const providerObj = win.okxwallet || win.ethereum || win.rabby || win.bitkeep?.ethereum;
      if (!providerObj) {
        throw new Error('Wallet extension (OKX Wallet, MetaMask, Rabby) not detected in your browser.');
      }

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

      const provider = new ethers.BrowserProvider(providerObj);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const withdrawWei = parseTokenAmount(num);

      setStatusMsg({ ok: true, text: 'Please affirm the sanctuary withdrawal in your wallet...' });
      const txHash = await withdrawBettingContractOnChain(signer, withdrawWei, targetContract);

      setStatusMsg({
        ok: true,
        text: `Successfully withdrew ${num.toLocaleString()} USDG from Sanctuary Escrow to Admin Wallet! Hash: ${txHash.slice(0, 10)}...`,
      });
      setBettingWithdrawAmount('');
      fetchContractInfo();
      refreshBalances?.();
    } catch (e: any) {
      console.error('Withdraw betting error:', e);
      if (e?.code === 'ACTION_REJECTED' || e?.code === 4001) {
        setStatusMsg({ ok: false, text: 'Withdrawal transaction was cancelled in wallet.' });
      } else {
        const msg = e?.info?.error?.message || e?.data?.message || e?.reason || e?.shortMessage || e?.message || 'Failed to withdraw from sanctuary contract';
        setStatusMsg({ ok: false, text: msg });
      }
    } finally {
      setIsWithdrawingBetting(false);
    }
  };

  const [refreshingServer, setRefreshingServer] = useState(false);

  const handleForceServerRefresh = async () => {
    setRefreshingServer(true);
    try {
      const res = await adminFetch('/api/admin/force-refresh', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success || res.ok) {
        setStatusMsg({
          ok: true,
          text: 'Sanctuary signal broadcast! All connected observers will automatically reload to the latest version.',
        });
        fetchContractInfo();
      } else {
        throw new Error(data.message || 'Failed to refresh server');
      }
    } catch (e: any) {
      setStatusMsg({
        ok: false,
        text: e?.message || 'Failed to contact sanctuary server',
      });
    } finally {
      setTimeout(() => setRefreshingServer(false), 1200);
    }
  };

  const handleResetClaims = async () => {
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/game/reset-claims`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ ok: true, text: 'All game claim statuses reset successfully!' });
        fetchContractInfo();
      } else {
        setStatusMsg({ ok: false, text: data.error || 'Failed to reset claims' });
      }
    } catch (e: any) {
      setStatusMsg({ ok: false, text: 'Failed to reset claims' });
    }
  };

  const [deletingHistory, setDeletingHistory] = useState(false);

  const handleDeleteHistory = async () => {
    if (!window.confirm('Are you sure you want to permanently delete all historical epoch manifest records? This action cannot be undone.')) {
      return;
    }
    setDeletingHistory(true);
    try {
      const res = await adminFetch('/api/admin/clear-history', { method: 'POST' });
      const data = await res.json();
      if (data.success || res.ok) {
        setPastGames([]);
        setStatusMsg({
          ok: true,
          text: data.message || 'Historical manifest successfully purged from database!',
        });
        fetchContractInfo();
      } else {
        throw new Error(data.error || 'Failed to delete history');
      }
    } catch (e: any) {
      setStatusMsg({
        ok: false,
        text: e?.message || 'Failed to delete history',
      });
    } finally {
      setDeletingHistory(false);
    }
  };

  const handleResetBetting = async () => {
    try {
      const res = await adminFetch('/api/admin/reset-betting', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          ok: true,
          text: 'All active bets, player balances, and rounds have been cleanly reset back to Epoch #1!',
        });
        fetchContractInfo();
      } else {
        setStatusMsg({ ok: false, text: data.error || 'Failed to reset betting' });
      }
    } catch (e: any) {
      setStatusMsg({ ok: false, text: 'Failed to communicate with admin server' });
    }
  };

  const handleFactoryReset = async () => {
    setIsFactoryResetting(true);
    try {
      const res = await adminFetch('/api/admin/factory-reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        setShowFactoryResetModal(false);
        setStatusMsg({
          ok: true,
          text: 'Sanctuary purified! All configurations wiped. Reloading in 2 seconds...',
        });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setStatusMsg({ ok: false, text: data.error || 'Purification failed' });
      }
    } catch (e: any) {
      setStatusMsg({ ok: false, text: 'Failed to execute factory reset' });
    } finally {
      setIsFactoryResetting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // ═══════════════════════════════════════════════════════════════════
  // 1. PASSWORD AUTHENTICATION SCREEN
  // ═══════════════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#E8DFD1] text-[#171513] font-serif flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="editorial-frame w-full max-w-md p-6 sm:p-8 bg-[#F4EFE6] text-[#171513] shadow-[0_20px_50px_rgba(0,0,0,0.35)] space-y-5 text-center relative"
        >
          <BookplateCorner />

          <div className="mx-auto w-14 h-14 border border-[#9E8055] bg-[#E8DFD1] p-1.5 flex items-center justify-center shadow-inner">
            <img src="/image/logo.png" alt="CashFlip Logo" className="w-full h-full object-contain" />
          </div>

          <div>
            <span className="text-[9px] tracking-[0.3em] font-serif uppercase text-[#9E8055] block">
              Sanctum Observatory
            </span>
            <h1 className="text-lg sm:text-xl font-serif tracking-wider font-semibold text-[#171513]">
              MASTER CODEX AUTHORIZATION
            </h1>
            <p className="text-xs text-[#171513]/70 font-serif italic mt-1 leading-relaxed">
              Inscribe the master cryptographic key to unlock sanctuary governance, currency routing, and escrow controls.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.2em] font-serif uppercase text-[#171513]/70 block font-medium">
                ADMINISTRATOR CIPHER:
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  placeholder="Inscribe cipher..."
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-[#E8DFD1] border border-[#171513]/25 text-sm font-mono text-[#171513] focus:outline-none focus:border-[#9E8055] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-[#171513]/50 hover:text-[#171513]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-2.5 bg-red-950/10 border border-red-800/30 text-red-900 text-xs font-serif flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-700 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] font-serif text-xs tracking-widest uppercase border border-[#9E8055]/50 flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin text-[#9E8055]" />
                  <span>CONSULTING ARCHIVES...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-[#9E8055]" />
                  <span>UNLOCK MASTER CODEX</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-[#171513]/15">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-[#171513]/70 hover:text-[#171513] font-serif transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Sanctum</span>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. AUTHENTICATED ADMIN DASHBOARD
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen w-full bg-[#E8DFD1] text-[#171513] font-serif p-4 sm:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Top Header Navbar */}
        <header className="editorial-frame flex items-center justify-between p-4 bg-[#F4EFE6] shadow-sm flex-wrap gap-3 relative">
          <BookplateCorner />

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border border-[#9E8055] p-1 bg-[#E8DFD1] flex items-center justify-center flex-shrink-0 shadow-inner">
              <img src="/image/logo.png" alt="CashFlip" className="w-full h-full object-contain" />
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8DFD1] hover:bg-[#DDD2C1] text-[#171513] border border-[#171513]/20 text-xs font-serif transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#9E8055]" />
              <span>Public Sanctum</span>
            </Link>
            <div>
              <h1 className="text-base font-serif font-semibold tracking-wider text-[#171513] flex items-center gap-2">
                <span>MASTER CODEX & OBSERVATORY CONTROLS</span>
                <span className="px-2 py-0.5 border border-[#9E8055] text-[#9E8055] text-[9px] font-mono tracking-widest uppercase">
                  CONSECRATED
                </span>
              </h1>
              <p className="text-[11px] text-[#171513]/65 font-serif">
                Direct on-chain currency routing, escrow reserves, and epoch calibration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleForceServerRefresh}
              disabled={refreshingServer}
              className="px-3 py-1.5 bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] font-serif text-xs tracking-wider uppercase border border-[#9E8055]/50 flex items-center gap-1.5 transition-colors shadow-sm"
              title="Broadcast refresh signal to all connected observer browsers"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#9E8055] ${refreshingServer ? 'animate-spin' : ''}`} />
              <span>{refreshingServer ? 'BROADCASTING...' : 'BROADCAST REFRESH'}</span>
            </button>

            <button
              onClick={fetchContractInfo}
              disabled={loading}
              className="p-1.5 bg-[#E8DFD1] hover:bg-[#DDD2C1] border border-[#171513]/20 text-[#171513] transition-colors"
              title="Refresh ledger records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#9E8055]' : ''}`} />
            </button>

            {isConnected ? (
              <div className="px-2.5 py-1 bg-[#E8DFD1] border border-[#171513]/20 text-xs font-mono text-[#171513]">
                {account?.slice(0, 6)}...{account?.slice(-4)}
              </div>
            ) : (
              <button
                onClick={() => connectWallet('okx')}
                className="px-3 py-1 bg-[#171513] text-[#F4EFE6] text-xs font-serif tracking-wider uppercase border border-[#9E8055]/50"
              >
                Connect Ledger
              </button>
            )}

            <button
              onClick={handleLogout}
              className="p-1.5 bg-[#E8DFD1] hover:bg-red-100 border border-[#171513]/20 text-red-800 transition-colors"
              title="Seal Master Codex"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Status Toast Message */}
        <AnimatePresence>
          {statusMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-3.5 border flex items-center gap-2.5 text-xs font-serif shadow-sm ${
                statusMsg.ok
                  ? 'bg-[#F4EFE6] border-[#9E8055] text-[#171513]'
                  : 'bg-red-950/10 border-red-800/40 text-red-900'
              }`}
            >
              {statusMsg.ok ? (
                <CheckCircle2 className="w-4 h-4 text-[#9E8055] flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0" />
              )}
              <span className="flex-1 break-all">{statusMsg.text}</span>
              <button onClick={() => setStatusMsg(null)} className="text-xs opacity-60 hover:opacity-100">
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 1: BETTING TOKEN CONTRACT (CHANGE TOKEN ADDRESS)        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="editorial-frame p-5 sm:p-6 bg-[#F4EFE6] text-[#171513] shadow-sm space-y-4 relative">
          <BookplateCorner />

          <div className="flex items-center justify-between pb-3 border-b border-[#171513]/15">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 border border-[#9E8055] bg-[#E8DFD1] flex items-center justify-center text-[#9E8055]">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-serif font-semibold tracking-wider text-[#171513] flex items-center gap-2">
                  <span>SETTLEMENT CURRENCY CONTRACT (ERC-20 USDG)</span>
                  <span className="px-1.5 py-0.5 border border-[#9E8055] text-[#9E8055] text-[9px] font-mono uppercase">
                    Configurable
                  </span>
                </h2>
                <p className="text-[10px] text-[#171513]/65 font-serif">
                  Governs token address utilized for wagers, user allowances, and prize payouts
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif">
            {/* Active Token Address Info */}
            <div className="p-4 bg-[#E8DFD1] border border-[#171513]/15 space-y-2">
              <span className="text-[10px] text-[#9E8055] uppercase tracking-widest font-semibold block">
                ACTIVE SETTLEMENT TOKEN
              </span>
              <div className="flex items-center justify-between gap-2">
                <p className={`text-xs font-mono font-semibold break-all ${activeTokenContract ? 'text-[#171513]' : 'text-amber-800'}`}>
                  {activeTokenContract || '⚠️ NO CURRENCY CONTRACT CONFIGURED'}
                </p>
                {activeTokenContract && (
                  <button
                    onClick={() => copyToClipboard(activeTokenContract)}
                    className="p-1 hover:bg-[#DDD2C1] text-[#171513]/70 transition-colors"
                    title="Copy Currency Address"
                  >
                    {copiedToken ? <Check className="w-3 h-3 text-[#9E8055]" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
              {activeTokenContract ? (
                <a
                  href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/token/${activeTokenContract}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#9E8055] underline hover:text-[#171513] pt-1"
                >
                  <span>Inspect on Robinhood Blockscout</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ) : (
                <span className="text-[10px] text-amber-800 italic">
                  Paste USDG production token address below
                </span>
              )}
            </div>

            {/* Network & Routing Note */}
            <div className="p-4 bg-[#E8DFD1] border border-[#171513]/15 space-y-1.5">
              <span className="text-[10px] text-[#9E8055] uppercase tracking-widest font-semibold block">
                NETWORK & MULTI-TOKEN SPECIFICATION
              </span>
              <p className="text-xs text-[#171513] font-semibold">
                Robinhood Chain L2 (Chain ID {ROBINHOOD_CHAIN_CONFIG.chainId})
              </p>
              <p className="text-[10px] text-[#171513]/70 leading-relaxed">
                Compatible with standard Robinhood ERC-20 tokens. The interface and game engine immediately adapt deposits and player balances to the specified currency contract.
              </p>
            </div>
          </div>

          {/* Change Token Address Form */}
          <div className="p-3.5 bg-[#E8DFD1] border border-[#171513]/15 space-y-2">
            <label className="text-[10px] tracking-[0.2em] font-serif uppercase text-[#171513]/70 block font-medium">
              Update Settlement Token Contract Address:
            </label>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                value={manualTokenInput}
                onChange={(e) => setManualTokenInput(e.target.value)}
                placeholder="0x... (New ERC-20 token contract address)"
                className="flex-1 min-w-[240px] px-3 py-2 bg-[#F4EFE6] border border-[#171513]/25 text-[#171513] font-mono text-xs focus:outline-none focus:border-[#9E8055]"
              />
              <button
                onClick={handleSetTokenContract}
                className="px-4 py-2 bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] font-serif text-xs tracking-wider uppercase border border-[#9E8055]/50 flex items-center gap-1.5 flex-shrink-0"
              >
                <Sparkles className="w-3 h-3 text-[#9E8055]" />
                <span>Update Token</span>
              </button>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 2: SMART CONTRACT ESCROW POOL                           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="editorial-frame p-5 sm:p-6 bg-[#F4EFE6] text-[#171513] shadow-sm space-y-4 relative">
          <BookplateCorner />

          <div className="flex items-center justify-between pb-3 border-b border-[#171513]/15 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 border border-[#9E8055] bg-[#E8DFD1] flex items-center justify-center text-[#9E8055]">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-serif font-semibold tracking-wider text-[#171513]">
                  SANCTUARY ESCROW POOL & ADMIN WITHDRAWAL
                </h2>
                <p className="text-[10px] text-[#171513]/65 font-serif">
                  On-chain escrow holding wagers with 2% sanctuary fees retained for Admin
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleResetBetting}
                className="px-3 py-1.5 bg-[#E8DFD1] hover:bg-[#DDD2C1] border border-[#171513]/20 text-xs font-serif text-[#171513] flex items-center gap-1.5 transition-colors"
                title="Reset active bets and epoch history back to Epoch #1"
              >
                <RotateCcw className="w-3 h-3 text-[#9E8055]" />
                <span>Reset Epochs</span>
              </button>

              <button
                onClick={() => setShowDeployModal(true)}
                className="px-3.5 py-1.5 bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] text-xs font-serif tracking-wider uppercase border border-[#9E8055]/50 flex items-center gap-1.5 shadow-sm"
              >
                <Compass className="w-3.5 h-3.5 text-[#9E8055]" />
                <span>Consecrate New Escrow</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif">
            <div className="p-4 bg-[#E8DFD1] border border-[#171513]/15 space-y-2">
              <span className="text-[10px] text-[#9E8055] uppercase tracking-widest font-semibold block">
                ACTIVE SANCTUARY ESCROW ADDRESS
              </span>
              <p className={`text-xs font-mono font-semibold break-all ${activeContract ? 'text-[#171513]' : 'text-amber-800'}`}>
                {activeContract || '⚠️ NO SMART CONTRACT CONSECRATED'}
              </p>
              {activeContract ? (
                <a
                  href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/address/${activeContract}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#9E8055] underline hover:text-[#171513] pt-1"
                >
                  <span>Inspect on Robinhood Blockscout</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ) : (
                <span className="text-[10px] text-amber-800 italic">
                  Consecrate sanctuary above or bind existing address below
                </span>
              )}
            </div>

            <div className="p-4 bg-[#E8DFD1] border border-[#171513]/15 space-y-1.5">
              <span className="text-[10px] text-[#9E8055] uppercase tracking-widest font-semibold block">
                USDG RESERVES IN SANCTUARY
              </span>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#9E8055]" />
                <span className="text-lg font-serif font-bold text-[#171513]">
                  {Number(contractVaultBalance).toLocaleString()}
                </span>
                <span className="text-xs font-mono text-[#9E8055]">USDG</span>
              </div>
              <p className="text-[10px] text-[#171513]/65">
                Funds in contract escrow (includes 2% retained Admin protocol fees)
              </p>
            </div>
          </div>

          {/* Change Game Contract Manually */}
          <div className="p-3.5 bg-[#E8DFD1] border border-[#171513]/15 space-y-2">
            <label className="text-[10px] tracking-[0.2em] font-serif uppercase text-[#171513]/70 block font-medium">
              Bind Sanctuary Escrow Contract Address Manually:
            </label>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                value={manualContractInput}
                onChange={(e) => setManualContractInput(e.target.value)}
                placeholder="0x... (Escrow smart contract address)"
                className="flex-1 min-w-[240px] px-3 py-2 bg-[#F4EFE6] border border-[#171513]/25 text-[#171513] font-mono text-xs focus:outline-none focus:border-[#9E8055]"
              />
              <button
                onClick={handleSetContract}
                className="px-4 py-2 bg-[#E8DFD1] hover:bg-[#DDD2C1] border border-[#171513]/25 text-[#171513] font-serif text-xs uppercase tracking-wider flex-shrink-0"
              >
                Bind Address
              </button>
            </div>
          </div>

          {/* Withdraw Balance from Betting Smart Contract to Admin */}
          <div className="p-4 bg-[#E8DFD1] border border-[#171513]/15 space-y-2.5">
            <div>
              <span className="text-xs font-serif font-semibold text-[#171513] block">
                Withdraw Reserves from Sanctuary to Admin Wallet:
              </span>
              <p className="text-[10px] text-[#171513]/65 font-serif mt-0.5">
                Transfer USDG tokens (including accumulated 2% platform tithes) directly to your connected Admin wallet.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[180px]">
                <input
                  type="number"
                  value={bettingWithdrawAmount}
                  onChange={(e) => setBettingWithdrawAmount(e.target.value)}
                  placeholder="Amount of USDG"
                  className="w-full px-3 py-2 bg-[#F4EFE6] border border-[#171513]/25 text-[#171513] font-mono text-xs focus:outline-none focus:border-[#9E8055]"
                />
                <span className="absolute right-3 top-2 text-[10px] font-mono font-semibold text-[#9E8055]">
                  USDG
                </span>
              </div>

              <div className="flex gap-1">
                {['10', '50', '100'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBettingWithdrawAmount(preset)}
                    className="px-2 py-2 bg-[#F4EFE6] hover:bg-[#DDD2C1] border border-[#171513]/20 text-[10px] font-mono text-[#171513]"
                  >
                    +{preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setBettingWithdrawAmount(String(contractVaultBalance || '0'))}
                  className="px-2 py-2 bg-[#171513] text-[#F4EFE6] text-[10px] font-mono font-semibold"
                >
                  MAX
                </button>
              </div>

              <button
                onClick={handleWithdrawBetting}
                disabled={isWithdrawingBetting || Number(contractVaultBalance) <= 0}
                className="px-4 py-2 bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] font-serif text-xs tracking-wider uppercase border border-[#9E8055]/50 flex items-center justify-center gap-1.5 flex-shrink-0 disabled:opacity-50"
              >
                <Coins className="w-3.5 h-3.5 text-[#9E8055]" />
                <span>{isWithdrawingBetting ? 'EXECUTING...' : 'WITHDRAW TO ADMIN'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 3: GAME ENGINE & CLAIM HISTORY                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="editorial-frame p-5 sm:p-6 bg-[#F4EFE6] text-[#171513] shadow-sm space-y-4 relative">
          <BookplateCorner />

          <div className="flex items-center justify-between pb-3 border-b border-[#171513]/15 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 border border-[#9E8055] bg-[#E8DFD1] flex items-center justify-center text-[#9E8055]">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-serif font-semibold tracking-wider text-[#171513]">
                  EPOCH ENGINE & HISTORICAL MANIFEST
                </h2>
                <p className="text-[10px] text-[#171513]/65 font-serif">
                  Live state observation and test claim status resets
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleResetClaims}
                className="px-3 py-1.5 bg-[#E8DFD1] hover:bg-[#DDD2C1] border border-[#171513]/20 text-[#171513] text-xs font-serif flex items-center gap-1.5 transition-colors"
                title="Reset claimed status in test history"
              >
                <RotateCcw className="w-3 h-3 text-[#9E8055]" />
                <span>Reset Claim Statuses</span>
              </button>

              <button
                onClick={handleDeleteHistory}
                disabled={deletingHistory}
                className="px-3 py-1.5 bg-red-950/15 hover:bg-red-950/25 border border-red-800/40 text-red-900 text-xs font-serif flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Permanently purge all historical manifest records"
              >
                <Trash2 className="w-3 h-3 text-red-700" />
                <span>{deletingHistory ? 'Deleting History...' : 'Delete History'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs font-serif text-center">
            <div className="p-3 bg-[#E8DFD1] border border-[#171513]/15">
              <span className="text-[9px] uppercase tracking-widest text-[#9E8055] block">CURRENT EPOCH ID</span>
              <span className="text-sm font-mono font-semibold text-[#171513] mt-0.5 block">{gameStats?.gameId || '-'}</span>
            </div>
            <div className="p-3 bg-[#E8DFD1] border border-[#171513]/15">
              <span className="text-[9px] uppercase tracking-widest text-[#9E8055] block">STATUS</span>
              <span className="text-sm font-serif font-semibold text-[#171513] mt-0.5 block uppercase">
                {gameStats?.status || '-'}
              </span>
            </div>
            <div className="p-3 bg-[#E8DFD1] border border-[#171513]/15">
              <span className="text-[9px] uppercase tracking-widest text-[#9E8055] block">TOTAL POOL</span>
              <span className="text-sm font-mono font-semibold text-[#171513] mt-0.5 block">
                {(gameStats?.totalPool || 0).toLocaleString()} USDG
              </span>
            </div>
          </div>

          {/* Past Games Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-serif">
              <thead>
                <tr className="border-b border-[#171513]/20 text-[#171513]/60 text-[10px] uppercase tracking-wider">
                  <th className="py-2">EPOCH</th>
                  <th>VICTOR</th>
                  <th>DISPENSATION</th>
                  <th>CLAIM STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171513]/10 font-mono text-[11px]">
                {pastGames.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center font-serif text-[#171513]/50 italic">
                      No historical epochs recorded
                    </td>
                  </tr>
                ) : (
                  pastGames.slice(0, 10).map((g) => (
                    <tr key={g.gameId} className="hover:bg-[#E8DFD1]/50 transition-colors">
                      <td className="py-2 font-semibold text-[#171513]">#{g.gameId}</td>
                      <td className="text-[#171513]/80">
                        {g.winner?.address ? `${g.winner.address.slice(0, 6)}...${g.winner.address.slice(-4)}` : '-'}
                      </td>
                      <td className="font-semibold text-[#171513]">
                        {(g.winner?.prize ?? g.winner?.prizePons ?? 0).toLocaleString()} USDG
                      </td>
                      <td>
                        {g.winner?.claimed ? (
                          <span className="px-1.5 py-0.5 border border-[#9E8055] text-[#9E8055] text-[9px]">
                            CLAIMED
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 border border-[#171513]/30 text-[#171513]/60 text-[9px]">
                            UNCLAIMED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 4: PURIFICATION (FACTORY RESET)                         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="editorial-frame p-5 sm:p-6 bg-[#F4EFE6] text-[#171513] border-red-800/40 shadow-sm space-y-3 relative">
          <BookplateCorner />

          <div className="flex items-center justify-between pb-3 border-b border-red-900/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 border border-red-800 bg-red-100 flex items-center justify-center text-red-800">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-serif font-semibold tracking-wider text-red-900 flex items-center gap-2">
                  <span>SANCTUARY PURIFICATION (FACTORY RESET)</span>
                  <span className="px-1.5 py-0.5 border border-red-800 text-red-800 text-[9px] font-mono uppercase">
                    Solemn Action
                  </span>
                </h2>
                <p className="text-[10px] text-red-800/70 font-serif">
                  Purge all test token entries, local storage, past history, and cache prior to production deployment
                </p>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-red-950/5 border border-red-800/20 space-y-2 text-xs font-serif text-[#171513]/80">
            <p className="font-semibold text-red-900 flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-red-800" />
              <span>Consequences of Sanctuary Purification:</span>
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] pl-1 leading-relaxed">
              <li>Erases saved test token contracts and resets to fresh clean state.</li>
              <li>Purges historical epochs, player pots, and test claim signatures.</li>
              <li>Clears local browser cache for all connecting visitors.</li>
              <li>Restarts game engine at a pristine Epoch #1.</li>
            </ul>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowFactoryResetModal(true)}
                className="px-4 py-2 bg-red-900 hover:bg-red-800 text-[#F4EFE6] font-serif text-xs tracking-wider uppercase border border-red-700 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>PURIFY SANCTUARY (FACTORY RESET)</span>
              </button>
            </div>
          </div>
        </section>

        {/* Footer Info */}
        <footer className="p-3 bg-[#F4EFE6] border border-[#171513]/15 text-[10px] font-serif text-[#171513]/60 flex justify-between items-center flex-wrap gap-2">
          <span>Active Token: {activeTokenContract || CASHFLIP_TOKEN_ADDRESS}</span>
          <span>Network: {ROBINHOOD_CHAIN_CONFIG.name} (Chain ID {ROBINHOOD_CHAIN_CONFIG.chainId})</span>
          <span>Platform Tithe: 2.0%</span>
        </footer>
      </div>

      {/* Deploy Jackpot Modal */}
      <DeployModal
        isOpen={showDeployModal}
        onClose={() => setShowDeployModal(false)}
        onSuccess={(newAddr) => {
          setActiveContract(newAddr);
          setManualContractInput(newAddr);
          setShowDeployModal(false);
          setStatusMsg({ ok: true, text: `New sanctuary smart contract consecrated at: ${newAddr}` });
          fetchContractInfo();
        }}
      />

      {/* Factory Reset Confirmation Modal */}
      <AnimatePresence>
        {showFactoryResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0908]/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="editorial-frame w-full max-w-lg p-6 sm:p-7 bg-[#E8DFD1] text-[#171513] border-red-800 shadow-2xl space-y-4 font-serif relative"
            >
              <BookplateCorner />

              <div className="flex items-center gap-3 pb-3 border-b border-[#171513]/15">
                <div className="w-9 h-9 border border-red-800 bg-red-100 flex items-center justify-center text-red-800 flex-shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-semibold text-red-900 tracking-wider">
                    CONFIRM SANCTUARY PURIFICATION
                  </h3>
                  <p className="text-[11px] text-red-800/70 font-serif">
                    Irreversible reset to clean production state
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-[#F4EFE6] border border-red-800/30 text-xs text-[#171513] space-y-1.5 leading-relaxed">
                <p className="font-semibold text-red-900 flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-red-800 flex-shrink-0" />
                  <span>WARNING: This rite cannot be reversed.</span>
                </p>
                <p className="text-[11px]">
                  All testing token addresses, smart contract mappings, historical epoch ledgers, and local browser state will be permanently purged.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFactoryResetModal(false)}
                  disabled={isFactoryResetting}
                  className="px-4 py-2 border border-[#171513]/25 hover:bg-[#171513]/5 text-xs font-serif uppercase tracking-wider text-[#171513]/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFactoryReset}
                  disabled={isFactoryResetting}
                  className="px-4 py-2 bg-red-900 hover:bg-red-800 text-[#F4EFE6] font-serif text-xs tracking-wider uppercase border border-red-700 flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isFactoryResetting ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>PURIFYING...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>AFFIRM & PURGE EVERYTHING</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
