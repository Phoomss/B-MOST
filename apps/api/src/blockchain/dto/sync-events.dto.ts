import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SyncEventsDto {
  @ApiPropertyOptional({
    description: 'Starting block number to scan from (default: 0)',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fromBlock?: number;

  @ApiPropertyOptional({
    description: 'Ending block number to scan to (default: latest block)',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  toBlock?: number;
}
