'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { Compass, Check, X, RefreshCw, ExternalLink, ShieldCheck, AlertTriangle, Scroll } from 'lucide-react';
import { deployCashFlipJackpotContract, GAME_SERVER_SIGNER_ADDRESS } from '@/lib/web3/deployer';
import { CASHFLIP_TOKEN_ADDRESS, ROBINHOOD_CHAIN_CONFIG, getCashFlipTokenAddress } from '@/lib/web3/contracts';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { BookplateCorner, CelestialFlourish } from '@/components/ui/CelestialFlourish';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (contractAddress: string) => void;
}

export const DeployModal: React.FC<DeployModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [deploying, setDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveContract = async (addrToSave: string) => {
    const trimmed = addrToSave.trim();
    if (!trimmed.startsWith('0x') || trimmed.length !== 42) {
      setError('Invalid contract address format (must be 42 characters starting with 0x)');
      return;
    }

    try {
      localStorage.setItem('cashflip_deployed_game_contract', trimmed);
      localStorage.setItem('cashflip_deployed_game_contract', trimmed);
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/api/admin/set-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress: trimmed }),
      });
      onSuccess(trimmed);
    } catch (e: any) {
      console.warn('Saved locally:', e);
      onSuccess(trimmed);
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    setError(null);

    try {
      const win = typeof window !== 'undefined' ? (window as any) : {};
      const providerObj = win.okxwallet || win.ethereum;
      if (!providerObj) {
        throw new Error('OKX Wallet or MetaMask not detected in browser.');
      }

      const browserProvider = new ethers.BrowserProvider(providerObj);
      const signer = await browserProvider.getSigner();

      const tokenToUse = getCashFlipTokenAddress();
      if (!tokenToUse || !tokenToUse.startsWith('0x') || tokenToUse.length !== 42) {
        throw new Error('Please configure an active Betting Token contract address in the Master Codex before consecrating the Jackpot Escrow.');
      }

      // Pass the game server signer address for ECDSA anti-bot protection
      const address = await deployCashFlipJackpotContract(signer, tokenToUse, GAME_SERVER_SIGNER_ADDRESS);
      setDeployedAddress(address);
      await handleSaveContract(address);
    } catch (e: any) {
      console.error('Deployment error:', e);
      setError(e?.message || 'Failed to consecrate smart contract');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a0908]/75 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          className="editorial-frame bg-[#E8DFD1] text-[#171513] w-full max-w-lg p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.5)] space-y-4 select-none relative"
          onClick={(e) => e.stopPropagation()}
        >
          <BookplateCorner />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#171513]/15">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 border border-[#9E8055]/50 bg-[#F4EFE6] flex items-center justify-center text-[#9E8055]">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] tracking-[0.25em] font-serif uppercase text-[#9E8055] block">
                  On-Chain Sanctum
                </span>
                <h3 className="text-base font-serif tracking-[0.1em] font-semibold text-[#171513]">
                  CONSECRATE ESCROW SANCTUARY
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 border border-[#171513]/10 text-[#171513]/60 hover:text-[#171513] hover:border-[#171513]/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 pt-1">
            <div className="p-3.5 bg-[#F4EFE6] border border-[#171513]/15 space-y-1.5">
              <p className="font-serif font-semibold text-xs text-[#171513] flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#9E8055]" />
                <span className="uppercase text-[11px] tracking-wider">Sanctuary Purpose</span>
              </p>
              <p className="text-[11px] font-serif text-[#171513]/75 leading-relaxed">
                Empowers victors to receive immediate on-chain settlements autonomously through trustless contract escrow on Robinhood Chain, eliminating centralized intermediaries while strictly observing the 2% sanctuary fee.
              </p>
            </div>

            <div className="p-3.5 bg-[#F4EFE6] border border-[#171513]/15 space-y-1 text-[11px] font-serif">
              <div className="flex justify-between items-center py-0.5 border-b border-[#171513]/10">
                <span className="text-[#171513]/60">Settlement Currency:</span>
                <span className="font-mono text-xs font-semibold text-[#171513]">
                  USDG ({getCashFlipTokenAddress() ? `${getCashFlipTokenAddress().slice(0, 6)}...${getCashFlipTokenAddress().slice(-4)}` : '⚠️ Set Token Address'})
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#171513]/10">
                <span className="text-[#171513]/60">Protocol Sanctuary Tithe:</span>
                <span className="text-[#9E8055] font-semibold">2.0% (Reserved for Admin)</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-[#171513]/60">Estimated Consecration Gas:</span>
                <span className="font-mono text-[#171513]">~0.00008 ETH</span>
              </div>
            </div>

            {/* Manual contract address input */}
            <div className="p-3.5 bg-[#F4EFE6] border border-[#171513]/15 space-y-2">
              <label className="text-[10px] tracking-[0.2em] font-serif uppercase text-[#171513]/70 block font-medium">
                Already Consecrated? Bind Existing Sanctuary Address:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="0x... (Escrow Contract Address)"
                  className="flex-1 px-3 py-1.5 bg-[#E8DFD1] border border-[#171513]/25 text-xs text-[#171513] placeholder-[#171513]/40 focus:outline-none focus:border-[#9E8055] font-mono"
                />
                <button
                  onClick={() => handleSaveContract(manualAddress)}
                  className="px-4 py-1.5 bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] font-serif text-[11px] tracking-wider uppercase border border-[#9E8055]/50 transition-colors"
                >
                  Bind
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-950/10 border border-red-800/30 text-red-900 rounded text-[11px] flex items-center gap-2 font-serif">
                <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {deployedAddress && (
              <div className="p-3.5 bg-[#F4EFE6] border border-[#9E8055] space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-serif font-semibold text-[#171513]">
                  <Check className="w-3.5 h-3.5 text-[#9E8055]" />
                  <span>SANCTUARY CONTRACT CONSECRATED!</span>
                </div>
                <p className="text-[10px] break-all font-mono text-[#171513] pt-0.5">{deployedAddress}</p>
                <a
                  href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/address/${deployedAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#9E8055] underline hover:text-[#171513] pt-1 font-serif"
                >
                  <span>Inspect in Robinhood Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="w-full py-3 bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] font-serif text-xs tracking-widest uppercase border border-[#9E8055]/50 flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            {deploying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#9E8055]" />
                <span>COMMUNING WITH WALLET SIGNER...</span>
              </>
            ) : (
              <>
                <Scroll className="w-3.5 h-3.5 text-[#9E8055]" />
                <span>CONSECRATE NEW SANCTUARY ESCROW</span>
              </>
            )}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
