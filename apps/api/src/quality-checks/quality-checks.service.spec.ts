import { Test, TestingModule } from '@nestjs/testing';
import { QualityChecksService } from './quality-checks.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProductStatus,
  QualityCheckResult,
  UserRole,
  OrganizationType,
} from '@prisma/client';

describe('QualityChecksService', () => {
  let service: QualityChecksService;
  let prisma: any;
  let blockchain: any;

  const mockProduct = {
    id: 'prod-uuid-1',
    productCode: 'PRD-APEX-001',
    serialNumber: 'SN-APEX-001',
    name: 'Industrial Microcontroller',
    category: 'Hardware',
    status: ProductStatus.REGISTERED,
    manufacturerId: 'org-mfg-1',
    currentOwnerId: 'org-mfg-1',
    blockchainProductId: '1',
    blockchainTxHash: '0xabc123',
    productHash: '0xhash123',
    manufacturer: {
      id: 'org-mfg-1',
      name: 'Apex Mfg',
      code: 'APEX',
      type: OrganizationType.MANUFACTURER,
    },
    currentOwner: {
      id: 'org-mfg-1',
      name: 'Apex Mfg',
      code: 'APEX',
      type: OrganizationType.MANUFACTURER,
    },
  };

  const mockAuditorUser = {
    id: 'user-auditor-1',
    email: 'auditor@quality.org',
    role: UserRole.AUDITOR,
    organizationId: 'org-auditor-1',
    organization: {
      id: 'org-auditor-1',
      type: OrganizationType.AUDITOR,
    },
    firstName: 'Alice',
    lastName: 'Auditor',
  };

  const mockMfgUser = {
    id: 'user-mfg-1',
    email: 'mfg@apex.com',
    role: UserRole.MANUFACTURER,
    organizationId: 'org-mfg-1',
    organization: {
      id: 'org-mfg-1',
      type: OrganizationType.MANUFACTURER,
    },
    firstName: 'Bob',
    lastName: 'Builder',
  };

  const mockOtherUser = {
    id: 'user-other-1',
    email: 'intruder@other.com',
    role: UserRole.MANUFACTURER,
    organizationId: 'org-other-2',
    organization: {
      id: 'org-other-2',
      type: OrganizationType.MANUFACTURER,
    },
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      qualityCheck: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      blockchainTransaction: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    blockchain = {
      recordQualityCheck: jest.fn().mockResolvedValue({
        txHash: '0xqc_tx_hash_123',
        blockNumber: 42,
      }),
      registerProduct: jest.fn().mockResolvedValue({
        txHash: '0xreg_tx_hash_456',
        blockNumber: 41,
        productId: 1,
      }),
      getContractAddress: jest.fn().mockReturnValue('0xContractAddress'),
      getSigner: jest.fn().mockReturnValue({
        getAddress: jest.fn().mockResolvedValue('0xSignerAddress'),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualityChecksService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
      ],
    }).compile();

    service = module.get<QualityChecksService>(QualityChecksService);
  });

  describe('performQualityCheck', () => {
    it('successfully records PASSED quality check and updates status to QUALITY_CHECKED', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      const createdQC = {
        id: 'qc-uuid-1',
        productId: mockProduct.id,
        organizationId: mockAuditorUser.organizationId,
        inspectorName: 'Alice Auditor',
        result: QualityCheckResult.PASSED,
        notes: 'Passed all voltage & load tests',
        blockchainTxHash: '0xqc_tx_hash_123',
        createdAt: new Date(),
        product: mockProduct,
        organization: mockAuditorUser.organization,
      };
      prisma.qualityCheck.create.mockResolvedValue(createdQC);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.QUALITY_CHECKED,
      });

      const result = await service.performQualityCheck(
        mockProduct.id,
        {
          result: 'PASS',
          inspectorName: 'Alice Auditor',
          notes: 'Passed all voltage & load tests',
        } as any,
        mockAuditorUser,
      );

      expect(blockchain.recordQualityCheck).toHaveBeenCalledWith(
        BigInt(1),
        true,
        'Passed all voltage & load tests',
        undefined,
      );
      expect(prisma.qualityCheck.create).toHaveBeenCalled();
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockProduct.id },
          data: { status: ProductStatus.QUALITY_CHECKED },
        }),
      );
      expect(prisma.blockchainTransaction.upsert).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
      expect(result.blockchain.txHash).toBe('0xqc_tx_hash_123');
      expect(result.product.status).toBe(ProductStatus.QUALITY_CHECKED);
    });

    it('successfully records FAILED quality check and marks product as RECALLED', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      const createdQC = {
        id: 'qc-uuid-fail',
        productId: mockProduct.id,
        organizationId: mockAuditorUser.organizationId,
        inspectorName: 'Alice Auditor',
        result: QualityCheckResult.FAILED,
        notes: 'Critical component defect detected',
        blockchainTxHash: '0xqc_tx_hash_fail',
        createdAt: new Date(),
        product: mockProduct,
        organization: mockAuditorUser.organization,
      };
      prisma.qualityCheck.create.mockResolvedValue(createdQC);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.RECALLED,
      });

      const result = await service.performQualityCheck(
        mockProduct.id,
        {
          result: 'FAILED',
          inspectorName: 'Alice Auditor',
          notes: 'Critical component defect detected',
        },
        mockAuditorUser,
      );

      expect(blockchain.recordQualityCheck).toHaveBeenCalledWith(
        BigInt(1),
        false,
        'Critical component defect detected',
        undefined,
      );
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockProduct.id },
          data: { status: ProductStatus.RECALLED },
        }),
      );
      expect(result.product.status).toBe(ProductStatus.RECALLED);
    });

    it('auto-registers product on blockchain before QC if not yet registered', async () => {
      const unregisteredProduct = {
        ...mockProduct,
        blockchainProductId: null,
        blockchainTxHash: null,
      };
      prisma.product.findFirst.mockResolvedValue(unregisteredProduct);
      prisma.product.update.mockResolvedValue({
        ...unregisteredProduct,
        blockchainProductId: '1',
        status: ProductStatus.QUALITY_CHECKED,
      });
      prisma.qualityCheck.create.mockResolvedValue({
        id: 'qc-auto-reg',
        result: QualityCheckResult.PASSED,
      });

      await service.performQualityCheck(
        unregisteredProduct.id,
        { result: 'PASS' } as any,
        mockMfgUser,
      );

      expect(blockchain.registerProduct).toHaveBeenCalled();
    });

    it('uses existing blockchainProductId without calling registerProduct if product is already registered', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.qualityCheck.create.mockResolvedValue({
        id: 'qc-existing-id',
        result: QualityCheckResult.PASSED,
      });
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.QUALITY_CHECKED,
      });

      await service.performQualityCheck(
        mockProduct.id,
        { result: 'PASS' } as any,
        mockMfgUser,
      );

      expect(blockchain.registerProduct).not.toHaveBeenCalled();
      expect(blockchain.recordQualityCheck).toHaveBeenCalledWith(
        BigInt(1),
        true,
        '',
        undefined,
      );
    });

    it('throws ConflictException if onChainProductId is already assigned to another product in database', async () => {
      const unregisteredProduct = {
        ...mockProduct,
        id: 'prod-uuid-new',
        productCode: 'PRD-APEX-NEW',
        blockchainProductId: null,
        blockchainTxHash: null,
      };
      prisma.product.findFirst.mockResolvedValue(unregisteredProduct);
      prisma.product.findUnique.mockImplementation(({ where }: any) => {
        if (where.blockchainProductId === '1') {
          return Promise.resolve({
            id: 'other-existing-prod',
            productCode: 'PRD-EXISTING',
          });
        }
        return Promise.resolve(null);
      });

      await expect(
        service.performQualityCheck(
          unregisteredProduct.id,
          { result: 'PASS' } as any,
          mockMfgUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('handles concurrent P2002 gracefully if product was already updated with the same blockchainProductId', async () => {
      const unregisteredProduct = {
        ...mockProduct,
        blockchainProductId: null,
        blockchainTxHash: null,
      };
      prisma.product.findFirst.mockResolvedValue(unregisteredProduct);
      let findUniqueCallCount = 0;
      prisma.product.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === unregisteredProduct.id) {
          findUniqueCallCount++;
          if (findUniqueCallCount === 1) {
            return Promise.resolve({
              ...unregisteredProduct,
              blockchainProductId: null,
            });
          }
          return Promise.resolve({
            ...unregisteredProduct,
            blockchainProductId: '1',
          });
        }
        return Promise.resolve(null);
      });
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`blockchainProductId`)',
        { code: 'P2002', clientVersion: '6.19.3' },
      );
      prisma.product.update
        .mockRejectedValueOnce(p2002Error) // First update for blockchainProductId throws P2002
        .mockResolvedValueOnce({
          ...unregisteredProduct,
          blockchainProductId: '1',
          status: ProductStatus.QUALITY_CHECKED,
        }); // Second update for status succeeds
      prisma.qualityCheck.create.mockResolvedValue({
        id: 'qc-uuid-concurrent',
        result: QualityCheckResult.PASSED,
      });

      const res = await service.performQualityCheck(
        unregisteredProduct.id,
        { result: 'PASS' } as any,
        mockMfgUser,
      );

      expect(res).toBeDefined();
      expect(blockchain.recordQualityCheck).toHaveBeenCalledWith(
        BigInt(1),
        true,
        '',
        undefined,
      );
    });

    it('throws NotFoundException if target product does not exist', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.performQualityCheck(
          'non-existent-id',
          { result: 'PASS' } as any,
          mockAuditorUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if product is already RECALLED', async () => {
      prisma.product.findFirst.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.RECALLED,
      });

      await expect(
        service.performQualityCheck(
          mockProduct.id,
          { result: 'PASS' } as any,
          mockAuditorUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if product is already SOLD', async () => {
      prisma.product.findFirst.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.SOLD,
      });

      await expect(
        service.performQualityCheck(
          mockProduct.id,
          { result: 'PASS' } as any,
          mockAuditorUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if non-auditor user from unrelated organization attempts QC', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      await expect(
        service.performQualityCheck(
          mockProduct.id,
          { result: 'PASS' } as any,
          mockOtherUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException for invalid result input', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      await expect(
        service.performQualityCheck(
          mockProduct.id,
          { result: 'INVALID_VERDICT' as any },
          mockAuditorUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('returns paginated quality checks with total pages', async () => {
      prisma.qualityCheck.count.mockResolvedValue(1);
      prisma.qualityCheck.findMany.mockResolvedValue([
        {
          id: 'qc-1',
          result: QualityCheckResult.PASSED,
          product: mockProduct,
        },
      ]);

      const res = await service.findAll(
        { page: 1, limit: 10, result: 'PASSED' },
        mockAuditorUser,
      );

      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
      expect(res.meta.totalPages).toBe(1);
    });

    it('applies tenant isolation for regular tenant user', async () => {
      prisma.qualityCheck.count.mockResolvedValue(0);
      prisma.qualityCheck.findMany.mockResolvedValue([]);

      await service.findAll({}, mockMfgUser);

      expect(prisma.qualityCheck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { organizationId: mockMfgUser.organizationId },
              { product: { manufacturerId: mockMfgUser.organizationId } },
              { product: { currentOwnerId: mockMfgUser.organizationId } },
            ],
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns quality check if authorized', async () => {
      const mockQC = {
        id: 'qc-1',
        organizationId: mockMfgUser.organizationId,
        product: mockProduct,
      };
      prisma.qualityCheck.findUnique.mockResolvedValue(mockQC);

      const res = await service.findOne('qc-1', mockMfgUser);
      expect(res.id).toBe('qc-1');
    });

    it('throws NotFoundException if QC record does not exist', async () => {
      prisma.qualityCheck.findUnique.mockResolvedValue(null);

      await expect(service.findOne('qc-none', mockAuditorUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if tenant user views unrelated inspection', async () => {
      const mockQC = {
        id: 'qc-1',
        organizationId: 'other-org',
        product: {
          manufacturerId: 'other-org',
          currentOwnerId: 'other-org',
        },
      };
      prisma.qualityCheck.findUnique.mockResolvedValue(mockQC);

      await expect(service.findOne('qc-1', mockMfgUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
