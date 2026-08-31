import { ethers } from 'ethers';
import PonspotJackpotABI from './abi/PonspotJackpotABI.json';
import { PONSCORE_JACKPOT_BYTECODE } from './bytecode';
import PonspotAirdropABI from './abi/PonspotAirdropABI.json';
import { PONSCORE_AIRDROP_BYTECODE } from './airdropBytecode';

/**
 * Deploy PonspotJackpot smart contract directly using connected wallet (OKX / MetaMask)
 * This deploys the real autonomous on-chain escrow and winner payout contract on Robinhood Chain!
 */
export async function deployPonspotJackpotContract(
  signer: ethers.Signer,
  ponsTokenAddress: string
): Promise<string> {
  const factory = new ethers.ContractFactory(
    PonspotJackpotABI,
    PONSCORE_JACKPOT_BYTECODE,
    signer
  );

  // Deploy with constructor arguments: (_ponsToken)
  const contract = await factory.deploy(ponsTokenAddress);
  const deployed = await contract.waitForDeployment();
  const contractAddress = await deployed.getAddress();

  return contractAddress;
}

export const deployPonscoreJackpotContract = deployPonspotJackpotContract;

/**
 * Deploy PonspotAirdrop dedicated smart contract using connected wallet (OKX / MetaMask)
 * This deploys the dedicated on-chain 1-time claim airdrop vault on Robinhood Chain!
 */
export async function deployPonspotAirdropContract(
  signer: ethers.Signer,
  ponsTokenAddress: string,
  initialRewardPons: number = 100
): Promise<string> {
  const factory = new ethers.ContractFactory(
    PonspotAirdropABI,
    PONSCORE_AIRDROP_BYTECODE,
    signer
  );

  const initialRewardWei = ethers.parseEther(initialRewardPons.toString());
  const contract = await factory.deploy(ponsTokenAddress, initialRewardWei);
  const deployed = await contract.waitForDeployment();
  const contractAddress = await deployed.getAddress();

  return contractAddress;
}

export const deployPonscoreAirdropContract = deployPonspotAirdropContract;
