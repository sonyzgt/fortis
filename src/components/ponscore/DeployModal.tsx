'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { Rocket, Check, X, RefreshCw, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';
import { deployPonscoreJackpotContract } from '@/lib/web3/deployer';
import { PONS_TOKEN_ADDRESS, ROBINHOOD_CHAIN_CONFIG } from '@/lib/web3/contracts';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (contractAddress: string) => void;
}

export const DeployModal: React.FC<DeployModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [deploying, setDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDeploy = async () => {
    setDeploying(true);
    setError(null);

    try {
      const win = typeof window !== 'undefined' ? (window as any) : {};
      const providerObj = win.okxwallet || win.ethereum;
      if (!providerObj) {
        throw new Error('OKX Wallet atau MetaMask tidak terdeteksi di browser.');
      }

      const browserProvider = new ethers.BrowserProvider(providerObj);
      const signer = await browserProvider.getSigner();

      const address = await deployPonscoreJackpotContract(signer, PONS_TOKEN_ADDRESS);
      setDeployedAddress(address);

      try {
        await fetch('http://localhost:4000/api/admin/set-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractAddress: address }),
        });
      } catch (postErr) {
        console.warn('Could not sync contract to server, saved locally', postErr);
      }

      onSuccess(address);
    } catch (e: any) {
      console.error('Deployment error:', e);
      setError(e?.message || 'Gagal melakukan deploy contract');
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
          className="bg-gradient-to-b from-[#0a1428]/95 to-[#040812]/95 border-2 border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_60px_rgba(0,240,255,0.3)] max-w-md w-full relative overflow-hidden backdrop-blur-2xl text-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.3)]">
                <Rocket className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-wide">DEPLOY SMART CONTRACT</h3>
                <p className="text-[10px] text-slate-400 font-mono">Robinhood Chain (Arbitrum L2)</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs font-mono mb-4">
            <div className="p-3 bg-cyan-950/30 border border-cyan-500/25 rounded-2xl space-y-1 text-slate-300">
              <p className="font-bold text-white flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Mengapa Smart Contract Harus Di-deploy?
              </p>
              <p className="text-[11px] text-slate-300">
                Agar pemenang bisa **menerima dana secara otomatis** saat mengklik <span className="text-[#00f0ff] font-bold">[ CLAIM WINNINGS ]</span> tanpa memerlukan wallet server terpusat, kontrak pintar harus di-deploy ke jaringan Robinhood Chain.
              </p>
            </div>

            <div className="p-3 bg-[#060c18] border border-slate-800 rounded-2xl space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Token Taruhan:</span>
                <span className="text-[#00f0ff] font-bold">0x5cc0...7e22 (marcopolo)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Platform Fee:</span>
                <span className="text-emerald-400 font-bold">5% on-chain</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimasi Gas Deploy:</span>
                <span className="text-white font-bold">~0.00008 ETH</span>
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
                  <span>SMART CONTRACT BERHASIL DIDEPLOY!</span>
                </div>
                <p className="text-[10px] break-all font-mono text-white pt-1">{deployedAddress}</p>
                <a
                  href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/address/${deployedAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:underline pt-1"
                >
                  <span>Lihat di Robinhood Blockscout</span>
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
