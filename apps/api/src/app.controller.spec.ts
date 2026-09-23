import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const mockPrismaService = {
      organization: {
        count: jest.fn().mockResolvedValue(5),
      },
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return api status ok and database connected', async () => {
      const status = await appController.getStatus();
      expect(status.status).toBe('ok');
      expect(status.name).toBe('B-MOST API');
      expect(status.database.status).toBe('connected');
      expect(status.database.organizations).toBe(5);
    });
  });
});
