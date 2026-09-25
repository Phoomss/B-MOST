import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TransferOwnershipDto {
  @ApiProperty({
    description: 'New owning organization UUID or unique organization code',
    example: 'org-dist-uuid',
  })
  @IsNotEmpty({ message: 'newOwnerOrganizationId is required' })
  @IsString()
  newOwnerOrganizationId: string;

  // Deprecated field; incoming private keys are rejected by ValidationPipe.
  signerPrivateKey?: string;

  @ApiPropertyOptional({
    description: 'Transfer remarks or business justification',
    example: 'Consignment transfer between business divisions',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
