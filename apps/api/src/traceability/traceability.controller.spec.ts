import { Test, TestingModule } from '@nestjs/testing';
import { TraceabilityController } from './traceability.controller';
import { TraceabilityService } from './traceability.service';

describe('TraceabilityController', () => {
  let controller: TraceabilityController;
  let service: any;

  const mockUser = {
    id: 'user-1',
    role: 'AUDITOR',
    organizationId: 'org-1',
  };

  const mockTraceabilityResult = {
    product: {
      id: 'prod-1',
      productCode: 'PRD-001',
      serialNumber: 'SN-001',
      name: 'Microcontroller',
      status: 'QUALITY_CHECKED',
    },
    currentOwner: { id: 'org-1', name: 'Apex Mfg' },
    manufacturer: { id: 'org-1', name: 'Apex Mfg' },
    events: [
      {
        id: 'reg-prod-1',
        eventType: 'PRODUCT_REGISTERED',
        title: 'Product Registered',
        actor: 'Apex Mfg',
        timestamp: '2026-01-01T00:00:00.000Z',
      },
    ],
    ownershipHistory: [],
    blockchainVerification: {
      verified: true,
      hashMatch: true,
      onChainProductId: 1,
    },
  };

  beforeEach(async () => {
    service = {
      getTraceability: jest.fn().mockResolvedValue(mockTraceabilityResult),
      search: jest.fn().mockResolvedValue([mockTraceabilityResult.product]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TraceabilityController],
      providers: [
        {
          provide: TraceabilityService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<TraceabilityController>(TraceabilityController);
  });

  it('delegates search query to service.search', async () => {
    const query = { search: 'PRD-001' };
    const res = await controller.search(query, mockUser);
    expect(service.search).toHaveBeenCalledWith(query, mockUser);
    expect(res).toEqual([mockTraceabilityResult.product]);
  });

  it('delegates getTraceability to service.getTraceability', async () => {
    const res = await controller.getTraceability('PRD-001', mockUser);
    expect(service.getTraceability).toHaveBeenCalledWith('PRD-001', mockUser);
    expect(res).toEqual(mockTraceabilityResult);
    expect(res.events).toHaveLength(1);
    expect(res.blockchainVerification.verified).toBe(true);
  });
});
