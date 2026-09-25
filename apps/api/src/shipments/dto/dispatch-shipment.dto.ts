import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DispatchShipmentDto {
  // Deprecated field; incoming private keys are rejected by ValidationPipe.
  signerPrivateKey?: string;

  @ApiPropertyOptional({
    description: 'Dispatch notes or tracking reference',
    example: 'Cargo picked up by logistics carrier truck fleet #BKK-09',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
