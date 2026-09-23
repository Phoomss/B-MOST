import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication;
  let manufacturerToken: string;
  let superadminToken: string;
  let retailerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('should reject invalid password with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'manufacturer@bmost.io',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should reject non-existent user with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@bmost.io',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should validate request body and reject invalid email format with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'password123',
        })
        .expect(400);
    });

    it('should successfully log in manufacturer and return access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'manufacturer@bmost.io',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('manufacturer@bmost.io');
      expect(response.body.user.role).toBe('MANUFACTURER');
      expect(response.body.user.organization).toBeDefined();
      expect(response.body.user.organization.code).toBe('ORG-MFG-001');

      manufacturerToken = response.body.accessToken;
    });

    it('should successfully log in super admin and return access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'superadmin@bmost.io',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.role).toBe('SUPER_ADMIN');

      superadminToken = response.body.accessToken;
    });

    it('should successfully log in retailer and return access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'retailer@bmost.io',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.role).toBe('RETAILER');

      retailerToken = response.body.accessToken;
    });
  });

  describe('GET /api/auth/me (Protected Route)', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('should reject request with invalid JWT with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-string')
        .expect(401);
    });

    it('should return profile for authenticated manufacturer', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .expect(200);

      expect(response.body.email).toBe('manufacturer@bmost.io');
      expect(response.body.role).toBe('MANUFACTURER');
      expect(response.body.organization.name).toBe('Apex Tech Manufacturing');
    });
  });

  describe('RBAC Route Protection', () => {
    it('should forbid manufacturer from accessing superadmin-only endpoint (403)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/admin-only')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });

    it('should allow superadmin to access superadmin-only endpoint (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/admin-only')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Access granted to super administrator');
      expect(response.body.user.role).toBe('SUPER_ADMIN');
    });

    it('should allow manufacturer to access manufacturer-only endpoint (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/manufacturer-only')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .expect(200);

      expect(response.body.message).toBe('Access granted to manufacturer');
      expect(response.body.user.role).toBe('MANUFACTURER');
    });

    it('should forbid retailer from accessing manufacturer-only endpoint (403)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/manufacturer-only')
        .set('Authorization', `Bearer ${retailerToken}`)
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });
  });
});
