import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: any;

  const mockAdminUser = {
    id: 'user-admin-uuid',
    email: 'admin@bmost.io',
    role: UserRole.SUPER_ADMIN,
    organizationId: null,
  };

  const mockAuditorUser = {
    id: 'user-auditor-uuid',
    email: 'auditor@bmost.io',
    role: UserRole.AUDITOR,
    organizationId: 'org-auditor-uuid',
  };

  const mockOrgUser = {
    id: 'user-mfg-uuid',
    email: 'mfg@acme.com',
    role: UserRole.MANUFACTURER,
    organizationId: 'org-mfg-uuid',
  };

  const sampleAuditLog = {
    id: 'audit-log-1',
    userId: mockOrgUser.id,
    organizationId: mockOrgUser.organizationId,
    action: 'PRODUCT_CREATED',
    entityType: 'Product',
    entityId: 'prod-uuid-1',
    metadata: { productCode: 'PRD-APEX-001' },
    ipAddress: '127.0.0.1',
    createdAt: new Date('2026-09-24T10:00:00Z'),
    user: {
      id: mockOrgUser.id,
      email: mockOrgUser.email,
      firstName: 'Alice',
      lastName: 'Smith',
      role: mockOrgUser.role,
    },
    organization: {
      id: mockOrgUser.organizationId,
      name: 'Acme Electronics',
      code: 'ACME',
      type: 'MANUFACTURER',
    },
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'audit-log-new',
            ...data,
            createdAt: new Date(),
          }),
        ),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([sampleAuditLog]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === sampleAuditLog.id) return Promise.resolve(sampleAuditLog);
          return Promise.resolve(null);
        }),
      },
      organization: {
        findMany: jest.fn().mockResolvedValue([sampleAuditLog.organization]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('record', () => {
    it('creates an audit log entry with sanitized metadata and IP address', async () => {
      const res = await service.record({
        userId: mockOrgUser.id,
        organizationId: mockOrgUser.organizationId,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: mockOrgUser.id,
        metadata: {
          email: 'test@example.com',
          password: 'superSecretPassword123',
        },
        ipAddress: '192.168.1.10',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'USER_LOGIN',
            entityType: 'User',
            ipAddress: '192.168.1.10',
            metadata: {
              email: 'test@example.com',
              password: '[REDACTED]',
            },
          }),
        }),
      );
      expect(res).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('allows SUPER_ADMIN to query all audit logs across organizations', async () => {
      const res = await service.findAll({}, mockAdminUser);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });

    it('enforces organization isolation for regular organization users', async () => {
      const res = await service.findAll({}, mockOrgUser);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgUser.organizationId,
          }),
        }),
      );
      expect(res.data).toHaveLength(1);
    });

    it('applies filters by action, entityType, and date range', async () => {
      await service.findAll(
        {
          action: 'PRODUCT_CREATED',
          entityType: 'Product',
          dateFrom: '2026-09-01T00:00:00Z',
          dateTo: '2026-09-24T23:59:59Z',
          search: 'APEX',
        },
        mockAdminUser,
      );

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { equals: 'PRODUCT_CREATED' },
            entityType: { equals: 'Product' },
            createdAt: expect.objectContaining({
              gte: new Date('2026-09-01T00:00:00Z'),
              lte: new Date('2026-09-24T23:59:59Z'),
            }),
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns audit log for authorized auditor', async () => {
      const res = await service.findOne(sampleAuditLog.id, mockAuditorUser);
      expect(res).toEqual(sampleAuditLog);
    });

    it('allows current organization user to view own organization audit log', async () => {
      const res = await service.findOne(sampleAuditLog.id, mockOrgUser);
      expect(res).toEqual(sampleAuditLog);
    });

    it('forbids other organization user from viewing audit log', async () => {
      const otherOrgUser = {
        ...mockOrgUser,
        organizationId: 'other-org-uuid',
      };

      await expect(
        service.findOne(sampleAuditLog.id, otherOrgUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for non-existent audit log', async () => {
      await expect(
        service.findOne('non-existent-id', mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFilterOptions', () => {
    it('returns unique action and entity type lists', async () => {
      const res = await service.getFilterOptions(mockAdminUser);
      expect(res.actions).toContain('PRODUCT_CREATED');
      expect(res.entityTypes).toContain('Product');
      expect(res.organizations).toHaveLength(1);
    });
  });
});
