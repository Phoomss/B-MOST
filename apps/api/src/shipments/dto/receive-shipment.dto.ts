import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReceiveShipmentDto {
  @ApiPropertyOptional({
    description:
      'Optional EVM private key for explicitly signing the on-chain receive & ownership transfer transaction',
  })
  @IsOptional()
  @IsString()
  signerPrivateKey?: string;

  @ApiPropertyOptional({
    description: 'Receiving inspection notes or confirmation remarks',
    example: 'Cargo safely delivered. Seals verified intact.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
