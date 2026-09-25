import { registerAs } from '@nestjs/config';

export default registerAs('blockchain', () => ({
  rpcUrl: process.env.BLOCKCHAIN_RPC_URL,
  contractAddress: '0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a',
  chainId: 11155111,
}));
