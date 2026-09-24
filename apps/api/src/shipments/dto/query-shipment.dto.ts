import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryShipmentDto {
  @ApiPropertyOptional({
    description: 'Filter shipments by product UUID or product code',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Filter shipments by sender organization UUID',
  })
  @IsOptional()
  @IsString()
  senderId?: string;

  @ApiPropertyOptional({
    description: 'Filter shipments by receiver organization UUID',
  })
  @IsOptional()
  @IsString()
  receiverId?: string;

  @ApiPropertyOptional({
    description: 'Filter shipments by carrier organization UUID',
  })
  @IsOptional()
  @IsString()
  carrierId?: string;

  @ApiPropertyOptional({
    description:
      'Filter by shipment status (PENDING, SHIPPED, IN_TRANSIT, DELIVERED, CANCELLED)',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description:
      'Search term across shipment code, origin, destination, or product name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
