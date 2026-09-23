import { registerAs } from '@nestjs/config';

export default registerAs('blockchain', () => ({
  rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545',
  contractAddress:
    process.env.CONTRACT_ADDRESS ||
    '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  deployerPrivateKey:
    process.env.DEPLOYER_PRIVATE_KEY ||
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
}));
