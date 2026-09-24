import { Test, TestingModule } from '@nestjs/testing';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';
import { ShipmentStatus } from '@prisma/client';

describe('ShipmentsController', () => {
  let controller: ShipmentsController;
  let service: any;

  const mockUser = {
    id: 'user-1',
    role: 'MANUFACTURER',
    organizationId: 'org-1',
  };

  const mockShipment = {
    id: 'shp-1',
    shipmentCode: 'SHP-001',
    productId: 'prod-1',
    status: ShipmentStatus.PENDING,
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(mockShipment),
      findAll: jest.fn().mockResolvedValue({
        data: [mockShipment],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      }),
      findOne: jest.fn().mockResolvedValue(mockShipment),
      ship: jest.fn().mockResolvedValue({ status: ShipmentStatus.SHIPPED }),
      receive: jest
        .fn()
        .mockResolvedValue({ status: ShipmentStatus.DELIVERED }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShipmentsController],
      providers: [
        {
          provide: ShipmentsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<ShipmentsController>(ShipmentsController);
  });

  it('creates shipment via POST /shipments', async () => {
    const dto = {
      productId: 'prod-1',
      receiverOrganizationId: 'org-2',
      origin: 'BKK',
      destination: 'CNX',
    };
    const res = await controller.create(dto, mockUser);
    expect(service.create).toHaveBeenCalledWith(dto, mockUser);
    expect(res).toEqual(mockShipment);
  });

  it('lists shipments via GET /shipments', async () => {
    const query = { page: 1, limit: 10 };
    const res = await controller.findAll(query, mockUser);
    expect(service.findAll).toHaveBeenCalledWith(query, mockUser);
    expect(res.data).toHaveLength(1);
  });

  it('gets single shipment via GET /shipments/:id', async () => {
    const res = await controller.findOne('shp-1', mockUser);
    expect(service.findOne).toHaveBeenCalledWith('shp-1', mockUser);
    expect(res.id).toBe('shp-1');
  });

  it('dispatches shipment via POST /shipments/:id/ship', async () => {
    const res = await controller.ship('shp-1', {}, mockUser);
    expect(service.ship).toHaveBeenCalledWith('shp-1', {}, mockUser);
    expect(res.status).toBe(ShipmentStatus.SHIPPED);
  });

  it('receives shipment via POST /shipments/:id/receive', async () => {
    const res = await controller.receive('shp-1', {}, mockUser);
    expect(service.receive).toHaveBeenCalledWith('shp-1', {}, mockUser);
    expect(res.status).toBe(ShipmentStatus.DELIVERED);
  });
});
