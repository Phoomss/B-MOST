import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationStatus, OrganizationType, UserRole } from '@prisma/client';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: PrismaService;

  const mockOrg = {
    id: 'org-uuid-1',
    name: 'Acme Manufacturing Corp',
    code: 'ACME',
    type: OrganizationType.MANUFACTURER,
    address: '123 Industrial Way',
    contactEmail: 'contact@acme.com',
    phone: '+1-555-0100',
    walletAddress: '0x1111111111111111111111111111111111111111',
    status: OrganizationStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
    _count: { users: 2, manufacturedProducts: 5, ownedProducts: 5 },
  };

  const mockSuperAdmin = {
    id: 'user-admin',
    email: 'admin@bmost.io',
    role: UserRole.SUPER_ADMIN,
    organizationId: null,
  };

  const mockOrgUser = {
    id: 'user-org',
    email: 'worker@acme.com',
    role: UserRole.ORG_ADMIN,
    organizationId: 'org-uuid-1',
  };

  const mockOtherOrgUser = {
    id: 'user-other',
    email: 'other@dist.com',
    role: UserRole.ORG_ADMIN,
    organizationId: 'org-uuid-2',
  };

  const mockPrisma = {
    organization: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an organization when code and wallet are unique', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue(mockOrg);

      const result = await service.create(
        {
          name: 'Acme Manufacturing Corp',
          code: 'ACME',
          type: OrganizationType.MANUFACTURER,
          walletAddress: '0x1111111111111111111111111111111111111111',
        },
        mockSuperAdmin,
      );

      expect(result).toBeDefined();
      expect(result.code).toBe('ACME');
      expect(mockPrisma.organization.create).toHaveBeenCalled();
    });

    it('should reject with ConflictException if code already exists', async () => {
      mockPrisma.organization.findUnique.mockResolvedValueOnce(mockOrg);

      await expect(
        service.create(
          {
            name: 'Another Acme',
            code: 'ACME',
            type: OrganizationType.MANUFACTURER,
          },
          mockSuperAdmin,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject with ConflictException if wallet address is taken', async () => {
      mockPrisma.organization.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockOrg);

      await expect(
        service.create(
          {
            name: 'Different Org',
            code: 'DIFF',
            type: OrganizationType.DISTRIBUTOR,
            walletAddress: '0x1111111111111111111111111111111111111111',
          },
          mockSuperAdmin,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll (Organization Isolation)', () => {
    it('should allow SUPER_ADMIN to see all organizations', async () => {
      mockPrisma.organization.count.mockResolvedValue(1);
      mockPrisma.organization.findMany.mockResolvedValue([mockOrg]);

      const result = await service.findAll({}, mockSuperAdmin);

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ id: 'org-uuid-1' }),
        }),
      );
    });

    it('should restrict standard organization user to ONLY their own organization', async () => {
      mockPrisma.organization.count.mockResolvedValue(1);
      mockPrisma.organization.findMany.mockResolvedValue([mockOrg]);

      const result = await service.findAll({}, mockOrgUser);

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'org-uuid-1' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return organization if user belongs to it', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await service.findOne('org-uuid-1', mockOrgUser);
      expect(result.id).toBe('org-uuid-1');
    });

    it('should forbid user from accessing other organization details with ForbiddenException', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

      await expect(service.findOne('org-uuid-1', mockOtherOrgUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if organization does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockSuperAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should allow SUPER_ADMIN to change organization status', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrisma.organization.update.mockResolvedValue({
        ...mockOrg,
        status: OrganizationStatus.SUSPENDED,
      });

      const updated = await service.updateStatus(
        'org-uuid-1',
        { status: OrganizationStatus.SUSPENDED },
        mockSuperAdmin,
      );

      expect(updated.status).toBe(OrganizationStatus.SUSPENDED);
    });

    it('should forbid non-SUPER_ADMIN user from changing status', async () => {
      await expect(
        service.updateStatus(
          'org-uuid-1',
          { status: OrganizationStatus.SUSPENDED },
          mockOrgUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
