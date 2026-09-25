import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BlockchainService } from './blockchain.service';
import { BlockchainTransactionService } from './blockchain-transaction.service';
import { BlockchainIndexerService } from './blockchain-indexer.service';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { SyncEventsDto } from './dto/sync-events.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BlockchainVerificationService } from './blockchain-verification.service';
import { VerifyTransactionDto } from './dto/verify-transaction.dto';

@ApiTags('Blockchain')
@Controller('blockchain')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BlockchainController {
  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly transactionService: BlockchainTransactionService,
    private readonly indexerService: BlockchainIndexerService,
    private readonly verificationService: BlockchainVerificationService,
  ) {}

  @Post('verify-transaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Independently verify a user-signed Sepolia transaction' })
  async verifyTransaction(@Body() dto: VerifyTransactionDto, @CurrentUser() user: any) {
    return this.verificationService.verifyTransaction(dto.transactionHash, user?.walletAddress);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get blockchain connection status',
    description:
      'Returns current RPC connection state, network chain ID, current block height, deployed contract address, and operator wallet balance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Blockchain status returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatus() {
    const status = await this.blockchainService.getStatus();
    const listener = this.indexerService.getListenerStatus();
    return {
      ...status,
      listenerActive: listener.isListening,
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get blockchain transaction statistics',
    description:
      'Returns counts of total, confirmed, pending, and failed indexed transactions.',
  })
  @ApiResponse({ status: 200, description: 'Stats returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats() {
    return this.transactionService.getStats();
  }

  @Get('blocks/:blockNumber')
  @ApiOperation({
    summary: 'Get block details by block number or latest',
    description:
      'Retrieves block headers, timestamps, gas details, and included transactions from the blockchain node.',
  })
  @ApiParam({
    name: 'blockNumber',
    description: 'Block number or hash or "latest"',
  })
  @ApiResponse({ status: 200, description: 'Block details returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Block not found' })
  async getBlock(@Param('blockNumber') blockNumber: string) {
    const block = await this.blockchainService.getBlock(blockNumber);
    if (!block) {
      throw new NotFoundException(`Block ${blockNumber} not found`);
    }
    return block;
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'List indexed blockchain transactions',
    description:
      'Returns paginated list of supply-chain transactions recorded on-chain and indexed into PostgreSQL.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTransactions(@Query() query: QueryTransactionsDto) {
    return this.transactionService.findAll(query);
  }

  @Get('transactions/:txHash')
  @ApiOperation({
    summary: 'Get transaction details by hash',
    description:
      'Retrieves the indexed transaction record along with on-chain receipt confirmation.',
  })
  @ApiParam({
    name: 'txHash',
    description: 'Ethereum transaction hash (0x...)',
  })
  @ApiResponse({ status: 200, description: 'Transaction details returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(@Param('txHash') txHash: string) {
    return this.transactionService.findByHash(txHash);
  }

  @Post('sync')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync historical blockchain events (SUPER_ADMIN only)',
    description:
      'Manually triggers scanning of smart contract event logs across specified block ranges and syncs them into the database.',
  })
  @ApiResponse({
    status: 200,
    description: 'Historical events synced successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires SUPER_ADMIN' })
  async syncEvents(@Body() syncDto: SyncEventsDto) {
    const result = await this.indexerService.syncHistoricalEvents(
      syncDto.fromBlock ?? 0,
      syncDto.toBlock,
    );
    return {
      message: 'Blockchain event sync completed',
      ...result,
    };
  }
}
