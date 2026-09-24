import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class TraceabilityQueryDto {
  @ApiPropertyOptional({
    description:
      'Search query: can be productCode, serialNumber, or product UUID',
    example: 'PRD-APEX-001',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
