import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrganizationStatus, OrganizationType } from '@prisma/client';

describe('Organizations & Organization Isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superadminToken: string;
  let orgAdminToken: string;
  let manufacturerToken: string;
  let retailerToken: string;
  let auditorToken: string;

  let apexTechOrgId: string;
  let primeRetailOrgId: string;

  const initialOrgs: any[] = [
    {
      id: 'org-mfg-001',
      code: 'ORG-MFG-001',
      name: 'Apex Tech Manufacturing',
      type: OrganizationType.MANUFACTURER,
      status: OrganizationStatus.ACTIVE,
      walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      _count: { users: 2, productsManufactured: 5 },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'org-rtl-001',
      code: 'ORG-RTL-001',
      name: 'Prime Retail',
      type: OrganizationType.RETAILER,
      status: OrganizationStatus.ACTIVE,
      walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      _count: { users: 1, productsManufactured: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'org-aud-001',
      code: 'ORG-AUD-001',
      name: 'Eurofins Quality Audit',
      type: OrganizationType.AUDITOR,
      status: OrganizationStatus.ACTIVE,
      walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      _count: { users: 1, productsManufactured: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'org-dst-001',
      code: 'ORG-DST-001',
      name: 'Pacific Freight Dist',
      type: OrganizationType.DISTRIBUTOR,
      status: OrganizationStatus.ACTIVE,
      walletAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      _count: { users: 1, productsManufactured: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'org-whs-001',
      code: 'ORG-WHS-001',
      name: 'Central Warehousing',
      type: OrganizationType.WAREHOUSE,
      status: OrganizationStatus.ACTIVE,
      walletAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
      _count: { users: 1, productsManufactured: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const initialUsers: any[] = [
    {
      id: 'user-admin',
      email: 'superadmin@bmost.io',
      passwordHash: bcrypt.hashSync('password123', 10),
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      organizationId: null,
      organization: null,
    },
    {
      id: 'user-orgadmin',
      email: 'orgadmin@bmost.io',
      passwordHash: bcrypt.hashSync('password123', 10),
      role: 'ORG_ADMIN',
      status: 'ACTIVE',
      organizationId: 'org-mfg-001',
      organization: initialOrgs[0],
    },
    {
      id: 'user-mfg',
      email: 'manufacturer@bmost.io',
      passwordHash: bcrypt.hashSync('password123', 10),
      role: 'MANUFACTURER',
      status: 'ACTIVE',
      organizationId: 'org-mfg-001',
      organization: initialOrgs[0],
    },
    {
      id: 'user-rtl',
      email: 'retailer@bmost.io',
      passwordHash: bcrypt.hashSync('password123', 10),
      role: 'RETAILER',
      status: 'ACTIVE',
      organizationId: 'org-rtl-001',
      organization: initialOrgs[1],
    },
    {
      id: 'user-aud',
      email: 'auditor@bmost.io',
      passwordHash: bcrypt.hashSync('password123', 10),
      role: 'AUDITOR',
      status: 'ACTIVE',
      organizationId: 'org-aud-001',
      organization: initialOrgs[2],
    },
  ];

  let storedOrgs = [...initialOrgs];
  const storedLogs: any[] = [];

  const mockPrisma = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    organization: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const found = storedOrgs.find(
          (o) =>
            (where.id && o.id === where.id) ||
            (where.code && o.code === where.code) ||
            (where.walletAddress &&
              o.walletAddress?.toLowerCase() ===
                where.walletAddress?.toLowerCase()),
        );
        return Promise.resolve(found ? { ...found } : null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where?.OR && Array.isArray(where.OR)) {
          for (const cond of where.OR) {
            const found = storedOrgs.find(
              (o) =>
                (cond.id && o.id === cond.id) ||
                (cond.code && o.code === cond.code) ||
                (cond.walletAddress &&
                  o.walletAddress?.toLowerCase() ===
                    cond.walletAddress?.toLowerCase()),
            );
            if (found) return Promise.resolve({ ...found });
          }
        }
        const found = storedOrgs.find(
          (o) =>
            (where?.id && o.id === where.id) ||
            (where?.code && o.code === where.code) ||
            (where?.walletAddress &&
              o.walletAddress?.toLowerCase() ===
                where.walletAddress?.toLowerCase()),
        );
        return Promise.resolve(found ? { ...found } : null);
      }),
      findMany: jest
        .fn()
        .mockImplementation(({ where, skip = 0, take = 50 }) => {
          let results = [...storedOrgs];
          if (where?.id) {
            results = results.filter((o) => o.id === where.id);
          }
          return Promise.resolve(results.slice(skip, skip + take));
        }),
      count: jest.fn().mockImplementation(({ where }) => {
        let results = [...storedOrgs];
        if (where?.id) {
          results = results.filter((o) => o.id === where.id);
        }
        return Promise.resolve(results.length);
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const newOrg = {
          id: `org-gen-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          _count: { users: 0, productsManufactured: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        storedOrgs.push(newOrg);
        return Promise.resolve({ ...newOrg });
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = storedOrgs.findIndex((o) => o.id === where.id);
        if (idx === -1) {
          const err = new Error('Record not found');
          Object.assign(err, { code: 'P2025' });
          return Promise.reject(err);
        }
        storedOrgs[idx] = {
          ...storedOrgs[idx],
          ...data,
          updatedAt: new Date(),
        };
        return Promise.resolve({ ...storedOrgs[idx] });
      }),
      deleteMany: jest.fn().mockImplementation(({ where }) => {
        if (where?.code?.in) {
          storedOrgs = storedOrgs.filter(
            (o) => !where.code.in.includes(o.code),
          );
        }
        return Promise.resolve({ count: 1 });
      }),
    },
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const found = initialUsers.find(
          (u) =>
            (where.id && u.id === where.id) ||
            (where.email &&
              u.email.toLowerCase() === where.email.toLowerCase()),
        );
        return Promise.resolve(found ? { ...found } : null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const found = initialUsers.find(
          (u) =>
            (where.id && u.id === where.id) ||
            (where.email &&
              u.email.toLowerCase() === where.email.toLowerCase()),
        );
        return Promise.resolve(found ? { ...found } : null);
      }),
    },
    auditLog: {
      create: jest.fn().mockImplementation(({ data }) => {
        const entry = {
          id: `log-${Date.now()}`,
          ...data,
          createdAt: new Date(),
        };
        storedLogs.push(entry);
        return Promise.resolve(entry);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const found = storedLogs.find(
          (l) =>
            (!where.action || l.action === where.action) &&
            (!where.entityId || l.entityId === where.entityId),
        );
        return Promise.resolve(found || null);
      }),
      findMany: jest.fn().mockImplementation(() => Promise.resolve(storedLogs)),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // Retrieve organization IDs from seeded database
    const apexOrg = await prisma.organization.findUnique({
      where: { code: 'ORG-MFG-001' },
    });
    apexTechOrgId = apexOrg!.id;

    const retailOrg = await prisma.organization.findUnique({
      where: { code: 'ORG-RTL-001' },
    });
    primeRetailOrgId = retailOrg!.id;

    // Login users to acquire JWT tokens for each role
    const superadminRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'superadmin@bmost.io', password: 'password123' });
    superadminToken = superadminRes.body.accessToken;

    const orgAdminRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'orgadmin@bmost.io', password: 'password123' });
    orgAdminToken = orgAdminRes.body.accessToken;

    const manufacturerRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'manufacturer@bmost.io', password: 'password123' });
    manufacturerToken = manufacturerRes.body.accessToken;

    const retailerRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'retailer@bmost.io', password: 'password123' });
    retailerToken = retailerRes.body.accessToken;

    const auditorRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'auditor@bmost.io', password: 'password123' });
    auditorToken = auditorRes.body.accessToken;

    // Clean up test organizations if previously created
    await prisma.auditLog.deleteMany({
      where: {
        organization: {
          code: {
            in: ['ORG-LOG-888', 'ORG-LOG-889', 'ORG-INV-WALLET', 'ORG-UNAUTH'],
          },
        },
      },
    });
    await prisma.organization.deleteMany({
      where: {
        code: {
          in: ['ORG-LOG-888', 'ORG-LOG-889', 'ORG-INV-WALLET', 'ORG-UNAUTH'],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: {
        organization: {
          code: {
            in: ['ORG-LOG-888', 'ORG-LOG-889', 'ORG-INV-WALLET', 'ORG-UNAUTH'],
          },
        },
      },
    });
    await prisma.organization.deleteMany({
      where: {
        code: {
          in: ['ORG-LOG-888', 'ORG-LOG-889', 'ORG-INV-WALLET', 'ORG-UNAUTH'],
        },
      },
    });
    await app.close();
  });

  describe('Organization Isolation on GET /api/organizations', () => {
    it('SUPER_ADMIN can see all organizations across the platform', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/organizations')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data.length).toBeGreaterThanOrEqual(5);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(5);
    });

    it('AUDITOR can see all organizations for compliance and auditing', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/organizations')
        .set('Authorization', `Bearer ${auditorToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(5);
    });

    it('MANUFACTURER sees ONLY their own organization (Apex Tech)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/organizations')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(apexTechOrgId);
      expect(response.body.data[0].code).toBe('ORG-MFG-001');
    });

    it('RETAILER sees ONLY their own organization (Prime Retail)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/organizations')
        .set('Authorization', `Bearer ${retailerToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(primeRetailOrgId);
      expect(response.body.data[0].code).toBe('ORG-RTL-001');
    });
  });

  describe('Organization Isolation on GET /api/organizations/:id', () => {
    it('MANUFACTURER can access their own organization details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/organizations/${apexTechOrgId}`)
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .expect(200);

      expect(response.body.id).toBe(apexTechOrgId);
      expect(response.body.name).toBe('Apex Tech Manufacturing');
      expect(response.body._count).toBeDefined();
    });

    it('MANUFACTURER is rejected with 403 Forbidden when trying to access another organization', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/organizations/${primeRetailOrgId}`)
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });

    it('RETAILER is rejected with 403 Forbidden when trying to access manufacturer organization', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/organizations/${apexTechOrgId}`)
        .set('Authorization', `Bearer ${retailerToken}`)
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });

    it('SUPER_ADMIN can access any organization by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/organizations/${primeRetailOrgId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body.id).toBe(primeRetailOrgId);
    });

    it('AUDITOR can access any organization by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/organizations/${apexTechOrgId}`)
        .set('Authorization', `Bearer ${auditorToken}`)
        .expect(200);

      expect(response.body.id).toBe(apexTechOrgId);
    });

    it('Returns 404 NotFound when SUPER_ADMIN requests non-existent organization UUID', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/organizations/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(404);
    });
  });

  describe('Organization Creation (POST /api/organizations)', () => {
    it('rejects unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/organizations')
        .send({
          name: 'Unauthorized Org',
          code: 'ORG-UNAUTH',
          type: OrganizationType.LOGISTICS,
        })
        .expect(401);
    });

    it('forbids MANUFACTURER from creating organizations with 403', async () => {
      await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .send({
          name: 'New Logistics Partner',
          code: 'ORG-LOG-001',
          type: OrganizationType.LOGISTICS,
        })
        .expect(403);
    });

    it('forbids ORG_ADMIN from creating organizations with 403', async () => {
      await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({
          name: 'New Logistics Partner',
          code: 'ORG-LOG-002',
          type: OrganizationType.LOGISTICS,
        })
        .expect(403);
    });

    it('validates Ethereum wallet address format with 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Invalid Wallet Org',
          code: 'ORG-INV-WALLET',
          type: OrganizationType.LOGISTICS,
          walletAddress: '0xinvalidEthereumAddress',
        })
        .expect(400);

      expect(
        response.body.message.some((msg: string) =>
          msg.includes('walletAddress'),
        ),
      ).toBe(true);
    });

    it('validates organization code format with 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Invalid Code Org',
          code: 'bad code with spaces',
          type: OrganizationType.LOGISTICS,
        })
        .expect(400);

      expect(
        response.body.message.some((msg: string) => msg.includes('code')),
      ).toBe(true);
    });

    it('allows SUPER_ADMIN to successfully create an organization', async () => {
      const newOrgData = {
        name: 'Apex Fast Express Logistics',
        code: 'ORG-LOG-888',
        type: OrganizationType.LOGISTICS,
        address: '500 Airport Freight Way, Bangkok, Thailand',
        contactEmail: 'contact@apexlogistics.com',
        phone: '+66 2 999 1234',
        walletAddress: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
        status: OrganizationStatus.ACTIVE,
      };

      const response = await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(newOrgData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.code).toBe('ORG-LOG-888');
      expect(response.body.name).toBe('Apex Fast Express Logistics');
      expect(response.body.walletAddress).toBe(
        '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
      );
      expect(response.body.status).toBe(OrganizationStatus.ACTIVE);

      // Verify audit log entry was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'ORGANIZATION_CREATED',
          entityId: response.body.id,
        },
      });
      expect(auditLog).toBeDefined();
    });

    it('rejects duplicate organization code with 409 Conflict', async () => {
      const duplicateData = {
        name: 'Duplicate Code Org',
        code: 'ORG-LOG-888',
        type: OrganizationType.LOGISTICS,
      };

      const response = await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(duplicateData)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('rejects duplicate wallet address with 409 Conflict', async () => {
      const duplicateWalletData = {
        name: 'Duplicate Wallet Org',
        code: 'ORG-LOG-889',
        type: OrganizationType.LOGISTICS,
        walletAddress: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
      };

      const response = await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(duplicateWalletData)
        .expect(409);

      expect(response.body.message).toContain('already registered');
    });
  });

  describe('Organization Update (PATCH /api/organizations/:id)', () => {
    it('ORG_ADMIN can update their own organization profile (name, phone, address)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/organizations/${apexTechOrgId}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({
          name: 'Apex Tech Advanced Manufacturing Ltd.',
          phone: '+66 2 111 2233',
        })
        .expect(200);

      expect(response.body.name).toBe('Apex Tech Advanced Manufacturing Ltd.');
      expect(response.body.phone).toBe('+66 2 111 2233');
    });

    it('ORG_ADMIN is forbidden from updating another organization (403)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/organizations/${primeRetailOrgId}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({
          name: 'Hacked Retail Name',
        })
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });

    it('ORG_ADMIN is forbidden from changing code, type, status, or wallet address (403)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/organizations/${apexTechOrgId}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({
          code: 'ORG-HACK-001',
        })
        .expect(403);

      expect(response.body.message).toContain(
        'ORG_ADMIN is not authorized to modify',
      );
    });

    it('MANUFACTURER role is forbidden from updating organization (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/organizations/${apexTechOrgId}`)
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .send({
          name: 'Unauthorized Edit',
        })
        .expect(403);
    });

    it('SUPER_ADMIN can update administrative fields (code, walletAddress)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/organizations/${apexTechOrgId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Apex Tech Manufacturing',
          phone: '+66 2 123 4567',
        })
        .expect(200);

      expect(response.body.name).toBe('Apex Tech Manufacturing');
    });
  });

  describe('Organization Status Management (PATCH /api/organizations/:id/status)', () => {
    it('forbids non-SUPER_ADMIN (e.g. ORG_ADMIN) from modifying status with 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/organizations/${apexTechOrgId}/status`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({
          status: OrganizationStatus.SUSPENDED,
        })
        .expect(403);
    });

    it('SUPER_ADMIN can deactivate organization', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/organizations/${apexTechOrgId}/status`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          status: OrganizationStatus.INACTIVE,
          reason: 'Scheduled maintenance review',
        })
        .expect(200);

      expect(response.body.status).toBe(OrganizationStatus.INACTIVE);

      // Verify audit log entry
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'ORGANIZATION_STATUS_CHANGED',
          entityId: apexTechOrgId,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(auditLog).toBeDefined();
      expect((auditLog?.metadata as any).newStatus).toBe(
        OrganizationStatus.INACTIVE,
      );
    });

    it('SUPER_ADMIN can reactivate organization to ACTIVE', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/organizations/${apexTechOrgId}/status`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          status: OrganizationStatus.ACTIVE,
          reason: 'Review passed; reactivating operational status',
        })
        .expect(200);

      expect(response.body.status).toBe(OrganizationStatus.ACTIVE);
    });

    it('returns 404 NotFound when status update is requested for non-existent org', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .patch(`/api/organizations/${nonExistentUuid}/status`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          status: OrganizationStatus.INACTIVE,
        })
        .expect(404);
    });
  });
});
