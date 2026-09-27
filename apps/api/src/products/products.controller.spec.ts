import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { PublicProductsController } from './public-products.controller';
import { ProductsService } from './products.service';
import { QualityChecksService } from '../quality-checks/quality-checks.service';
import { ShipmentsService } from '../shipments/shipments.service';
import { UserRole } from '@prisma/client';
import { GoneException } from '@nestjs/common';

describe('ProductsController & PublicProductsController', () => {
  let controller: ProductsController;
  let publicController: PublicProductsController;
  let service: any;
  let qcService: any;

  const mockUser = {
    id: 'user-1',
    role: UserRole.MANUFACTURER,
    organizationId: 'org-1',
  };

  const mockProduct = {
    id: 'prod-1',
    productCode: 'PRD-2026-0001',
    name: 'Sensor 1',
    status: 'REGISTERED',
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(mockProduct),
      findAll: jest.fn().mockResolvedValue({ data: [mockProduct], meta: {} }),
      findOne: jest.fn().mockResolvedValue(mockProduct),
      findByCode: jest.fn().mockResolvedValue(mockProduct),
      update: jest.fn().mockResolvedValue(mockProduct),
      registerOnBlockchain: jest.fn().mockResolvedValue(mockProduct),
      getHistory: jest
        .fn()
        .mockResolvedValue({ product: mockProduct, timeline: [] }),
      getQr: jest.fn().mockResolvedValue({
        qrCode: 'data:...',
        verificationUrl: 'http://...',
      }),
      remove: jest.fn().mockResolvedValue({ success: true }),
      verifyPublicProduct: jest
        .fn()
        .mockResolvedValue({ verified: true, product: mockProduct }),
    };

    qcService = {
      performQualityCheck: jest
        .fn()
        .mockResolvedValue({ status: 'QUALITY_CHECKED' }),
      findByProductId: jest.fn().mockResolvedValue({ data: [], meta: {} }),
    };

    const shipmentsService = {
      shipByProductId: jest.fn().mockResolvedValue({ status: 'SHIPPED' }),
      receiveByProductId: jest.fn().mockResolvedValue({ status: 'RECEIVED' }),
      transferOwnership: jest.fn().mockResolvedValue({ success: true }),
      findByProductId: jest.fn().mockResolvedValue({ data: [], meta: {} }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController, PublicProductsController],
      providers: [
        { provide: ProductsService, useValue: service },
        { provide: QualityChecksService, useValue: qcService },
        { provide: ShipmentsService, useValue: shipmentsService },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    publicController = module.get<PublicProductsController>(
      PublicProductsController,
    );
  });

  it('should call create service with dto and current user', async () => {
    const dto: any = {
      productCode: 'PRD-01',
      serialNumber: 'SN-01',
      name: 'Test',
    };
    const res = await controller.create(dto, mockUser);
    expect(res).toEqual(mockProduct);
    expect(service.create).toHaveBeenCalledWith(dto, mockUser);
  });

  it('should call findAll service with query and current user', async () => {
    const query: any = { page: 1, limit: 10 };
    const res = await controller.findAll(query, mockUser);
    expect(res.data).toHaveLength(1);
    expect(service.findAll).toHaveBeenCalledWith(query, mockUser);
  });

  it('should call findOne service with id and current user', async () => {
    const res = await controller.findOne('prod-1', mockUser);
    expect(res).toEqual(mockProduct);
    expect(service.findOne).toHaveBeenCalledWith('prod-1', mockUser);
  });

  it('should call findByCode service', async () => {
    const res = await controller.findByCode('PRD-2026-0001', mockUser);
    expect(res).toEqual(mockProduct);
    expect(service.findByCode).toHaveBeenCalledWith('PRD-2026-0001', mockUser);
  });

  it('should call update service with id, dto, and current user', async () => {
    const dto = { name: 'New Name' };
    const res = await controller.update('prod-1', dto, mockUser);
    expect(res).toEqual(mockProduct);
    expect(service.update).toHaveBeenCalledWith('prod-1', dto, mockUser);
  });

  it('rejects the legacy backend-signed registration route', async () => {
    await expect(
      controller.registerOnBlockchain('prod-1', {}, mockUser),
    ).rejects.toThrow(GoneException);
    expect(service.registerOnBlockchain).not.toHaveBeenCalled();
  });

  it('should call getHistory service', async () => {
    const res = await controller.getHistory('prod-1', mockUser);
    expect(res.product).toBeDefined();
    expect(service.getHistory).toHaveBeenCalledWith('prod-1', mockUser);
  });

  it('should call getQr service', async () => {
    const res = await controller.getQr('prod-1', mockUser);
    expect(res.qrCode).toBeDefined();
    expect(service.getQr).toHaveBeenCalledWith('prod-1', mockUser);
  });

  it('rejects the legacy backend-signed quality route', async () => {
    const dto: any = { result: 'PASSED', notes: 'Checked OK' };
    await expect(controller.qualityCheck('prod-1', dto, mockUser)).rejects.toThrow(GoneException);
    expect(qcService.performQualityCheck).not.toHaveBeenCalled();
  });

  it('should call getProductQualityChecks service with product id and current user', async () => {
    const res = await controller.getProductQualityChecks('prod-1', mockUser);
    expect(res).toEqual({ data: [], meta: {} });
    expect(qcService.findByProductId).toHaveBeenCalledWith('prod-1', mockUser);
  });

  it('should call remove service', async () => {
    const res = await controller.remove('prod-1', mockUser);
    expect(res.success).toBe(true);
    expect(service.remove).toHaveBeenCalledWith('prod-1', mockUser);
  });

  it('should verify public product without authentication via publicController', async () => {
    const res = await publicController.verifyProduct('PRD-2026-0001');
    expect(res.verified).toBe(true);
    expect(service.verifyPublicProduct).toHaveBeenCalledWith('PRD-2026-0001');
  });
});
