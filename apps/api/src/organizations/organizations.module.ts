import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationIsolationGuard } from './guards/organization-isolation.guard';

@Module({
  imports: [PrismaModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationIsolationGuard],
  exports: [OrganizationsService, OrganizationIsolationGuard],
})
export class OrganizationsModule {}
