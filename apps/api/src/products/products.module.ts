import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProductsController } from './products.controller';
import { PublicProductsController } from './public-products.controller';
import { ProductsService } from './products.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { QualityChecksModule } from '../quality-checks/quality-checks.module';
import { ShipmentsModule } from '../shipments/shipments.module';

@Module({
  imports: [
    PrismaModule,
    BlockchainModule,
    ConfigModule,
    QualityChecksModule,
    ShipmentsModule,
  ],
  controllers: [ProductsController, PublicProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
