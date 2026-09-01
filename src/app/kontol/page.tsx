'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import {
  ShieldAlert,
  Rocket,
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
  Gift,
  Trash2,
  Flame,
  AlertOctagon,
} from 'lucide-react';
import { usePonspotWeb3 } from '@/context/PonspotWeb3Context';
import { DeployModal } from '@/components/ponspot/DeployModal';
import { DeployAirdropModal } from '@/components/ponspot/DeployAirdropModal';
import {
  ROBINHOOD_CHAIN_CONFIG,
  getGameContractAddress,
  getAirdropContractAddress,
  getPonspotTokenAddress,
  getPonspotContract,
  depositAirdropOnChain,
  fetchOnChainAirdropBalance,
  withdrawBettingContractOnChain,
  withdrawAirdropContractOnChain,
  PONSPOT_TOKEN_ADDRESS,
  PONS_TOKEN_ADDRESS,
} from '@/lib/web3/contracts';
import { getApiBaseUrl } from '@/lib/apiConfig';

export default function AdminPanelPage() {
  const { account, isConnected, connectWallet, refreshBalances } = usePonspotWeb3();

  // Authentication State (Secure Session via Backend Token)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Airdrop Vault Management State
  const [airdropPoolBalance, setAirdropPoolBalance] = useState<number>(10000);
  const [airdropReward, setAirdropReward] = useState<number>(100);
  const [airdropDepositAmount, setAirdropDepositAmount] = useState<string>('5000');
  const [airdropCustomReward, setAirdropCustomReward] = useState<string>('100');
  const [activeAirdropContract, setActiveAirdropContract] = useState<string>('');
  const [manualAirdropContractInput, setManualAirdropContractInput] = useState<string>('');
  const [showDeployAirdropModal, setShowDeployAirdropModal] = useState<boolean>(false);
  const [isDepositingAirdrop, setIsDepositingAirdrop] = useState<boolean>(false);
  const [airdropWithdrawAmount, setAirdropWithdrawAmount] = useState<string>('');
  const [isWithdrawingAirdrop, setIsWithdrawingAirdrop] = useState<boolean>(false);

  // Contracts & Engine State
  const [activeContract, setActiveContract] = useState<string>('');
  const [activeTokenContract, setActiveTokenContract] = useState<string>('');
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [contractPonsBalance, setContractPonsBalance] = useState<string>('0');
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
      (typeof window !== 'undefined' ? sessionStorage.getItem('ponspot_admin_token') || '' : '');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'x-admin-token': token } : {}),
      ...(options.headers || {}),
    };
    return fetch(`${apiBase}${endpoint}`, { ...options, headers });
  };

  // Check saved admin session and apply theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = sessionStorage.getItem('ponspot_admin_token');
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
              fetchAirdropInfo();
            } else {
              sessionStorage.removeItem('ponspot_admin_token');
              setIsAuthenticated(false);
            }
          })
          .catch(() => {
            setIsAuthenticated(true);
            fetchContractInfo();
            fetchAirdropInfo();
          });
      }
      document.documentElement.classList.add('dark');
      localStorage.setItem('ponspot_theme', 'dark');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchContractInfo();
      fetchAirdropInfo();
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
      if (res.ok && data.success) {
        setAdminToken(data.token);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('ponspot_admin_token', data.token);
        }
        setIsAuthenticated(true);
        setPasswordInput('');
        fetchContractInfo();
        fetchAirdropInfo();
      } else {
        setAuthError(data.error || 'Incorrect password! Access denied.');
      }
    } catch (err: any) {
      setAuthError('Failed to communicate with game server. Make sure server is running.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminFetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    setIsAuthenticated(false);
    setAdminToken('');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('ponspot_admin_token');
    }
  };

  const fetchContractInfo = async () => {
    setLoading(true);
    const apiBase = getApiBase();
    try {
      // 1. Fetch active game contract
      try {
        const res = await fetch(`${apiBase}/api/contract-address`);
        const data = await res.json();
        const addr = (data.contractAddress || getGameContractAddress() || '').trim();
        setActiveContract(addr);
        setManualContractInput(addr);
      } catch {
        const fallbackAddr = (getGameContractAddress() || '').trim();
        setActiveContract(fallbackAddr);
        setManualContractInput(fallbackAddr);
      }

      // 2. Fetch active token contract
      try {
        const tokenRes = await fetch(`${apiBase}/api/token-contract-address`);
        const tokenData = await tokenRes.json();
        const tAddr = (tokenData.tokenAddress || getPonspotTokenAddress() || '').trim();
        setActiveTokenContract(tAddr);
        setManualTokenInput(tAddr);
      } catch {
        const fallbackToken = (getPonspotTokenAddress() || '').trim();
        setActiveTokenContract(fallbackToken);
        setManualTokenInput(fallbackToken);
      }

      // 3. Fetch token balance in game contract
      const currAddr = getGameContractAddress();
      if (currAddr && currAddr.startsWith('0x') && currAddr.length === 42) {
        try {
          const token = getPonspotContract();
          const bal = await token.balanceOf(currAddr);
          setContractPonsBalance(ethers.formatEther(bal));
        } catch {
          setContractPonsBalance('0');
        }
      } else {
        setContractPonsBalance('0');
      }

      // 4. Fetch current game and history
      try {
        const curRes = await fetch(`${apiBase}/api/game/current`);
        setGameStats(await curRes.json());

        const histRes = await fetch(`${apiBase}/api/games/history`);
        setPastGames(await histRes.json());
      } catch (e) {
        console.warn('Game engine offline or fetching local', e);
      }
    } catch (e: any) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchContractInfo();
    }
  }, [isAuthenticated]);

  // Set New Betting Token Address
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
        localStorage.setItem('ponscore_token_contract', trimmed);
        setActiveTokenContract(trimmed);
        setStatusMsg({ ok: true, text: `Active betting token successfully updated to: ${trimmed}` });
        fetchContractInfo();
      } else {
        throw new Error(data.error || 'Failed to update token');
      }
    } catch (e: any) {
      localStorage.setItem('ponscore_token_contract', trimmed);
      setActiveTokenContract(trimmed);
      setStatusMsg({ ok: true, text: `Betting token saved locally in browser: ${trimmed}` });
      fetchContractInfo();
    }
  };

  // Set Game Vault Escrow Contract Address
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
        localStorage.setItem('ponspot_deployed_game_contract', trimmed);
        localStorage.setItem('ponscore_deployed_game_contract', trimmed);
        setActiveContract(trimmed);
        setStatusMsg({ ok: true, text: `Active smart contract updated to: ${trimmed}` });
        fetchContractInfo();
      } else {
        throw new Error(data.error || 'Failed to update contract');
      }
    } catch (e: any) {
      localStorage.setItem('ponspot_deployed_game_contract', trimmed);
      localStorage.setItem('ponscore_deployed_game_contract', trimmed);
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

    const availableBal = Number(contractPonsBalance);
    if (num > availableBal) {
      setStatusMsg({ ok: false, text: `Insufficient smart contract balance (Available: ${availableBal.toLocaleString()} PONSPOT)` });
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
      setStatusMsg({ ok: false, text: `Alamat Smart Contract (${targetContract}) tidak valid. Pastikan 42 karakter diawali 0x.` });
      return;
    }

    setIsWithdrawingBetting(true);
    try {
      const win = typeof window !== 'undefined' ? (window as any) : {};
      const providerObj = win.okxwallet || win.ethereum || win.rabby || win.bitkeep?.ethereum;
      if (!providerObj) {
        throw new Error('Wallet extension (OKX Wallet, MetaMask, Rabby) not detected in your browser.');
      }

      // 1. Ensure wallet switched to Robinhood Chain (ID: 4663)
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

      // 2. Connect and sign transaction
      const provider = new ethers.BrowserProvider(providerObj);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const withdrawWei = ethers.parseEther(num.toString());

      setStatusMsg({ ok: true, text: 'Please confirm the withdrawal transaction in your wallet...' });
      const txHash = await withdrawBettingContractOnChain(signer, withdrawWei, targetContract);
      
      setStatusMsg({
        ok: true,
        text: `🎉 Successfully withdrew ${num.toLocaleString()} PONSPOT from Betting Smart Contract to Admin Wallet! Hash: ${txHash.slice(0, 10)}...`,
      });
      setBettingWithdrawAmount('');
      fetchContractInfo();
      refreshBalances?.();
    } catch (e: any) {
      console.error('Withdraw betting error:', e);
      if (e?.code === 'ACTION_REJECTED' || e?.code === 4001) {
        setStatusMsg({ ok: false, text: 'Withdrawal transaction was cancelled in wallet.' });
      } else {
        const msg = e?.info?.error?.message || e?.data?.message || e?.reason || e?.shortMessage || e?.message || 'Failed to withdraw from betting contract';
        setStatusMsg({ ok: false, text: msg });
      }
    } finally {
      setIsWithdrawingBetting(false);
    }
  };

  const handleWithdrawAirdrop = async () => {
    const num = parseFloat(airdropWithdrawAmount);
    if (isNaN(num) || num <= 0) {
      setStatusMsg({ ok: false, text: 'Please enter a valid airdrop withdrawal amount!' });
      return;
    }

    if (num > airdropPoolBalance) {
      setStatusMsg({ ok: false, text: `Insufficient airdrop contract balance (Available: ${airdropPoolBalance.toLocaleString()} PONSPOT)` });
      return;
    }

    let targetContract = (activeAirdropContract || getAirdropContractAddress() || '').trim();
    if (!targetContract || !targetContract.startsWith('0x') || targetContract.length !== 42) {
      setStatusMsg({ ok: false, text: 'Airdrop smart contract address is not set or invalid. Please set or deploy a contract first.' });
      return;
    }

    setIsWithdrawingAirdrop(true);
    try {
      const win = typeof window !== 'undefined' ? (window as any) : {};
      const providerObj = win.okxwallet || win.ethereum || win.rabby || win.bitkeep?.ethereum;
      if (!providerObj) {
        throw new Error('Wallet extension (OKX Wallet, MetaMask, Rabby) not detected in your browser.');
      }

      // 1. Ensure wallet switched to Robinhood Chain (ID: 4663)
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
      const withdrawWei = ethers.parseEther(num.toString());

      setStatusMsg({ ok: true, text: 'Please confirm emergency withdrawal transaction in wallet...' });
      const txHash = await withdrawAirdropContractOnChain(signer, withdrawWei, targetContract);

      setStatusMsg({
        ok: true,
        text: `🎉 Successfully withdrew ${num.toLocaleString()} PONSPOT from Airdrop Contract to Admin Wallet! Hash: ${txHash.slice(0, 10)}...`,
      });
      setAirdropWithdrawAmount('');
      fetchAirdropInfo();
      refreshBalances?.();
    } catch (e: any) {
      console.error('Withdraw airdrop error:', e);
      if (e?.code === 'ACTION_REJECTED' || e?.code === 4001) {
        setStatusMsg({ ok: false, text: 'Withdrawal transaction was cancelled in wallet.' });
      } else {
        const msg = e?.info?.error?.message || e?.data?.message || e?.reason || e?.shortMessage || e?.message || 'Failed to execute emergency withdraw from airdrop contract';
        setStatusMsg({ ok: false, text: msg });
      }
    } finally {
      setIsWithdrawingAirdrop(false);
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
          text: '⚡ Server Refresh Triggered! All connected player browsers will automatically reload to the latest version.',
        });
        fetchContractInfo();
      } else {
        throw new Error(data.message || 'Failed to refresh server');
      }
    } catch (e: any) {
      setStatusMsg({
        ok: false,
        text: e?.message || 'Failed to contact game server',
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

  const fetchAirdropInfo = async () => {
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/airdrop`);
      const data = await res.json();
      if (data) {
        let currentAddr = data.airdropContractAddress || getAirdropContractAddress();
        setActiveAirdropContract(currentAddr || '');

        let liveBalance = data.poolBalance || 0;
        if (currentAddr && currentAddr.startsWith('0x')) {
          const onChainBal = await fetchOnChainAirdropBalance(currentAddr);
          if (!isNaN(onChainBal)) liveBalance = onChainBal;
        }

        setAirdropPoolBalance(liveBalance);
        setAirdropReward(data.rewardPerClaim || 100);
        setAirdropCustomReward(String(data.rewardPerClaim || 100));
      }
    } catch (e) {
      console.warn('Failed to fetch airdrop info', e);
    }
  };

  const handleSetAirdropContract = async () => {
    if (!manualAirdropContractInput.trim().startsWith('0x') || manualAirdropContractInput.trim().length !== 42) {
      setStatusMsg({ ok: false, text: 'Invalid airdrop smart contract address format (must be 0x... 42 characters)' });
      return;
    }
    const targetAddr = manualAirdropContractInput.trim();
    localStorage.setItem('ponscore_airdrop_contract', targetAddr);
    setActiveAirdropContract(targetAddr);
    try {
      await adminFetch('/api/admin/set-airdrop-contract', {
        method: 'POST',
        body: JSON.stringify({ airdropContractAddress: targetAddr }),
      });
      setStatusMsg({ ok: true, text: '🎉 Dedicated Airdrop Smart Contract synced across the entire system!' });
    } catch (e) {
      setStatusMsg({ ok: true, text: 'Airdrop Smart Contract saved locally!' });
    }
    setManualAirdropContractInput('');
  };

  const handleAirdropDeploySuccess = async (newAddress: string) => {
    setActiveAirdropContract(newAddress);
    setShowDeployAirdropModal(false);
    try {
      await adminFetch('/api/admin/set-airdrop-contract', {
        method: 'POST',
        body: JSON.stringify({ airdropContractAddress: newAddress }),
      });
    } catch (e) {
      console.warn('Failed to sync airdrop contract to server', e);
    }
    fetchAirdropInfo();
    setStatusMsg({
      ok: true,
      text: `🚀 Dedicated Airdrop Smart Contract Deployed & Synced! Address: ${newAddress}`,
    });
  };

  const handleFundAirdropFromWallet = async () => {
    const num = parseFloat(airdropDepositAmount);
    if (isNaN(num) || num <= 0) {
      setStatusMsg({ ok: false, text: 'Please enter a valid deposit token amount!' });
      return;
    }

    setIsDepositingAirdrop(true);
    try {
      let txHash = '';
      const win = typeof window !== 'undefined' ? (window as any) : {};
      const providerObj = win.okxwallet || win.ethereum;

      if (providerObj && account && !account.startsWith('demo-')) {
        try {
          const provider = new ethers.BrowserProvider(providerObj);
          const signer = await provider.getSigner();
          const targetContract = activeAirdropContract || getAirdropContractAddress();
          const depositWei = ethers.parseEther(num.toString());
          
          setStatusMsg({ ok: true, text: 'Please confirm deposit transaction in your wallet...' });
          txHash = await depositAirdropOnChain(signer, depositWei, targetContract);
          setStatusMsg({ ok: true, text: `Deposit transaction sent! Waiting for on-chain confirmation... Hash: ${txHash}` });
        } catch (chainErr: any) {
          console.warn('On-chain admin transfer error or demo mode:', chainErr);
          if (chainErr?.code === 'ACTION_REJECTED' || chainErr?.code === 4001) {
            throw new Error('Deposit transaction was cancelled by user.');
          }
        }
      }

      // Register deposit with engine
      const res = await adminFetch('/api/admin/fund-airdrop', {
        method: 'POST',
        body: JSON.stringify({ amount: num, txHash }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ ok: true, text: `🎉 Successfully deposited ${num.toLocaleString()} PONSPOT to Dedicated Airdrop Vault!` });
        fetchAirdropInfo();
        fetchContractInfo();
      } else {
        throw new Error(data.error || 'Failed to deposit airdrop');
      }
    } catch (e: any) {
      setStatusMsg({ ok: false, text: e?.message || 'Failed to submit airdrop deposit' });
    } finally {
      setIsDepositingAirdrop(false);
    }
  };

  const handleSaveAirdropReward = async () => {
    const num = parseFloat(airdropCustomReward);
    if (isNaN(num) || num <= 0) return;
    try {
      const res = await adminFetch('/api/admin/set-airdrop-reward', {
        method: 'POST',
        body: JSON.stringify({ reward: num }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ ok: true, text: `Airdrop claim amount updated to ${num} PONSPOT per user!` });
        fetchAirdropInfo();
      }
    } catch (e: any) {
      setStatusMsg({ ok: false, text: 'Failed to configure airdrop reward' });
    }
  };

  const handleResetAirdropClaims = async () => {
    try {
      const res = await adminFetch('/api/admin/reset-airdrop-claims', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ ok: true, text: '🎉 All airdrop claim history reset successfully! All wallets can now claim again for testing.' });
        fetchAirdropInfo();
      } else {
        setStatusMsg({ ok: false, text: data.error || 'Failed to reset airdrop history' });
      }
    } catch (e: any) {
      setStatusMsg({ ok: false, text: 'Failed to reset airdrop claims' });
    }
  };

  const handleResetBetting = async () => {
    try {
      const res = await adminFetch('/api/admin/reset-betting', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          ok: true,
          text: '⚡ Betting rounds, current pot, and round history have been completely reset! Starting fresh Round #1.',
        });
        fetchContractInfo();
      } else {
        setStatusMsg({ ok: false, text: data.error || 'Failed to reset betting data' });
      }
    } catch (e: any) {
      setStatusMsg({ ok: false, text: 'Failed to reset betting data' });
    }
  };

  const [resetModalError, setResetModalError] = useState('');

  const handleFactoryReset = async () => {
    setIsFactoryResetting(true);
    setResetModalError('');
    try {
      await adminFetch('/api/admin/factory-reset', { method: 'POST' });
    } catch (e: any) {
      console.warn('Backend reset completed or offline notice:', e);
    }

    try {
      // Clear all cached test contract entries, keys, and stats from browser localStorage
      const savedToken = sessionStorage.getItem('ponspot_admin_token');
      localStorage.clear();
      sessionStorage.clear();
      if (savedToken) {
        sessionStorage.setItem('ponspot_admin_token', savedToken);
      }

      setActiveContract('');
      setActiveTokenContract('');
      setActiveAirdropContract('');
      setManualContractInput('');
      setManualTokenInput('');
      setManualAirdropContractInput('');
      setContractPonsBalance('0');
      setAirdropPoolBalance(0);
      setPastGames([]);
      setShowFactoryResetModal(false);

      // Force immediate reload to apply zero-state
      window.location.reload();
    } catch (err: any) {
      window.location.reload();
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
      <div className="min-h-screen cyber-grid-bg text-[#243329] dark:text-[#F5F8F3] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#0c1611]/90 backdrop-blur-2xl border border-white/90 dark:border-[#718D76]/35 shadow-2xl space-y-5 text-center"
        >
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#718D76]/15 dark:bg-emerald-500/20 border border-[#718D76]/35 flex items-center justify-center text-[#718D76] dark:text-emerald-400 shadow-sm">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-xl font-black text-[#243329] dark:text-white tracking-wide">PONSPOT ADMIN ACCESS</h1>
            <p className="text-xs text-[#526256] dark:text-[#8fa596] font-mono mt-1">
              Enter master administrator password to unlock contract management and token routing controls.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left font-mono">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#526256] dark:text-slate-300 block">
                ADMIN PASSWORD:
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  placeholder="Enter admin password..."
                  autoFocus
                  className="w-full px-4 py-3 bg-white/70 dark:bg-[#14241d]/70 border border-white/90 dark:border-[#718D76]/40 rounded-xl text-sm font-mono text-[#243329] dark:text-white focus:outline-none focus:border-[#718D76] dark:focus:border-emerald-400 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-[#526256] dark:text-slate-400 hover:text-[#243329] dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full btn-primary-sage py-3 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md tracking-wider transition-all disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>UNLOCK ADMIN PANEL</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-white/50 dark:border-white/10">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-[#526256] dark:text-[#8fa596] hover:text-[#243329] dark:hover:text-white font-mono transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Game Website</span>
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
    <div className="min-h-screen overflow-y-auto cyber-grid-bg text-[#243329] dark:text-[#F5F8F3] font-sans p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Top Header Navbar */}
        <header className="flex items-center justify-between p-4 rounded-3xl bg-white/75 dark:bg-[#0c1611]/90 backdrop-blur-2xl border border-white/90 dark:border-[#718D76]/35 shadow-md flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 hover:bg-white/90 dark:bg-[#14241d]/70 dark:hover:bg-[#1c3327] text-[#243329] dark:text-emerald-300 border border-white/80 dark:border-[#718D76]/35 rounded-xl text-xs font-mono font-bold transition-all shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Game</span>
            </Link>
            <div>
              <h1 className="text-base font-black text-[#243329] dark:text-white tracking-wider flex items-center gap-2">
                <span>PONSPOT ADMIN PANEL</span>
                <span className="px-2 py-0.5 bg-[#718D76]/15 dark:bg-emerald-500/20 text-[#718D76] dark:text-emerald-300 text-[10px] font-mono font-black rounded-md border border-[#718D76]/35">
                  AUTHENTICATED
                </span>
              </h1>
              <p className="text-[11px] text-[#526256] dark:text-[#8fa596] font-mono">
                Manage betting token routing, smart contract vaults, and on-chain game engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleForceServerRefresh}
              disabled={refreshingServer}
              className="tactile-btn px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-black font-black rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              title="Broadcast refresh signal to all connected player browsers"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingServer ? 'animate-spin' : ''}`} />
              <span>{refreshingServer ? 'REFRESHING...' : 'REFRESH SERVER (ALL BROWSERS)'}</span>
            </button>

            <button
              onClick={fetchContractInfo}
              disabled={loading}
              className="p-2 bg-white/60 hover:bg-white/90 dark:bg-[#14241d]/70 dark:hover:bg-[#1c3327] text-[#243329] dark:text-slate-300 rounded-xl border border-white/80 dark:border-[#718D76]/30 transition-all shadow-sm"
              title="Refresh local admin data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#718D76] dark:text-emerald-400' : ''}`} />
            </button>

            {isConnected ? (
              <div className="px-3 py-1.5 bg-white/60 dark:bg-emerald-950/60 border border-white/80 dark:border-emerald-500/30 rounded-xl text-xs font-mono text-[#243329] dark:text-emerald-300">
                {account?.slice(0, 6)}...{account?.slice(-4)}
              </div>
            ) : (
              <button
                onClick={() => connectWallet('okx')}
                className="btn-primary-sage px-3.5 py-1.5 font-bold rounded-xl text-xs font-mono shadow-sm"
              >
                Connect Wallet
              </button>
            )}

            <button
              onClick={handleLogout}
              className="p-2 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl transition-all shadow-sm"
              title="Sign out of Admin Panel"
            >
              <LogOut className="w-4 h-4" />
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
              className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-mono shadow-sm ${
                statusMsg.ok
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-500/50 text-rose-800 dark:text-rose-300'
              }`}
            >
              {statusMsg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              <span className="flex-1 break-all">{statusMsg.text}</span>
              <button onClick={() => setStatusMsg(null)} className="text-xs font-bold opacity-60 hover:opacity-100">
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 1: BETTING TOKEN CONTRACT (CHANGE TOKEN ADDRESS)        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="p-6 rounded-3xl bg-white/80 dark:bg-[#0c1611]/90 backdrop-blur-2xl border border-white/90 dark:border-[#718D76]/35 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/60 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#718D76]/15 dark:bg-emerald-500/20 border border-[#718D76]/35 flex items-center justify-center text-[#718D76] dark:text-emerald-400 shadow-sm">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-[#243329] dark:text-white tracking-wide flex items-center gap-2">
                  <span>BETTING TOKEN CONTRACT (ERC-20)</span>
                  <span className="px-2 py-0.2 bg-[#718D76]/15 text-[#718D76] dark:text-emerald-300 text-[9px] font-mono font-bold rounded">
                    CONFIGURABLE
                  </span>
                </h2>
                <p className="text-[10px] text-[#526256] dark:text-[#8fa596] font-mono">
                  Change the ERC-20 token address used for betting, approval allowances, and winner payouts
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Active Token Address Info */}
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 space-y-2">
              <span className="text-[10px] text-[#526256] dark:text-[#8fa596] block uppercase font-bold">
                ACTIVE BETTING TOKEN
              </span>
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-bold break-all ${activeTokenContract ? 'text-[#243329] dark:text-emerald-300' : 'text-amber-600 dark:text-amber-400'}`}>
                  {activeTokenContract || '⚠️ NO TOKEN CONFIGURED'}
                </p>
                {activeTokenContract && (
                  <button
                    onClick={() => copyToClipboard(activeTokenContract)}
                    className="p-1.5 hover:bg-white/80 dark:hover:bg-white/10 rounded-lg text-[#526256] dark:text-slate-400 transition-colors"
                    title="Copy Token Address"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              {activeTokenContract ? (
                <a
                  href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/token/${activeTokenContract}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#718D76] dark:text-emerald-400 hover:underline pt-1 font-bold"
                >
                  <span>View Token on Robinhood Blockscout</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                  Paste your production token contract address below
                </span>
              )}
            </div>

            {/* Network & Routing Note */}
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 space-y-2">
              <span className="text-[10px] text-[#526256] dark:text-[#8fa596] block uppercase font-bold">
                NETWORK & MULTI-TOKEN ARCHITECTURE
              </span>
              <p className="text-xs text-[#243329] dark:text-white font-bold">
                Robinhood Chain L2 (Chain ID {ROBINHOOD_CHAIN_CONFIG.chainId})
              </p>
              <p className="text-[10px] text-[#526256] dark:text-[#8fa596] leading-relaxed">
                You can specify any compatible ERC-20 token address at any time. The interface and game engine will immediately route deposits and player balances to the specified token contract.
              </p>
            </div>
          </div>

          {/* Change Token Address Form */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 space-y-2">
            <span className="text-[11px] text-[#243329] dark:text-white font-bold block font-mono">
              Update Betting Token Contract Address:
            </span>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                value={manualTokenInput}
                onChange={(e) => setManualTokenInput(e.target.value)}
                placeholder="0x... (New ERC-20 token contract address)"
                className="flex-1 min-w-[240px] px-3.5 py-2.5 rounded-xl bg-white/85 dark:bg-[#0c1611]/80 border border-white/90 dark:border-[#718D76]/40 text-[#243329] dark:text-white font-mono text-xs focus:outline-none focus:border-[#718D76] dark:focus:border-emerald-400"
              />
              <button
                onClick={handleSetTokenContract}
                className="btn-primary-sage px-5 py-2.5 font-black rounded-xl text-xs font-mono shadow-sm flex items-center gap-1.5 flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>UPDATE BETTING TOKEN</span>
              </button>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 2: SMART CONTRACT ESCROW POOL                           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="p-6 rounded-3xl bg-white/80 dark:bg-[#0c1611]/90 backdrop-blur-2xl border border-white/90 dark:border-[#718D76]/35 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/60 dark:border-white/10 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#718D76]/15 dark:bg-emerald-500/20 border border-[#718D76]/35 flex items-center justify-center text-[#718D76] dark:text-emerald-400 shadow-sm">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-[#243329] dark:text-white tracking-wide">
                  SMART CONTRACT ESCROW POOL
                </h2>
                <p className="text-[10px] text-[#526256] dark:text-[#8fa596] font-mono">
                  On-chain escrow contract holding betting pools and disbursing winner payouts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleResetBetting}
                className="px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-700 dark:text-amber-300 font-bold rounded-xl text-xs font-mono flex items-center gap-1.5 transition-colors shadow-sm"
                title="Reset all active bets, current jackpot pot, and round history back to Round #1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Betting & Rounds</span>
              </button>

              <button
                onClick={() => setShowDeployModal(true)}
                className="btn-primary-sage px-4 py-2 font-black rounded-xl text-xs flex items-center gap-2 shadow-md"
              >
                <Rocket className="w-4 h-4" />
                <span>DEPLOY NEW CONTRACT (1-CLICK)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 space-y-2">
              <span className="text-[10px] text-[#526256] dark:text-[#8fa596] block uppercase font-bold">
                ACTIVE JACKPOT CONTRACT ADDRESS
              </span>
              <p className={`text-sm font-bold break-all ${activeContract ? 'text-[#243329] dark:text-emerald-300' : 'text-amber-600 dark:text-amber-400'}`}>
                {activeContract || '⚠️ NO SMART CONTRACT DEPLOYED'}
              </p>
              {activeContract ? (
                <a
                  href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/address/${activeContract}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#718D76] dark:text-emerald-400 hover:underline pt-1 font-bold"
                >
                  <span>View on Robinhood Blockscout</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                  Deploy contract above or paste existing escrow address below
                </span>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 space-y-2">
              <span className="text-[10px] text-[#526256] dark:text-[#8fa596] block uppercase font-bold">
                TOKEN BALANCE IN CONTRACT
              </span>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#718D76] dark:text-emerald-400" />
                <span className="text-xl font-black text-[#243329] dark:text-white">
                  {Number(contractPonsBalance).toLocaleString()}
                </span>
                <span className="text-xs text-[#718D76] dark:text-emerald-400 font-bold">PONSPOT</span>
              </div>
              <p className="text-[10px] text-[#526256] dark:text-[#8fa596]">
                Funds available for immediate automated winner claims
              </p>
            </div>
          </div>

          {/* Change Game Contract Manually */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 space-y-2">
            <span className="text-[11px] text-[#243329] dark:text-white font-bold block font-mono">
              Update Jackpot Contract Address Manually:
            </span>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                value={manualContractInput}
                onChange={(e) => setManualContractInput(e.target.value)}
                placeholder="0x... (Jackpot escrow smart contract address)"
                className="flex-1 min-w-[240px] px-3.5 py-2.5 rounded-xl bg-white/85 dark:bg-[#0c1611]/80 border border-white/90 dark:border-[#718D76]/40 text-[#243329] dark:text-white font-mono text-xs focus:outline-none focus:border-[#718D76] dark:focus:border-emerald-400"
              />
              <button
                onClick={handleSetContract}
                className="btn-secondary-glass px-5 py-2.5 font-bold rounded-xl text-xs font-mono shadow-sm flex-shrink-0"
              >
                Set Contract
              </button>
            </div>
          </div>

          {/* Withdraw Saldo from Betting Smart Contract */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 space-y-3">
            <div>
              <span className="text-[11px] text-[#243329] dark:text-white font-bold block font-mono">
                Withdraw Funds from Betting Smart Contract to Admin Wallet:
              </span>
              <p className="text-[10px] text-[#526256] dark:text-[#8fa596] font-mono mt-0.5">
                Withdraw PONSPOT token balance stored inside the betting escrow smart contract directly to the connected Admin wallet.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="number"
                  value={bettingWithdrawAmount}
                  onChange={(e) => setBettingWithdrawAmount(e.target.value)}
                  placeholder="Amount of PONSPOT to withdraw"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 dark:bg-[#0c1611]/80 border border-white/90 dark:border-[#718D76]/40 text-[#243329] dark:text-white font-mono text-xs focus:outline-none focus:border-[#718D76] dark:focus:border-emerald-400"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-[#718D76] dark:text-emerald-400 font-mono">
                  PONSPOT
                </span>
              </div>

              <div className="flex gap-1.5">
                {['1000', '5000', '10000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBettingWithdrawAmount(preset)}
                    className="px-2.5 py-2 rounded-xl bg-white/70 hover:bg-white dark:bg-[#14241d] dark:hover:bg-[#1f382c] border border-black/10 dark:border-[#718D76]/30 text-[10px] font-mono font-bold text-[#718D76] dark:text-emerald-400 transition-colors"
                  >
                    +{preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setBettingWithdrawAmount(String(contractPonsBalance || '0'))}
                  className="px-2.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 transition-colors"
                >
                  MAX
                </button>
              </div>

              <button
                onClick={handleWithdrawBetting}
                disabled={isWithdrawingBetting || Number(contractPonsBalance) <= 0}
                className="btn-primary-sage px-5 py-2.5 font-black rounded-xl text-xs font-mono shadow-md flex items-center justify-center gap-1.5 flex-shrink-0"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{isWithdrawingBetting ? 'PROCESSING WITHDRAWAL...' : '💸 WITHDRAW BETTING BALANCE'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION: AIRDROP VAULT MANAGEMENT (WALLET ADMIN DEPOSIT)       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="p-6 rounded-3xl bg-white/80 dark:bg-[#0c1611]/90 backdrop-blur-2xl border border-white/90 dark:border-[#718D76]/35 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/60 dark:border-white/10 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-700 dark:text-amber-400 shadow-sm">
                <Gift className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h2 className="text-sm font-black text-[#243329] dark:text-white tracking-wide">
                  AIRDROP VAULT MANAGEMENT (ADMIN WALLET DEPOSIT)
                </h2>
                <p className="text-[10px] text-[#526256] dark:text-[#8fa596] font-mono">
                  Admin funds the airdrop vault tokens & sets the claim reward per user (1x claim per wallet)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={fetchAirdropInfo}
                className="btn-secondary-glass px-3.5 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Vault</span>
              </button>

              <button
                onClick={handleResetAirdropClaims}
                className="px-3.5 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold rounded-xl text-xs font-mono flex items-center gap-1.5 transition-colors shadow-sm"
                title="Reset all airdrop claim history so all wallets can claim again for testing"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Airdrop Claims (Testing)</span>
              </button>
            </div>
          </div>

          {/* Airdrop Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 space-y-2">
              <span className="text-[10px] text-[#526256] dark:text-[#8fa596] block uppercase font-bold">
                ACTIVE AIRDROP VAULT BALANCE
              </span>
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-500" />
                <span className="text-xl font-black text-[#243329] dark:text-white font-mono">
                  {airdropPoolBalance.toLocaleString()}
                </span>
                <span className="text-xs text-[#718D76] dark:text-emerald-400 font-bold">PONSPOT</span>
              </div>
              <p className="text-[10px] text-[#526256] dark:text-[#8fa596]">
                Level 5+ players can claim rewards from this pool 1x per wallet with cryptographic signature
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 space-y-2">
              <span className="text-[10px] text-[#526256] dark:text-[#8fa596] block uppercase font-bold">
                CLAIM REWARD (PER WALLET)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-[#718D76] dark:text-emerald-400 font-mono">
                  +{airdropReward.toLocaleString()}
                </span>
                <span className="text-xs text-[#526256] dark:text-slate-300 font-bold">PONSPOT / Wallet (1x Claim)</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  value={airdropCustomReward}
                  onChange={(e) => setAirdropCustomReward(e.target.value)}
                  className="w-24 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-black/50 border border-black/10 dark:border-white/10 text-xs font-mono text-[#243329] dark:text-white"
                  placeholder="100"
                />
                <button
                  onClick={handleSaveAirdropReward}
                  className="btn-primary-sage px-3 py-1 text-[11px] font-bold rounded-lg"
                >
                  Set Reward
                </button>
              </div>
            </div>
          </div>

          {/* Dedicated Airdrop Smart Contract Box */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-[11px] text-[#243329] dark:text-white font-bold block font-mono">
                  DEDICATED AIRDROP SMART CONTRACT (ON-CHAIN):
                </span>
                <span className="text-xs font-mono text-[#718D76] dark:text-emerald-400 break-all font-bold">
                  {activeAirdropContract || 'Not deployed yet (Use 1-click deploy button on the right)'}
                </span>
              </div>
              <button
                onClick={() => setShowDeployAirdropModal(true)}
                className="btn-primary-sage px-3.5 py-1.5 font-black rounded-xl text-xs font-mono shadow-md flex items-center gap-1.5"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>DEPLOY AIRDROP CONTRACT (1-CLICK)</span>
              </button>
            </div>

            <div className="flex gap-2 flex-wrap sm:flex-nowrap pt-1">
              <input
                type="text"
                value={manualAirdropContractInput}
                onChange={(e) => setManualAirdropContractInput(e.target.value)}
                placeholder="0x... (Dedicated airdrop vault contract address)"
                className="flex-1 min-w-[240px] px-3.5 py-2 rounded-xl bg-white/85 dark:bg-[#0c1611]/80 border border-white/90 dark:border-[#718D76]/40 text-[#243329] dark:text-white font-mono text-xs focus:outline-none focus:border-[#718D76] dark:focus:border-emerald-400"
              />
              <button
                onClick={handleSetAirdropContract}
                className="btn-secondary-glass px-4 py-2 font-bold rounded-xl text-xs font-mono shadow-sm flex-shrink-0"
              >
                Set Airdrop Contract
              </button>
            </div>
          </div>

          {/* Deposit PONSPOT from Admin Wallet with Signature */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 space-y-3">
            <div>
              <span className="text-[11px] text-[#243329] dark:text-white font-bold block font-mono">
                Deposit PONSPOT from Admin Wallet into Airdrop Contract (On-Chain Sign & Fund):
              </span>
              <p className="text-[10px] text-[#526256] dark:text-[#8fa596] font-mono mt-0.5">
                Specify the token amount you want to allocate for user airdrops, then click the button below to confirm the deposit transaction in your wallet.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="number"
                  value={airdropDepositAmount}
                  onChange={(e) => setAirdropDepositAmount(e.target.value)}
                  placeholder="Example: 5000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 dark:bg-[#0c1611]/80 border border-white/90 dark:border-[#718D76]/40 text-[#243329] dark:text-white font-mono text-xs focus:outline-none focus:border-[#718D76] dark:focus:border-emerald-400"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-[#718D76] dark:text-emerald-400 font-mono">
                  PONSPOT
                </span>
              </div>

              <div className="flex gap-1.5">
                {['1000', '5000', '10000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAirdropDepositAmount(preset)}
                    className="px-2.5 py-2 rounded-xl bg-white/70 hover:bg-white dark:bg-[#14241d] dark:hover:bg-[#1f382c] border border-black/10 dark:border-[#718D76]/30 text-[10px] font-mono font-bold text-[#718D76] dark:text-emerald-400 transition-colors"
                  >
                    +{preset}
                  </button>
                ))}
              </div>

              <button
                onClick={handleFundAirdropFromWallet}
                disabled={isDepositingAirdrop}
                className="btn-primary-sage px-5 py-2.5 font-black rounded-xl text-xs font-mono shadow-md flex items-center justify-center gap-1.5 flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isDepositingAirdrop ? 'PROCESSING & SIGNING...' : '🚀 DEPOSIT & SIGN AIRDROP'}</span>
              </button>
            </div>
          </div>

          {/* Withdraw PONSPOT from Airdrop Vault to Admin Wallet */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 space-y-3">
            <div>
              <span className="text-[11px] text-[#243329] dark:text-white font-bold block font-mono">
                Emergency Withdraw from Airdrop Contract to Admin Wallet:
              </span>
              <p className="text-[10px] text-[#526256] dark:text-[#8fa596] font-mono mt-0.5">
                Withdraw unused PONSPOT tokens from the airdrop vault back to the owner Admin wallet.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="number"
                  value={airdropWithdrawAmount}
                  onChange={(e) => setAirdropWithdrawAmount(e.target.value)}
                  placeholder="Amount of PONSPOT to withdraw"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 dark:bg-[#0c1611]/80 border border-white/90 dark:border-[#718D76]/40 text-[#243329] dark:text-white font-mono text-xs focus:outline-none focus:border-[#718D76] dark:focus:border-emerald-400"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-[#718D76] dark:text-emerald-400 font-mono">
                  PONSPOT
                </span>
              </div>

              <div className="flex gap-1.5">
                {['1000', '5000', '10000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAirdropWithdrawAmount(preset)}
                    className="px-2.5 py-2 rounded-xl bg-white/70 hover:bg-white dark:bg-[#14241d] dark:hover:bg-[#1f382c] border border-black/10 dark:border-[#718D76]/30 text-[10px] font-mono font-bold text-[#718D76] dark:text-emerald-400 transition-colors"
                  >
                    +{preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAirdropWithdrawAmount(String(airdropPoolBalance || '0'))}
                  className="px-2.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 transition-colors"
                >
                  MAX
                </button>
              </div>

              <button
                onClick={handleWithdrawAirdrop}
                disabled={isWithdrawingAirdrop || airdropPoolBalance <= 0}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-black font-black rounded-xl text-xs font-mono shadow-md flex items-center justify-center gap-1.5 flex-shrink-0 transition-colors"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{isWithdrawingAirdrop ? 'PROCESSING WITHDRAWAL...' : '💸 WITHDRAW AIRDROP VAULT'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 3: GAME ENGINE & CLAIM HISTORY                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="p-6 rounded-3xl bg-white/80 dark:bg-[#0c1611]/90 backdrop-blur-2xl border border-white/90 dark:border-[#718D76]/35 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/60 dark:border-white/10 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#718D76]/15 dark:bg-emerald-500/20 border border-[#718D76]/35 flex items-center justify-center text-[#718D76] dark:text-emerald-400 shadow-sm">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-[#243329] dark:text-white tracking-wide">
                  GAME ENGINE & ROUND MANAGEMENT
                </h2>
                <p className="text-[10px] text-[#526256] dark:text-[#8fa596] font-mono">
                  Live round status and testing claim status resets
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleForceServerRefresh}
                disabled={refreshingServer}
                className="tactile-btn px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-black font-black rounded-xl text-xs font-mono flex items-center gap-1.5 transition-colors shadow-sm"
                title="Broadcast reload signal to all connected player browsers"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingServer ? 'animate-spin' : ''}`} />
                <span>{refreshingServer ? 'REFRESHING...' : 'Refresh Server & Browsers'}</span>
              </button>

              <button
                onClick={handleResetClaims}
                className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold rounded-xl text-xs font-mono flex items-center gap-1.5 transition-colors shadow-sm"
                title="Reset claimed status in history so players can test re-claiming"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Claim Status</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 bg-white/60 dark:bg-[#14241d]/70 rounded-xl border border-white/80 dark:border-[#718D76]/30 text-center">
              <span className="text-[10px] text-[#526256] dark:text-[#8fa596] block font-bold">CURRENT GAME ID</span>
              <span className="text-sm font-bold text-[#243329] dark:text-white mt-1 block">{gameStats?.gameId || '-'}</span>
            </div>
            <div className="p-3 bg-white/60 dark:bg-[#14241d]/70 rounded-xl border border-white/80 dark:border-[#718D76]/30 text-center">
              <span className="text-[10px] text-[#526256] dark:text-[#8fa596] block font-bold">ROUND STATUS</span>
              <span className="text-sm font-bold text-[#718D76] dark:text-emerald-400 mt-1 block uppercase">
                {gameStats?.status || '-'}
              </span>
            </div>
            <div className="p-3 bg-white/60 dark:bg-[#14241d]/70 rounded-xl border border-white/80 dark:border-[#718D76]/30 text-center">
              <span className="text-[10px] text-[#526256] dark:text-[#8fa596] block font-bold">TOTAL POOL</span>
              <span className="text-sm font-bold text-[#243329] dark:text-white mt-1 block">
                {(gameStats?.totalPool || 0).toLocaleString()} PONSPOT
              </span>
            </div>
          </div>

          {/* Past Games Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/60 dark:border-white/10 text-[#526256] dark:text-[#8fa596] text-[10px]">
                  <th className="py-2.5">GAME ID</th>
                  <th>WINNER</th>
                  <th>PRIZE</th>
                  <th>CLAIM STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40 dark:divide-white/5">
                {pastGames.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-[#526256] dark:text-[#8fa596] italic">
                      No game history available yet
                    </td>
                  </tr>
                ) : (
                  pastGames.slice(0, 10).map((g) => (
                    <tr key={g.gameId} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2.5 font-bold text-[#718D76] dark:text-emerald-400">#{g.gameId}</td>
                      <td className="text-[#243329] dark:text-slate-300">{g.winner?.address ? `${g.winner.address.slice(0, 6)}...${g.winner.address.slice(-4)}` : '-'}</td>
                      <td className="text-[#243329] dark:text-white font-bold">
                        {(g.winner?.prizePons || 0).toLocaleString()} PONSPOT
                      </td>
                      <td>
                        {g.winner?.claimed ? (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded text-[10px] font-bold border border-emerald-300 dark:border-emerald-500/30">
                            CLAIMED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded text-[10px] font-bold border border-amber-300 dark:border-amber-500/30">
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
        {/* SECTION 4: FACTORY RESET & PRODUCTION HOSTING PREPARATION       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="p-6 rounded-3xl bg-rose-50/60 dark:bg-rose-950/20 backdrop-blur-2xl border-2 border-rose-400/40 dark:border-rose-500/30 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-rose-200/60 dark:border-rose-900/40 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-black text-rose-900 dark:text-rose-200 tracking-wide flex items-center gap-2">
                  <span>FACTORY RESET & HOSTING PREPARATION</span>
                  <span className="px-2 py-0.2 bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[9px] font-mono font-bold rounded">
                    DANGER ZONE
                  </span>
                </h2>
                <p className="text-[10px] text-rose-700 dark:text-rose-300/80 font-mono">
                  Wipe all testing smart contract configurations, saved test tokens, game history, and local cache before production hosting.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#0c1611]/80 border border-rose-300/50 dark:border-rose-900/50 space-y-3">
            <div className="space-y-1 text-xs font-mono text-[#526256] dark:text-slate-300">
              <p className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>What happens when you Factory Reset?</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] pl-1 text-[#243329] dark:text-slate-300 leading-relaxed">
                <li>Deletes saved test token addresses and resets contracts to clean default.</li>
                <li>Clears all round histories, test player pots, and test airdrop claim signatures.</li>
                <li>Purges local browser cache so new visitors connect to fresh production contracts.</li>
                <li>Restarts game engine at a brand new Round #1.</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowFactoryResetModal(true)}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs font-mono shadow-md flex items-center gap-2 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>🔥 FACTORY RESET ALL DATA (PREPARE FOR HOSTING)</span>
              </button>
            </div>
          </div>
        </section>

        {/* Footer Info */}
        <footer className="p-4 rounded-2xl bg-white/60 dark:bg-[#0c1611]/70 border border-white/80 dark:border-white/10 text-[11px] font-mono text-[#526256] dark:text-[#8fa596] flex justify-between items-center flex-wrap gap-2">
          <span>Active Token: {activeTokenContract || PONSPOT_TOKEN_ADDRESS}</span>
          <span>Network: {ROBINHOOD_CHAIN_CONFIG.name} (Chain ID {ROBINHOOD_CHAIN_CONFIG.chainId})</span>
          <span>Platform Fee: 5%</span>
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
          setStatusMsg({ ok: true, text: `New smart contract successfully deployed at: ${newAddr}` });
          fetchContractInfo();
        }}
      />

      {/* Deploy Dedicated Airdrop Modal */}
      <DeployAirdropModal
        isOpen={showDeployAirdropModal}
        onClose={() => setShowDeployAirdropModal(false)}
        onSuccess={handleAirdropDeploySuccess}
      />

      {/* Factory Reset Confirmation Modal */}
      <AnimatePresence>
        {showFactoryResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0c1611] border-2 border-rose-500 shadow-2xl space-y-5 text-left font-mono"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-rose-200 dark:border-rose-900/50">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
                  <Flame className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-900 dark:text-rose-200">
                    CONFIRM FACTORY RESET
                  </h3>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">
                    Prepare project for clean production hosting
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-2 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>WARNING: This action cannot be undone.</span>
                </p>
                <p className="text-[11px]">
                  All testing token addresses (<code className="bg-rose-200/60 dark:bg-rose-900/60 px-1 py-0.5 rounded">token_contract.txt</code>), game contracts, airdrop vaults, past games history, and local browser cache will be completely erased.
                </p>
                <p className="text-[11px]">
                  When hosted, the platform will start with clean contracts and zero test data.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFactoryResetModal(false)}
                  disabled={isFactoryResetting}
                  className="px-4 py-2.5 bg-gray-200 dark:bg-[#1a2d23] hover:bg-gray-300 dark:hover:bg-[#253e31] text-[#243329] dark:text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFactoryReset}
                  disabled={isFactoryResetting}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black rounded-xl text-xs shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isFactoryResetting ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>PURGING DATA...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>YES, RESET EVERYTHING NOW</span>
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
