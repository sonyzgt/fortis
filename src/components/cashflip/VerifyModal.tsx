'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Search, RefreshCw, Copy, ShieldCheck } from 'lucide-react';
import { verifyGameClientSide } from '@/lib/web3/contracts';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { BookplateCorner } from '@/components/ui/CelestialFlourish';

interface VerifyModalProps {
  isOpen: boolean;
  gameId: string | null;
  onClose: () => void;
}

export const VerifyModal: React.FC<VerifyModalProps> = ({ isOpen, gameId, onClose }) => {
  const [inputGameId, setInputGameId] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState<any | null>(null);
  const [verifyReport, setVerifyReport] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (gameId) {
      setInputGameId(gameId);
      fetchGame(gameId);
    }
  }, [gameId, isOpen]);

  const fetchGame = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    setVerifyReport(null);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/game/${id.trim()}`);
      if (!res.ok) {
        throw new Error('Game not found or still in progress.');
      }
      const data = await res.json();
      setGameData(data);

      if (data.revealedServerSeed && data.winningTicket !== undefined) {
        const report = await verifyGameClientSide(
          data.revealedServerSeed,
          data.serverSeedHash,
          data.publicSeed,
          data.nonce,
          data.gameId,
          data.gameHash,
          data.winningHash,
          data.winningTicket,
          data.totalTickets
        );
        setVerifyReport(report);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load game data');
      setGameData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121110]/80 backdrop-blur-sm select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#F4EFE6] dark:bg-[#1A1816] border border-[#171513] dark:border-[#E8DFD1]/30 p-6 shadow-2xl max-w-lg w-full relative overflow-hidden text-[#171513] dark:text-[#E8DFD1] max-h-[85vh] flex flex-col font-serif"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Bookplate Corners */}
          <BookplateCorner position="tl" />
          <BookplateCorner position="tr" />
          <BookplateCorner position="bl" />
          <BookplateCorner position="br" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-brass text-lg">✦</span>
              <div>
                <h3 className="text-sm font-display font-bold tracking-[0.16em] uppercase flex items-center gap-2">
                  CRYPTOGRAPHIC AUDIT
                  <span className="px-1.5 py-0.2 border border-brass text-brass text-[9px] font-mono tracking-wider">
                    HMAC-SHA256
                  </span>
                </h3>
                <p className="text-[11px] text-[#625B51] dark:text-[#9E968B] font-serif italic">
                  Mathematical verification of astronomical seeds & tickets
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-[#625B51] hover:text-[#171513] dark:text-[#9E968B] dark:hover:text-[#E8DFD1] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="pt-3 pb-2 flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchGame(inputGameId);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1 bg-white/60 dark:bg-black/30 border border-[#171513]/25 dark:border-[#E8DFD1]/20 flex items-center px-3">
                <Search className="w-3.5 h-3.5 text-brass mr-2 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Enter Game ID (e.g. CASHFLIP-15AFD5)"
                  value={inputGameId}
                  onChange={(e) => setInputGameId(e.target.value.toUpperCase())}
                  className="w-full bg-transparent py-2 text-xs font-mono text-[#171513] dark:text-[#E8DFD1] placeholder-[#625B51]/60 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="editorial-btn-primary px-4 py-2 text-xs flex items-center gap-1.5 flex-shrink-0"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'VERIFY'}
              </button>
            </form>
          </div>

          {/* Body Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 pt-1">
            {error && (
              <div className="p-3 border border-rose-800/40 bg-rose-900/10 text-rose-800 dark:text-rose-300 text-xs font-serif italic">
                ✕ {error}
              </div>
            )}

            {gameData && (
              <>
                {/* Verification Checklist Banner */}
                {verifyReport && (
                  <div
                    className={`p-3.5 border ${
                      verifyReport.allPassed
                        ? 'border-brass bg-brass/10'
                        : 'border-rose-800 bg-rose-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-display font-bold tracking-wider uppercase text-brass">
                        MATHEMATICAL PROOF AUDIT
                      </span>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 border border-current">
                        {verifyReport.allPassed ? '100% PROVABLY FAIR' : 'AUDIT FAILED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 text-brass">
                        {verifyReport.serverSeedValid ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                        <span>SERVER SEED VERIFIED</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-brass">
                        {verifyReport.gameHashValid ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                        <span>GAME HASH VERIFIED</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-brass">
                        {verifyReport.winningHashValid ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                        <span>WINNING HASH VERIFIED</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-brass">
                        {verifyReport.winningTicketValid ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                        <span>WINNING TICKET VERIFIED</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Game Parameters Breakdown */}
                <div className="p-3.5 border border-[#171513]/15 dark:border-[#E8DFD1]/15 bg-white/50 dark:bg-black/20 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[#625B51] dark:text-[#9E968B]">Game ID:</span>
                    <span className="font-bold text-brass">{gameData.gameId}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#625B51] dark:text-[#9E968B]">Nonce:</span>
                    <span className="font-bold">{gameData.nonce}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#625B51] dark:text-[#9E968B]">Public Seed:</span>
                    <span>{gameData.publicSeed}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#625B51] dark:text-[#9E968B]">Total Pool Tickets:</span>
                    <span className="font-bold">{gameData.totalTickets.toLocaleString()} Tickets</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#625B51] dark:text-[#9E968B]">Total USDG Pool:</span>
                    <span className="font-bold text-brass">{gameData.totalPool.toLocaleString()} USDG</span>
                  </div>

                  {gameData.winner && (
                    <>
                      <div className="pt-2 border-t border-[#171513]/10 dark:border-[#E8DFD1]/10 flex items-center justify-between">
                        <span className="text-[#625B51] dark:text-[#9E968B]">Winning Ticket Drawn:</span>
                        <span className="font-bold text-brass text-sm">#{gameData.winner.winningTicket}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#625B51] dark:text-[#9E968B]">Winner Address:</span>
                        <span className="text-[11px] truncate max-w-[200px] font-bold">{gameData.winner.address}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Cryptographic Hashes */}
                <div className="space-y-2 text-[11px] font-mono">
                  {/* Game Hash */}
                  <div className="p-2.5 border border-[#171513]/15 dark:border-[#E8DFD1]/15 bg-white/40 dark:bg-black/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#625B51] dark:text-[#9E968B] uppercase font-bold text-[9px]">Game Hash</span>
                      <button
                        onClick={() => handleCopy(gameData.gameHash, 'gameHash')}
                        className="text-[#625B51] hover:text-[#171513] dark:text-[#9E968B] dark:hover:text-[#E8DFD1]"
                      >
                        {copied === 'gameHash' ? 'Copied' : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="break-all text-[10px]">{gameData.gameHash}</p>
                  </div>

                  {/* Server Seed Hash */}
                  <div className="p-2.5 border border-[#171513]/15 dark:border-[#E8DFD1]/15 bg-white/40 dark:bg-black/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#625B51] dark:text-[#9E968B] uppercase font-bold text-[9px]">Server Seed Hash (Pre-Commitment)</span>
                      <button
                        onClick={() => handleCopy(gameData.serverSeedHash, 'serverSeedHash')}
                        className="text-[#625B51] hover:text-[#171513] dark:text-[#9E968B] dark:hover:text-[#E8DFD1]"
                      >
                        {copied === 'serverSeedHash' ? 'Copied' : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="break-all text-[10px]">{gameData.serverSeedHash}</p>
                  </div>

                  {/* Revealed Server Seed */}
                  {gameData.revealedServerSeed ? (
                    <div className="p-2.5 border border-brass/50 bg-brass/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-brass uppercase font-bold text-[9px]">Revealed Server Seed (Post-Game)</span>
                        <button
                          onClick={() => handleCopy(gameData.revealedServerSeed, 'serverSeed')}
                          className="text-brass hover:text-[#171513] dark:hover:text-white"
                        >
                          {copied === 'serverSeed' ? 'Copied' : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="break-all text-[10px] font-bold text-brass">{gameData.revealedServerSeed}</p>
                    </div>
                  ) : (
                    <div className="p-2.5 border border-[#171513]/15 dark:border-[#E8DFD1]/15 bg-white/40 dark:bg-black/20 text-[#625B51] dark:text-[#9E968B] text-[10px] italic">
                      🔒 Server Seed remains sealed until the round concludes.
                    </div>
                  )}

                  {/* Winning Hash */}
                  {gameData.winningHash && (
                    <div className="p-2.5 border border-[#171513]/15 dark:border-[#E8DFD1]/15 bg-white/40 dark:bg-black/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[#625B51] dark:text-[#9E968B] uppercase font-bold text-[9px]">HMAC-SHA256 Draw Hash</span>
                        <button
                          onClick={() => handleCopy(gameData.winningHash, 'winHash')}
                          className="text-[#625B51] hover:text-[#171513] dark:text-[#9E968B] dark:hover:text-[#E8DFD1]"
                        >
                          {copied === 'winHash' ? 'Copied' : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="break-all text-[10px]">{gameData.winningHash}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
