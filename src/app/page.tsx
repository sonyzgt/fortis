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
  const [mobileTab, setMobileTab] = useState<'game' | 'chat' | 'history'>('game');
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
        const apiBase = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000';
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
        title: 'Airdrop Telah Di-Reset!',
        desc: 'Riwayat klaim telah di-reset oleh admin. Semua wallet kini dapat mencoba klaim ulang.',
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

  // Terms of Service & Age Verification Modal State
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [pendingWalletType, setPendingWalletType] = useState<string | null>(null);

  const handleInitiateConnectWallet = (targetType: 'okx' | 'metamask' | 'rabby' | 'bitget' = 'okx') => {
    const accepted = localStorage.getItem('ponspot_terms_accepted');
    if (accepted === 'true') {
      connectWallet(targetType);
    } else {
      setPendingWalletType(targetType);
      setShowTermsModal(true);
    }
  };

  const handleAcceptTerms = () => {
    localStorage.setItem('ponspot_terms_accepted', 'true');
    setShowTermsModal(false);
    const target = pendingWalletType || 'okx';
    connectWallet(target as any);
    setPendingWalletType(null);
  };

  const handleDeclineTerms = () => {
    setShowTermsModal(false);
    setPendingWalletType(null);
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

  // Automatically prompt player to enter Name & Avatar when wallet is connected
  useEffect(() => {
    if (isConnected && account) {
      const configured = localStorage.getItem('ponspot_profile_configured');
      if (!configured) {
        setShowProfileModal(true);
      }
    }
  }, [isConnected, account]);

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

  // Auto-sync active game contract address from server
  useEffect(() => {
    const syncContract = async () => {
      try {
        const apiBase = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000';
        const res = await fetch(`${apiBase}/api/contract-address`);
        const data = await res.json();
        if (data.contractAddress && data.contractAddress.startsWith('0x')) {
          localStorage.setItem('ponscore_deployed_game_contract', data.contractAddress);
        }
      } catch (e) {
        console.warn('Could not sync contract address from server', e);
      }
    };
    syncContract();
  }, []);

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
      connectWallet();
      return;
    }
    try {
      const tx = await approveTokens(betAmount);
      if (tx) {
        setToastMsg({
          ok: true,
          title: 'PONSPOT Token Approved!',
          desc: `Approved ${betAmount.toLocaleString()} PONSPOT for the game contract.`,
          txHash: tx,
        });
        setTimeout(() => setToastMsg(null), 5000);
      }
    } catch (e: any) {
      setToastMsg({ ok: false, title: 'Approval Cancelled', desc: e?.message || 'Failed to approve token' });
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  // Handle Place Bet
  const handleBet = async () => {
    if (!account) {
      connectWallet();
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
    <div className="h-screen flex flex-col overflow-hidden cyber-grid-bg font-sans text-[#F5F8F3] dark">      {/* ═══════════ TOP NAVBAR ═══════════ */}
      <header className="flex-shrink-0 h-[60px] sm:h-[96px] lg:h-[104px] flex items-center border-b border-white/60 dark:border-[#718D76]/30 bg-[#A4BAA2]/80 dark:bg-[#0c1611]/90 backdrop-blur-2xl z-40 shadow-sm transition-colors">
        {/* Left: Logo (mobile) / Video Banner (desktop) */}
        <div className="hidden lg:flex w-[275px] h-full flex-shrink-0 border-r border-white/50 dark:border-[#718D76]/30 overflow-hidden items-center justify-center p-0 m-0">
          <video
            src="/image/banner.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover select-none pointer-events-none block"
          />
        </div>
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 pl-3 flex-shrink-0">
          <img src="/image/logo.png" alt="Ponspot" className="w-8 h-8 rounded-xl object-contain" />
          <span className="text-sm font-black text-white tracking-wide">PONSPOT</span>
        </div>

        {/* Center: Token Badge (desktop only) */}
        <div className="hidden sm:flex flex-1 items-center gap-3 px-4">
          <a
            href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/token/${getPonspotTokenAddress() || PONSPOT_TOKEN_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3.5 py-1.5 bg-white/50 hover:bg-white/70 dark:bg-white/10 dark:hover:bg-white/15 border border-white/80 dark:border-[#718D76]/35 rounded-xl text-[11px] font-mono transition-colors shadow-sm"
            title="Inspect PONSPOT token contract on Robinhood Blockscout"
          >
            <span className="w-2 h-2 rounded-full bg-[#718D76] animate-pulse shadow-[0_0_6px_#718D76]" />
            <span className="text-[#526256] dark:text-slate-400">Token:</span>
            <span className="text-[#243329] dark:text-emerald-300 font-bold">
              {getPonspotTokenAddress() ? `${getPonspotTokenAddress().slice(0, 6)}...${getPonspotTokenAddress().slice(-4)}` : 'Robinhood ERC-20'}
            </span>
            <ExternalLink className="w-2.5 h-2.5 text-[#718D76] dark:text-emerald-400" />
          </a>
        </div>
        {/* Spacer on mobile */}
        <div className="flex-1 sm:hidden" />

        {/* Right: Wallet & Sound Controls */}
        <div className="flex items-center gap-2 justify-end pr-3 sm:pr-4">
          {/* Connected Wallet Pill / Connect Button */}
          {isConnected && account ? (
            <div className="relative">
              <button
                onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                className="tactile-btn flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-white/65 hover:bg-white/85 dark:bg-[#14241d]/75 dark:hover:bg-[#1b3127] backdrop-blur-xl border border-white/80 dark:border-[#718D76]/35 rounded-xl transition-all shadow-sm text-[#243329] dark:text-white"
              >
                <div className="w-7 h-7 rounded-xl bg-white/80 dark:bg-black/50 p-0.5 border border-white/90 dark:border-white/20 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img src={displayAvatar} alt="" className="w-full h-full rounded-lg object-cover" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-black text-[#243329] dark:text-white truncate max-w-[110px] leading-tight">
                    {displayName}
                  </p>
                  <p className="text-[10px] font-mono text-[#526256] dark:text-[#8fa596] leading-none mt-0.5">
                    {ponsBalance.toLocaleString()} <span className="text-[#718D76] dark:text-emerald-400 font-bold">PONSPOT</span>
                  </p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[#526256] dark:text-[#8fa596] transition-transform ${showWalletDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showWalletDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-full mt-2 w-72 bg-[#F5F8F3]/95 dark:bg-[#0c1611]/95 backdrop-blur-2xl border border-white/90 dark:border-[#718D76]/35 rounded-2xl shadow-2xl p-3.5 z-50 space-y-2.5 text-xs font-mono text-[#243329] dark:text-[#F5F8F3]"
                  >
                    {/* User Profile Pod */}
                    <div className="p-3 bg-white/70 dark:bg-[#14241d]/80 rounded-xl border border-white/80 dark:border-[#718D76]/30 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/90 dark:bg-black/50 p-0.5 border border-[#718D76] dark:border-emerald-400 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img src={displayAvatar} alt="" className="w-full h-full rounded-lg object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-[#243329] dark:text-white truncate">{displayName}</p>
                        <p className="text-[10px] text-[#526256] dark:text-slate-400 truncate">{account}</p>
                      </div>
                    </div>

                    {/* Edit Profile Action Button */}
                    <button
                      onClick={() => {
                        setShowWalletDropdown(false);
                        setShowProfileModal(true);
                      }}
                      className="w-full btn-primary-sage py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>EDIT PROFILE &amp; AVATAR</span>
                    </button>

                    <div className="p-2.5 bg-white/60 dark:bg-[#14241d]/70 rounded-xl border border-white/80 dark:border-[#718D76]/30 flex justify-between items-center text-[11px]">
                      <span className="text-[#526256] dark:text-[#8fa596]">Approved Allowance:</span>
                      <span className="text-[#243329] dark:text-emerald-300 font-bold">{ponsAllowance.toLocaleString()} PONSPOT</span>
                    </div>

                    <button
                      onClick={() => {
                        disconnectWallet();
                        setShowWalletDropdown(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-rose-100 dark:bg-rose-950/50 hover:bg-rose-200 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors border border-rose-200 dark:border-rose-800"
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
              onClick={() => handleInitiateConnectWallet('okx')}
              className="btn-primary-sage px-3 sm:px-4 py-2 font-black rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CONNECT WALLET</span>
              <span className="sm:hidden">Connect</span>
            </button>
          )}
        </div>
      </header>

      {/* ═══════════ MAIN LAYOUT (3 cols desktop, 1 col mobile with tabs) ═══════════ */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Chat Sidebar — desktop always visible, mobile only on chat tab */}
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
          className={mobileTab === 'chat' ? 'flex w-full lg:w-[275px]' : 'hidden lg:flex'}
        />

        {/* Center: Main Ponscore Game Arena — visible when mobileTab is 'game' or on desktop */}
        <main className={`flex-1 overflow-y-auto min-w-0 bg-transparent p-0 flex flex-col justify-between pb-16 lg:pb-0 ${mobileTab === 'game' ? 'flex' : 'hidden lg:flex'}`}>
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
                  className="p-4 rounded-3xl bg-white/75 dark:bg-[#122019]/90 backdrop-blur-xl border-2 border-[#718D76]/50 dark:border-emerald-500/50 shadow-lg flex items-center justify-between flex-wrap gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#718D76]/15 dark:bg-emerald-500/20 border border-[#718D76]/30 flex items-center justify-center text-[#718D76] dark:text-emerald-400 shadow-sm flex-shrink-0">
                      <Trophy className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#243329] dark:text-white tracking-wide uppercase flex items-center gap-1.5">
                          <span>🎉 YOU HAVE UNCLAIMED JACKPOT PRIZES!</span>
                        </span>
                        <span className="px-2 py-0.5 bg-[#718D76]/15 dark:bg-emerald-500/20 text-[#243329] dark:text-emerald-300 text-[10px] font-mono font-black rounded-full border border-[#718D76]/30">
                          {unclaimedGames.length} Rounds Awaiting Claim
                        </span>
                      </div>
                      <p className="text-[11px] text-[#526256] dark:text-slate-300 font-mono mt-0.5">
                        You won <span className="text-[#243329] dark:text-emerald-300 font-bold">{unclaimedGames[0]?.winner?.prizePons?.toLocaleString()} PONSPOT</span> in Round <span className="text-[#718D76] dark:text-emerald-400 font-bold">#{unclaimedGames[0]?.gameId}</span>. Withdraw now directly to your wallet!
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedResultGame(unclaimedGames[0]);
                      setShowResultModal(true);
                    }}
                    className="btn-primary-sage px-5 py-2.5 font-black rounded-xl text-xs flex items-center gap-2 shadow-md tracking-wider"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    <span>CLAIM WINNINGS ({unclaimedGames[0]?.winner?.prizePons?.toLocaleString()} PONSPOT)</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── 1. CORE GAME HEADER & STATS ── */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {/* Prize Pool */}
              <div className="p-3.5 rounded-2xl glass-panel text-center relative overflow-hidden">
                <p className="text-[10px] font-mono text-[#526256] dark:text-[#8fa596] uppercase tracking-wider mb-0.5 font-bold">PRIZE POOL</p>
                <div className="text-xl font-black font-mono text-[#243329] dark:text-[#F5F8F3] flex items-center justify-center gap-1">
                  <span>{(game?.totalPool || 0).toLocaleString()}</span>
                  <span className="text-sm font-bold text-[#718D76] dark:text-emerald-400">PONSPOT</span>
                </div>
                <span className="text-[9px] font-mono text-[#526256]/80 dark:text-[#8fa596]/80 font-bold">
                  ~95% to Winner • <span className="text-amber-600 dark:text-amber-400">🔥 5% Burned</span>
                </span>
              </div>

              {/* Total Players */}
              <div className="p-3.5 rounded-2xl glass-panel text-center relative overflow-hidden">
                <p className="text-[10px] font-mono text-[#526256] dark:text-[#8fa596] uppercase tracking-wider mb-0.5 font-bold">PLAYERS</p>
                <div className="text-xl font-black font-mono text-[#243329] dark:text-[#F5F8F3] flex items-center justify-center gap-1.5">
                  <Users className="w-4 h-4 text-[#718D76] dark:text-emerald-400" />
                  <span>{game?.totalPlayers || 0}</span>
                </div>
                <span className="text-[9px] font-mono text-[#526256]/80 dark:text-[#8fa596]/80">
                  {game?.status === 'waiting' ? 'Waiting for 2 players' : 'Countdown Active'}
                </span>
              </div>

              {/* Time Remaining */}
              <div className="p-3.5 rounded-2xl glass-panel text-center relative overflow-hidden">
                <p className="text-[10px] font-mono text-[#526256] dark:text-[#8fa596] uppercase tracking-wider mb-0.5 font-bold">TIME REMAINING</p>
                <div
                  className={`text-xl font-black font-mono tracking-tight ${
                    game?.status === 'waiting'
                      ? 'text-[#526256]/60 dark:text-[#8fa596]/60'
                      : timeRemaining <= 5
                      ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                      : 'text-[#243329] dark:text-[#F5F8F3]'
                  }`}
                >
                  {game?.status === 'waiting' ? '-- : --' : `${mm} : ${ss}`}
                </div>
                <span className="text-[9px] font-mono text-[#526256]/80 dark:text-[#8fa596]/80">15s Fast Round</span>
              </div>
            </div>

            {/* ── 2. 3D ARENA CAROUSEL REEL ── */}
            <PlayerCarousel
              participants={participants}
              isSpinning={game?.status === 'spinning'}
              winner={carouselWinner}
            />

            {/* ── 3. YOUR BET SECTION (PONSPOT BETTING & APPROVAL) ── */}
            <div className="p-4 rounded-3xl glass-panel space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#718D76] dark:text-emerald-400" />
                  <span className="text-xs font-black tracking-wide text-[#243329] dark:text-[#F5F8F3]">YOUR PONSPOT BET</span>
                </div>
                <span className="text-[10px] font-mono text-[#526256] dark:text-[#8fa596]">
                  Balance:{' '}
                  <span className="text-[#243329] dark:text-emerald-300 font-bold">{ponsBalance.toLocaleString()} PONSPOT</span>
                </span>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-2">
                {BET_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setBetAmount(preset)}
                    className={`tactile-btn py-2.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                      betAmount === preset
                        ? 'bg-[#718D76] border-[#5E7A63] text-[#F5F8F3] shadow-sm'
                        : 'bg-white/45 hover:bg-white/70 dark:bg-white/10 dark:hover:bg-white/20 border-white/70 dark:border-[#718D76]/30 text-[#243329] dark:text-[#F5F8F3]'
                    }`}
                  >
                    {preset.toLocaleString()} PONSPOT
                  </button>
                ))}
              </div>

              {/* Custom Input & Action Button */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 bg-white/70 dark:bg-[#0c1611]/80 border border-white/90 dark:border-[#718D76]/40 rounded-xl px-3 py-2.5 focus-within:border-[#718D76] dark:focus-within:border-emerald-400 transition-colors">
                  <span className="text-xs font-mono font-bold text-[#718D76] dark:text-emerald-400">PONSPOT:</span>
                  <input
                    type="number"
                    min={100000}
                    step={10000}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(100000, Number(e.target.value)))}
                    className="w-full bg-transparent text-sm font-mono font-bold text-[#243329] dark:text-[#F5F8F3] focus:outline-none placeholder-[#526256]/50 dark:placeholder-[#8fa596]/50"
                  />
                  <span className="text-[10px] font-mono text-[#526256] dark:text-[#8fa596]">{betAmount} tix</span>
                </div>

                {/* Dynamic Button: Approve vs Bet */}
                {!isConnected ? (
                  <button
                    onClick={() => connectWallet('okx')}
                    className="btn-primary-sage px-6 py-2.5 font-black rounded-xl text-xs transition-all flex-shrink-0"
                  >
                    CONNECT WALLET
                  </button>
                ) : !hasApproved ? (
                  <button
                    onClick={handleApprove}
                    disabled={txState === 'approving'}
                    className="btn-primary-sage px-6 py-2.5 font-black rounded-xl text-xs transition-all flex items-center gap-1.5 flex-shrink-0"
                  >
                    {txState === 'approving' ? (
                      <span className="animate-pulse">APPROVING...</span>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>APPROVE PONSPOT</span>
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
                    className={`tactile-btn px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 flex-shrink-0 ${
                      (game?.status === 'waiting' || game?.status === 'open') && ponsBalance >= betAmount
                        ? 'btn-primary-sage'
                        : 'bg-white/40 dark:bg-white/10 text-[#526256]/60 dark:text-slate-500 border border-white/60 dark:border-white/10 cursor-not-allowed'
                    }`}
                  >
                    {txState === 'betting' ? (
                      <span className="animate-pulse">SIGNING TX...</span>
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
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#526256] dark:text-[#8fa596] bg-white/50 dark:bg-[#0c1611]/60 border border-white/70 dark:border-[#718D76]/30 px-3 py-1.5 rounded-xl">
                  <Info className="w-3 h-3 flex-shrink-0 text-[#718D76] dark:text-emerald-400" />
                  <span>
                    ERC-20 standard requires token approval before the smart contract can accept PONSPOT bets.
                  </span>
                </div>
              )}
            </div>

            {/* ── 4. CURRENT PLAYERS LIST (AESTHETIC CASINO CARDS) ── */}
            <div className="space-y-3">
              {/* Header Bar */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-[#121f19]/80 border border-white/80 dark:border-[#718D76]/30 shadow-sm text-xs font-black text-[#243329] dark:text-white">
                    <Users className="w-3.5 h-3.5 text-[#718D76] dark:text-emerald-400" />
                    <span>{game?.players?.length || 0} Players</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#718D76]/15 dark:bg-[#1a3828]/80 border border-[#718D76]/30 dark:border-emerald-500/30 text-[11px] font-bold text-[#243329] dark:text-emerald-300 shadow-sm">
                    <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-[#8ba790] to-[#516d56] dark:from-emerald-400 dark:to-emerald-600 flex items-center justify-center text-[7px] font-black text-white dark:text-black shadow-sm">P</span>
                    <span>Payouts are settled in PONSPOT</span>
                  </div>

                  {/* Provably Fair Button */}
                  <button
                    onClick={() => {
                      setVerifyTargetGameId(game?.gameId || null);
                      setShowVerifyModal(true);
                    }}
                    className="tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white dark:bg-[#14261e]/90 dark:hover:bg-[#1a3828] border border-white/80 dark:border-[#718D76]/35 text-[11px] font-bold text-[#718D76] dark:text-emerald-400 shadow-sm transition-all group"
                    title="Verify smart contract cryptographic provable fairness"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#718D76] dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>Provably Fair</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </button>
                </div>

                <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#526256] dark:text-slate-400">
                  <span className="text-[#718D76] dark:text-emerald-400 font-black">#</span>
                  <span>Round:</span>
                  <span className="text-[#243329] dark:text-white font-black">{game?.gameId?.replace('PONSPOT-', '') || '371667'}</span>
                </div>
              </div>

              {/* Player Card Stack */}
              <div className="space-y-2.5">
                {(!game?.players || game.players.length === 0) ? (
                  <div className="text-center py-10 rounded-2xl bg-white/40 dark:bg-[#101c16]/50 border border-white/70 dark:border-[#718D76]/20 text-xs text-[#526256] dark:text-[#8fa596] font-mono italic">
                    No players in this pot yet. Be the first to place a PONSPOT bet!
                  </div>
                ) : (
                  game.players.map((p: any) => {
                    const isMe = account && p.address.toLowerCase() === account.toLowerCase();
                    const playerLevel = isMe ? levelInfo.level : Math.max(1, (Math.abs(parseInt(p.address.slice(-2), 16) % 4) + 1));
                    return (
                      <div
                        key={p.address}
                        className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all overflow-hidden ${
                          isMe
                            ? 'bg-white/85 dark:bg-[#14261e]/95 border-[#718D76] dark:border-emerald-500/60 shadow-[0_4px_16px_rgba(0,0,0,0.15)]'
                            : 'bg-white/60 dark:bg-[#0f1c16]/90 border-white/80 dark:border-[#718D76]/25 hover:bg-white/75 dark:hover:bg-[#15271f] shadow-sm'
                        }`}
                      >
                        {/* Right vertical glowing accent indicator bar */}
                        <div className="absolute right-0 top-3 bottom-3 w-1.5 rounded-l-full bg-gradient-to-b from-[#718D76] to-emerald-400 shadow-[0_0_10px_#718D76] dark:shadow-[0_0_12px_#34d399]" />

                        {/* Left: Avatar, Name, Level Badge */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-12 h-12 rounded-2xl bg-white/80 dark:bg-black/50 p-0.5 border border-white/90 dark:border-white/20 shadow-inner flex-shrink-0 overflow-hidden flex items-center justify-center">
                            <img
                              src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.address}`}
                              alt=""
                              className="w-full h-full rounded-xl object-cover"
                            />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-black text-[#243329] dark:text-white truncate tracking-tight">
                              {p.name || `${p.address.slice(0, 6)}...${p.address.slice(-4)}`}
                              {isMe && <span className="text-[#718D76] dark:text-emerald-400 text-xs ml-1.5 font-bold">(You)</span>}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-[#718D76]/20 dark:bg-[#1a3828] border border-[#718D76]/30 dark:border-emerald-500/30 text-[10px] font-mono font-black text-[#718D76] dark:text-emerald-400">
                                Lv. {playerLevel}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Middle: Token Coin Badge & Bet Amount */}
                        <div className="flex items-center gap-3 px-4">
                          <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[#718D76]/25 to-emerald-500/10 border border-[#718D76]/40 dark:border-emerald-500/40 flex items-center justify-center shadow-inner flex-shrink-0 p-1">
                            <img
                              src="/image/logo.png"
                              alt="PONSPOT"
                              className="w-full h-full rounded-full object-cover"
                            />
                          </div>
                          <div className="text-left font-mono">
                            <p className="text-base sm:text-lg font-black text-[#243329] dark:text-white tracking-tight leading-tight">
                              {p.totalBetPons.toLocaleString()}
                            </p>
                            <p className="text-[11px] text-[#718D76] dark:text-emerald-400 font-bold">
                              PONSPOT
                            </p>
                          </div>
                        </div>

                        {/* Right: Chance Label & Percentage */}
                        <div className="text-right pr-3 sm:pr-4">
                          <span className="text-[11px] font-bold text-[#526256] dark:text-slate-400 block tracking-wider">
                            Chance
                          </span>
                          <span className="text-base sm:text-lg font-black font-mono text-[#243329] dark:text-white tracking-tight">
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

          {/* ═══════════ MAIN SITE FOOTER (100% EDGE-TO-EDGE FULL BLACK) ═══════════ */}
          <footer
            style={{ marginTop: '450px' }}
            className="w-full bg-black dark:bg-[#050a07] border-t border-black/80 dark:border-[#718D76]/20 pt-10 pb-4 px-4 lg:px-6 select-none font-sans text-xs"
          >
            <div className="max-w-4xl xl:max-w-5xl mx-auto space-y-4">
              {/* Top Card: About Ponspot & Terms */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white/75 dark:bg-[#0e1b15]/90 backdrop-blur-2xl border border-white/80 dark:border-[#718D76]/30 shadow-md flex flex-col md:flex-row items-center gap-6">
                  {/* Left Logo / Mascot Pod */}
                  <div className="flex flex-col items-center justify-center flex-shrink-0">
                    <div className="relative w-20 h-20 rounded-2xl bg-white/85 dark:bg-[#14241d] border border-white/90 dark:border-[#718D76]/40 p-2 shadow-inner flex items-center justify-center overflow-hidden">
                      <img
                        src="/image/logo.png"
                        alt="Ponspot Logo"
                        className="w-full h-full object-contain rounded-xl select-none pointer-events-none drop-shadow-sm"
                      />
                    </div>
                    <span className="text-sm font-black tracking-widest text-[#243329] dark:text-white mt-2 font-mono">
                      PONSPOT
                    </span>
                  </div>

                  {/* Right Terms & Description */}
                  <div className="space-y-3 text-[#3a4d3f] dark:text-slate-300 text-[11px] leading-relaxed text-center md:text-left">
                    <p>
                      Welcome to <strong className="text-[#243329] dark:text-white font-black">Ponspot</strong>. Play 100% fair on-chain Jackpot games powered by Robinhood Chain and PONSPOT token. Ponspot provides instant decentralized deposits and transparent smart contract prize distribution for bets of any size. Dedicated to decentralized gaming exclusively for the Robinhood ecosystem.
                    </p>
                    <p className="text-[10px] text-[#526256] dark:text-slate-400">
                      In order to participate on this website, the user is required to accept the <strong className="text-[#243329] dark:text-white font-bold">General Terms and Conditions</strong>. In the event the <strong className="text-[#243329] dark:text-white font-bold">General Terms and Conditions</strong> are updated, existing users may choose to discontinue using the platform before the said update becomes effective.
                    </p>
                  </div>
                </div>

                {/* Middle Card: Smart Contract Verification / Regulatory Badge */}
                <div className="p-4 sm:p-4.5 rounded-2xl bg-white/60 dark:bg-[#0c1712]/85 backdrop-blur-xl border border-white/70 dark:border-[#718D76]/25 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0 shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] text-[#526256] dark:text-slate-400 leading-normal">
                      <strong className="text-[#243329] dark:text-emerald-300 font-bold">Ponspot.fun</strong> operates via decentralized smart contracts on Robinhood Chain (Vault: <code className="text-[#718D76] dark:text-emerald-400 font-mono font-bold">{GAME_CONTRACT_ADDRESS ? `${GAME_CONTRACT_ADDRESS.slice(0, 6)}...${GAME_CONTRACT_ADDRESS.slice(-4)}` : 'Decentralized'}</code>, Token: <code className="text-[#718D76] dark:text-emerald-400 font-mono font-bold">{PONS_TOKEN_ADDRESS ? `${PONS_TOKEN_ADDRESS.slice(0, 6)}...${PONS_TOKEN_ADDRESS.slice(-4)}` : 'ERC-20'}</code>). All rounds use SHA-256 pre-commit hash verification and public block seeds for 100% cryptographic provable fairness.
                    </p>
                  </div>
                  <a
                    href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/address/${GAME_CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                    className="tactile-btn px-3.5 py-2 rounded-xl bg-white/80 hover:bg-white dark:bg-[#14241d] dark:hover:bg-[#1c3328] border border-emerald-500/30 text-[10px] font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 flex-shrink-0 shadow-sm"
                    title="View verified smart contract on Robinhood Blockscout"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                    <span>View on Blockscout</span>
                  </a>
                </div>

                {/* Unified Bottom Row: Copyright & Legal on Left, X / Twitter on Right */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 pb-2 text-[11px] text-[#526256] dark:text-slate-400 font-mono border-t border-white/40 dark:border-white/10 flex-wrap">
                  {/* Left: Copyright & Legal Links */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span>© 2026 Ponspot.fun All Rights Reserved</span>
                    <span>•</span>
                    <Link
                      href="/terms"
                      className="text-[#718D76] dark:text-emerald-400 hover:underline font-bold"
                    >
                      Terms of Use
                    </Link>
                    <span>•</span>
                    <Link
                      href="/privacy"
                      className="text-[#718D76] dark:text-emerald-400 hover:underline font-bold"
                    >
                      Privacy Policy
                    </Link>
                  </div>

                  {/* Right: X / Twitter */}
                  <a
                    href="https://x.com/play_ponspot"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white/70 dark:bg-[#122019] border border-white/80 dark:border-[#718D76]/35 hover:bg-white dark:hover:bg-[#182b22] transition-all shadow-sm group flex-shrink-0"
                  >
                    <div className="w-4 h-4 rounded-md bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-black text-[#243329] dark:text-white font-mono">
                      𝕏
                    </div>
                    <div className="text-left leading-none">
                      <span className="text-[8px] text-[#526256] dark:text-slate-400 block">Follow our</span>
                      <span className="text-[11px] font-black text-[#243329] dark:text-white">@play_ponspot</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[8px] font-black border border-emerald-500/30 ml-1">
                      Follow now
                    </span>
                  </a>
                </div>
              </div>
            </footer>
        </main>

        {/* Right: Round History Sidebar — desktop always visible, mobile only on history tab */}
        <RightWinnerSidebar
          pastRounds={pastGames.map((g) => ({
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
          }))}
          className={mobileTab === 'history' ? 'flex w-full lg:w-[275px]' : 'hidden lg:flex'}
        />
      </div>

      {/* ═══════════ MOBILE BOTTOM NAVIGATION BAR ═══════════ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex items-stretch bg-[#0c1611]/95 backdrop-blur-2xl border-t border-[#718D76]/30 shadow-2xl">
        <button
          onClick={() => setMobileTab('game')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-black transition-all ${
            mobileTab === 'game'
              ? 'text-emerald-400 border-t-2 border-emerald-400'
              : 'text-slate-500 border-t-2 border-transparent'
          }`}
        >
          <span className="text-lg leading-none">🎮</span>
          <span>GAME</span>
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-black transition-all ${
            mobileTab === 'chat'
              ? 'text-emerald-400 border-t-2 border-emerald-400'
              : 'text-slate-500 border-t-2 border-transparent'
          }`}
        >
          <span className="text-lg leading-none">💬</span>
          <span>CHAT</span>
        </button>
        <button
          onClick={() => setMobileTab('history')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-black transition-all ${
            mobileTab === 'history'
              ? 'text-emerald-400 border-t-2 border-emerald-400'
              : 'text-slate-500 border-t-2 border-transparent'
          }`}
        >
          <span className="text-lg leading-none">🏆</span>
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
            className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-2xl shadow-2xl border select-none ${
              toastMsg.ok
                ? 'bg-white/95 dark:bg-[#0c1611]/95 border-emerald-500/40 shadow-lg text-[#243329] dark:text-[#F5F8F3]'
                : 'bg-white/95 dark:bg-[#0c1611]/95 border-rose-500/40 shadow-lg text-[#243329] dark:text-[#F5F8F3]'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                toastMsg.ok
                  ? 'bg-[#718D76]/15 dark:bg-[#718D76]/30 text-[#718D76] dark:text-emerald-400 border border-[#718D76]/30'
                  : 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
              }`}
            >
              {toastMsg.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <div>
              <p className={`text-xs font-black tracking-wide ${toastMsg.ok ? 'text-[#718D76] dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                {toastMsg.title}
              </p>
              <p className="text-[11px] text-[#526256] dark:text-slate-300 font-mono mt-0.5">{toastMsg.desc}</p>
              {toastMsg.txHash && (
                <a
                  href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/tx/${toastMsg.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#718D76] dark:text-emerald-400 hover:underline font-mono mt-1"
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
    </div>
  );
}
