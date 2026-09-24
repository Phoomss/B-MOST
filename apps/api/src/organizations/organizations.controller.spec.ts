import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationStatus, OrganizationType, UserRole } from '@prisma/client';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let service: OrganizationsService;

  const mockOrg = {
    id: 'org-uuid-1',
    name: 'Acme Manufacturing Corp',
    code: 'ACME',
    type: OrganizationType.MANUFACTURER,
    status: OrganizationStatus.ACTIVE,
  };

  const mockUser = {
    id: 'user-admin',
    email: 'admin@bmost.io',
    role: UserRole.SUPER_ADMIN,
    organizationId: null,
  };

  const mockOrganizationsService = {
    create: jest.fn().mockResolvedValue(mockOrg),
    findAll: jest.fn().mockResolvedValue({
      data: [mockOrg],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    }),
    findOne: jest.fn().mockResolvedValue(mockOrg),
    update: jest.fn().mockResolvedValue(mockOrg),
    updateStatus: jest.fn().mockResolvedValue({
      ...mockOrg,
      status: OrganizationStatus.SUSPENDED,
    }),
    getUsers: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: OrganizationsService,
          useValue: mockOrganizationsService,
        },
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
    service = module.get<OrganizationsService>(OrganizationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create organization', async () => {
      const dto = {
        name: 'Acme Manufacturing Corp',
        code: 'ACME',
        type: OrganizationType.MANUFACTURER,
      };
      const result = await controller.create(dto, mockUser);
      expect(result).toEqual(mockOrg);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser);
    });
  });

  describe('findAll', () => {
    it('should return list of organizations', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.findAll(query, mockUser);
      expect(result.data).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalledWith(query, mockUser);
    });
  });

  describe('findOne', () => {
    it('should return organization detail', async () => {
      const result = await controller.findOne('org-uuid-1', mockUser);
      expect(result).toEqual(mockOrg);
      expect(service.findOne).toHaveBeenCalledWith('org-uuid-1', mockUser);
    });
  });

  describe('updateStatus', () => {
    it('should update organization status', async () => {
      const result = await controller.updateStatus(
        'org-uuid-1',
        { status: OrganizationStatus.SUSPENDED },
        mockUser,
      );
      expect(result.status).toBe(OrganizationStatus.SUSPENDED);
      expect(service.updateStatus).toHaveBeenCalledWith(
        'org-uuid-1',
        { status: OrganizationStatus.SUSPENDED },
        mockUser,
      );
    });
  });
});
