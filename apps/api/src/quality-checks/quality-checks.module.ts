import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { QualityChecksController } from './quality-checks.controller';
import { QualityChecksService } from './quality-checks.service';

@Module({
  imports: [PrismaModule, BlockchainModule],
  controllers: [QualityChecksController],
  providers: [QualityChecksService],
  exports: [QualityChecksService],
})
export class QualityChecksModule {}
