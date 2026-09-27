import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { TraceabilityController } from './traceability.controller';
import { TraceabilityService } from './traceability.service';

@Module({
  imports: [PrismaModule, BlockchainModule],
  controllers: [TraceabilityController],
  providers: [TraceabilityService],
  exports: [TraceabilityService],
})
export class TraceabilityModule {}
