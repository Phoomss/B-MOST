import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';

export enum UserSignedAction {
  REGISTER_PRODUCT = 'registerProduct',
  QUALITY_CHECK = 'recordQualityCheck',
  CREATE_SHIPMENT = 'createShipment',
  SHIP_PRODUCT = 'shipProduct',
  MARK_IN_TRANSIT = 'markInTransit',
  RECEIVE_PRODUCT = 'receiveProduct',
  STORE_PRODUCT = 'storeProduct',
  MARK_SOLD = 'markAsSold',
  TRANSFER_OWNERSHIP = 'transferOwnership',
  RECALL_PRODUCT = 'recallProduct',
}

export class PrepareBlockchainActionDto {
  @IsEnum(UserSignedAction)
  action: UserSignedAction;

  @IsString()
  entityId: string;

  @IsOptional()
  @IsBoolean()
  passed?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  receiverOrganizationId?: string;

  @IsOptional()
  @IsString()
  carrierOrganizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  origin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  destination?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  shipmentCode?: string;

  @IsOptional()
  @IsString()
  newOwnerOrganizationId?: string;
}

export class ConfirmBlockchainActionDto {
  @IsUUID()
  intentId: string;

  @Matches(/^0x[0-9a-fA-F]{64}$/)
  transactionHash: string;
}

export class PrepareRoleChangeDto {
  @IsIn(['grantRole', 'revokeRole'])
  action: 'grantRole' | 'revokeRole';

  @IsIn(['DISTRIBUTOR_ROLE', 'WAREHOUSE_ROLE', 'RETAILER_ROLE'])
  role: 'DISTRIBUTOR_ROLE' | 'WAREHOUSE_ROLE' | 'RETAILER_ROLE';

  @Matches(/^0x[0-9a-fA-F]{40}$/)
  targetWallet: string;
}
