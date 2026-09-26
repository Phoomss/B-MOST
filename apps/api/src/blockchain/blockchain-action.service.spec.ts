import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ProductStatus, UserRole } from '@prisma/client';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from './blockchain.service';
import { ProductStateMachineService } from './product-state-machine.service';
import { BlockchainActionService } from './blockchain-action.service';
import { UserSignedAction } from './dto/blockchain-action.dto';
import { supplyChainRegistryAbi } from './constants/sepolia-abi.constant';

describe('BlockchainActionService', () => {
  const address = '0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a';
  const wallet = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const hash = `0x${'a'.repeat(64)}`;
  const productHash = `0x${'b'.repeat(64)}`;
  const iface = new ethers.Interface(supplyChainRegistryAbi);
  const user = {
    id: 'user-1',
    role: UserRole.MANUFACTURER,
    organizationId: 'org-1',
    walletAddress: wallet,
  };
  const product = {
    id: 'product-1',
    productCode: 'BM-001',
    productHash,
    status: ProductStatus.REGISTERED,
    manufacturerId: 'org-1',
    currentOwnerId: 'org-1',
    manufacturer: { walletAddress: wallet },
    currentOwner: { walletAddress: wallet },
    blockchainProductId: null,
    blockchainChainId: null,
    blockchainContractAddress: null,
  };
  const provider = {
    call: jest.fn(),
    getNetwork: jest.fn(),
    getTransaction: jest.fn(),
    getTransactionReceipt: jest.fn(),
  };
  const tx = {
    shipment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    blockchainActionIntent: { create: jest.fn(), update: jest.fn() },
    product: { update: jest.fn() },
    qualityCheck: { findFirst: jest.fn(), create: jest.fn() },
    blockchainTransaction: { upsert: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    product: { findFirst: jest.fn(), findUnique: jest.fn() },
    shipment: { findUnique: jest.fn() },
    blockchainActionIntent: { findUnique: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const blockchain = {
    getStatus: jest.fn(),
    getContractAddress: jest.fn(() => address),
    getReadOnlyContract: jest.fn(() => ({
      interface: iface,
      MANUFACTURER_ROLE: jest.fn().mockResolvedValue('0xmanufacturer'),
      hasRole: jest.fn().mockResolvedValue(true),
    })),
    getProvider: jest.fn(() => provider),
    getProduct: jest.fn(),
  };
  const stateMachine = {
    checkStateMismatch: jest.fn(),
    validateTransition: jest.fn(),
  };
  const service = new BlockchainActionService(
    prisma as unknown as PrismaService,
    blockchain as unknown as BlockchainService,
    stateMachine as unknown as ProductStateMachineService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.product.findFirst.mockResolvedValue(product);
    blockchain.getStatus.mockResolvedValue({
      connected: true,
      chainId: 11155111,
    });
    provider.call.mockResolvedValue('0x');
    prisma.blockchainActionIntent.findFirst.mockResolvedValue(null);
    tx.blockchainActionIntent.create.mockResolvedValue({
      id: 'intent-1',
      entityType: 'Product',
      entityId: product.id,
      expiresAt: new Date(),
    });
  });

  it('prepares a registration from database values and simulates it from the user wallet', async () => {
    const result = await service.prepare(
      { action: UserSignedAction.REGISTER_PRODUCT, entityId: product.id },
      user,
    );
    expect(result).toMatchObject({
      functionName: 'registerProduct',
      args: ['BM-001', productHash],
      expectedWallet: wallet,
    });
    expect(provider.call).toHaveBeenCalledWith({
      to: address,
      from: wallet,
      data: iface.encodeFunctionData('registerProduct', [
        'BM-001',
        productHash,
      ]),
    });
    expect(tx.blockchainActionIntent.create).toHaveBeenCalled();
  });

  it('rejects legacy product IDs without a Sepolia chain and contract identity', async () => {
    prisma.product.findFirst.mockResolvedValueOnce({
      ...product,
      blockchainProductId: '1',
      status: ProductStatus.RECEIVED,
    });
    await expect(
      service.prepare(
        { action: UserSignedAction.STORE_PRODUCT, entityId: product.id },
        {
          ...user,
          role: UserRole.WAREHOUSE,
        },
      ),
    ).rejects.toThrow(ConflictException);
    expect(blockchain.getProduct).not.toHaveBeenCalled();
  });

  it('rejects a wallet that differs from the manufacturer wallet', async () => {
    await expect(
      service.prepare(
        { action: UserSignedAction.REGISTER_PRODUCT, entityId: product.id },
        {
          ...user,
          walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects registration before simulation when the wallet lacks MANUFACTURER_ROLE', async () => {
    blockchain.getReadOnlyContract.mockReturnValueOnce({
      interface: iface,
      MANUFACTURER_ROLE: jest.fn().mockResolvedValue('0xmanufacturer'),
      hasRole: jest.fn().mockResolvedValue(false),
    });
    await expect(
      service.prepare(
        { action: UserSignedAction.REGISTER_PRODUCT, entityId: product.id },
        user,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(provider.call).not.toHaveBeenCalled();
  });

  it('confirms a matching on-chain registration event before assigning the Sepolia ID', async () => {
    const log = iface.encodeEventLog(iface.getEvent('ProductRegistered')!, [
      1n,
      'BM-001',
      productHash,
      wallet,
      1n,
    ]);
    const input = iface.encodeFunctionData('registerProduct', [
      'BM-001',
      productHash,
    ]);
    prisma.blockchainActionIntent.findUnique.mockResolvedValue({
      id: 'intent-1',
      userId: user.id,
      status: 'PENDING',
      action: 'registerProduct',
      entityType: 'Product',
      entityId: product.id,
      functionName: 'registerProduct',
      args: ['BM-001', productHash],
      metadata: {},
    });
    prisma.product.findUnique.mockResolvedValue(product);
    provider.getNetwork.mockResolvedValue({ chainId: 11155111n });
    provider.getTransaction.mockResolvedValue({
      to: address,
      from: wallet,
      data: input,
      value: 0n,
    });
    provider.getTransactionReceipt.mockResolvedValue({
      hash,
      to: address,
      from: wallet,
      status: 1,
      blockNumber: 123,
      logs: [{ address, topics: log.topics, data: log.data }],
    });
    tx.product.update.mockResolvedValue({
      ...product,
      blockchainProductId: '1',
    });
    const result = await service.confirm(
      { intentId: 'intent-1', transactionHash: hash },
      user,
    );
    expect(result).toMatchObject({
      verified: true,
      synced: true,
      transactionHash: hash,
    });
    expect(tx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blockchainProductId: '1',
          blockchainChainId: 11155111,
          blockchainContractAddress: address,
        }),
      }),
    );
  });

  it('confirms a quality check routed through a wallet when the registry event matches the intent', async () => {
    const forwardedTo = '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3';
    const qualityProduct = { ...product, blockchainProductId: '3', blockchainChainId: 11155111, blockchainContractAddress: address };
    const log = iface.encodeEventLog(iface.getEvent('QualityChecked')!, [
      3n, wallet, true, '', 1n,
    ]);
    prisma.blockchainActionIntent.findUnique.mockResolvedValue({
      id: 'intent-1', userId: user.id, status: 'PENDING',
      action: UserSignedAction.QUALITY_CHECK, entityType: 'Product',
      entityId: product.id, functionName: 'recordQualityCheck',
      args: ['3', 'true', ''], metadata: {},
    });
    prisma.product.findUnique.mockResolvedValue(qualityProduct);
    provider.getNetwork.mockResolvedValue({ chainId: 11155111n });
    provider.getTransaction.mockResolvedValue({ to: forwardedTo, from: wallet, data: '0xcef6d209', value: 0n });
    provider.getTransactionReceipt.mockResolvedValue({
      hash, to: forwardedTo, from: wallet, status: 1, blockNumber: 123,
      logs: [{ address, topics: log.topics, data: log.data }],
    });
    tx.product.update.mockResolvedValue({ ...qualityProduct, status: ProductStatus.QUALITY_CHECKED });
    tx.qualityCheck.findFirst.mockResolvedValue(null);

    await expect(service.confirm({ intentId: 'intent-1', transactionHash: hash }, user))
      .resolves.toMatchObject({ verified: true, synced: true });
    expect(tx.qualityCheck.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ productId: product.id, blockchainTxHash: hash }),
    }));
  });

  it('confirms an older registration without rolling back a product that passed quality check', async () => {
    const forwardedTo = '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3';
    const log = iface.encodeEventLog(iface.getEvent('ProductRegistered')!, [
      3n, 'BM-001', productHash, wallet, 1n,
    ]);
    prisma.blockchainActionIntent.findUnique.mockResolvedValue({
      id: 'intent-1', userId: user.id, status: 'PENDING',
      action: UserSignedAction.REGISTER_PRODUCT, entityType: 'Product',
      entityId: product.id, functionName: 'registerProduct',
      args: ['BM-001', productHash], metadata: {},
    });
    prisma.product.findUnique.mockResolvedValue({
      ...product, blockchainProductId: '3', status: ProductStatus.QUALITY_CHECKED,
    });
    provider.getNetwork.mockResolvedValue({ chainId: 11155111n });
    provider.getTransaction.mockResolvedValue({ to: forwardedTo, from: wallet, data: '0xcef6d209', value: 0n });
    provider.getTransactionReceipt.mockResolvedValue({
      hash, to: forwardedTo, from: wallet, status: 1, blockNumber: 123,
      logs: [{ address, topics: log.topics, data: log.data }],
    });
    tx.product.update.mockResolvedValue({ ...product, status: ProductStatus.QUALITY_CHECKED });

    await expect(service.confirm({ intentId: 'intent-1', transactionHash: hash }, user))
      .resolves.toMatchObject({ verified: true, synced: true });
    expect(tx.product.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ status: ProductStatus.REGISTERED }),
    }));
  });

  it('rejects a forwarded quality check whose event result differs from the intent', async () => {
    const forwardedTo = '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3';
    const log = iface.encodeEventLog(iface.getEvent('QualityChecked')!, [
      3n, wallet, false, '', 1n,
    ]);
    prisma.blockchainActionIntent.findUnique.mockResolvedValue({
      id: 'intent-1', userId: user.id, status: 'PENDING',
      action: UserSignedAction.QUALITY_CHECK, entityType: 'Product',
      entityId: product.id, functionName: 'recordQualityCheck',
      args: ['3', 'true', ''], metadata: {},
    });
    prisma.product.findUnique.mockResolvedValue({ ...product, blockchainProductId: '3' });
    provider.getNetwork.mockResolvedValue({ chainId: 11155111n });
    provider.getTransaction.mockResolvedValue({ to: forwardedTo, from: wallet, data: '0xcef6d209', value: 0n });
    provider.getTransactionReceipt.mockResolvedValue({
      hash, to: forwardedTo, from: wallet, status: 1, blockNumber: 123,
      logs: [{ address, topics: log.topics, data: log.data }],
    });

    await expect(service.confirm({ intentId: 'intent-1', transactionHash: hash }, user))
      .rejects.toThrow(ConflictException);
    expect(tx.product.update).not.toHaveBeenCalled();
  });

  it('confirms a shipment created through a wallet using the registry event', async () => {
    const forwardedTo = '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3';
    const receiver = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
    const shipment = { id: 'shipment-1', shipmentCode: 'SHP-001', product: { ...product, blockchainProductId: '3' }, blockchainShipmentId: '1' };
    const log = iface.encodeEventLog(iface.getEvent('ShipmentCreated')!, [
      1n, shipment.shipmentCode, 3n, wallet, receiver, wallet, 1n,
    ]);
    prisma.blockchainActionIntent.findUnique.mockResolvedValue({
      id: 'intent-1', userId: user.id, status: 'PENDING',
      action: UserSignedAction.CREATE_SHIPMENT, entityType: 'Shipment',
      entityId: shipment.id, functionName: 'createShipment',
      args: [shipment.shipmentCode, '3', receiver, wallet], metadata: {},
    });
    prisma.shipment.findUnique.mockResolvedValue(shipment);
    provider.getNetwork.mockResolvedValue({ chainId: 11155111n });
    provider.getTransaction.mockResolvedValue({ to: forwardedTo, from: wallet, data: '0xcef6d209', value: 0n });
    provider.getTransactionReceipt.mockResolvedValue({
      hash, to: forwardedTo, from: wallet, status: 1, blockNumber: 123,
      logs: [{ address, topics: log.topics, data: log.data }],
    });
    tx.product.update.mockResolvedValue({ ...shipment.product, status: ProductStatus.READY_TO_SHIP });

    await expect(service.confirm({ intentId: 'intent-1', transactionHash: hash }, user))
      .resolves.toMatchObject({ verified: true, synced: true, shipmentDbId: shipment.id });
    expect(tx.shipment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: shipment.id },
      data: expect.objectContaining({ blockchainShipmentId: '1', blockchainTxHash: hash }),
    }));
  });

  it('rejects a forwarded shipment event with a different receiver', async () => {
    const forwardedTo = '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3';
    const receiver = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
    const log = iface.encodeEventLog(iface.getEvent('ShipmentCreated')!, [
      1n, 'SHP-001', 3n, wallet, wallet, wallet, 1n,
    ]);
    prisma.blockchainActionIntent.findUnique.mockResolvedValue({
      id: 'intent-1', userId: user.id, status: 'PENDING',
      action: UserSignedAction.CREATE_SHIPMENT, entityType: 'Shipment',
      entityId: 'shipment-1', functionName: 'createShipment',
      args: ['SHP-001', '3', receiver, wallet], metadata: {},
    });
    prisma.shipment.findUnique.mockResolvedValue({
      id: 'shipment-1', shipmentCode: 'SHP-001',
      product: { ...product, blockchainProductId: '3' },
    });
    provider.getNetwork.mockResolvedValue({ chainId: 11155111n });
    provider.getTransaction.mockResolvedValue({ to: forwardedTo, from: wallet, data: '0xcef6d209', value: 0n });
    provider.getTransactionReceipt.mockResolvedValue({
      hash, to: forwardedTo, from: wallet, status: 1, blockNumber: 123,
      logs: [{ address, topics: log.topics, data: log.data }],
    });

    await expect(service.confirm({ intentId: 'intent-1', transactionHash: hash }, user))
      .rejects.toThrow(ConflictException);
    expect(tx.shipment.update).not.toHaveBeenCalled();
  });

  it('rejects a transaction sent by a different wallet', async () => {
    prisma.blockchainActionIntent.findUnique.mockResolvedValue({
      id: 'intent-1',
      userId: user.id,
      status: 'PENDING',
      action: 'registerProduct',
      entityType: 'Product',
      entityId: product.id,
      functionName: 'registerProduct',
      args: ['BM-001', productHash],
    });
    provider.getNetwork.mockResolvedValue({ chainId: 11155111n });
    provider.getTransaction.mockResolvedValue({ to: address, from: address });
    provider.getTransactionReceipt.mockResolvedValue({
      to: address,
      from: address,
      status: 1,
    });
    await expect(
      service.confirm({ intentId: 'intent-1', transactionHash: hash }, user),
    ).rejects.toThrow(
      'wallet ผู้ส่งธุรกรรมไม่ตรงกับ walletAddress ของบัญชีผู้ใช้งาน',
    );
  });

  it.each([
    {
      receiptStatus: 0,
      transactionTo: address,
      message: 'ธุรกรรมบน Blockchain ล้มเหลว',
    },
    {
      receiptStatus: 1,
      transactionTo: wallet,
      message: 'ธุรกรรมนี้ไม่ได้ส่งไปยัง SupplyChainRegistry ที่กำหนด',
    },
  ])('identifies a failed or wrong-contract transaction: $message', async ({
    receiptStatus,
    transactionTo,
    message,
  }) => {
    prisma.blockchainActionIntent.findUnique.mockResolvedValue({
      id: 'intent-1',
      userId: user.id,
      status: 'PENDING',
    });
    provider.getNetwork.mockResolvedValue({ chainId: 11155111n });
    provider.getTransaction.mockResolvedValue({
      to: transactionTo,
      from: wallet,
    });
    provider.getTransactionReceipt.mockResolvedValue({
      hash,
      to: transactionTo,
      from: wallet,
      status: receiptStatus,
      logs: [],
    });

    await expect(
      service.confirm({ intentId: 'intent-1', transactionHash: hash }, user),
    ).rejects.toThrow(new BadRequestException(message));
  });

  it('rejects a transaction hash already assigned to another intent', async () => {
    prisma.blockchainActionIntent.findUnique.mockResolvedValue({
      id: 'intent-1',
      userId: user.id,
      status: 'PENDING',
    });
    prisma.blockchainActionIntent.findFirst.mockResolvedValue({
      id: 'intent-2',
    });
    provider.getNetwork.mockResolvedValue({ chainId: 11155111n });
    provider.getTransaction.mockResolvedValue({ to: address, from: wallet });
    provider.getTransactionReceipt.mockResolvedValue({
      hash,
      to: address,
      from: wallet,
      status: 1,
    });

    await expect(
      service.confirm({ intentId: 'intent-1', transactionHash: hash }, user),
    ).rejects.toThrow(ConflictException);
    expect(tx.product.update).not.toHaveBeenCalled();
  });
});
