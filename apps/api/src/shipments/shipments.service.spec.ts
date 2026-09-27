import { Test, TestingModule } from '@nestjs/testing';
import { ShipmentsService } from './shipments.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ProductStateMachineService } from '../blockchain/product-state-machine.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  ProductStatus,
  ShipmentStatus,
  UserRole,
  OrganizationType,
} from '@prisma/client';

describe('ShipmentsService', () => {
  let service: ShipmentsService;
  let prisma: any;
  let blockchain: any;

  const mockSenderOrg = {
    id: 'org-sender-1',
    name: 'Apex Mfg',
    code: 'APEX',
    type: OrganizationType.MANUFACTURER,
    walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    status: 'ACTIVE',
  };

  const mockReceiverOrg = {
    id: 'org-receiver-2',
    name: 'Global Freight Dist',
    code: 'GFD',
    type: OrganizationType.DISTRIBUTOR,
    walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    status: 'ACTIVE',
  };

  const mockCarrierOrg = {
    id: 'org-carrier-3',
    name: 'FastHaul Logistics',
    code: 'FAST',
    type: OrganizationType.LOGISTICS,
    walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    status: 'ACTIVE',
  };

  const mockProduct = {
    id: 'prod-uuid-1',
    productCode: 'PRD-APEX-001',
    serialNumber: 'SN-APEX-001',
    name: 'Industrial Microcontroller',
    category: 'Hardware',
    status: ProductStatus.QUALITY_CHECKED,
    manufacturerId: mockSenderOrg.id,
    currentOwnerId: mockSenderOrg.id,
    blockchainProductId: '1',
    blockchainTxHash: '0xabc123',
    productHash: '0xhash123',
    manufacturer: mockSenderOrg,
    currentOwner: mockSenderOrg,
  };

  const mockSenderUser = {
    id: 'user-sender-1',
    email: 'mfg@apex.com',
    role: UserRole.MANUFACTURER,
    organizationId: mockSenderOrg.id,
    organization: mockSenderOrg,
    firstName: 'Alice',
    lastName: 'Shipper',
  };

  const mockReceiverUser = {
    id: 'user-receiver-2',
    email: 'receiver@gfd.com',
    role: UserRole.DISTRIBUTOR,
    organizationId: mockReceiverOrg.id,
    organization: mockReceiverOrg,
    firstName: 'Bob',
    lastName: 'Receiver',
  };

  const mockOtherUser = {
    id: 'user-other-9',
    email: 'intruder@other.com',
    role: UserRole.MANUFACTURER,
    organizationId: 'unrelated-org',
    organization: { id: 'unrelated-org', type: OrganizationType.MANUFACTURER },
  };

  const mockShipmentRecord = {
    id: 'shp-uuid-1',
    shipmentCode: 'SHP-2026-001',
    productId: mockProduct.id,
    senderOrganizationId: mockSenderOrg.id,
    receiverOrganizationId: mockReceiverOrg.id,
    carrierOrganizationId: mockCarrierOrg.id,
    origin: 'Bangkok Factory 1',
    destination: 'Chiang Mai Depot 2',
    status: ShipmentStatus.PENDING,
    blockchainShipmentId: '1',
    blockchainTxHash: '0xshptx123',
    shippedAt: null,
    receivedAt: null,
    product: mockProduct,
    sender: mockSenderOrg,
    receiver: mockReceiverOrg,
    carrier: mockCarrierOrg,
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      organization: {
        findFirst: jest.fn(),
      },
      shipment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      blockchainTransaction: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    blockchain = {
      createShipment: jest.fn().mockResolvedValue({
        txHash: '0xshptx123',
        blockNumber: 50,
        shipmentId: 1,
      }),
      shipProduct: jest.fn().mockResolvedValue({
        txHash: '0xdispatchtx456',
        blockNumber: 51,
      }),
      receiveProduct: jest.fn().mockResolvedValue({
        txHash: '0xreceivetx789',
        blockNumber: 52,
      }),
      transferOwnership: jest.fn().mockResolvedValue({
        txHash: '0xtransfertx999',
        blockNumber: 53,
      }),
      registerProduct: jest.fn().mockResolvedValue({
        txHash: '0xregtx000',
        blockNumber: 49,
        productId: 1,
      }),
      getProduct: jest.fn().mockResolvedValue({
        productId: 1,
        productCode: mockProduct.productCode,
        status: 1,
        currentOwner: mockSenderOrg.walletAddress,
      }),
      getShipment: jest.fn().mockResolvedValue({
        shipmentId: 1,
        productId: 1,
        status: 0,
      }),
      getShipmentByCode: jest.fn().mockResolvedValue({
        shipmentId: 1,
        productId: 1,
        status: 0,
      }),
      verifyShipmentExists: jest.fn().mockResolvedValue(true),
      verifyProductExists: jest.fn().mockResolvedValue(true),
      logTransactionAttempt: jest.fn(),
      getContractAddress: jest.fn().mockReturnValue('0xContractAddress'),
      getSigner: jest.fn().mockReturnValue({
        getAddress: jest.fn().mockResolvedValue(mockSenderOrg.walletAddress),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
        {
          provide: ProductStateMachineService,
          useValue: {
            checkStateMismatch: jest.fn().mockReturnValue(false),
            validateTransition: jest.fn(), // does not throw by default
            getStatusName: jest.fn().mockReturnValue('QUALITY_CHECKED'),
            getAllowedStates: jest.fn().mockReturnValue([1, 2, 6]),
          },
        },
      ],
    }).compile();

    service = module.get<ShipmentsService>(ShipmentsService);
  });

  describe('create', () => {
    it('successfully creates shipment, calls smart contract, and sets product to READY_TO_SHIP', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.organization.findFirst
        .mockResolvedValueOnce(mockReceiverOrg) // receiver
        .mockResolvedValueOnce(mockCarrierOrg); // carrier
      prisma.shipment.findUnique.mockResolvedValue(null); // uniqueness check
      prisma.shipment.create.mockResolvedValue(mockShipmentRecord);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.READY_TO_SHIP,
      });

      const res = await service.create(
        {
          productId: mockProduct.id,
          receiverOrganizationId: mockReceiverOrg.id,
          carrierOrganizationId: mockCarrierOrg.id,
          origin: 'Bangkok Factory 1',
          destination: 'Chiang Mai Depot 2',
          shipmentCode: 'SHP-2026-001',
        },
        mockSenderUser,
      );

      expect(blockchain.createShipment).toHaveBeenCalledWith(
        'SHP-2026-001',
        BigInt(1),
        mockReceiverOrg.walletAddress,
        mockCarrierOrg.walletAddress,
        undefined,
      );
      expect(prisma.shipment.create).toHaveBeenCalled();
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockProduct.id },
          data: { status: ProductStatus.READY_TO_SHIP },
        }),
      );
      expect(res.blockchain.status).toBe('CONFIRMED');
      expect(res.shipment.status).toBe(ShipmentStatus.PENDING);
    });

    it('rejects shipment creation if product is recalled', async () => {
      prisma.product.findFirst.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.RECALLED,
      });

      await expect(
        service.create(
          {
            productId: mockProduct.id,
            receiverOrganizationId: mockReceiverOrg.id,
            origin: 'BKK',
            destination: 'CNX',
          },
          mockSenderUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if sender is not the current product owner', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      await expect(
        service.create(
          {
            productId: mockProduct.id,
            receiverOrganizationId: mockReceiverOrg.id,
            origin: 'BKK',
            destination: 'CNX',
          },
          mockOtherUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects if receiver organization is same as sender', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.organization.findFirst.mockResolvedValue(mockSenderOrg); // same org

      await expect(
        service.create(
          {
            productId: mockProduct.id,
            receiverOrganizationId: mockSenderOrg.id,
            origin: 'BKK',
            destination: 'CNX',
          },
          mockSenderUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ship', () => {
    it('successfully dispatches shipment, executes on-chain ship, and updates status to SHIPPED', async () => {
      prisma.shipment.findFirst.mockResolvedValue(mockShipmentRecord);
      prisma.shipment.update.mockResolvedValue({
        ...mockShipmentRecord,
        status: ShipmentStatus.SHIPPED,
        shippedAt: new Date(),
      });
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.SHIPPED,
      });

      const res = await service.ship(
        mockShipmentRecord.id,
        { notes: 'Left warehouse' },
        mockSenderUser,
      );

      expect(blockchain.shipProduct).toHaveBeenCalledWith(
        BigInt(1),
        BigInt(1),
        undefined,
      );
      expect(prisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ShipmentStatus.SHIPPED }),
        }),
      );
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ProductStatus.SHIPPED },
        }),
      );
      expect(res.blockchain.status).toBe('CONFIRMED');
    });

    it('rejects dispatch if shipment is not in PENDING state', async () => {
      prisma.shipment.findFirst.mockResolvedValue({
        ...mockShipmentRecord,
        status: ShipmentStatus.DELIVERED,
      });

      await expect(
        service.ship(mockShipmentRecord.id, {}, mockSenderUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects dispatch if user is unrelated to sender, carrier, or logistics', async () => {
      prisma.shipment.findFirst.mockResolvedValue(mockShipmentRecord);

      await expect(
        service.ship(mockShipmentRecord.id, {}, mockOtherUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('receive', () => {
    it('successfully receives shipment, calls smart contract, and transfers product ownership to receiver', async () => {
      const shippedRecord = {
        ...mockShipmentRecord,
        status: ShipmentStatus.SHIPPED,
      };
      prisma.shipment.findFirst.mockResolvedValue(shippedRecord);
      blockchain.getShipment.mockResolvedValue({ shipmentId: 1, productId: 1, status: 1 });
      prisma.shipment.update.mockResolvedValue({
        ...shippedRecord,
        status: ShipmentStatus.DELIVERED,
        receivedAt: new Date(),
      });
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.RECEIVED,
        currentOwnerId: mockReceiverOrg.id,
      });

      const res = await service.receive(
        shippedRecord.id,
        { notes: 'Seals verified' },
        mockReceiverUser,
      );

      expect(blockchain.receiveProduct).toHaveBeenCalledWith(
        BigInt(1),
        BigInt(1),
        undefined,
      );
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: ProductStatus.RECEIVED,
            currentOwnerId: mockReceiverOrg.id,
          },
        }),
      );
      expect(res.product.currentOwnerId).toBe(mockReceiverOrg.id);
      expect(res.blockchain.status).toBe('CONFIRMED');
    });

    it('rejects receive if caller does not belong to receiver organization', async () => {
      const shippedRecord = {
        ...mockShipmentRecord,
        status: ShipmentStatus.SHIPPED,
      };
      prisma.shipment.findFirst.mockResolvedValue(shippedRecord);

      await expect(
        service.receive(shippedRecord.id, {}, mockSenderUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('transferOwnership', () => {
    it('explicitly transfers product ownership to a new organization on blockchain', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.organization.findFirst.mockResolvedValue(mockReceiverOrg);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        currentOwnerId: mockReceiverOrg.id,
      });

      const res = await service.transferOwnership(
        mockProduct.id,
        { newOwnerOrganizationId: mockReceiverOrg.id },
        mockSenderUser,
      );

      expect(blockchain.transferOwnership).toHaveBeenCalledWith(
        BigInt(1),
        mockReceiverOrg.walletAddress,
        undefined,
      );
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { currentOwnerId: mockReceiverOrg.id },
        }),
      );
      expect(res.product.currentOwnerId).toBe(mockReceiverOrg.id);
    });
  });

  describe('markInTransit', () => {
    it('advances product and shipment together after on-chain confirmation', async () => {
      const shipped = { ...mockShipmentRecord, status: ShipmentStatus.SHIPPED,
        product: { ...mockProduct, status: ProductStatus.SHIPPED } };
      prisma.shipment.findFirst.mockResolvedValue(shipped);
      prisma.shipment.update.mockResolvedValue({ ...shipped, status: ShipmentStatus.IN_TRANSIT });
      prisma.product.update.mockResolvedValue({ ...shipped.product, status: ProductStatus.IN_TRANSIT });
      blockchain.getProduct.mockResolvedValue({ productCode: mockProduct.productCode, status: 3 });
      blockchain.getShipment.mockResolvedValue({ productId: 1, status: 1 });
      blockchain.markInTransit = jest.fn().mockResolvedValue({ txHash: '0xintransit', blockNumber: 54 });

      const result = await service.markInTransit(shipped.id, {}, mockSenderUser);
      expect(blockchain.markInTransit).toHaveBeenCalledWith(BigInt(1), BigInt(1), undefined);
      expect(result.product.status).toBe(ProductStatus.IN_TRANSIT);
      expect(result.shipment.status).toBe(ShipmentStatus.IN_TRANSIT);
    });
  });
});
