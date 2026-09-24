import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController', () => {
  let controller: AuditController;
  let service: any;

  const mockUser = {
    id: 'user-admin-uuid',
    role: 'SUPER_ADMIN',
  };

  const sampleResult = {
    data: [],
    meta: { total: 0, page: 1, limit: 20, totalPages: 1 },
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue(sampleResult),
      findOne: jest.fn().mockResolvedValue({ id: 'log-1' }),
      getFilterOptions: jest.fn().mockResolvedValue({
        actions: ['PRODUCT_CREATED'],
        entityTypes: ['Product'],
        organizations: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: service }],
    }).compile();

    controller = module.get<AuditController>(AuditController);
  });

  it('should call findAll with query and current user', async () => {
    const query = { page: 1, limit: 20 };
    const res = await controller.findAll(query, mockUser);
    expect(res).toEqual(sampleResult);
    expect(service.findAll).toHaveBeenCalledWith(query, mockUser);
  });

  it('should call getFilterOptions with current user', async () => {
    const res = await controller.getFilterOptions(mockUser);
    expect(res.actions).toContain('PRODUCT_CREATED');
    expect(service.getFilterOptions).toHaveBeenCalledWith(mockUser);
  });

  it('should call findOne with id and current user', async () => {
    const res = await controller.findOne('log-1', mockUser);
    expect(res).toEqual({ id: 'log-1' });
    expect(service.findOne).toHaveBeenCalledWith('log-1', mockUser);
  });
});
