import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SellProductDto {
  @ApiPropertyOptional({
    description:
      'Optional EVM private key for explicitly signing the on-chain markAsSold transaction',
  })
  @IsOptional()
  @IsString()
  signerPrivateKey?: string;

  @ApiPropertyOptional({
    description: 'Sale notes, retail invoice ID, or customer reference',
    example: 'Retail POS Sale to consumer invoice #INV-9821',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
