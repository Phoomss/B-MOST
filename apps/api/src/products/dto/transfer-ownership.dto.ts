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

  @ApiPropertyOptional({
    description:
      'Optional EVM private key for explicitly signing the on-chain transfer transaction',
  })
  @IsOptional()
  @IsString()
  signerPrivateKey?: string;

  @ApiPropertyOptional({
    description: 'Transfer remarks or business justification',
    example: 'Consignment transfer between business divisions',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
