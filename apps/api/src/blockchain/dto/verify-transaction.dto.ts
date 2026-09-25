import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class VerifyTransactionDto {
  @ApiProperty({ description: 'Sepolia transaction hash signed by the authenticated user wallet' })
  @IsString()
  @Matches(/^0x[0-9a-fA-F]{64}$/)
  transactionHash: string;
}
