'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { Gift, Check, X, RefreshCw, ExternalLink, ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';
import { deployPonspotAirdropContract } from '@/lib/web3/deployer';
import { PONSPOT_TOKEN_ADDRESS, ROBINHOOD_CHAIN_CONFIG } from '@/lib/web3/contracts';
import { getApiBaseUrl } from '@/lib/apiConfig';

interface DeployAirdropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (contractAddress: string) => void;
}

export const DeployAirdropModal: React.FC<DeployAirdropModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [deploying, setDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [rewardAmount, setRewardAmount] = useState<number>(100);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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

      const address = await deployPonspotAirdropContract(signer, PONSPOT_TOKEN_ADDRESS, rewardAmount);
      setDeployedAddress(address);

      try {
        localStorage.setItem('ponspot_airdrop_contract', address);
        localStorage.setItem('ponscore_airdrop_contract', address);
        const apiBase = getApiBaseUrl();
        await fetch(`${apiBase}/api/admin/set-airdrop-contract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ airdropContractAddress: address }),
        });
      } catch (postErr) {
        console.warn('Could not sync airdrop contract to server, saved locally', postErr);
      }

      onSuccess(address);
    } catch (e: any) {
      console.error('Airdrop Deployment error:', e);
      setError(e?.message || 'Failed to deploy airdrop contract');
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-[#0c1611]/95 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-2xl max-w-md w-full relative overflow-hidden backdrop-blur-2xl text-slate-100 font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                <Gift className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-wide">DEPLOY AIRDROP SMART CONTRACT</h3>
                <p className="text-[10px] text-slate-400 font-mono">Robinhood Chain (Arbitrum L2)</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs font-mono mb-4">
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/25 rounded-2xl space-y-1 text-slate-300">
              <p className="font-bold text-white flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Dedicated On-Chain Airdrop Vault
              </p>
              <p className="text-[11px] text-slate-300">
                This dedicated smart contract holds token deposits from the Admin wallet and manages 1-time automated claims per wallet directly on the blockchain.
              </p>
            </div>

            <div className="p-3 bg-black/40 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 block">TARGET TOKEN (PONSPOT):</span>
              <span className="text-xs text-emerald-400 font-bold break-all">{PONSPOT_TOKEN_ADDRESS}</span>
            </div>

            <div className="p-3 bg-black/40 rounded-xl space-y-1.5">
              <span className="text-[10px] text-slate-400 block">INITIAL REWARD PER WALLET:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs font-mono text-white"
                  placeholder="100"
                />
                <span className="text-xs text-emerald-400 font-bold">PONSPOT</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="break-all">{error}</span>
              </div>
            )}

            {deployedAddress && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold block flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> AIRDROP CONTRACT DEPLOYED SUCCESSFULLY!
                </span>
                <p className="text-xs text-white font-bold break-all">{deployedAddress}</p>
                <a
                  href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/address/${deployedAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline pt-1"
                >
                  <span>View on Blockscout</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-bold font-mono transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDeploy}
              disabled={deploying}
              className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black rounded-xl text-xs font-mono flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {deploying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>DEPLOYING...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>DEPLOY (1-CLICK)</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
