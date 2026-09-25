import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';

/**
 * Smart Contract ProductStatus Enum Values (from SupplyChainRegistry.sol)
 *
 * enum ProductStatus {
 *   REGISTERED,       // 0
 *   QUALITY_CHECKED,  // 1
 *   READY_TO_SHIP,    // 2
 *   SHIPPED,          // 3
 *   IN_TRANSIT,       // 4
 *   RECEIVED,         // 5
 *   STORED,           // 6
 *   SOLD,             // 7
 *   RECALLED          // 8
 * }
 */
export enum OnChainProductStatus {
  REGISTERED = 0,
  QUALITY_CHECKED = 1,
  READY_TO_SHIP = 2,
  SHIPPED = 3,
  IN_TRANSIT = 4,
  RECEIVED = 5,
  STORED = 6,
  SOLD = 7,
  RECALLED = 8,
}

/**
 * Smart Contract ShipmentStatus Enum Values (from SupplyChainRegistry.sol)
 *
 * enum ShipmentStatus {
 *   PENDING,          // 0
 *   SHIPPED,          // 1
 *   IN_TRANSIT,       // 2
 *   DELIVERED,        // 3
 *   CANCELLED         // 4
 * }
 */
export enum OnChainShipmentStatus {
  PENDING = 0,
  SHIPPED = 1,
  IN_TRANSIT = 2,
  DELIVERED = 3,
  CANCELLED = 4,
}

export type BlockchainAction =
  | 'recordQualityCheck'
  | 'createShipment'
  | 'shipProduct'
  | 'markInTransit'
  | 'receiveProduct'
  | 'storeProduct'
  | 'transferOwnership'
  | 'markAsSold'
  | 'recallProduct';

/**
 * State Machine derived directly from SupplyChainRegistry.sol validation rules.
 *
 * Each action maps to the set of allowed Product statuses as defined by the
 * require() statements in the contract. If the product is NOT in one of these
 * states when the action is called, the contract reverts with INVALID_STATE_TRANSITION.
 */
const ALLOWED_STATES_FOR_ACTION: Record<BlockchainAction, OnChainProductStatus[]> = {
  recordQualityCheck: [OnChainProductStatus.REGISTERED],

  // A stored product can start another delivery leg.
  createShipment: [
    OnChainProductStatus.QUALITY_CHECKED,
    OnChainProductStatus.STORED,
  ],

  shipProduct: [OnChainProductStatus.READY_TO_SHIP],

  // markInTransit: SHIPPED only
  markInTransit: [OnChainProductStatus.SHIPPED],

  // receiveProduct: SHIPPED || IN_TRANSIT
  receiveProduct: [
    OnChainProductStatus.SHIPPED,
    OnChainProductStatus.IN_TRANSIT,
  ],

  // storeProduct: RECEIVED only
  storeProduct: [OnChainProductStatus.RECEIVED],

  // transferOwnership: any except RECALLED and SOLD
  transferOwnership: [
    OnChainProductStatus.REGISTERED,
    OnChainProductStatus.QUALITY_CHECKED,
    OnChainProductStatus.READY_TO_SHIP,
    OnChainProductStatus.SHIPPED,
    OnChainProductStatus.IN_TRANSIT,
    OnChainProductStatus.RECEIVED,
    OnChainProductStatus.STORED,
  ],

  markAsSold: [OnChainProductStatus.STORED],

  // recallProduct: any except RECALLED, including sold products recalled for safety.
  recallProduct: [
    OnChainProductStatus.REGISTERED,
    OnChainProductStatus.QUALITY_CHECKED,
    OnChainProductStatus.READY_TO_SHIP,
    OnChainProductStatus.SHIPPED,
    OnChainProductStatus.IN_TRANSIT,
    OnChainProductStatus.RECEIVED,
    OnChainProductStatus.STORED,
    OnChainProductStatus.SOLD,
  ],
};

const STATUS_NAMES: Record<number, string> = {
  0: 'REGISTERED (ลงทะเบียนแล้ว)',
  1: 'QUALITY_CHECKED (ผ่านการตรวจสอบคุณภาพ)',
  2: 'READY_TO_SHIP (พร้อมจัดส่ง)',
  3: 'SHIPPED (ส่งแล้ว)',
  4: 'IN_TRANSIT (อยู่ระหว่างการขนส่ง)',
  5: 'RECEIVED (ได้รับแล้ว)',
  6: 'STORED (เก็บในคลัง)',
  7: 'SOLD (ขายแล้ว)',
  8: 'RECALLED (ถูกเรียกคืน)',
};

const ACTION_DESCRIPTIONS: Record<BlockchainAction, string> = {
  recordQualityCheck: 'บันทึกการตรวจสอบคุณภาพ (recordQualityCheck)',
  createShipment: 'สร้างการจัดส่ง (createShipment)',
  shipProduct: 'จัดส่งสินค้า (shipProduct)',
  markInTransit: 'อัพเดตสถานะระหว่างขนส่ง (markInTransit)',
  receiveProduct: 'รับสินค้า (receiveProduct)',
  storeProduct: 'เก็บสินค้าเข้าคลัง (storeProduct)',
  transferOwnership: 'โอนกรรมสิทธิ์ (transferOwnership)',
  markAsSold: 'ทำเครื่องหมายขายสินค้า (markAsSold)',
  recallProduct: 'เรียกคืนสินค้า (recallProduct)',
};

@Injectable()
export class ProductStateMachineService {
  private readonly logger = new Logger(ProductStateMachineService.name);

  /**
   * Gets the human-readable name of an on-chain product status number.
   */
  getStatusName(statusNum: number): string {
    return STATUS_NAMES[statusNum] ?? `UNKNOWN(${statusNum})`;
  }

  /**
   * Returns the set of allowed on-chain states for a given action.
   * This mirrors the require() statements in SupplyChainRegistry.sol exactly.
   */
  getAllowedStates(action: BlockchainAction): OnChainProductStatus[] {
    return ALLOWED_STATES_FOR_ACTION[action];
  }

  /**
   * Validates that the given on-chain product status allows the requested action.
   * Throws BadRequestException with a detailed, human-readable message if invalid.
   *
   * @param onChainStatus - The numeric status from getProduct().status
   * @param action - The blockchain function to be called
   * @param productCode - Product code for logging context
   * @param productDbId - Database ID for logging context
   */
  validateTransition(
    onChainStatus: number,
    action: BlockchainAction,
    productCode: string,
    productDbId: string,
    blockchainProductId?: string,
    databaseStatus?: string,
    contractAddress?: string,
  ): void {
    const allowed = ALLOWED_STATES_FOR_ACTION[action];
    const isAllowed = allowed.includes(onChainStatus as OnChainProductStatus);

    const currentStatusName = this.getStatusName(onChainStatus);
    const allowedStatusNames = allowed.map((s) => this.getStatusName(s)).join(', ');
    const actionDesc = ACTION_DESCRIPTIONS[action];
    const nextStatus: Partial<Record<BlockchainAction, OnChainProductStatus>> = {
      recordQualityCheck: OnChainProductStatus.QUALITY_CHECKED,
      createShipment: OnChainProductStatus.READY_TO_SHIP,
      shipProduct: OnChainProductStatus.SHIPPED,
      markInTransit: OnChainProductStatus.IN_TRANSIT,
      receiveProduct: OnChainProductStatus.RECEIVED,
      storeProduct: OnChainProductStatus.STORED,
      markAsSold: OnChainProductStatus.SOLD,
      recallProduct: OnChainProductStatus.RECALLED,
    };

    this.logger.log(
      `[StateMachine] Product=${productCode} (DB: ${productDbId})\n` +
        `  Blockchain Product ID: ${blockchainProductId ?? 'N/A'}\n` +
        `  Database Status: ${databaseStatus ?? 'N/A'}\n` +
        `  Contract Address: ${contractAddress ?? 'N/A'}\n` +
        `  Action: ${action}\n` +
        `  Current Blockchain Status: ${onChainStatus} = ${currentStatusName}\n` +
        `  Expected State: [${allowedStatusNames}]\n` +
        `  Next State: ${nextStatus[action] === undefined ? 'UNCHANGED' : this.getStatusName(nextStatus[action]!)}\n` +
        `  Valid Transition: ${isAllowed}`,
    );

    if (!isAllowed) {
      const userMessage = this.buildUserErrorMessage(onChainStatus, action, productCode);
      this.logger.error(
        `[StateMachine] INVALID_STATE_TRANSITION detected BEFORE sending transaction.\n` +
          `  Product: ${productCode} (DB: ${productDbId})\n` +
          `  Action: ${action}\n` +
          `  Blockchain State: ${onChainStatus} (${currentStatusName})\n` +
          `  Required one of: [${allowedStatusNames}]\n` +
          `  Next State: ${nextStatus[action] === undefined ? 'UNCHANGED' : this.getStatusName(nextStatus[action]!)}`,
      );
      throw new BadRequestException(userMessage);
    }
  }

  /**
   * Builds a user-friendly Thai error message for the INVALID_STATE_TRANSITION.
   */
  private buildUserErrorMessage(
    onChainStatus: number,
    action: BlockchainAction,
    productCode: string,
  ): string {
    const currentName = this.getStatusName(onChainStatus);
    switch (action) {
      case 'recordQualityCheck':
        return (
          `ไม่สามารถบันทึกการตรวจสอบคุณภาพได้\n` +
          `สินค้า ${productCode} อยู่ในสถานะ: ${currentName}\n` +
          `สินค้าที่ถูก RECALLED หรือ SOLD ไม่สามารถตรวจสอบคุณภาพได้อีก`
        );
      case 'createShipment':
        return (
          `ไม่สามารถสร้างการจัดส่งได้\n` +
          `สินค้า ${productCode} อยู่ในสถานะ: ${currentName}\n` +
          `สินค้าต้องอยู่ในสถานะ QUALITY_CHECKED, STORED, หรือ READY_TO_SHIP ก่อนสร้างการจัดส่ง`
        );
      case 'shipProduct':
        return (
          `ไม่สามารถจัดส่งสินค้าได้\n` +
          `สินค้า ${productCode} อยู่ในสถานะ: ${currentName}\n` +
          `สินค้าต้องอยู่ในสถานะ READY_TO_SHIP, QUALITY_CHECKED, หรือ STORED ก่อนจัดส่ง\n` +
          (onChainStatus === OnChainProductStatus.SHIPPED
            ? 'สินค้าถูกจัดส่งไปแล้ว'
            : onChainStatus === OnChainProductStatus.RECEIVED
              ? 'สินค้าถูกรับแล้ว ไม่สามารถจัดส่งซ้ำได้'
              : '')
        );
      case 'markInTransit':
        return (
          `ไม่สามารถอัพเดตสถานะระหว่างขนส่งได้\n` +
          `สินค้า ${productCode} อยู่ในสถานะ: ${currentName}\n` +
          `สินค้าต้องอยู่ในสถานะ SHIPPED ก่อน`
        );
      case 'receiveProduct':
        return (
          `ไม่สามารถรับสินค้าได้\n` +
          `สินค้า ${productCode} อยู่ในสถานะ: ${currentName}\n` +
          `สินค้าต้องอยู่ในสถานะ SHIPPED หรือ IN_TRANSIT ก่อนรับ\n` +
          (onChainStatus === OnChainProductStatus.RECEIVED
            ? 'สินค้าถูกรับแล้ว'
            : '')
        );
      case 'storeProduct':
        return (
          `ไม่สามารถเก็บสินค้าเข้าคลังได้\n` +
          `สินค้า ${productCode} อยู่ในสถานะ: ${currentName}\n` +
          `สินค้าต้องอยู่ในสถานะ RECEIVED ก่อนเก็บเข้าคลัง`
        );
      case 'transferOwnership':
        return (
          `ไม่สามารถโอนกรรมสิทธิ์สินค้าได้\n` +
          `สินค้า ${productCode} อยู่ในสถานะ: ${currentName}\n` +
          `สินค้าที่ถูก RECALLED หรือ SOLD ไม่สามารถโอนกรรมสิทธิ์ได้`
        );
      case 'markAsSold':
        return (
          `ไม่สามารถทำเครื่องหมายขายสินค้าได้\n` +
          `สินค้า ${productCode} อยู่ในสถานะ: ${currentName}\n` +
          `สินค้าต้องอยู่ในสถานะ STORED หรือ RECEIVED ก่อนขาย`
        );
      case 'recallProduct':
        return (
          `ไม่สามารถเรียกคืนสินค้าได้\n` +
          `สินค้า ${productCode} อยู่ในสถานะ: ${currentName}\n` +
          `สินค้าถูกเรียกคืนแล้ว (RECALLED) ไม่สามารถเรียกคืนซ้ำได้`
        );
      default:
        return (
          `ไม่สามารถดำเนินการได้ เนื่องจากสถานะสินค้าปัจจุบันไม่รองรับการดำเนินการนี้\n` +
          `สินค้า ${productCode} อยู่ในสถานะ: ${currentName}`
        );
    }
  }

  /**
   * Checks and logs a state mismatch between the database and the blockchain.
   * Returns true if there is a mismatch, false if they are in sync.
   */
  checkStateMismatch(
    dbStatus: string,
    onChainStatus: number,
    productCode: string,
    productDbId: string,
    blockchainProductId?: string,
    action?: BlockchainAction,
    contractAddress?: string,
  ): boolean {
    // Map Prisma ProductStatus enum to on-chain status number
    const dbStatusToOnChain: Record<string, OnChainProductStatus> = {
      REGISTERED: OnChainProductStatus.REGISTERED,
      QUALITY_CHECKED: OnChainProductStatus.QUALITY_CHECKED,
      READY_TO_SHIP: OnChainProductStatus.READY_TO_SHIP,
      SHIPPED: OnChainProductStatus.SHIPPED,
      IN_TRANSIT: OnChainProductStatus.IN_TRANSIT,
      RECEIVED: OnChainProductStatus.RECEIVED,
      STORED: OnChainProductStatus.STORED,
      SOLD: OnChainProductStatus.SOLD,
      RECALLED: OnChainProductStatus.RECALLED,
    };

    const expectedOnChain = dbStatusToOnChain[dbStatus];
    const isMismatch = expectedOnChain !== undefined && expectedOnChain !== onChainStatus;

    if (isMismatch) {
      this.logger.warn(
        `[StateMachine] BLOCKCHAIN_STATE_MISMATCH detected!\n` +
          `  Product: ${productCode} (DB: ${productDbId})\n` +
          `  Blockchain Product ID: ${blockchainProductId ?? 'N/A'}\n` +
          `  Requested Action: ${action ?? 'N/A'}\n` +
          `  Contract Address: ${contractAddress ?? 'N/A'}\n` +
          `  Database Status: ${dbStatus} (expected on-chain: ${expectedOnChain})\n` +
          `  Actual Blockchain Status: ${onChainStatus} (${this.getStatusName(onChainStatus)})\n` +
          `  BLOCKCHAIN_STATE_MISMATCH: transaction rejected.`,
      );
      throw new ConflictException({
        code: 'BLOCKCHAIN_STATE_MISMATCH',
        message: `สถานะสินค้า ${productCode} ในฐานข้อมูล (${dbStatus}) ไม่ตรงกับ Blockchain (${this.getStatusName(onChainStatus)}) กรุณาตรวจสอบข้อมูลก่อนดำเนินการ`,
      });
    }

    return isMismatch;
  }
}
