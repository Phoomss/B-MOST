export const BLOCKCHAIN_EVENTS = {
  PRODUCT_REGISTERED: 'ProductRegistered',
  QUALITY_CHECKED: 'QualityChecked',
  SHIPMENT_CREATED: 'ShipmentCreated',
  PRODUCT_SHIPPED: 'ProductShipped',
  SHIPMENT_IN_TRANSIT: 'ShipmentInTransit',
  PRODUCT_RECEIVED: 'ProductReceived',
  PRODUCT_STORED: 'ProductStored',
  OWNERSHIP_TRANSFERRED: 'OwnershipTransferred',
  PRODUCT_SOLD: 'ProductSold',
  PRODUCT_RECALLED: 'ProductRecalled',
} as const;

export type BlockchainEventType =
  (typeof BLOCKCHAIN_EVENTS)[keyof typeof BLOCKCHAIN_EVENTS];

export const CONTRACT_ROLES = {
  DEFAULT_ADMIN_ROLE: 'DEFAULT_ADMIN_ROLE',
  MANUFACTURER_ROLE: 'MANUFACTURER_ROLE',
  DISTRIBUTOR_ROLE: 'DISTRIBUTOR_ROLE',
  WAREHOUSE_ROLE: 'WAREHOUSE_ROLE',
  RETAILER_ROLE: 'RETAILER_ROLE',
  LOGISTICS_ROLE: 'LOGISTICS_ROLE',
  AUDITOR_ROLE: 'AUDITOR_ROLE',
} as const;

export const PRODUCT_STATUS_MAP: Record<number, string> = {
  0: 'REGISTERED',
  1: 'QUALITY_CHECKED',
  2: 'READY_TO_SHIP',
  3: 'SHIPPED',
  4: 'IN_TRANSIT',
  5: 'RECEIVED',
  6: 'STORED',
  7: 'SOLD',
  8: 'RECALLED',
};

export const SHIPMENT_STATUS_MAP: Record<number, string> = {
  0: 'PENDING',
  1: 'SHIPPED',
  2: 'IN_TRANSIT',
  3: 'DELIVERED',
  4: 'CANCELLED',
};
