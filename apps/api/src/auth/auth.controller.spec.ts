import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'admin@bmost.io',
    firstName: 'Super',
    lastName: 'Admin',
    role: UserRole.SUPER_ADMIN,
    organizationId: null,
  };

  const mockAuthService = {
    login: jest.fn().mockResolvedValue({
      accessToken: 'jwt-access-token',
      user: mockUser,
    }),
    getProfile: jest.fn().mockResolvedValue(mockUser),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should authenticate user and return access token', async () => {
      const loginDto = { email: 'admin@bmost.io', password: 'Password123!' };
      const res = await controller.login(loginDto);

      expect(res.accessToken).toBe('jwt-access-token');
      expect(res.user.email).toBe(loginDto.email);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('getProfile', () => {
    it('should return profile of authenticated user', async () => {
      const profile = await controller.getProfile(mockUser);
      expect(profile).toEqual(mockUser);
      expect(authService.getProfile).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('adminOnly', () => {
    it('should grant access and return confirmation message', async () => {
      const res = await controller.adminOnly(mockUser);
      expect(res.message).toBe('Access granted to super administrator');
      expect(res.user.role).toBe(UserRole.SUPER_ADMIN);
    });
  });

  describe('manufacturerOnly', () => {
    it('should grant access to manufacturer user', async () => {
      const manufacturerUser = {
        ...mockUser,
        role: UserRole.MANUFACTURER,
      };
      const res = await controller.manufacturerOnly(manufacturerUser);
      expect(res.message).toBe('Access granted to manufacturer');
      expect(res.user.role).toBe(UserRole.MANUFACTURER);
    });
  });
});
