import { Matches } from 'class-validator';

export class SetUserWalletDto {
  @Matches(/^0x[0-9a-fA-F]{40}$/)
  walletAddress: string;
}
