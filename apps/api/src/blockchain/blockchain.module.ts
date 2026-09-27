import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import blockchainConfig from './blockchain.config';
import { BlockchainService } from './blockchain.service';
import { BlockchainTransactionService } from './blockchain-transaction.service';
import { BlockchainIndexerService } from './blockchain-indexer.service';
import { BlockchainController } from './blockchain.controller';
import { ProductStateMachineService } from './product-state-machine.service';
import { BlockchainVerificationService } from './blockchain-verification.service';
import { BlockchainActionService } from './blockchain-action.service';

@Module({
  imports: [ConfigModule.forFeature(blockchainConfig)],
  controllers: [BlockchainController],
  providers: [
    BlockchainService,
    BlockchainTransactionService,
    BlockchainIndexerService,
    ProductStateMachineService,
    BlockchainVerificationService,
    BlockchainActionService,
  ],
  exports: [
    BlockchainService,
    BlockchainTransactionService,
    BlockchainIndexerService,
    ProductStateMachineService,
    BlockchainVerificationService,
    BlockchainActionService,
  ],
})
export class BlockchainModule {}
