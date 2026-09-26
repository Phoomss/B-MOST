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
}): Promise<{ hash: Hash; blockNumber: bigint }> {
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
  const fragment = abi.find((item) => item.type === 'function' && item.name === params.functionName);
  if (!fragment || fragment.type !== 'function') {
    throw new Error('ไม่พบฟังก์ชันนี้ใน ABI ของ Contract');
  }
  const args = params.args.map((value, index) => {
    const type = fragment.inputs[index]?.type;
    if (type?.startsWith('uint') || type?.startsWith('int')) return BigInt(String(value));
    if (type === 'bool') return value === true || value === 'true';
    return value;
  });
  const hash = await client.writeContract({
    account,
    address: SEPOLIA_CONTRACT_ADDRESS,
    abi,
    functionName: params.functionName,
    args,
    chain: sepolia,
  });
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('ธุรกรรมบน Blockchain ล้มเหลว');
  return { hash, blockNumber: receipt.blockNumber };
}

export async function executeUserSignedAction(
  data: Parameters<typeof api.blockchain.prepareAction>[0],
  onProgress?: (message: string) => void,
) {
  onProgress?.('กำลังตรวจสอบสถานะสินค้าและเตรียมธุรกรรม...');
  const prepared = await api.blockchain.prepareAction(data);
  const account = await connectWallet();
  assertExpectedWallet(account, prepared.expectedWallet);
  if (Date.now() >= new Date(prepared.expiresAt).getTime()) {
    throw new Error('คำขอธุรกรรมหมดอายุ กรุณาลองใหม่');
  }
  onProgress?.('กรุณายืนยันธุรกรรมใน MetaMask');
  let hash: Hash;
  try {
    ({ hash } = await writeSupplyChainAction({
      account,
      expectedWallet: prepared.expectedWallet,
      functionName: prepared.functionName,
      args: prepared.args,
    }));
  } catch (error) {
    const code = (error as { code?: number | string })?.code;
    if (code === 4001 || code === 'ACTION_REJECTED') {
      throw new Error('ผู้ใช้ยกเลิกธุรกรรมใน MetaMask');
    }
    throw error;
  }
  onProgress?.('กำลังตรวจสอบธุรกรรมและซิงก์ข้อมูล...');
  const confirmed = await api.blockchain.confirmAction(prepared.intentId, hash);
  if (!confirmed.verified || !confirmed.synced) {
    throw new Error(`ธุรกรรม ${hash} ยืนยันแล้ว แต่ยังซิงก์ข้อมูลไม่สำเร็จ`);
  }
  onProgress?.('ธุรกรรมสำเร็จ');
  return confirmed;
}
