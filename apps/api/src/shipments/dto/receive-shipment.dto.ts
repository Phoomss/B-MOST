import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReceiveShipmentDto {
  // Deprecated field; incoming private keys are rejected by ValidationPipe.
  signerPrivateKey?: string;

  @ApiPropertyOptional({
    description: 'Receiving inspection notes or confirmation remarks',
    example: 'Cargo safely delivered. Seals verified intact.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
