import { Test, TestingModule } from '@nestjs/testing';
import { QualityChecksController } from './quality-checks.controller';
import { QualityChecksService } from './quality-checks.service';
import { QualityCheckResult } from '@prisma/client';

describe('QualityChecksController', () => {
  let controller: QualityChecksController;
  let service: any;

  const mockUser = {
    id: 'user-1',
    role: 'AUDITOR',
    organizationId: 'org-1',
  };

  const mockQC = {
    id: 'qc-1',
    productId: 'prod-1',
    result: QualityCheckResult.PASSED,
    inspectorName: 'Auditor Jane',
    notes: 'Meets ISO benchmarks',
    blockchainTxHash: '0xtx123',
  };

  beforeEach(async () => {
    service = {
      performQualityCheck: jest.fn().mockResolvedValue({
        qualityCheck: mockQC,
        blockchain: { txHash: '0xtx123', status: 'CONFIRMED' },
      }),
      findAll: jest.fn().mockResolvedValue({
        data: [mockQC],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      }),
      findOne: jest.fn().mockResolvedValue(mockQC),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QualityChecksController],
      providers: [
        {
          provide: QualityChecksService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<QualityChecksController>(QualityChecksController);
  });

  it('creates a quality check inspection via POST /quality-checks', async () => {
    const dto = {
      productId: 'prod-1',
      result: QualityCheckResult.PASSED,
      notes: 'Meets ISO benchmarks',
    };

    const res = await controller.create(dto, mockUser);
    expect(service.performQualityCheck).toHaveBeenCalledWith(
      'prod-1',
      dto,
      mockUser,
    );
    expect(res.qualityCheck.id).toBe('qc-1');
  });

  it('lists quality checks via GET /quality-checks', async () => {
    const query = { page: 1, limit: 10 };
    const res = await controller.findAll(query, mockUser);
    expect(service.findAll).toHaveBeenCalledWith(query, mockUser);
    expect(res.data).toHaveLength(1);
  });

  it('retrieves single quality check by ID via GET /quality-checks/:id', async () => {
    const res = await controller.findOne('qc-1', mockUser);
    expect(service.findOne).toHaveBeenCalledWith('qc-1', mockUser);
    expect(res.id).toBe('qc-1');
  });
});
