import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService wallet management', () => {
  const address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const tx = {
    user: { update: jest.fn() },
    organization: { update: jest.fn() },
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    {} as JwtService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
    tx.user.update.mockResolvedValue({
      id: 'user-1',
      organizationId: 'org-1',
      walletAddress: address,
    });
    tx.organization.update.mockResolvedValue({ id: 'org-1', walletAddress: address });
  });

  it('sets the user and organization wallet in one transaction when requested', async () => {
    await service.setUserWallet('user-1', address, true);

    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: { walletAddress: address },
    }));
    expect(tx.organization.update).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: { walletAddress: address },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('keeps the organization wallet unchanged unless requested', async () => {
    await service.setUserWallet('user-1', address);
    expect(tx.organization.update).not.toHaveBeenCalled();
  });

  it('rejects organization sync for a user without an organization', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', organizationId: null });
    await expect(service.setUserWallet('admin-1', address, true)).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
