import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus() {
    let dbStatus = 'disconnected';
    let organizationCount = 0;
    try {
      organizationCount = await this.prisma.organization.count();
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    return {
      name: 'B-MOST API',
      description:
        'Blockchain-Based Multi-Organization Supply Chain Traceability Platform',
      status: 'ok',
      version: '1.0.0',
      database: {
        status: dbStatus,
        organizations: organizationCount,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
