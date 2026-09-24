import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: any;

  const mockUser = {
    id: 'user-admin-1',
    role: 'SUPER_ADMIN',
  };

  const mockStats = {
    totalProducts: 40,
    inTransit: 8,
    received: 20,
    sold: 10,
    recalled: 2,
    activeShipments: 6,
    blockchainTransactions: 75,
  };

  const mockCharts = {
    productStatus: [],
    shipmentActivity: [],
    organizationActivity: [],
    blockchainActivity: {
      totalTransactions: 75,
      confirmedTransactions: 70,
      pendingTransactions: 5,
      failedTransactions: 0,
      recentTransactions: [],
      dailyTrend: [],
    },
  };

  const mockActivity = [
    {
      id: 'act-1',
      type: 'PRODUCT_CREATED',
      title: 'Product Registered',
      description: 'Acme registered item',
      timestamp: '2026-09-24T10:00:00.000Z',
      badgeColor: 'blue',
    },
  ];

  beforeEach(async () => {
    service = {
      getStatistics: jest.fn().mockResolvedValue(mockStats),
      getCharts: jest.fn().mockResolvedValue(mockCharts),
      getRecentActivity: jest.fn().mockResolvedValue(mockActivity),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: service }],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('should call getStatistics with current user', async () => {
    const res = await controller.getStatistics(mockUser);
    expect(res).toEqual(mockStats);
    expect(service.getStatistics).toHaveBeenCalledWith(mockUser);
  });

  it('should call getCharts with current user', async () => {
    const res = await controller.getCharts(mockUser);
    expect(res).toEqual(mockCharts);
    expect(service.getCharts).toHaveBeenCalledWith(mockUser);
  });

  it('should call getRecentActivity with current user', async () => {
    const res = await controller.getRecentActivity(mockUser);
    expect(res).toEqual(mockActivity);
    expect(service.getRecentActivity).toHaveBeenCalledWith(mockUser);
  });
});
