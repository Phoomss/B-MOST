import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BlockchainService } from '../src/blockchain/blockchain.service';
import { UserRole } from '@prisma/client';

describe('Audit Logs API Endpoints (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let adminToken: string;
  let mfgToken: string;
  let otherOrgToken: string;

  const mockAdminUser = {
    id: 'user-admin-uuid',
    email: 'admin@bmost.io',
    role: UserRole.SUPER_ADMIN,
    organizationId: null,
    status: 'ACTIVE',
    organization: null,
  };

  const mockMfgUser = {
    id: 'user-mfg-uuid',
    email: 'mfg@acme.com',
    role: UserRole.MANUFACTURER,
    organizationId: 'org-mfg-uuid',
    status: 'ACTIVE',
    organization: {
      id: 'org-mfg-uuid',
      name: 'Acme Electronics',
      code: 'ACME',
      type: 'MANUFACTURER',
    },
  };

  const mockOtherUser = {
    id: 'user-other-uuid',
    email: 'other@retail.com',
    role: UserRole.RETAILER,
    organizationId: 'org-other-uuid',
    status: 'ACTIVE',
    organization: {
      id: 'org-other-uuid',
      name: 'Retail Hub',
      code: 'RETL',
      type: 'RETAILER',
    },
  };

  const sampleAuditLog = {
    id: 'audit-uuid-1',
    userId: mockMfgUser.id,
    organizationId: mockMfgUser.organizationId,
    action: 'PRODUCT_CREATED',
    entityType: 'Product',
    entityId: 'prod-uuid-1',
    metadata: { productCode: 'PRD-APEX-001' },
    ipAddress: '127.0.0.1',
    createdAt: new Date('2026-09-24T10:00:00Z'),
    user: mockMfgUser,
    organization: mockMfgUser.organization,
  };

  const mockPrisma = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockAdminUser.id)
          return Promise.resolve(mockAdminUser);
        if (where.id === mockMfgUser.id) return Promise.resolve(mockMfgUser);
        if (where.id === mockOtherUser.id)
          return Promise.resolve(mockOtherUser);
        return Promise.resolve(null);
      }),
    },
    organization: {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockResolvedValue([mockMfgUser.organization]),
    },
    auditLog: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([sampleAuditLog]),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === sampleAuditLog.id)
          return Promise.resolve(sampleAuditLog);
        return Promise.resolve(null);
      }),
    },
  };

  const mockBlockchainService = {
    getContractAddress: jest.fn().mockReturnValue('0xMockContractAddress'),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(BlockchainService)
      .useValue(mockBlockchainService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    jwtService = moduleRef.get<JwtService>(JwtService);
    adminToken = jwtService.sign({
      sub: mockAdminUser.id,
      email: mockAdminUser.email,
      role: mockAdminUser.role,
      organizationId: mockAdminUser.organizationId,
    });
    mfgToken = jwtService.sign({
      sub: mockMfgUser.id,
      email: mockMfgUser.email,
      role: mockMfgUser.role,
      organizationId: mockMfgUser.organizationId,
    });
    otherOrgToken = jwtService.sign({
      sub: mockOtherUser.id,
      email: mockOtherUser.email,
      role: mockOtherUser.role,
      organizationId: mockOtherUser.organizationId,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/audit-logs', () => {
    it('rejects unauthenticated request with 401', async () => {
      await request(app.getHttpServer()).get('/api/audit-logs').expect(401);
    });

    it('returns paginated audit logs for SUPER_ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0].action).toEqual('PRODUCT_CREATED');
    });

    it('scopes query to organization for regular organization user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${mfgToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-mfg-uuid',
          }),
        }),
      );
    });

    it('applies query filters by action and entityType', async () => {
      await request(app.getHttpServer())
        .get(
          '/api/audit-logs?action=PRODUCT_CREATED&entityType=Product&page=1&limit=10',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { equals: 'PRODUCT_CREATED' },
            entityType: { equals: 'Product' },
          }),
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('GET /api/audit-logs/filters/options', () => {
    it('returns available choices for action, entityType, and organization', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-logs/filters/options')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.actions).toBeInstanceOf(Array);
      expect(res.body.entityTypes).toBeInstanceOf(Array);
      expect(res.body.organizations).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/audit-logs/:id', () => {
    it('returns detail of specific audit log for authorized user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/audit-logs/${sampleAuditLog.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toEqual(sampleAuditLog.id);
      expect(res.body.action).toEqual('PRODUCT_CREATED');
    });

    it('forbids cross-tenant organization access to audit log', async () => {
      await request(app.getHttpServer())
        .get(`/api/audit-logs/${sampleAuditLog.id}`)
        .set('Authorization', `Bearer ${otherOrgToken}`)
        .expect(403);
    });

    it('returns 404 for non-existent audit log', async () => {
      await request(app.getHttpServer())
        .get('/api/audit-logs/non-existent-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
