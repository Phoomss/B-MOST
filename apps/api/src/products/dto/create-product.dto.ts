import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Unique product code identifier (e.g. PRD-2026-0001)',
    example: 'PRD-2026-0001',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message:
      'productCode must contain only alphanumeric characters, dashes, and underscores',
  })
  productCode: string;

  @ApiProperty({
    description: 'Unique manufacturer serial number (e.g. SN-8921473)',
    example: 'SN-8921473',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  serialNumber: string;

  @ApiProperty({
    description: 'Product commercial name',
    example: 'Industrial IoT Temperature & Humidity Sensor',
    minLength: 2,
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description, specifications, or usage instructions',
    example:
      'High-precision sensor with operating range -40C to 85C, IP67 rated.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Product category or classification',
    example: 'Sensors & IoT',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    description:
      'Organization UUID of manufacturer. Allowed only for SUPER_ADMIN; for other users, the manufacturer is set from their assigned organization.',
    example: '00000000-0000-0000-0000-000000000001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'manufacturerId must be a valid UUID' })
  manufacturerId?: string;

  @ApiPropertyOptional({
    description:
      'If true, automatically registers the product onto the EVM smart contract during creation',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  registerOnBlockchain?: boolean;
}
