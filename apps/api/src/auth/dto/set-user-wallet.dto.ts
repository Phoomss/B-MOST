import { IsBoolean, IsOptional, Matches } from 'class-validator';

export class SetUserWalletDto {
  @Matches(/^0x[0-9a-fA-F]{40}$/)
  walletAddress: string;

  @IsOptional()
  @IsBoolean()
  syncOrganization?: boolean;
}
