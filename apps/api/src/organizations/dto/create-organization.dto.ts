import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsEmail,
  Matches,
  Length,
} from 'class-validator';
import { OrganizationType, OrganizationStatus } from '@prisma/client';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization full legal name',
    example: 'Apex Tech Manufacturing Ltd.',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @ApiProperty({
    description:
      'Unique organization code (uppercase alphanumeric, hyphens, underscores)',
    example: 'ORG-MFG-002',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_-]{3,20}$/, {
    message:
      'code must be 3-20 characters long and contain only uppercase letters, numbers, hyphens, and underscores',
  })
  code: string;

  @ApiProperty({
    description: 'Organization type in the supply chain',
    enum: OrganizationType,
    example: OrganizationType.MANUFACTURER,
  })
  @IsEnum(OrganizationType, {
    message:
      'type must be one of: MANUFACTURER, DISTRIBUTOR, WAREHOUSE, RETAILER, LOGISTICS, AUDITOR',
  })
  type: OrganizationType;

  @ApiPropertyOptional({
    description: 'Physical operating address',
    example: '123 Innovation Way, Bangkok, Thailand',
  })
  @IsOptional()
  @IsString()
  @Length(3, 255)
  address?: string;

  @ApiPropertyOptional({
    description: 'Primary contact email address',
    example: 'contact@apextech.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'contactEmail must be a valid email address' })
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+66 2 123 4567',
  })
  @IsOptional()
  @IsString()
  @Length(5, 30)
  phone?: string;

  @ApiPropertyOptional({
    description:
      'Ethereum wallet address for on-chain identity and transactions (0x followed by 40 hex chars)',
    example: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  })
  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message:
      'walletAddress must be a valid Ethereum address (0x followed by 40 hex characters)',
  })
  walletAddress?: string;

  @ApiPropertyOptional({
    description: 'Initial operational status',
    enum: OrganizationStatus,
    default: OrganizationStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;
}
