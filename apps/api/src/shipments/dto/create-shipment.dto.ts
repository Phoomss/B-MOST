import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateShipmentDto {
  @ApiProperty({
    description: 'Product UUID or unique product code to be shipped',
    example: 'PRD-APEX-001',
  })
  @IsNotEmpty({ message: 'productId is required' })
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'Receiving organization UUID or unique organization code',
    example: 'org-dist-uuid',
  })
  @IsNotEmpty({ message: 'receiverOrganizationId is required' })
  @IsString()
  receiverOrganizationId: string;

  @ApiPropertyOptional({
    description: 'Carrier / logistics organization UUID or code',
    example: 'org-logistics-uuid',
  })
  @IsOptional()
  @IsString()
  carrierOrganizationId?: string;

  @ApiProperty({
    description: 'Origin departure facility or geographic location',
    example: 'Apex Electronics Factory 1, Chonburi, Thailand',
  })
  @IsNotEmpty({ message: 'origin is required' })
  @IsString()
  @MaxLength(200)
  origin: string;

  @ApiProperty({
    description: 'Destination arrival facility or warehouse location',
    example: 'Global Freight Dist Warehouse 4, Bangkok, Thailand',
  })
  @IsNotEmpty({ message: 'destination is required' })
  @IsString()
  @MaxLength(200)
  destination: string;

  @ApiPropertyOptional({
    description:
      'Custom unique shipment tracking code. Auto-generated if omitted',
    example: 'SHP-2026-0001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  shipmentCode?: string;

  // Deprecated field; incoming private keys are rejected by ValidationPipe.
  signerPrivateKey?: string;
}
