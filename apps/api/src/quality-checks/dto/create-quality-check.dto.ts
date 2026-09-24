import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { QualityCheckResult } from '@prisma/client';

export enum QualityCheckStatusInput {
  PASS = 'PASS',
  FAIL = 'FAIL',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

export class CreateQualityCheckDto {
  @ApiPropertyOptional({
    description:
      'Product UUID or unique Product Code. Required when using POST /quality-checks',
    example: 'PRD-APEX-001',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({
    description: 'Inspection verdict: PASSED (or PASS) / FAILED (or FAIL)',
    enum: QualityCheckStatusInput,
    example: QualityCheckStatusInput.PASSED,
  })
  @IsNotEmpty({ message: 'Quality check result is required' })
  @IsEnum(QualityCheckStatusInput, {
    message: 'Result must be PASS, PASSED, FAIL, or FAILED',
  })
  result: QualityCheckResult | QualityCheckStatusInput;

  @ApiPropertyOptional({
    description:
      'Full name and designation of inspector. Defaults to authenticated user name if not provided',
    example: 'Dr. Jane Smith, Lead QC Auditor',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  inspectorName?: string;

  @ApiPropertyOptional({
    description:
      'Detailed inspection notes, sensor readings, or failure reasons',
    example:
      'Passed thermal stress, voltage tolerance, and cryptographic bootloader tests.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description:
      'Optional EVM private key for explicitly signing the on-chain quality check transaction',
  })
  @IsOptional()
  @IsString()
  signerPrivateKey?: string;
}
