import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DispatchShipmentDto {
  @ApiPropertyOptional({
    description:
      'Optional EVM private key for explicitly signing the on-chain ship transaction',
  })
  @IsOptional()
  @IsString()
  signerPrivateKey?: string;

  @ApiPropertyOptional({
    description: 'Dispatch notes or tracking reference',
    example: 'Cargo picked up by logistics carrier truck fleet #BKK-09',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
