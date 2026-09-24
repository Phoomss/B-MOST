/**
 * Thai localization dictionary & badge styles for B-MOST Enterprise Supply Chain
 */

export const THAI_PRODUCT_STATUS: Record<string, string> = {
  REGISTERED: 'ลงทะเบียนแล้ว',
  QUALITY_CHECKED: 'ตรวจสอบคุณภาพแล้ว',
  READY_TO_SHIP: 'พร้อมจัดส่ง',
  SHIPPED: 'จัดส่งแล้ว',
  IN_TRANSIT: 'อยู่ระหว่างการขนส่ง',
  RECEIVED: 'รับสินค้าแล้ว',
  STORED: 'จัดเก็บแล้ว',
  SOLD: 'จำหน่ายแล้ว',
  RECALLED: 'เรียกคืน',
};

export const THAI_SHIPMENT_STATUS: Record<string, string> = {
  PENDING: 'รอการจัดส่ง',
  SHIPPED: 'จัดส่งแล้ว',
  IN_TRANSIT: 'อยู่ระหว่างการขนส่ง',
  DELIVERED: 'ส่งมอบสำเร็จ',
  CANCELLED: 'ยกเลิก',
};

export const THAI_QC_RESULT: Record<string, string> = {
  PASSED: 'ผ่านการตรวจสอบ',
  PASS: 'ผ่านการตรวจสอบ',
  FAILED: 'ไม่ผ่านการตรวจสอบ',
  FAIL: 'ไม่ผ่านการตรวจสอบ',
  PENDING: 'รอการตรวจสอบ',
};

export const THAI_TX_STATUS: Record<string, string> = {
  PENDING: 'กำลังดำเนินการ',
  CONFIRMED: 'ยืนยันแล้ว',
  FAILED: 'ไม่สำเร็จ',
};

export const THAI_USER_ROLE: Record<string, string> = {
  SUPER_ADMIN: 'ผู้ดูแลระบบสูงสุด',
  ORG_ADMIN: 'ผู้ดูแลองค์กร',
  MANUFACTURER: 'ผู้ผลิต',
  DISTRIBUTOR: 'ผู้จัดจำหน่าย',
  WAREHOUSE: 'คลังสินค้า',
  RETAILER: 'ร้านค้าปลีก',
  AUDITOR: 'ผู้ตรวจสอบ',
  VIEWER: 'ผู้ชม',
};

export const THAI_ORG_TYPE: Record<string, string> = {
  MANUFACTURER: 'โรงงานผู้ผลิต',
  DISTRIBUTOR: 'ตัวแทนกระจายสินค้า',
  WAREHOUSE: 'คลังจัดเก็บสินค้า',
  RETAILER: 'ร้านค้าปลีก',
  LOGISTICS: 'ผู้ให้บริการโลจิสติกส์',
  AUDITOR: 'สถาบันตรวจสอบคุณภาพ',
};

export function getProductStatusBadge(status: string) {
  const text = THAI_PRODUCT_STATUS[status] || status;
  switch (status) {
    case 'REGISTERED':
      return { text, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'QUALITY_CHECKED':
      return { text, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'READY_TO_SHIP':
      return { text, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'SHIPPED':
    case 'IN_TRANSIT':
      return { text, bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'RECEIVED':
    case 'STORED':
      return { text, bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'SOLD':
      return { text, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'RECALLED':
      return { text, bg: 'bg-red-50 text-red-700 border-red-200' };
    default:
      return { text, bg: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
}

export function getShipmentStatusBadge(status: string) {
  const text = THAI_SHIPMENT_STATUS[status] || status;
  switch (status) {
    case 'PENDING':
      return { text, bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'SHIPPED':
    case 'IN_TRANSIT':
      return { text, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'DELIVERED':
      return { text, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'CANCELLED':
      return { text, bg: 'bg-red-50 text-red-700 border-red-200' };
    default:
      return { text, bg: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
}

export function getQcBadge(result: string) {
  const isPass = result === 'PASSED' || result === 'PASS';
  const text = THAI_QC_RESULT[result] || (isPass ? 'ผ่าน' : 'ไม่ผ่าน');
  return {
    text,
    bg: isPass ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200',
  };
}

export function getTxBadge(status: string) {
  const text = THAI_TX_STATUS[status] || status;
  switch (status) {
    case 'CONFIRMED':
      return { text, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'PENDING':
      return { text, bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'FAILED':
      return { text, bg: 'bg-red-50 text-red-700 border-red-200' };
    default:
      return { text, bg: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
}
