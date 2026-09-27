import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TxStatus } from '@prisma/client';

export class QueryTransactionsDto {
  @ApiPropertyOptional({
    description:
      'Filter by contract event type (e.g. ProductRegistered, QualityChecked)',
    example: 'ProductRegistered',
  })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity type (Product or Shipment)',
    example: 'Product',
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity ID',
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Filter by PostgreSQL product UUID',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    description:
      'Filter by wallet address that initiated or recorded the event',
  })
  @IsOptional()
  @IsString()
  walletAddress?: string;

  @ApiPropertyOptional({
    enum: TxStatus,
    description: 'Filter by transaction status (PENDING, CONFIRMED, FAILED)',
  })
  @IsOptional()
  @IsEnum(TxStatus)
  status?: TxStatus;

  @ApiPropertyOptional({
    description: 'Filter by block number',
    example: '10',
  })
  @IsOptional()
  @IsString()
  blockNumber?: string;

  @ApiPropertyOptional({
    description:
      'Search term across txHash, walletAddress, eventType, or entityId',
    example: '0x123',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Page size limit',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
