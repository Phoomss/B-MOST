type ErrorInfo = { name?: unknown; code?: unknown; message?: unknown; shortMessage?: unknown; details?: unknown; cause?: unknown };

const MESSAGES = {
  rejected: 'คุณยกเลิกการยืนยันธุรกรรมใน MetaMask',
  unauthorized: 'คุณไม่มีสิทธิ์ดำเนินการนี้',
  productMissing: 'ไม่พบข้อมูลสินค้านี้บน Blockchain',
  productNotRegistered: 'สินค้านี้ยังไม่ได้บันทึกบน Blockchain กรุณาเปิดหน้าสินค้าเพื่อบันทึกก่อนตรวจคุณภาพ',
  shipmentMissing: 'ไม่พบข้อมูลการจัดส่งนี้บน Blockchain',
  shipmentNotRegistered: 'การจัดส่งนี้ยังไม่ได้บันทึกบน Blockchain',
  networkReference: 'ข้อมูล Blockchain ของรายการนี้ไม่ตรงกับสัญญา Sepolia ปัจจุบัน กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบ',
  invalidState: 'สถานะปัจจุบันของรายการไม่รองรับการดำเนินการนี้',
  notOwner: 'บัญชีที่เชื่อมต่อไม่ได้เป็นเจ้าของสินค้าปัจจุบัน',
  ownerMismatch: 'เจ้าของสินค้าในระบบไม่ตรงกับ Blockchain กรุณาตรวจสอบการรับสินค้าและการซิงก์สถานะ',
  sameWallet: 'องค์กรผู้รับใช้ wallet เดียวกับผู้ส่ง กรุณากำหนด wallet คนละ address ก่อนจัดส่ง',
  funds: 'ยอด Sepolia ETH ไม่เพียงพอสำหรับค่าธรรมเนียมธุรกรรม',
  chain: 'กรุณาเปลี่ยนเครือข่าย MetaMask เป็น Sepolia',
  disconnected: 'กรุณาเชื่อมต่อ MetaMask ก่อนทำรายการ',
  unknown: 'ไม่สามารถทำรายการบน Blockchain ได้ กรุณาลองใหม่อีกครั้ง',
} as const;

function fields(error: unknown): ErrorInfo[] {
  if (typeof error === 'string' || typeof error === 'number') return [{ message: error }];
  const result: ErrorInfo[] = [];
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === 'object' && !seen.has(current) && result.length < 8) {
    seen.add(current);
    const item = current as ErrorInfo;
    result.push(item);
    current = item.cause;
  }
  return result;
}

function matches(error: unknown, pattern: RegExp): boolean {
  return fields(error).some((item) =>
    [item.name, item.code, item.shortMessage, item.details, item.message]
      .some((value) => (typeof value === 'string' || typeof value === 'number') && pattern.test(String(value))),
  );
}

export function isBlockchainRejection(error: unknown): boolean {
  return fields(error).some((item) => item.code === 4001 || item.code === '4001' || item.code === 'ACTION_REJECTED') ||
    matches(error, /UserRejectedRequestError|user rejected the request|user denied transaction signature|user rejected|user denied/i);
}

export function getBlockchainErrorMessage(error: unknown): string {
  if (isBlockchainRejection(error)) return MESSAGES.rejected;
  if (fields(error).some((item) => item.code === 4100 || item.code === '4100') || matches(error, /UNAUTHORIZED_ACTION|Unauthorized|AccessControlUnauthorizedAccount|not authorized|wallet.*(mismatch|does not match)|กระเป๋าเงินที่เชื่อมต่อไม่ตรง|wallet นี้ไม่มีสิทธิ์ทำรายการบนสัญญา/i)) return MESSAGES.unauthorized;
  if (matches(error, /PRODUCT_NOT_REGISTERED/)) return MESSAGES.productNotRegistered;
  if (matches(error, /SHIPMENT_NOT_REGISTERED/)) return MESSAGES.shipmentNotRegistered;
  if (matches(error, /BLOCKCHAIN_NETWORK_MISMATCH/)) return MESSAGES.networkReference;
  if (matches(error, /PRODUCT_NOT_FOUND|ไม่พบสินค้าบน Blockchain/)) return MESSAGES.productMissing;
  if (matches(error, /SHIPMENT_NOT_FOUND|ไม่พบการจัดส่งบน Blockchain/)) return MESSAGES.shipmentMissing;
  if (matches(error, /INVALID_STATE_TRANSITION|สถานะสินค้าปัจจุบันไม่รองรับการดำเนินการนี้/)) return MESSAGES.invalidState;
  if (matches(error, /wallet ผู้ส่งไม่ตรงกับเจ้าของสินค้าบน Blockchain/)) return MESSAGES.ownerMismatch;
  if (matches(error, /NOT_CURRENT_OWNER|wallet ที่เชื่อมต่อไม่ใช่เจ้าของสินค้าปัจจุบัน/)) return MESSAGES.notOwner;
  if (matches(error, /INVALID_RECIPIENT|CANNOT_TRANSFER_TO_SELF|ไม่สามารถสร้างการจัดส่งให้ wallet เดิม|ใช้ wallet เดียวกับเจ้าของสินค้า/)) return MESSAGES.sameWallet;
  if (matches(error, /InsufficientFunds|insufficient funds|exceeds.*balance/i)) return MESSAGES.funds;
  if (fields(error).some((item) => item.code === 4902 || item.code === '4902') || matches(error, /ChainMismatch|WrongChain|wrong (network|chain)|chain.*(mismatch|does not match)|กรุณาเปลี่ยนเครือข่าย MetaMask เป็น Sepolia/i)) return MESSAGES.chain;
  if (fields(error).some((item) => item.code === 4900 || item.code === '4900') || matches(error, /ProviderNotFound|ConnectorNotConnected|wallet disconnected|not connected|no accounts|ไม่พบ MetaMask|กรุณาเลือกบัญชีใน MetaMask/i)) return MESSAGES.disconnected;
  return MESSAGES.unknown;
}
