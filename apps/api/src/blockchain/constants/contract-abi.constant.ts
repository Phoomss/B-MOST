// Auto-generated contract ABI from SupplyChainRegistry.json
export const SUPPLY_CHAIN_REGISTRY_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'initialAdmin',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'AccessControlBadConfirmation',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'neededRole',
        type: 'bytes32',
      },
    ],
    name: 'AccessControlUnauthorizedAccount',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'recalledBy',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'reason',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'ProductRecalled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'shipmentId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'receiver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'ProductReceived',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'productCode',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'productHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'manufacturer',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'ProductRegistered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'shipmentId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'ProductShipped',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'seller',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'ProductSold',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'ProductStored',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'inspector',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'passed',
        type: 'bool',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'notes',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'QualityChecked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'previousAdminRole',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'newAdminRole',
        type: 'bytes32',
      },
    ],
    name: 'RoleAdminChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
    ],
    name: 'RoleGranted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
    ],
    name: 'RoleRevoked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'shipmentId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'shipmentCode',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'receiver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'carrier',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'ShipmentCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'shipmentId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'carrier',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'ShipmentInTransit',
    type: 'event',
  },
  {
    inputs: [],
    name: 'AUDITOR_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DISTRIBUTOR_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'LOGISTICS_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MANUFACTURER_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'RETAILER_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'WAREHOUSE_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'shipmentCode',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'receiver',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'carrier',
        type: 'address',
      },
    ],
    name: 'createShipment',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
    ],
    name: 'getProduct',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'productId',
            type: 'uint256',
          },
          {
            internalType: 'string',
            name: 'productCode',
            type: 'string',
          },
          {
            internalType: 'bytes32',
            name: 'productHash',
            type: 'bytes32',
          },
          {
            internalType: 'address',
            name: 'manufacturer',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'currentOwner',
            type: 'address',
          },
          {
            internalType: 'enum SupplyChainRegistry.ProductStatus',
            name: 'status',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'registeredAt',
            type: 'uint256',
          },
        ],
        internalType: 'struct SupplyChainRegistry.Product',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'productCode',
        type: 'string',
      },
    ],
    name: 'getProductByCode',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'productId',
            type: 'uint256',
          },
          {
            internalType: 'string',
            name: 'productCode',
            type: 'string',
          },
          {
            internalType: 'bytes32',
            name: 'productHash',
            type: 'bytes32',
          },
          {
            internalType: 'address',
            name: 'manufacturer',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'currentOwner',
            type: 'address',
          },
          {
            internalType: 'enum SupplyChainRegistry.ProductStatus',
            name: 'status',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'registeredAt',
            type: 'uint256',
          },
        ],
        internalType: 'struct SupplyChainRegistry.Product',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
    ],
    name: 'getProductHistory',
    outputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'eventType',
            type: 'string',
          },
          {
            internalType: 'address',
            name: 'actor',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'timestamp',
            type: 'uint256',
          },
          {
            internalType: 'string',
            name: 'details',
            type: 'string',
          },
        ],
        internalType: 'struct SupplyChainRegistry.ProductEventRecord[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
    ],
    name: 'getQualityChecks',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'checkId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'productId',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'inspector',
            type: 'address',
          },
          {
            internalType: 'bool',
            name: 'passed',
            type: 'bool',
          },
          {
            internalType: 'string',
            name: 'notes',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'checkedAt',
            type: 'uint256',
          },
        ],
        internalType: 'struct SupplyChainRegistry.QualityCheck[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
    ],
    name: 'getRoleAdmin',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'shipmentId',
        type: 'uint256',
      },
    ],
    name: 'getShipment',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'shipmentId',
            type: 'uint256',
          },
          {
            internalType: 'string',
            name: 'shipmentCode',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'productId',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'sender',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'receiver',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'carrier',
            type: 'address',
          },
          {
            internalType: 'enum SupplyChainRegistry.ShipmentStatus',
            name: 'status',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'createdAt',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'shippedAt',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'receivedAt',
            type: 'uint256',
          },
        ],
        internalType: 'struct SupplyChainRegistry.Shipment',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'shipmentCode',
        type: 'string',
      },
    ],
    name: 'getShipmentByCode',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'shipmentId',
            type: 'uint256',
          },
          {
            internalType: 'string',
            name: 'shipmentCode',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'productId',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'sender',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'receiver',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'carrier',
            type: 'address',
          },
          {
            internalType: 'enum SupplyChainRegistry.ShipmentStatus',
            name: 'status',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'createdAt',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'shippedAt',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'receivedAt',
            type: 'uint256',
          },
        ],
        internalType: 'struct SupplyChainRegistry.Shipment',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalProducts',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalShipments',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'hasRole',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
    ],
    name: 'markAsSold',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'shipmentId',
        type: 'uint256',
      },
    ],
    name: 'markInTransit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'reason',
        type: 'string',
      },
    ],
    name: 'recallProduct',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'shipmentId',
        type: 'uint256',
      },
    ],
    name: 'receiveProduct',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        internalType: 'bool',
        name: 'passed',
        type: 'bool',
      },
      {
        internalType: 'string',
        name: 'notes',
        type: 'string',
      },
    ],
    name: 'recordQualityCheck',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'productCode',
        type: 'string',
      },
      {
        internalType: 'bytes32',
        name: 'productHash',
        type: 'bytes32',
      },
    ],
    name: 'registerProduct',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'callerConfirmation',
        type: 'address',
      },
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'shipmentId',
        type: 'uint256',
      },
    ],
    name: 'shipProduct',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
    ],
    name: 'storeProduct',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: 'interfaceId',
        type: 'bytes4',
      },
    ],
    name: 'supportsInterface',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'productId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
