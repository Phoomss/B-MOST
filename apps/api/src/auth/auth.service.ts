import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { ethers } from 'ethers';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async listUserWallets() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        walletAddress: true,
        status: true,
      },
      orderBy: { email: 'asc' },
    });
  }

  async setUserWallet(
    id: string,
    walletAddress: string,
    syncOrganization = false,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });
    if (!user) throw new NotFoundException('ไม่พบบัญชีผู้ใช้');
    if (syncOrganization && !user.organizationId) {
      throw new BadRequestException('ผู้ใช้ไม่มีองค์กรให้ตั้งค่า walletAddress');
    }
    if (!ethers.isAddress(walletAddress)) {
      throw new BadRequestException('walletAddress ไม่ถูกต้อง');
    }
    const address = ethers.getAddress(walletAddress);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { walletAddress: address },
        select: {
          id: true,
          email: true,
          role: true,
          organizationId: true,
          walletAddress: true,
        },
      });
      if (syncOrganization && user.organizationId) {
        await tx.organization.update({
          where: { id: user.organizationId },
          data: { walletAddress: address },
        });
      }
      return updated;
    });
  }

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive or suspended');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { passwordHash: _passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload);

    // Record audit log for login
    await this.prisma.auditLog
      .create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          action: 'USER_LOGIN',
          entityType: 'User',
          entityId: user.id,
          metadata: { email: user.email, role: user.role },
        },
      })
      .catch(() => {
        // Non-blocking audit log
      });

    return {
      accessToken,
      user,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { passwordHash: _passwordHash, ...result } = user;
    return result;
  }
}
