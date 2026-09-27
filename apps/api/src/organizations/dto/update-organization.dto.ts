import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  Matches,
  Length,
} from 'class-validator';
import { OrganizationType, OrganizationStatus } from '@prisma/client';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    description: 'Organization full legal name',
    example: 'Apex Tech Manufacturing Solutions Ltd.',
  })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Unique organization code (SUPER_ADMIN only)',
    example: 'ORG-MFG-001',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,20}$/, {
    message:
      'code must be 3-20 characters long and contain only uppercase letters, numbers, hyphens, and underscores',
  })
  code?: string;

  @ApiPropertyOptional({
    description: 'Organization type in the supply chain (SUPER_ADMIN only)',
    enum: OrganizationType,
  })
  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;

  @ApiPropertyOptional({
    description: 'Physical operating address',
    example: '88 Industrial Park Road, Bangkok, Thailand',
  })
  @IsOptional()
  @IsString()
  @Length(3, 255)
  address?: string;

  @ApiPropertyOptional({
    description: 'Primary contact email address',
    example: 'info@apextech.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'contactEmail must be a valid email address' })
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+66 2 987 6543',
  })
  @IsOptional()
  @IsString()
  @Length(5, 30)
  phone?: string;

  @ApiPropertyOptional({
    description:
      'Ethereum wallet address for on-chain identity (SUPER_ADMIN only, 0x followed by 40 hex chars)',
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
    description: 'Organization operational status (SUPER_ADMIN only)',
    enum: OrganizationStatus,
  })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;
}
