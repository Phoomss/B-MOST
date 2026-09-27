import { describe, expect, it } from 'vitest';
import { getBlockchainErrorMessage, isBlockchainRejection } from '../lib/blockchain/errors';

describe('blockchain error messages', () => {
  it.each([
    [{ code: 4001 }, 'คุณยกเลิกการยืนยันธุรกรรมใน MetaMask'],
    [{ name: 'UserRejectedRequestError' }, 'คุณยกเลิกการยืนยันธุรกรรมใน MetaMask'],
    [{ cause: { details: 'User denied transaction signature' } }, 'คุณยกเลิกการยืนยันธุรกรรมใน MetaMask'],
    [{ shortMessage: 'UNAUTHORIZED_ACTION' }, 'คุณไม่มีสิทธิ์ดำเนินการนี้'],
    [{ message: 'PRODUCT_NOT_REGISTERED: สินค้ายังไม่ได้บันทึกบน Blockchain' }, 'สินค้านี้ยังไม่ได้บันทึกบน Blockchain กรุณาเปิดหน้าสินค้าเพื่อบันทึกก่อนตรวจคุณภาพ'],
    [{ message: 'BLOCKCHAIN_NETWORK_MISMATCH: ข้อมูลอ้างอิง Blockchain ไม่ใช่สัญญา Sepolia ปัจจุบัน' }, 'ข้อมูล Blockchain ของรายการนี้ไม่ตรงกับสัญญา Sepolia ปัจจุบัน กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบ'],
    [{ cause: { details: 'PRODUCT_NOT_FOUND' } }, 'ไม่พบข้อมูลสินค้านี้บน Blockchain'],
    [{ details: 'SHIPMENT_NOT_FOUND' }, 'ไม่พบข้อมูลการจัดส่งนี้บน Blockchain'],
    [{ message: 'INVALID_STATE_TRANSITION' }, 'สถานะปัจจุบันของรายการไม่รองรับการดำเนินการนี้'],
    [{ message: 'NOT_CURRENT_OWNER' }, 'บัญชีที่เชื่อมต่อไม่ได้เป็นเจ้าของสินค้าปัจจุบัน'],
    [{ name: 'InsufficientFundsError' }, 'ยอด Sepolia ETH ไม่เพียงพอสำหรับค่าธรรมเนียมธุรกรรม'],
    [{ name: 'ChainMismatchError' }, 'กรุณาเปลี่ยนเครือข่าย MetaMask เป็น Sepolia'],
    [{ name: 'ProviderNotFoundError' }, 'กรุณาเชื่อมต่อ MetaMask ก่อนทำรายการ'],
    [{ message: 'calldata: 0x123\nstack trace\nviem docs' }, 'ไม่สามารถทำรายการบน Blockchain ได้ กรุณาลองใหม่อีกครั้ง'],
  ])('sanitizes %j', (error, expected) => {
    expect(getBlockchainErrorMessage(error)).toBe(expected);
  });

  it('handles cyclic causes and identifies cancellation', () => {
    const error: { cause?: unknown; code: number } = { code: 4001 };
    error.cause = error;
    expect(isBlockchainRejection(error)).toBe(true);
    expect(getBlockchainErrorMessage(error)).toBe('คุณยกเลิกการยืนยันธุรกรรมใน MetaMask');
  });
});
