import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SellProductDto {
  // Deprecated field; incoming private keys are rejected by ValidationPipe.
  signerPrivateKey?: string;

  @ApiPropertyOptional({
    description: 'Sale notes, retail invoice ID, or customer reference',
    example: 'Retail POS Sale to consumer invoice #INV-9821',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
