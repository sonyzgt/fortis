'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { Check, X, RefreshCw, ExternalLink, ShieldCheck, AlertTriangle, Terminal } from 'lucide-react';
import { deployCashFlipJackpotContract, GAME_SERVER_SIGNER_ADDRESS } from '@/lib/web3/deployer';
import { ROBINHOOD_CHAIN_CONFIG, getCashFlipTokenAddress, TOKEN_SYMBOL } from '@/lib/web3/contracts';
import { getApiBaseUrl } from '@/lib/apiConfig';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (contractAddress: string) => void;
}

export const DeployModal: React.FC<DeployModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mounted, setMounted] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const handleSaveContract = async (addrToSave: string) => {
    const trimmed = addrToSave.trim();
    if (!trimmed.startsWith('0x') || trimmed.length !== 42) {
      setError('Invalid contract address format (must be 42 characters starting with 0x)');
      return;
    }

    try {
      localStorage.setItem('kofuku_deployed_game_contract', trimmed);
      localStorage.setItem('cashflip_deployed_game_contract', trimmed);
      const apiBase = getApiBaseUrl();
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('cashflip_admin_token') || '' : '';
      await fetch(`${apiBase}/api/admin/set-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-admin-token': token } : {}),
        },
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
        throw new Error('Please configure an active Betting Token contract address before deploying the Jackpot Escrow.');
      }

      // Pass the game server signer address for ECDSA anti-bot protection
      const address = await deployCashFlipJackpotContract(signer, tokenToUse, GAME_SERVER_SIGNER_ADDRESS);
      setDeployedAddress(address);
      await handleSaveContract(address);
    } catch (e: any) {
      console.error('Deployment error:', e);
      setError(e?.message || 'Failed to deploy smart contract');
    } finally {
      setDeploying(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#030508]/85 backdrop-blur-xl select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="glass-capsule rounded-3xl text-[#F5F7FA] w-full max-w-lg p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(205, 180, 134,0.1)] space-y-4 relative font-sans border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div className="space-y-0.5">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#CDB486] block font-bold">
                INFRASTRUCTURE // ADMIN
              </span>
              <h3 className="font-heading text-lg font-bold uppercase text-[#F5F7FA] tracking-wide">
                DEPLOY ESCROW VAULT
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8993A4] hover:text-[#F5F7FA] bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3.5 pt-1 text-xs">
            <div className="p-4 glass-capsule rounded-2xl space-y-2">
              <p className="font-bold text-[#CDB486] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="uppercase text-[10px] font-mono tracking-wider">CONTRACT ROLE SPECIFICATION</span>
              </p>
              <p className="text-[11px] text-[#8993A4] leading-relaxed">
                Facilitates automated non-custodial payouts on Robinhood Chain upon round resolution. The vault executes an automatic 2.0% deflationary burn to the dead address (0x...dEaD) on every claim.
              </p>
            </div>

            <div className="p-4 glass-capsule rounded-2xl space-y-2 text-[11px] font-mono">
              <div className="flex justify-between items-center py-1 border-b border-white/[0.05]">
                <span className="text-[#8993A4]">SETTLEMENT TOKEN:</span>
                <span className="font-bold text-[#F5F7FA]">
                  {TOKEN_SYMBOL} ({getCashFlipTokenAddress() ? `${getCashFlipTokenAddress().slice(0, 6)}...${getCashFlipTokenAddress().slice(-4)}` : '⚠️ Set Token Address'})
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/[0.05]">
                <span className="text-[#8993A4]">DEFLATIONARY BURN:</span>
                <span className="text-[#CDB486] font-bold">2.0% (to 0x...dEaD)</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#8993A4]">ESTIMATED GAS:</span>
                <span className="text-[#F5F7FA]">~0.00008 ETH</span>
              </div>
            </div>

            {/* Manual contract address input */}
            <div className="p-4 glass-capsule rounded-2xl space-y-2.5">
              <label className="text-[10px] font-mono tracking-[0.15em] uppercase text-[#8993A4] block font-bold">
                BIND EXISTING CONTRACT ADDRESS:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="0x... (Escrow Contract Address)"
                  className="glass-input flex-1 px-3.5 py-2 text-xs font-mono text-[#F5F7FA] placeholder-[#8993A4]/50"
                />
                <button
                  onClick={() => handleSaveContract(manualAddress)}
                  className="glass-btn-chip px-4 py-2 text-[#CDB486] text-[10px] font-mono tracking-wider uppercase font-bold cursor-pointer"
                >
                  BIND
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-950/20 border border-rose-500/40 rounded-2xl text-rose-300 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {deployedAddress && (
              <div className="p-4 glass-capsule rounded-2xl border border-[#CDB486]/40 space-y-1.5 text-xs font-mono">
                <div className="flex items-center gap-1.5 font-bold text-[#CDB486]">
                  <Check className="w-4 h-4" />
                  <span>CONTRACT DEPLOYED SUCCESSFULLY!</span>
                </div>
                <p className="text-[11px] break-all text-[#F5F7FA] pt-0.5">{deployedAddress}</p>
                <a
                  href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/address/${deployedAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] text-[#CDB486] hover:underline pt-1"
                >
                  <span>View in Robinhood Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="w-full py-3.5 glass-btn-inflated text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            {deploying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#030508]" />
                <span>REQUESTING WALLET SIGNATURE...</span>
              </>
            ) : (
              <>
                <Terminal className="w-4 h-4 text-[#030508]" />
                <span>DEPLOY NEW CONTRACT ESCROW</span>
              </>
            )}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
