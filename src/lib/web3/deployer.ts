import { ethers } from 'ethers';
import CashFlipJackpotABI from './abi/CashFlipJackpotABI.json';
import { CASHFLIP_JACKPOT_BYTECODE } from './bytecode';

// The trusted game server signer address (set in NEXT_PUBLIC_SIGNER_ADDRESS env)
export const GAME_SERVER_SIGNER_ADDRESS =
  (process.env.NEXT_PUBLIC_SIGNER_ADDRESS || '').trim();

/**
 * Deploy CashFlip Jackpot smart contract directly using connected wallet (OKX / MetaMask)
 * New contract requires two constructor args: token address + game server signer address.
 */
export async function deployCashFlipJackpotContract(
  signer: ethers.Signer,
  cashflipTokenAddress: string,
  signerAddress?: string
): Promise<string> {
  const signerAddr = signerAddress || GAME_SERVER_SIGNER_ADDRESS;
  if (!signerAddr || !signerAddr.startsWith('0x') || signerAddr.length !== 42) {
    throw new Error('Game server signer address not configured. Please set NEXT_PUBLIC_SIGNER_ADDRESS in .env.local');
  }

  const factory = new ethers.ContractFactory(
    CashFlipJackpotABI,
    CASHFLIP_JACKPOT_BYTECODE,
    signer
  );

  // Deploy with constructor arguments: (_token, _signerAddress)
  const contract = await factory.deploy(cashflipTokenAddress, signerAddr);
  const deployed = await contract.waitForDeployment();
  const contractAddress = await deployed.getAddress();

  return contractAddress;
}
