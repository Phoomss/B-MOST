import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import blockchainConfig from './blockchain.config';
import { BlockchainService } from './blockchain.service';
import { BlockchainTransactionService } from './blockchain-transaction.service';
import { BlockchainIndexerService } from './blockchain-indexer.service';
import { BlockchainController } from './blockchain.controller';

@Module({
  imports: [ConfigModule.forFeature(blockchainConfig)],
  controllers: [BlockchainController],
  providers: [
    BlockchainService,
    BlockchainTransactionService,
    BlockchainIndexerService,
  ],
  exports: [
    BlockchainService,
    BlockchainTransactionService,
    BlockchainIndexerService,
  ],
})
export class BlockchainModule {}
