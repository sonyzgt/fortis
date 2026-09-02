'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { useSocket } from '@/context/SocketContext';
import { usePonspotWeb3 } from '@/context/PonspotWeb3Context';
import { useSound } from '@/context/SoundContext';
import { PlayerCarousel, RightWinnerSidebar } from '@/components/jackpot/PlayerCarousel';
import { LeftChatSidebar } from '@/components/jackpot/LeftChatSidebar';
import { VerifyModal } from '@/components/ponspot/VerifyModal';
import { GameResultModal } from '@/components/ponspot/GameResultModal';
import Link from 'next/link';
import { TermsModal } from '@/components/ponspot/TermsModal';
import { ProfileModal } from '@/components/ponspot/ProfileModal';
import { WalletSelectModal } from '@/components/ponspot/WalletSelectModal';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { ROBINHOOD_CHAIN_CONFIG, PONSPOT_TOKEN_ADDRESS, PONS_TOKEN_ADDRESS, GAME_CONTRACT_ADDRESS, getGameContractAddress } from '@/lib/web3/contracts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Zap,
  Lock,
  Check,
  X,
  ExternalLink,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Activity,
  Users,
  Coins,
  ArrowRight,
  Clock,
  Sparkles,
  Gift,
  Wallet,
  LogOut,
  ChevronDown,
  Info,
  Trophy,
  Rocket,
  CheckCircle2,
  User,
  Edit3,
  Scale,
  RefreshCw,
} from 'lucide-react';

import { getUserStats, getUserLevelInfo, recordUserBet, recordAirdropClaim } from '@/lib/levelSystem';
import { claimAirdropOnChain, fetchOnChainAirdropBalance, getPonspotTokenAddress } from '@/lib/web3/contracts';

export default function PonscorePage() {
  const { socket } = useSocket();
  const {
    account,
    walletType,
    isConnected,
    ponsBalance,
    ponsAllowance,
    isApproved,
    txState,
    lastTxHash,
    errorMessage,
    connectWallet,
    disconnectWallet,
    approveTokens,
    placeBet,
    signAirdropMessage,
    refreshBalances,
    faucet,
  } = usePonspotWeb3();

  const { soundEnabled, toggleSound, playChip, playWin } = useSound();

  // User Level & XP Stats State
  const [userStats, setUserStats] = useState(() => getUserStats(account));
  const [isClaimingAirdrop, setIsClaimingAirdrop] = useState(false);
  const [claimedAddresses, setClaimedAddresses] = useState<string[]>([]);
  const [airdropInfo, setAirdropInfo] = useState<{ poolBalance: number; rewardPerClaim: number; airdropContractAddress?: string }>({
    poolBalance: 0,
    rewardPerClaim: 100,
  });

  const isCurrentWalletClaimed = useMemo(() => {
    if (!account) return false;
    const norm = account.toLowerCase();
    return claimedAddresses.includes(norm);
  }, [account, claimedAddresses]);

  // Fetch initial airdrop config from server & on-chain smart contract balance
  useEffect(() => {
    const fetchAirdrop = async () => {
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/api/airdrop`);
        if (res.ok) {
          const data = await res.json();
          if (data?.airdropContractAddress && data.airdropContractAddress.startsWith('0x') && typeof window !== 'undefined') {
            localStorage.setItem('ponscore_airdrop_contract', data.airdropContractAddress);
          }
          let currentAddr = data?.airdropContractAddress || (typeof window !== 'undefined' ? localStorage.getItem('ponscore_airdrop_contract') : null);
          let onChainBal = data.poolBalance || 0;
          if (currentAddr && currentAddr.startsWith('0x') && currentAddr !== '0x0000000000000000000000000000000000000000') {
            const liveBal = await fetchOnChainAirdropBalance(currentAddr);
            if (!isNaN(liveBal)) onChainBal = liveBal;
          }

          if (data && data.rewardPerClaim !== undefined) {
            setAirdropInfo({
              poolBalance: onChainBal,
              rewardPerClaim: data.rewardPerClaim || 100,
              airdropContractAddress: currentAddr || data.airdropContractAddress,
            });
          }
          if (data && data.claimedAddresses && Array.isArray(data.claimedAddresses)) {
            setClaimedAddresses(data.claimedAddresses.map((a: string) => a.toLowerCase()));
          }
        }
      } catch (e) {
        console.warn('Failed to fetch airdrop state', e);
      }
    };
    fetchAirdrop();
  }, []);

  // Listen to real-time airdrop changes from Admin Panel
  useEffect(() => {
    if (!socket) return;
    const handleAirdropState = async (data: any) => {
      if (data?.airdropContractAddress && data.airdropContractAddress.startsWith('0x') && typeof window !== 'undefined') {
        localStorage.setItem('ponscore_airdrop_contract', data.airdropContractAddress);
      }
      let currentAddr = data?.airdropContractAddress || (typeof window !== 'undefined' ? localStorage.getItem('ponscore_airdrop_contract') : null);
      let onChainBal = data?.poolBalance || 0;
      if (currentAddr && currentAddr.startsWith('0x') && currentAddr !== '0x0000000000000000000000000000000000000000') {
        const liveBal = await fetchOnChainAirdropBalance(currentAddr);
        if (!isNaN(liveBal)) onChainBal = liveBal;
      }

      if (data && data.rewardPerClaim !== undefined) {
        setAirdropInfo({
          poolBalance: onChainBal,
          rewardPerClaim: data.rewardPerClaim || 100,
          airdropContractAddress: currentAddr || data.airdropContractAddress,
        });
      }
      if (data && data.claimedAddresses && Array.isArray(data.claimedAddresses)) {
        setClaimedAddresses(data.claimedAddresses.map((a: string) => a.toLowerCase()));
      }
    };

    const handleAirdropReset = () => {
      setClaimedAddresses([]);
      if (account && typeof window !== 'undefined') {
        const key = `ponspot_user_stats_${account.toLowerCase()}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          const cleared = { ...parsed, hasClaimedAirdrop: false, lastAirdropClaim: 0 };
          localStorage.setItem(key, JSON.stringify(cleared));
          setUserStats(cleared);
        }
      }
      setToastMsg({
        ok: true,
        title: 'Airdrop Reset!',
        desc: 'Claim history has been reset by admin. All eligible wallets can now claim again.',
      });
      setTimeout(() => setToastMsg(null), 4000);
    };

    const handleForceReload = (payload: any) => {
      if (payload?.isFactoryReset && typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      setTimeout(() => {
        window.location.reload();
      }, 500);
    };

    socket.on('airdrop_state', handleAirdropState);
    socket.on('airdrop_claims_reset', handleAirdropReset);
    socket.on('force_client_reload', handleForceReload);
    socket.on('factory_reset_complete', handleForceReload);
    return () => {
      socket.off('airdrop_state', handleAirdropState);
      socket.off('airdrop_claims_reset', handleAirdropReset);
      socket.off('force_client_reload', handleForceReload);
      socket.off('factory_reset_complete', handleForceReload);
    };
  }, [socket, account]);

  useEffect(() => {
    setUserStats(getUserStats(account));
  }, [account]);

  const levelInfo = useMemo(() => getUserLevelInfo(userStats.gamesPlayed, userStats.totalVolumePons), [userStats]);

  // Terms of Service & Wallet Modal State
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Mobile panel tab: 'chat' | 'arena' | 'history'
  const [mobileTab, setMobileTab] = useState<'chat' | 'arena' | 'history'>('arena');

  const handleInitiateConnectWallet = (targetType: 'okx' | 'metamask' | 'rabby' | 'bitget' = 'okx') => {
    connectWallet(targetType);
  };

  const handleAcceptTerms = () => {
    setShowTermsModal(false);
  };

  const handleDeclineTerms = () => {
    setShowTermsModal(false);
  };

  // User Profile Customization State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string }>({
    name: '',
    avatar: '',
  });

  // Load saved profile on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ponspot_user_profile');
      if (saved) {
        setUserProfile(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load user profile', e);
    }
  }, []);

  const handleSaveProfile = useCallback((name: string, avatar: string) => {
    const finalAvatar = avatar || '/image/logo.png';
    const updated = { name, avatar: finalAvatar };
    setUserProfile(updated);
    try {
      localStorage.setItem('ponspot_user_profile', JSON.stringify(updated));
      localStorage.setItem('ponspot_profile_configured', 'true');
    } catch (e) {
      console.error('Failed to save user profile', e);
    }
    setToastMsg({
      ok: true,
      title: 'Profile Saved Successfully!',
      desc: `Name: "${name}"`,
    });
    setTimeout(() => setToastMsg(null), 4000);
  }, []);

  // Enforce permanent dark theme
  useEffect(() => {
    document.documentElement.classList.add('dark');
    if (typeof window !== 'undefined') {
      localStorage.setItem('ponspot_theme', 'dark');
    }
  }, []);

  // Ponscore Game State from Socket / Engine
  const [game, setGame] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [pastGames, setPastGames] = useState<any[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedResultGame, setSelectedResultGame] = useState<any | null>(null);
  const [unclaimedGames, setUnclaimedGames] = useState<any[]>([]);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyTargetGameId, setVerifyTargetGameId] = useState<string | null>(null);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);

  // Bet input state
  const [betAmount, setBetAmount] = useState<number>(100000);
  const [toastMsg, setToastMsg] = useState<{ ok: boolean; title: string; desc: string; txHash?: string } | null>(null);
  const [totalBetsVolume, setTotalBetsVolume] = useState(19420850);

  // Simulated volume counter
  useEffect(() => {
    const t = setInterval(() => {
      setTotalBetsVolume((n) => n + Math.floor(Math.random() * 4));
    }, 2500);
    return () => clearInterval(t);
  }, []);

  // Auto-sync active game & token contract address from server on refresh / mount
  useEffect(() => {
    const syncContracts = async () => {
      const apiBase = getApiBaseUrl();
      const ts = Date.now();
      try {
        const res = await fetch(`${apiBase}/api/contract-address?_t=${ts}`, { cache: 'no-store' });
        const data = await res.json();
        if (data?.contractAddress && data.contractAddress.startsWith('0x') && data.contractAddress.length === 42) {
          localStorage.setItem('ponscore_deployed_game_contract', data.contractAddress);
          localStorage.setItem('ponspot_deployed_game_contract', data.contractAddress);
        } else {
          localStorage.removeItem('ponscore_deployed_game_contract');
          localStorage.removeItem('ponspot_deployed_game_contract');
        }
      } catch (e) {
        console.warn('Could not sync game contract address from server', e);
      }

      try {
        const tokenRes = await fetch(`${apiBase}/api/token-contract-address?_t=${ts}`, { cache: 'no-store' });
        const tokenData = await tokenRes.json();
        if (tokenData?.tokenAddress && tokenData.tokenAddress.startsWith('0x') && tokenData.tokenAddress.length === 42) {
          localStorage.setItem('ponscore_token_contract', tokenData.tokenAddress);
          localStorage.setItem('ponspot_token_contract', tokenData.tokenAddress);
        }
      } catch (e) {
        console.warn('Could not sync token contract address from server', e);
      }

      try {
        await refreshBalances?.();
      } catch {}
    };
    syncContracts();
  }, [refreshBalances]);

  // Request unclaimed games whenever account changes
  useEffect(() => {
    if (!socket || !account) {
      setUnclaimedGames([]);
      return;
    }
    socket.emit('ponscore_get_unclaimed', { address: account });
  }, [socket, account]);

  // Scan pastGames for unclaimed prizes as well
  useEffect(() => {
    if (!account) return;
    const norm = account.toLowerCase();
    const unclaimed = pastGames.filter(
      (g) => g.winner && g.winner.address.toLowerCase() === norm && !g.winner.claimed
    );
    if (unclaimed.length > 0) {
      setUnclaimedGames((prev) => {
        const map = new Map<string, any>();
        prev.forEach((g) => map.set(g.gameId, g));
        unclaimed.forEach((g) => map.set(g.gameId, g));
        return Array.from(map.values());
      });
    }
  }, [pastGames, account]);

  // Socket listener for Ponscore Game
  useEffect(() => {
    if (!socket) return;

    socket.on('ponscore_state', (state: any) => {
      setGame(state);
    });

    socket.on('ponscore_history', (history: any[]) => {
      setPastGames(history);
    });

    socket.on('ponscore_contract_updated', (data: any) => {
      if (data?.contractAddress) {
        localStorage.setItem('ponscore_deployed_game_contract', data.contractAddress);
        localStorage.setItem('ponspot_deployed_game_contract', data.contractAddress);
      }
    });

    socket.on('ponscore_token_updated', (data: any) => {
      if (data?.tokenAddress) {
        localStorage.setItem('ponscore_token_contract', data.tokenAddress);
        localStorage.setItem('ponspot_token_contract', data.tokenAddress);
      }
    });

    socket.on('force_client_reload', (data: any) => {
      setToastMsg({
        ok: true,
        title: 'Server Updated by Admin!',
        desc: data?.message || 'Reloading to the latest version...',
      });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    });

    socket.on('ponscore_winner', (payload: any) => {
      const roundData = payload.round || payload;
      const winnerAddress = roundData?.winner?.address;
      const isWinner = account && winnerAddress && account.toLowerCase() === winnerAddress.toLowerCase();

      // Only winner receives win claim pop up and celebration sound
      if (isWinner) {
        playWin();
        setSelectedResultGame(roundData);
        setShowResultModal(true);
        socket.emit('ponscore_get_unclaimed', { address: account });
      } else {
        setShowResultModal(false);
      }
    });

    socket.on('ponscore_unclaimed_list', (list: any[]) => {
      setUnclaimedGames(list || []);
    });

    socket.on('chat_history', setMessages);
    socket.on('chat_message', (m: any) => setMessages((p) => [...p.slice(-99), m]));

    socket.on('ponscore_bet_result', (r: any) => {
      if (r.success) {
        playChip();
        setToastMsg({
          ok: true,
          title: 'PONSPOT Bet Placed Successfully!',
          desc: r.message,
          txHash: r.bet?.txHash,
        });
      } else {
        setToastMsg({
          ok: false,
          title: 'Bet Failed',
          desc: r.message,
        });
      }
      setTimeout(() => setToastMsg(null), 5000);
    });

    socket.on('ponscore_claim_result', (r: any) => {
      if (r.success) {
        setUnclaimedGames((prev) => prev.filter((g) => g.gameId !== r.gameId));
      }
    });

    return () => {
      [
        'ponscore_state',
        'ponscore_history',
        'ponscore_winner',
        'ponscore_unclaimed_list',
        'chat_history',
        'chat_message',
        'ponscore_bet_result',
        'ponscore_claim_result',
      ].forEach((e) => socket.off(e));
    };
  }, [socket, account, playChip, playWin]);

  const handleClaimSuccess = useCallback(
    (gameId: string, txHash: string) => {
      if (socket && account) {
        socket.emit('ponscore_claim', { gameId, claimTxHash: txHash, address: account });
      }
      setUnclaimedGames((prev) => prev.filter((g) => g.gameId !== gameId));
      setToastMsg({
        ok: true,
        title: 'Winner Claim Successful!',
        desc: `Prize for game #${gameId} transferred on-chain to your wallet!`,
        txHash,
      });
      setTimeout(() => setToastMsg(null), 5000);
    },
    [socket, account]
  );

  // Transform players into carousel participants format
  const participants = useMemo(() => {
    if (!game || !game.players) return [];
    return game.players.map((p: any) => ({
      playerId: p.address,
      playerName: p.name || `${p.address.slice(0, 6)}...${p.address.slice(-4)}`,
      playerAvatar: p.avatar || '/image/logo.png',
      walletAddress: p.address,
      ticketCount: p.ticketCount,
      totalSpent: p.totalBetPons,
      odds: p.odds,
    }));
  }, [game]);

  // Stable carousel winner object (prevents re-triggering carousel spin on state changes)
  const carouselWinner = useMemo(() => {
    if (!game?.winner) return null;
    return {
      playerId: game.winner.address,
      playerName: game.winner.name,
      playerAvatar: game.winner.avatar || '/image/logo.png',
      walletAddress: game.winner.address,
      ticketCount: game.winner.ticketCount,
      potWon: game.winner.prizePons,
      odds: game.winner.odds,
      winningTicket: game.winner.winningTicket,
      timestamp: game.endTime || 0,
    };
  }, [game?.winner?.address, game?.winner?.winningTicket, game?.winner?.prizePons, game?.endTime]);

  // Current user participant data
  const myPlayer = useMemo(() => {
    if (!game || !account) return null;
    return game.players?.find((p: any) => p.address.toLowerCase() === account.toLowerCase()) || null;
  }, [game, account]);

  const hasApproved = isApproved(betAmount);

  // Quick Bet presets (100k min)
  const BET_PRESETS = [100000, 250000, 500000, 1000000];

  // Handle Approve Token
  const handleApprove = async () => {
    if (!account) {
      setShowWalletModal(true);
      return;
    }

    try {
      const tx = await approveTokens(betAmount);
      if (tx) {
        setToastMsg({
          ok: true,
          title: 'Token Approved!',
          desc: `PONSPOT token successfully approved! You can now place bets on-chain.`,
          txHash: tx,
        });
        setTimeout(() => setToastMsg(null), 5000);
      }
    } catch (e: any) {
      const isUserRejected =
        e?.code === 4001 ||
        e?.code === 'ACTION_REJECTED' ||
        e?.message?.includes('user rejected') ||
        e?.message?.includes('User denied');
      setToastMsg({
        ok: false,
        title: isUserRejected ? 'Approval Cancelled' : 'Approval Failed',
        desc: isUserRejected
          ? 'Token approval transaction was cancelled in wallet.'
          : e?.reason || e?.message || 'Failed to approve PONSPOT tokens.',
      });
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  // Handle Place Bet
  const handleBet = async () => {
    if (!account) {
      setShowWalletModal(true);
      return;
    }
    if (!game) return;

    if (betAmount < 100000) {
      setToastMsg({
        ok: false,
        title: 'Minimum Bet Not Met',
        desc: 'The minimum bet amount is 100,000 PONSPOT (100k).',
      });
      setTimeout(() => setToastMsg(null), 4000);
      return;
    }

    try {
      // 1. Sign on-chain transaction
      const tx = await placeBet(game.gameId, betAmount);
      if (tx) {
        // 2. Record User XP & Level stats locally
        const newStats = recordUserBet(account, betAmount);
        setUserStats(newStats);

        // 3. Broadcast to engine with customized profile
        socket?.emit('ponscore_bet', {
          playerAddress: account,
          playerName: userProfile.name || `${account.slice(0, 6)}...${account.slice(-4)}`,
          playerAvatar: userProfile.avatar || '/image/logo.png',
          amountPons: betAmount,
          txHash: tx,
        });
      }
    } catch (e: any) {
      setToastMsg({ ok: false, title: 'Bet Cancelled', desc: e?.message || 'Failed to place bet' });
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  // Handle 24-Hour Admin Airdrop Vault Claim with Wallet Signature
  const handleClaimAirdrop = async () => {
    if (!account) {
      handleInitiateConnectWallet('okx');
      return;
    }
    if (levelInfo.level < 5) {
      setToastMsg({
        ok: false,
        title: 'Airdrop Locked (Level 5 Required)',
        desc: `Reach Level 5 by playing rounds to unlock airdrop claims! (Your level: Lv. ${levelInfo.level})`,
      });
      setTimeout(() => setToastMsg(null), 4500);
      return;
    }

    if (userStats.hasClaimedAirdrop) {
      setToastMsg({
        ok: false,
        title: 'Airdrop Already Claimed',
        desc: 'Each wallet is eligible to claim the airdrop only once.',
      });
      setTimeout(() => setToastMsg(null), 4000);
      return;
    }

    setIsClaimingAirdrop(true);
    try {
      const rewardAmount = airdropInfo.rewardPerClaim || 100;
      const timestamp = Math.floor(Date.now() / 1000);
      const signMsg = `PONSPOT COMMUNITY AIRDROP CLAIM\nBeneficiary: ${account}\nAmount: ${rewardAmount} PONSPOT\nTimestamp: ${timestamp}\nProtocol: Nonce Verified 1-Time Claim Per Wallet`;

      let signature = '';
      let txHash = '';
      const win = typeof window !== 'undefined' ? (window as any) : {};
      const providerObj = win.okxwallet || win.ethereum;
      const airdropAddr = (airdropInfo as any).airdropContractAddress || (typeof window !== 'undefined' ? localStorage.getItem('ponscore_airdrop_contract') : null);

      if (
        airdropAddr &&
        airdropAddr.startsWith('0x') &&
        airdropAddr !== '0x0000000000000000000000000000000000000000' &&
        providerObj &&
        account &&
        !account.startsWith('demo-')
      ) {
        try {
          const provider = new ethers.BrowserProvider(providerObj);
          const signer = await provider.getSigner();
          setToastMsg({
            ok: true,
            title: 'Confirm On-Chain Claim in Wallet',
            desc: `Open OKX Wallet to confirm the ${rewardAmount} PONSPOT claim transaction...`,
          });
          txHash = await claimAirdropOnChain(signer, airdropAddr);
        } catch (chainErr: any) {
          if (chainErr?.code === 'ACTION_REJECTED' || chainErr?.code === 4001) {
            throw new Error('On-chain claim transaction was cancelled in wallet.');
          }
          if (
            chainErr?.message?.includes('insufficient vault balance') ||
            chainErr?.message?.includes('transfer failed') ||
            chainErr?.reason?.includes('insufficient vault balance')
          ) {
            throw new Error('Airdrop vault smart contract does not have sufficient PONSPOT balance. Admin must deposit tokens first.');
          }
          if (chainErr?.message?.includes('already claimed') || chainErr?.reason?.includes('already claimed')) {
            throw new Error('This wallet has already claimed the airdrop on-chain (1x claim per wallet).');
          }
          throw new Error(chainErr?.shortMessage || chainErr?.reason || chainErr?.message || 'Failed to execute on-chain airdrop claim');
        }
      } else {
        setToastMsg({
          ok: true,
          title: 'Please Sign in Wallet',
          desc: `Confirm signature in wallet extension to claim ${rewardAmount} PONSPOT...`,
        });
        signature = await signAirdropMessage(signMsg);
      }

      // Record claim locally & broadcast to backend
      recordAirdropClaim(account);
      setClaimedAddresses((prev) => Array.from(new Set([...prev, account.toLowerCase()])));
      setUserStats(getUserStats(account));
      playWin();
      await refreshBalances();

      socket?.emit('claim_airdrop_signed', {
        playerAddress: account,
        playerName: userProfile.name || `${account.slice(0, 6)}...${account.slice(-4)}`,
        signature: signature || txHash,
        txHash,
      });

      setToastMsg({
        ok: true,
        title: `🎁 ${rewardAmount} PONSPOT Airdrop Claimed Successfully!`,
        desc: txHash ? `On-chain transaction confirmed! Hash: ${txHash.slice(0, 10)}...` : 'Tokens successfully withdrawn from the Community Airdrop Vault.',
      });
      setTimeout(() => setToastMsg(null), 5000);
    } catch (e: any) {
      if (
        e?.code === 'ACTION_REJECTED' ||
        e?.code === 4001 ||
        e?.message?.includes('rejected') ||
        e?.message?.includes('dibatalkan') ||
        e?.message?.includes('User rejected')
      ) {
        setToastMsg({
          ok: false,
          title: 'Signature Cancelled',
          desc: 'You cancelled the signature request in wallet.',
        });
      } else {
        setToastMsg({
          ok: false,
          title: 'Airdrop Claim Failed',
          desc: e?.message || 'An error occurred during airdrop claim.',
        });
      }
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setIsClaimingAirdrop(false);
    }
  };

  const handleChat = useCallback(
    (text: string) => {
      if (!socket || !account) return;
      if (levelInfo.level < 5) {
        setToastMsg({
          ok: false,
          title: 'Chat Locked',
          desc: 'Chat unlocks automatically when your account reaches Level 5!',
        });
        setTimeout(() => setToastMsg(null), 3500);
        return;
      }
      socket.emit('send_chat', {
        senderId: account,
        senderName: userProfile.name || `${account.slice(0, 6)}...${account.slice(-4)}`,
        senderAvatar: userProfile.avatar || '/image/logo.png',
        text,
      });
    },
    [socket, account, userProfile, levelInfo]
  );

  const timeRemaining = game?.timeRemaining ?? 15;
  const mm = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
  const ss = String(timeRemaining % 60).padStart(2, '0');

  const displayName = userProfile.name || (account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Player');
  const displayAvatar = userProfile.avatar || '/image/logo.png';

  return (
    <div className="h-screen flex flex-col overflow-hidden cyber-grid-bg font-sans text-white dark">
      {/* ═══════════ TOP CYBERPUNK HUD NAVBAR ═══════════ */}
      <header className="flex-shrink-0 h-[64px] sm:h-[88px] lg:h-[96px] flex items-center border-b border-cyan-500/20 bg-[#060b17]/95 backdrop-blur-2xl z-40 shadow-[0_4px_30px_rgba(0,0,0,0.8)] transition-colors">
        {/* Left: Branding Video Banner (hidden on mobile, shown on lg) */}
        <div className="hidden lg:flex w-[285px] h-full flex-shrink-0 border-r border-cyan-500/20 overflow-hidden items-center justify-center p-0 m-0 relative">
          <video
            src="/image/banner.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover select-none pointer-events-none block opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#060b17]/80 pointer-events-none" />
        </div>

        {/* Mobile: Logo + Name */}
        <div className="flex lg:hidden items-center gap-2.5 pl-3.5 flex-shrink-0">
          <img src="/image/logo.png" alt="Ponspot" className="w-8 h-8 rounded-lg object-contain border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.4)]" />
          <span className="text-base font-black text-white tracking-widest font-orbitron text-neon-cyan">PONSPOT</span>
        </div>

        {/* Center: System Telemetry Badges (hidden on mobile) */}
        <div className="hidden sm:flex flex-1 items-center gap-3 px-5">
          <a
            href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/token/${getPonspotTokenAddress() || PONSPOT_TOKEN_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#091224] hover:bg-[#0f1d38] border border-cyan-500/30 hover:border-cyan-400 rounded-lg text-[11px] font-mono transition-all shadow-[0_0_10px_rgba(0,240,255,0.1)] group"
            title="Inspect PONSPOT token contract on Robinhood Blockscout"
          >
            <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
            <span className="text-slate-400">CA:</span>
            <span className="text-[#00f0ff] font-bold group-hover:underline">
              {getPonspotTokenAddress() ? `${getPonspotTokenAddress().slice(0, 6)}...${getPonspotTokenAddress().slice(-4)}` : 'Robinhood L2'}
            </span>
            <ExternalLink className="w-3 h-3 text-cyan-400 opacity-70 group-hover:opacity-100" />
          </a>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#091224] border border-emerald-500/30 rounded-lg text-[11px] font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-[#00ff88]" />
            <span>CHAIN:</span>
            <span className="text-[#00ff88] font-bold">ROBINHOOD L2 (4663)</span>
          </div>
        </div>

        {/* Spacer on mobile */}
        <div className="flex-1 sm:hidden" />

        {/* Right: Wallet & Sound Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3 justify-end pr-3.5 sm:pr-5">
          {/* Connected Wallet Pill / Connect Button */}
          {isConnected && account ? (
            <div className="relative">
              <button
                onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                className="tactile-btn flex items-center gap-2.5 px-2.5 sm:px-3.5 py-1.5 bg-[#091224] hover:bg-[#0e1b36] border border-cyan-500/40 rounded-xl transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] text-white"
              >
                <div className="w-7 h-7 rounded-lg bg-black/60 p-0.5 border border-cyan-400/50 shadow-inner flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img src={displayAvatar} alt="" className="w-full h-full rounded-md object-cover" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-black text-white truncate max-w-[110px] leading-tight font-cyber">
                    {displayName}
                  </p>
                  <p className="text-[10px] font-mono text-cyan-400 leading-none mt-0.5 font-bold">
                    {ponsBalance.toLocaleString()} <span className="text-slate-400 font-normal">PONS</span>
                  </p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-cyan-400 transition-transform ${showWalletDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showWalletDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-full mt-2 w-72 bg-[#060b17]/98 backdrop-blur-2xl border border-cyan-500/40 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.95)] p-3.5 z-50 space-y-2.5 text-xs font-mono text-white"
                  >
                    {/* User Profile Pod */}
                    <div className="p-3 bg-[#091224] rounded-lg border border-cyan-500/30 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-black/60 p-0.5 border border-[#00f0ff] shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img src={displayAvatar} alt="" className="w-full h-full rounded-md object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-white truncate font-cyber">{displayName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{account}</p>
                      </div>
                    </div>

                    {/* Edit Profile Action Button */}
                    <button
                      onClick={() => {
                        setShowWalletDropdown(false);
                        setShowProfileModal(true);
                      }}
                      className="w-full cyber-btn-cyan py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm font-cyber uppercase tracking-wider"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>EDIT PROFILE & AVATAR</span>
                    </button>

                    {/* Free Faucet Button for Testing */}
                    <button
                      onClick={() => {
                        faucet();
                        setToastMsg({
                          ok: true,
                          title: 'Faucet Claimed!',
                          desc: 'Successfully credited +500,000 PONSPOT to your balance.',
                        });
                        setTimeout(() => setToastMsg(null), 3500);
                      }}
                      className="w-full py-2 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-[#00ff88] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 font-mono"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>CLAIM FREE FAUCET (+500K)</span>
                    </button>

                    <div className="p-2.5 bg-[#091224] rounded-lg border border-cyan-500/20 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Approved Allowance:</span>
                      <span className="text-[#00ff88] font-bold">{ponsAllowance.toLocaleString()} PONS</span>
                    </div>

                    <button
                      onClick={() => {
                        disconnectWallet();
                        setShowWalletDropdown(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-lg text-xs font-bold transition-colors border border-rose-500/30 font-mono"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect Wallet</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => setShowWalletModal(true)}
              className="cyber-btn-cyan px-3.5 sm:px-4 py-2 font-black rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-95 font-orbitron"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CONNECT WALLET</span>
              <span className="sm:hidden">CONNECT</span>
            </button>
          )}
        </div>
      </header>

      {/* ═══════════ MAIN 3-COLUMN LAYOUT ═══════════ */}
      <div className="flex-1 flex overflow-hidden min-h-0 pb-[56px] lg:pb-0">
        {/* Left: Chat Feed */}
        <div className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-auto h-full`}>
          <LeftChatSidebar
            messages={messages}
            onSend={handleChat}
            currentUserId={account || undefined}
            levelInfo={levelInfo}
            hasClaimedAirdrop={isCurrentWalletClaimed}
            onClaimAirdrop={handleClaimAirdrop}
            isClaimingAirdrop={isClaimingAirdrop}
            airdropRewardAmount={airdropInfo.rewardPerClaim}
            airdropPoolBalance={airdropInfo.poolBalance}
          />
        </div>

        {/* Center: Main Arena */}
        <div className={`${mobileTab === 'arena' ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-w-0 h-full`}>
        <main className="flex-1 overflow-y-auto min-w-0 bg-transparent p-0 flex flex-col justify-between">
          <div className="px-4 lg:px-6 pt-4">
            <div className="max-w-4xl xl:max-w-5xl mx-auto">
              {/* ── GAME ARENA CONTENT STACK ── */}
              <div className="space-y-3.5">
                {/* ── UNCLAIMED PRIZE ALERT BANNER ── */}
                <AnimatePresence>
              {unclaimedGames.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.96 }}
                  className="p-4 rounded-xl bg-[#091b29] border-2 border-[#00ff88] shadow-[0_0_30px_rgba(0,255,136,0.3)] flex items-center justify-between flex-wrap gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-emerald-950/80 border border-[#00ff88] flex items-center justify-center text-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.4)] flex-shrink-0">
                      <Trophy className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white tracking-widest uppercase flex items-center gap-1.5 font-orbitron">
                          <span>🎉 UNCLAIMED JACKPOT VICTORY DETECTED</span>
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-950/90 text-[#00ff88] text-[10px] font-mono font-black rounded border border-[#00ff88]/40">
                          {unclaimedGames.length} Rounds
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                        You won <span className="text-[#00ff88] font-bold">{unclaimedGames[0]?.winner?.prizePons?.toLocaleString()} PONSPOT</span> in Round <span className="text-cyan-400 font-bold">#{unclaimedGames[0]?.gameId}</span>. Claim on-chain now!
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedResultGame(unclaimedGames[0]);
                      setShowResultModal(true);
                    }}
                    className="bg-gradient-to-r from-emerald-400 to-[#00ff88] text-black px-5 py-2.5 font-black rounded-lg text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,136,0.6)] font-orbitron tracking-wider active:scale-95"
                  >
                    <Zap className="w-4 h-4 fill-black" />
                    <span>CLAIM WINNINGS ({unclaimedGames[0]?.winner?.prizePons?.toLocaleString()} PONS)</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── 1. CORE GAME HEADER & STATS ── */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Prize Pool */}
              <div className="p-3.5 rounded-xl cyber-panel text-center relative overflow-hidden">
                <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-0.5 font-bold">LIVE PRIZE POOL</p>
                <div className="text-xl font-black font-mono text-white flex items-center justify-center gap-1.5">
                  <span className="text-neon-cyan">{(game?.totalPool || 0).toLocaleString()}</span>
                  <span className="text-xs font-bold text-cyan-400">PONS</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400 font-bold block mt-0.5">
                  95% Winner • <span className="text-[#ff007a]">🔥 5% Burn</span>
                </span>
              </div>

              {/* Total Players */}
              <div className="p-3.5 rounded-xl cyber-panel text-center relative overflow-hidden">
                <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-0.5 font-bold">ACTIVE PLAYERS</p>
                <div className="text-xl font-black font-mono text-white flex items-center justify-center gap-1.5">
                  <Users className="w-4 h-4 text-[#00f0ff]" />
                  <span>{game?.totalPlayers || 0}</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                  {game?.status === 'waiting' ? 'Waiting 2 Players' : 'Round Active'}
                </span>
              </div>

              {/* Time Remaining */}
              <div className="p-3.5 rounded-xl cyber-panel text-center relative overflow-hidden">
                <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-0.5 font-bold">COUNTDOWN</p>
                <div
                  className={`text-xl font-black font-mono tracking-tight ${
                    game?.status === 'waiting'
                      ? 'text-slate-500'
                      : timeRemaining <= 5
                      ? 'text-[#ff007a] text-neon-pink animate-pulse'
                      : 'text-white'
                  }`}
                >
                  {game?.status === 'waiting' ? '-- : --' : `${mm} : ${ss}`}
                </div>
                <span className="text-[9px] font-mono text-slate-400 block mt-0.5">15s Fast Round</span>
              </div>
            </div>

            {/* ── 2. 3D ARENA CAROUSEL REEL ── */}
            <PlayerCarousel
              participants={participants}
              isSpinning={game?.status === 'spinning'}
              winner={carouselWinner}
            />

            {/* ── 3. YOUR BET SECTION (CYBERPUNK BETTING DECK) ── */}
            <div className="p-4 rounded-xl cyber-panel space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.7)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#00f0ff]" />
                  <span className="text-xs font-black tracking-wider text-white font-orbitron">WAGER CONTROL DECK</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Wallet Balance:{' '}
                  <span className="text-[#00ff88] font-bold">{ponsBalance.toLocaleString()} PONS</span>
                </span>
              </div>

              {/* Quick Multiplier Presets */}
              <div className="grid grid-cols-4 gap-2">
                {BET_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setBetAmount(preset)}
                    className={`tactile-btn py-2.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                      betAmount === preset
                        ? 'bg-[#00f0ff] border-white text-black font-black shadow-[0_0_15px_rgba(0,240,255,0.6)]'
                        : 'bg-[#091224] hover:bg-[#0e1b36] border-cyan-500/30 text-slate-200'
                    }`}
                  >
                    {preset.toLocaleString()} PONS
                  </button>
                ))}
              </div>

              {/* Custom Input & Action Button */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 flex-1 bg-[#091224] border border-cyan-500/30 rounded-lg px-3.5 py-2.5 focus-within:border-[#00f0ff] focus-within:shadow-[0_0_12px_rgba(0,240,255,0.3)] transition-all">
                  <span className="text-xs font-mono font-bold text-[#00f0ff]">PONS:</span>
                  <input
                    type="number"
                    min={100000}
                    step={10000}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(100000, Number(e.target.value)))}
                    className="w-full bg-transparent text-sm font-mono font-bold text-white focus:outline-none placeholder-slate-600"
                  />
                  <span className="text-[10px] font-mono text-cyan-400/80">{betAmount} tix</span>
                </div>

                {/* Dynamic Action Button: Approve vs Bet */}
                {!isConnected ? (
                  <button
                    onClick={() => setShowWalletModal(true)}
                    className="cyber-btn-cyan px-6 py-2.5 font-black rounded-lg text-xs transition-all flex-shrink-0 active:scale-95 font-orbitron"
                  >
                    CONNECT WALLET
                  </button>
                ) : !hasApproved ? (
                  <button
                    onClick={handleApprove}
                    disabled={txState === 'approving'}
                    className="cyber-btn-cyan px-6 py-2.5 font-black rounded-lg text-xs transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed font-orbitron"
                  >
                    {txState === 'approving' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span className="animate-pulse">APPROVING...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>APPROVE PONS</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleBet}
                    disabled={
                      txState === 'betting' ||
                      (game?.status !== 'waiting' && game?.status !== 'open') ||
                      ponsBalance < betAmount
                    }
                    className={`tactile-btn px-6 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 flex-shrink-0 font-orbitron ${
                      (game?.status === 'waiting' || game?.status === 'open') && ponsBalance >= betAmount
                        ? 'cyber-btn-cyan active:scale-95 shadow-[0_0_20px_rgba(0,240,255,0.5)]'
                        : 'bg-[#091224] text-slate-500 border border-white/10 cursor-not-allowed'
                    }`}
                  >
                    {txState === 'betting' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span className="animate-pulse">SIGNING TX...</span>
                      </>
                    ) : game?.status === 'spinning' ? (
                      'DRAWING...'
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>PLACE BET</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Approval Info Tooltip */}
              {!hasApproved && isConnected && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-[#091224] border border-cyan-500/20 px-3 py-1.5 rounded-lg">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 text-[#00f0ff]" />
                  <span>
                    ERC-20 standard requires token approval before the smart contract can accept PONSPOT wagers.
                  </span>
                </div>
              )}
            </div>

            {/* ── 4. CURRENT PLAYERS LIST (CYBERPUNK CARDS) ── */}
            <div className="space-y-3">
              {/* Header Bar */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#091224] border border-cyan-500/30 text-xs font-black text-white font-orbitron">
                    <Users className="w-3.5 h-3.5 text-[#00f0ff]" />
                    <span>{game?.players?.length || 0} PLAYERS</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-bold text-[#00ff88] font-mono">
                    <span className="w-3 h-3 rounded-full bg-[#00ff88] flex items-center justify-center text-[7px] font-black text-black">✓</span>
                    <span>100% NON-CUSTODIAL ESCROW</span>
                  </div>

                  {/* Provably Fair Button */}
                  <button
                    onClick={() => {
                      setVerifyTargetGameId(game?.gameId || null);
                      setShowVerifyModal(true);
                    }}
                    className="tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#091224] hover:bg-[#0f1e3c] border border-cyan-500/40 text-[11px] font-bold text-cyan-300 transition-all font-mono group"
                    title="Verify cryptographic provable fairness"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#00f0ff] group-hover:scale-110 transition-transform" />
                    <span>PROVABLY FAIR</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </button>
                </div>

                <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-400">
                  <span className="text-[#00f0ff]">#</span>
                  <span>ROUND:</span>
                  <span className="text-white font-black">{game?.gameId?.replace('PONSPOT-', '') || '371667'}</span>
                </div>
              </div>

              {/* Player Card Stack */}
              <div className="space-y-2.5">
                {(!game?.players || game.players.length === 0) ? (
                  <div className="text-center py-10 rounded-xl bg-[#091224]/60 border border-cyan-500/20 text-xs text-slate-400 font-mono italic">
                    NO ACTIVE WAGERS IN THIS ROUND. PLACE THE FIRST BET!
                  </div>
                ) : (
                  game.players.map((p: any) => {
                    const isMe = account && p.address.toLowerCase() === account.toLowerCase();
                    const playerLevel = isMe ? levelInfo.level : Math.max(1, (Math.abs(parseInt(p.address.slice(-2), 16) % 4) + 1));
                    return (
                      <div
                        key={p.address}
                        className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all overflow-hidden ${
                          isMe
                            ? 'bg-[#0c1830]/95 border-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                            : 'bg-[#091224]/85 border-cyan-500/20 hover:border-cyan-500/40'
                        }`}
                      >
                        {/* Right vertical glowing accent indicator bar */}
                        <div className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full bg-[#00f0ff] shadow-[0_0_10px_#00f0ff]" />

                        {/* Left: Avatar, Name, Level Badge */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-12 h-12 rounded-lg bg-black/60 p-0.5 border border-cyan-400/40 shadow-inner flex-shrink-0 overflow-hidden flex items-center justify-center">
                            <img
                              src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.address}`}
                              alt=""
                              className="w-full h-full rounded-md object-cover"
                            />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-black text-white truncate tracking-tight font-cyber">
                              {p.name || `${p.address.slice(0, 6)}...${p.address.slice(-4)}`}
                              {isMe && <span className="text-[#00f0ff] text-xs ml-1.5 font-bold font-mono">(YOU)</span>}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/30 text-[10px] font-mono font-black text-[#00f0ff]">
                                LV. {playerLevel}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Middle: Token Coin Badge & Bet Amount */}
                        <div className="flex items-center gap-3 px-4">
                          <div className="relative w-8 h-8 rounded-full bg-cyan-950/60 border border-cyan-400/40 flex items-center justify-center flex-shrink-0 p-1">
                            <img
                              src="/image/logo.png"
                              alt="PONSPOT"
                              className="w-full h-full rounded-full object-cover"
                            />
                          </div>
                          <div className="text-left font-mono">
                            <p className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                              {p.totalBetPons.toLocaleString()}
                            </p>
                            <p className="text-[11px] text-cyan-400 font-bold">
                              PONS
                            </p>
                          </div>
                        </div>

                        {/* Right: Chance Label & Percentage */}
                        <div className="text-right pr-3 sm:pr-4">
                          <span className="text-[10px] font-bold text-slate-400 block tracking-widest uppercase font-mono">
                            ODDS
                          </span>
                          <span className="text-base sm:text-lg font-black font-mono text-[#00ff88] tracking-tight">
                            {p.odds}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            </div>
            </div>
          </div>

          {/* ═══════════ MAIN CYBERPUNK SITE FOOTER ═══════════ */}
          <footer className="w-full bg-[#03060f] border-t border-cyan-500/25 mt-12 pt-10 pb-28 lg:pb-10 px-4 sm:px-6 select-none font-sans text-xs text-slate-400 relative overflow-hidden">
            {/* Background cyber grid & ambient glows */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,240,255,0.06),rgba(255,255,255,0))] pointer-events-none" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-cyan-500/5 blur-3xl pointer-events-none" />

            <div className="max-w-6xl mx-auto space-y-8 relative z-10">
              {/* Top Row: Brand & Live Protocol Telemetry */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-6 border-b border-cyan-500/15">
                {/* Brand & Ecosystem */}
                <div className="md:col-span-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#081226] border border-cyan-400/50 p-1.5 shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center justify-center flex-shrink-0">
                      <img
                        src="/image/logo.png"
                        alt="Ponspot Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white tracking-widest font-orbitron text-neon-cyan">
                        PONSPOT.FUN
                      </h3>
                      <p className="text-[10px] text-cyan-400 font-mono tracking-wide">
                        NEXT-GEN DECENTRALIZED JACKPOT ARENA
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    The premier non-custodial gaming protocol on <strong className="text-white">Robinhood Chain L2</strong>. Wagers are escrowed directly in immutable smart contracts with 100% provably fair cryptographic outcomes.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff88]" />
                    </span>
                    <span className="text-[10px] font-mono text-[#00ff88] font-bold tracking-wider">
                      ROBINHOOD CHAIN L2 // STATUS: ONLINE (4663)
                    </span>
                  </div>
                </div>

                {/* Quick Protocol Links */}
                <div className="md:col-span-3 space-y-2.5">
                  <h4 className="text-[10px] font-black uppercase text-cyan-400 font-orbitron tracking-widest">
                    PROTOCOL & GOVERNANCE
                  </h4>
                  <ul className="space-y-1.5 text-[11px] font-mono">
                    <li>
                      <button
                        onClick={() => setShowTermsModal(true)}
                        className="text-slate-300 hover:text-[#00f0ff] transition-colors flex items-center gap-1.5"
                      >
                        <span>›</span>
                        <span>Protocol Rules & Terms</span>
                      </button>
                    </li>
                    <li>
                      <Link
                        href="/terms"
                        className="text-slate-300 hover:text-[#00f0ff] transition-colors flex items-center gap-1.5"
                      >
                        <span>›</span>
                        <span>Terms of Service</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/privacy"
                        className="text-slate-300 hover:text-[#00f0ff] transition-colors flex items-center gap-1.5"
                      >
                        <span>›</span>
                        <span>Privacy Policy</span>
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setVerifyTargetGameId(game?.gameId || null);
                          setShowVerifyModal(true);
                        }}
                        className="text-slate-300 hover:text-[#00f0ff] transition-colors flex items-center gap-1.5"
                      >
                        <span>›</span>
                        <span>Cryptographic Verifier</span>
                      </button>
                    </li>
                  </ul>
                </div>

                {/* Social & Explorer */}
                <div className="md:col-span-4 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-cyan-400 font-orbitron tracking-widest">
                    OFFICIAL COMMS & EXPLORER
                  </h4>
                  <div className="space-y-2">
                    <a
                      href="https://x.com/play_ponspot"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#081226] border border-cyan-500/30 hover:border-cyan-400 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded bg-black/60 border border-white/10 flex items-center justify-center text-xs font-black text-white font-mono">
                          𝕏
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                            Official X / Twitter
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">@play_ponspot</span>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    </a>

                    <a
                      href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/address/${GAME_CONTRACT_ADDRESS}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#081226] border border-cyan-500/30 hover:border-cyan-400 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-xs text-[#00ff88]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors font-cyber">
                            Blockscout Explorer
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">Robinhood Mainnet Vault</span>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#00ff88] transition-colors" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Middle Row: Contract Addresses with 1-Click Copy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Token Contract Card */}
                <div className="p-3.5 rounded-xl bg-[#060c1c] border border-cyan-500/25 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-[9px] font-mono font-bold text-[#00f0ff]">
                        $PONS TOKEN
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">ERC-20 Betting Asset</span>
                    </div>
                    <p className="text-xs font-mono text-white truncate font-bold select-all">
                      {PONS_TOKEN_ADDRESS}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(PONS_TOKEN_ADDRESS);
                      setToastMsg({ ok: true, title: 'TOKEN COPIED', desc: 'Token contract copied to clipboard' });
                      setTimeout(() => setToastMsg(null), 2500);
                    }}
                    className="cyber-btn-glass px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold text-cyan-300 flex-shrink-0 hover:border-cyan-400 active:scale-95"
                    title="Copy Token CA"
                  >
                    COPY CA
                  </button>
                </div>

                {/* Vault Contract Card */}
                <div className="p-3.5 rounded-xl bg-[#060c1c] border border-cyan-500/25 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-[9px] font-mono font-bold text-[#00ff88]">
                        ESCROW VAULT
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Robinhood Smart Contract</span>
                    </div>
                    <p className="text-xs font-mono text-white truncate font-bold select-all">
                      {GAME_CONTRACT_ADDRESS}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(GAME_CONTRACT_ADDRESS);
                      setToastMsg({ ok: true, title: 'VAULT COPIED', desc: 'Game contract copied to clipboard' });
                      setTimeout(() => setToastMsg(null), 2500);
                    }}
                    className="cyber-btn-glass px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold text-emerald-300 flex-shrink-0 hover:border-emerald-400 active:scale-95"
                    title="Copy Vault Address"
                  >
                    COPY VAULT
                  </button>
                </div>
              </div>

              {/* Protocol Economics Badge */}
              <div className="p-3 rounded-xl bg-[#050914] border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[10px] font-mono">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00ff88] flex-shrink-0" />
                  <span className="text-slate-300">
                    <strong className="text-white">Economics:</strong> 95% Claimed by Winner • 5% Permanently Burned to <code className="text-[#ff007a]">0x00...dEaD</code>
                  </span>
                </div>
                <div className="text-slate-400">
                  Dev Security Verified // Non-Custodial
                </div>
              </div>

              {/* Bottom Copyright & Security Disclaimer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-cyan-500/15 text-[10px] text-slate-400 font-mono">
                <div>
                  © 2026 <strong className="text-white font-cyber">PONSPOT.FUN</strong> — ALL RIGHTS RESERVED.
                </div>
                <div className="text-slate-400 text-center sm:text-right">
                  Decentralized Web3 protocol. Always verify contract address before placing wagers.
                </div>
              </div>
            </div>
          </footer>
        </main>
        </div>


        {/* Right: Round History Sidebar */}
        <div className={`${mobileTab === 'history' ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-auto h-full`}>
          <RightWinnerSidebar pastRounds={pastGames.map((g) => ({
            roundNumber: g.nonce,
            winner: {
              playerId: g.winner?.address || '',
              playerName: g.winner?.name || '',
              playerAvatar: g.winner?.avatar,
              walletAddress: g.winner?.address,
              ticketCount: g.winner?.ticketCount || 0,
              potWon: g.winner?.prizePons || 0,
              odds: g.winner?.odds || 0,
              winningTicket: g.winner?.winningTicket || 0,
              timestamp: g.endTime,
            },
            totalPot: g.totalPool,
            totalPlayers: g.totalPlayers,
            timestamp: g.endTime,
          }))} />
        </div>
      </div>

      {/* ═══════════ MOBILE BOTTOM NAV BAR ═══════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden items-stretch h-14 bg-[#060b17]/98 backdrop-blur-2xl border-t border-cyan-500/30 shadow-2xl">
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-black tracking-widest font-orbitron transition-all active:scale-95 ${mobileTab === 'chat' ? 'text-[#00f0ff] bg-cyan-400/10' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          <span>CHAT</span>
        </button>
        <button
          onClick={() => setMobileTab('arena')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-black tracking-widest font-orbitron transition-all active:scale-95 ${mobileTab === 'arena' ? 'text-[#00f0ff] bg-cyan-400/10' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          <span>ARENA</span>
        </button>
        <button
          onClick={() => setMobileTab('history')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-black tracking-widest font-orbitron transition-all active:scale-95 ${mobileTab === 'history' ? 'text-[#00f0ff] bg-cyan-400/10' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
          <span>HISTORY</span>
        </button>
      </nav>

      {/* ── 6. FLOATING TRANSACTION NOTIFICATION POPUP ── */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.92 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-2xl shadow-2xl border select-none ${
              toastMsg.ok
                ? 'bg-[#060b17]/95 border-[#00ff88]/50 shadow-[0_0_20px_rgba(0,255,136,0.3)] text-white'
                : 'bg-[#060b17]/95 border-[#ff007a]/50 shadow-[0_0_20px_rgba(255,0,122,0.3)] text-white'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                toastMsg.ok
                  ? 'bg-emerald-950/80 text-[#00ff88] border border-[#00ff88]/40'
                  : 'bg-rose-950/80 text-[#ff007a] border border-[#ff007a]/40'
              }`}
            >
              {toastMsg.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <div>
              <p className={`text-xs font-black tracking-wide font-cyber ${toastMsg.ok ? 'text-[#00ff88]' : 'text-[#ff007a]'}`}>
                {toastMsg.title}
              </p>
              <p className="text-[11px] text-slate-300 font-mono mt-0.5">{toastMsg.desc}</p>
              {lastTxHash && (
                <a
                  href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/tx/${lastTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#00f0ff] hover:underline font-mono mt-1"
                >
                  <span>View on Robinhood Explorer</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── 7. GAME RESULT POPUP (WINNER CLAIM & NON-WINNER STATE) ── */}
      <GameResultModal
        isOpen={showResultModal}
        game={selectedResultGame || game}
        onClose={() => {
          setShowResultModal(false);
          setSelectedResultGame(null);
        }}
        onOpenVerify={(id) => {
          setVerifyTargetGameId(id);
          setShowVerifyModal(true);
        }}
        onClaimSuccess={handleClaimSuccess}
      />

      {/* ── 8. PROVABLY FAIR VERIFIER MODAL ── */}
      <VerifyModal
        isOpen={showVerifyModal}
        gameId={verifyTargetGameId}
        onClose={() => setShowVerifyModal(false)}
      />

      {/* ── 10. EDIT USER PROFILE MODAL ── */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        account={account}
        currentName={userProfile.name}
        currentAvatar={userProfile.avatar}
        onSaveProfile={handleSaveProfile}
      />

      {/* ── 12. TERMS OF USE & AGE VERIFICATION MODAL ── */}
      <TermsModal
        isOpen={showTermsModal}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
      />

      {/* ── 14. MULTI-WALLET SELECTION MODAL ── */}
      <WalletSelectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelect={(type) => connectWallet(type)}
      />

    </div>
  );
}
