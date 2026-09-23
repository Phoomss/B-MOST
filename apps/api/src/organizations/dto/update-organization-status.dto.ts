import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { OrganizationStatus } from '@prisma/client';

export class UpdateOrganizationStatusDto {
  @ApiProperty({
    description: 'New operational status for the organization',
    enum: OrganizationStatus,
    example: OrganizationStatus.ACTIVE,
  })
  @IsEnum(OrganizationStatus, {
    message: 'status must be one of: ACTIVE, INACTIVE, SUSPENDED',
  })
  @IsNotEmpty()
  status: OrganizationStatus;

  @ApiPropertyOptional({
    description: 'Reason for status change (recorded in audit log)',
    example: 'Regulatory compliance verified',
  })
  @IsOptional()
  @IsString()
  @Length(2, 255)
  reason?: string;
}
