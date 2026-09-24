import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { ProductsModule } from './products/products.module';
import { QualityChecksModule } from './quality-checks/quality-checks.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    BlockchainModule,
    ProductsModule,
    QualityChecksModule,
    ShipmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
