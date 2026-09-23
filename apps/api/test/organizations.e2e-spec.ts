import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
      where: { organization: { code: { in: ['ORG-LOG-888', 'ORG-LOG-889', 'ORG-INV-WALLET', 'ORG-UNAUTH'] } } },
    });
    await prisma.organization.deleteMany({
      where: { code: { in: ['ORG-LOG-888', 'ORG-LOG-889', 'ORG-INV-WALLET', 'ORG-UNAUTH'] } },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { organization: { code: { in: ['ORG-LOG-888', 'ORG-LOG-889', 'ORG-INV-WALLET', 'ORG-UNAUTH'] } } },
    });
    await prisma.organization.deleteMany({
      where: { code: { in: ['ORG-LOG-888', 'ORG-LOG-889', 'ORG-INV-WALLET', 'ORG-UNAUTH'] } },
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

      expect(response.body.message.some((msg: string) => msg.includes('walletAddress'))).toBe(true);
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

      expect(response.body.message.some((msg: string) => msg.includes('code'))).toBe(true);
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
      expect(response.body.walletAddress).toBe('0x14dC79964da2C08b23698B3D3cc7Ca32193d9955');
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

      expect(response.body.message).toContain('ORG_ADMIN is not authorized to modify');
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
      expect((auditLog?.metadata as any).newStatus).toBe(OrganizationStatus.INACTIVE);
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
