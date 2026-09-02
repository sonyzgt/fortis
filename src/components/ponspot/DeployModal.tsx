'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { Rocket, Check, X, RefreshCw, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';
import { deployPonspotJackpotContract } from '@/lib/web3/deployer';
import { PONSPOT_TOKEN_ADDRESS, ROBINHOOD_CHAIN_CONFIG, getPonspotTokenAddress } from '@/lib/web3/contracts';
import { getApiBaseUrl } from '@/lib/apiConfig';

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
      localStorage.setItem('ponspot_deployed_game_contract', trimmed);
      localStorage.setItem('ponscore_deployed_game_contract', trimmed);
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

      const tokenToUse = getPonspotTokenAddress();
      if (!tokenToUse || !tokenToUse.startsWith('0x') || tokenToUse.length !== 42) {
        throw new Error('Please configure an active Betting Token contract address in the Admin Panel before deploying the Jackpot Escrow contract.');
      }

      const address = await deployPonspotJackpotContract(signer, tokenToUse);
      setDeployedAddress(address);
      await handleSaveContract(address);
    } catch (e: any) {
      console.error('Deployment error:', e);
      setError(e?.message || 'Failed to deploy smart contract');
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
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-[#0a1222] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl font-mono space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-white text-sm tracking-wider">DEPLOY NEW JACKPOT ESCROW</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-cyan-950/30 border border-cyan-500/25 rounded-2xl space-y-1 text-slate-300">
              <p className="font-bold text-white flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Why Deploy the Smart Contract?
              </p>
              <p className="text-[11px] text-slate-300">
                To allow winners to **receive automated on-chain payouts** when clicking <span className="text-[#00f0ff] font-bold">[ CLAIM WINNINGS ]</span> without relying on a centralized server wallet, the smart contract is deployed to Robinhood Chain.
              </p>
            </div>

            <div className="p-3 bg-[#060c18] border border-slate-800 rounded-2xl space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Betting Token:</span>
                <span className="text-[#00f0ff] font-bold">
                  {getPonspotTokenAddress() ? `${getPonspotTokenAddress().slice(0, 6)}...${getPonspotTokenAddress().slice(-4)}` : '⚠️ Set Token First'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Platform Fee:</span>
                <span className="text-emerald-400 font-bold">5% on-chain (Burned)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Deploy Gas:</span>
                <span className="text-white font-bold">~0.00008 ETH</span>
              </div>
            </div>

            {/* Manual contract address input */}
            <div className="p-3 bg-[#060c18] border border-slate-800 rounded-2xl space-y-2">
              <label className="text-[11px] text-slate-300 block font-bold">
                Already deployed? Enter contract address:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="0x... (Smart Contract Address)"
                  className="flex-1 bg-black/50 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                />
                <button
                  onClick={() => handleSaveContract(manualAddress)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition-all active:scale-95 flex-shrink-0"
                >
                  Apply
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-2xl text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {deployedAddress && (
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>SMART CONTRACT DEPLOYED SUCCESSFULLY!</span>
                </div>
                <p className="text-[10px] break-all font-mono text-white pt-1">{deployedAddress}</p>
                <a
                  href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/address/${deployedAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:underline pt-1"
                >
                  <span>View on Robinhood Blockscout</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="tactile-btn w-full py-3.5 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 text-black font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,240,255,0.4)] tracking-wide"
          >
            {deploying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>SIGNING DEPLOYMENT IN OKX WALLET...</span>
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                <span>DEPLOY SMART CONTRACT (1-CLICK)</span>
              </>
            )}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
