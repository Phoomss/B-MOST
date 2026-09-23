import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'Updated product commercial name',
    example: 'Industrial IoT Temperature & Humidity Sensor V2',
    minLength: 2,
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated detailed description or specifications',
    example: 'Upgraded firmware with Bluetooth LE 5.3 support.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated product category or classification',
    example: 'Industrial Electronics',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
