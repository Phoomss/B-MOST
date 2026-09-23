import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class RegisterBlockchainDto {
  @ApiPropertyOptional({
    description:
      'Optional private key for custom transaction signer. If not provided, platform operator key is used.',
    example:
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  })
  @IsOptional()
  @IsString()
  @Matches(/^0x[0-9a-fA-F]{64}$/, {
    message:
      'signerPrivateKey must be a valid 32-byte hexadecimal private key (0x...)',
  })
  signerPrivateKey?: string;
}
