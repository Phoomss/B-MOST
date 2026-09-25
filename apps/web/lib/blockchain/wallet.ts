import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  http,
  type Abi,
  type Address,
  type EIP1193Provider,
  type Hash,
} from 'viem';
import { sepolia } from 'viem/chains';
import { supplyChainRegistryAbi } from './abi';
import { api } from '../api';

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CONTRACT_ADDRESS = '0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a' as Address;

export function getInjectedProvider(): EIP1193Provider | null {
  if (typeof window === 'undefined') return null;
  return (window as Window & { ethereum?: EIP1193Provider }).ethereum ?? null;
}

export function getPublicClient() {
  return createPublicClient({ chain: sepolia, transport: http() });
}

export function getWalletClient() {
  const provider = getInjectedProvider();
  if (!provider) throw new Error('ไม่พบ MetaMask กรุณาติดตั้งส่วนขยายก่อน');
  return createWalletClient({ chain: sepolia, transport: custom(provider) });
}

export async function connectWallet(): Promise<Address> {
  const [account] = await getWalletClient().requestAddresses();
  if (!account) throw new Error('กรุณาเลือกบัญชีใน MetaMask');
  return getAddress(account);
}

export async function switchToSepolia(): Promise<void> {
  await getWalletClient().switchChain({ id: sepolia.id });
}

export function assertExpectedWallet(account: string | null, expectedWallet: string | null | undefined): Address {
  if (!expectedWallet) throw new Error('บัญชีผู้ใช้งานยังไม่ได้กำหนด walletAddress');
  if (!account || getAddress(account) !== getAddress(expectedWallet)) {
    throw new Error('กระเป๋าเงินที่เชื่อมต่อไม่ตรงกับบัญชีผู้ใช้งาน กรุณาเปลี่ยนบัญชีใน MetaMask');
  }
  return getAddress(account);
}

export async function writeSupplyChainAction(params: {
  account: string;
  expectedWallet: string;
  functionName: string;
  args: readonly unknown[];
}): Promise<{ hash: Hash; blockNumber: bigint; synced: boolean }> {
  if (
    Number(process.env.NEXT_PUBLIC_CHAIN_ID) !== SEPOLIA_CHAIN_ID ||
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.toLowerCase() !== SEPOLIA_CONTRACT_ADDRESS.toLowerCase()
  ) {
    throw new Error('การตั้งค่าเครือข่ายหรือสัญญาไม่ตรงกับ Sepolia ของระบบ');
  }
  const account = assertExpectedWallet(params.account, params.expectedWallet);
  const client = getWalletClient();
  if (await client.getChainId() !== SEPOLIA_CHAIN_ID) {
    throw new Error('กรุณาเปลี่ยนเครือข่าย MetaMask เป็น Sepolia');
  }
  if (
    process.env.NEXT_PUBLIC_BLOCKCHAIN_ABI_READY !== 'true' ||
    (supplyChainRegistryAbi as readonly unknown[]).length === 0
  ) {
    throw new Error('TODO: Waiting for SupplyChainRegistry ABI');
  }
  const abi = supplyChainRegistryAbi as Abi;
  if (!abi.some((item) => item.type === 'function' && item.name === params.functionName)) {
    throw new Error('ไม่พบฟังก์ชันนี้ใน ABI ของ Contract');
  }
  const hash = await client.writeContract({
    account,
    address: SEPOLIA_CONTRACT_ADDRESS,
    abi,
    functionName: params.functionName,
    args: params.args,
    chain: sepolia,
  });
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('ธุรกรรมบน Blockchain ล้มเหลว');
  const verification = await api.blockchain.verifyTransaction(hash);
  if (!verification.verified || verification.transactionHash.toLowerCase() !== hash.toLowerCase()) {
    throw new Error('ตรวจสอบธุรกรรมบน Sepolia ไม่สำเร็จ');
  }
  return { hash, blockNumber: receipt.blockNumber, synced: verification.synced };
}
