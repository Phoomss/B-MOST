import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateOrganizationStatusDto } from './dto/update-organization-status.dto';
import { QueryOrganizationDto } from './dto/query-organization.dto';
import { OrganizationStatus, UserRole } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateOrganizationDto, currentUser: any) {
    const formattedCode = createDto.code.toUpperCase();

    // Check code uniqueness
    const existingCode = await this.prisma.organization.findUnique({
      where: { code: formattedCode },
    });
    if (existingCode) {
      throw new ConflictException(`Organization with code '${formattedCode}' already exists`);
    }

    // Check wallet address uniqueness if provided
    if (createDto.walletAddress) {
      const existingWallet = await this.prisma.organization.findUnique({
        where: { walletAddress: createDto.walletAddress },
      });
      if (existingWallet) {
        throw new ConflictException(
          `Wallet address '${createDto.walletAddress}' is already registered to another organization`,
        );
      }
    }

    const organization = await this.prisma.organization.create({
      data: {
        name: createDto.name,
        code: formattedCode,
        type: createDto.type,
        address: createDto.address,
        contactEmail: createDto.contactEmail,
        phone: createDto.phone,
        walletAddress: createDto.walletAddress,
        status: createDto.status || OrganizationStatus.ACTIVE,
      },
    });

    // Record audit log
    await this.prisma.auditLog
      .create({
        data: {
          userId: currentUser?.id,
          organizationId: organization.id,
          action: 'ORGANIZATION_CREATED',
          entityType: 'Organization',
          entityId: organization.id,
          metadata: {
            name: organization.name,
            code: organization.code,
            type: organization.type,
            walletAddress: organization.walletAddress,
            createdById: currentUser?.id,
          },
        },
      })
      .catch(() => {
        // Non-blocking audit log
      });

    return organization;
  }

  async findAll(query: QueryOrganizationDto, currentUser: any) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    let where: any = {};

    // Organization Isolation:
    // SUPER_ADMIN and AUDITOR can see all organizations.
    // Other roles can ONLY see their own organization to preserve data isolation.
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.AUDITOR
    ) {
      if (!currentUser.organizationId) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }
      where.id = currentUser.organizationId;
    } else {
      // Admin/Auditor filters
      if (query.type) {
        where.type = query.type;
      }
      if (query.status) {
        where.status = query.status;
      }
      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { code: { contains: query.search, mode: 'insensitive' } },
        ];
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              productsManufactured: true,
              productsOwned: true,
              shipmentsSent: true,
              shipmentsReceived: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: any) {
    // Organization Isolation Check:
    // Users other than SUPER_ADMIN and AUDITOR are strictly forbidden from viewing another organization
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.AUDITOR
    ) {
      if (!currentUser.organizationId || currentUser.organizationId !== id) {
        throw new ForbiddenException(
          'Access denied: You do not have permission to access another organization’s data',
        );
      }
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            users: true,
            productsManufactured: true,
            productsOwned: true,
            shipmentsSent: true,
            shipmentsReceived: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID '${id}' not found`);
    }

    return organization;
  }

  async update(id: string, updateDto: UpdateOrganizationDto, currentUser: any) {
    // Role & Organization Isolation Check:
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      if (currentUser.role === UserRole.ORG_ADMIN) {
        if (!currentUser.organizationId || currentUser.organizationId !== id) {
          throw new ForbiddenException(
            'Access denied: You cannot update another organization',
          );
        }
        // ORG_ADMIN cannot alter administrative fields
        if (
          updateDto.code !== undefined ||
          updateDto.type !== undefined ||
          updateDto.status !== undefined ||
          updateDto.walletAddress !== undefined
        ) {
          throw new ForbiddenException(
            'Access denied: ORG_ADMIN is not authorized to modify organization code, type, status, or wallet address',
          );
        }
      } else {
        throw new ForbiddenException(
          'Access denied: Insufficient permissions to update organization',
        );
      }
    }

    const existing = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Organization with ID '${id}' not found`);
    }

    // Check code uniqueness if changing
    if (updateDto.code && updateDto.code.toUpperCase() !== existing.code) {
      const codeInUse = await this.prisma.organization.findUnique({
        where: { code: updateDto.code.toUpperCase() },
      });
      if (codeInUse) {
        throw new ConflictException(
          `Organization with code '${updateDto.code.toUpperCase()}' already exists`,
        );
      }
    }

    // Check wallet uniqueness if changing
    if (
      updateDto.walletAddress &&
      updateDto.walletAddress !== existing.walletAddress
    ) {
      const walletInUse = await this.prisma.organization.findUnique({
        where: { walletAddress: updateDto.walletAddress },
      });
      if (walletInUse) {
        throw new ConflictException(
          `Wallet address '${updateDto.walletAddress}' is already registered to another organization`,
        );
      }
    }

    const updateData: any = {};
    if (updateDto.name !== undefined) updateData.name = updateDto.name;
    if (updateDto.address !== undefined) updateData.address = updateDto.address;
    if (updateDto.contactEmail !== undefined)
      updateData.contactEmail = updateDto.contactEmail;
    if (updateDto.phone !== undefined) updateData.phone = updateDto.phone;

    // Super Admin privilege fields
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      if (updateDto.code !== undefined)
        updateData.code = updateDto.code.toUpperCase();
      if (updateDto.type !== undefined) updateData.type = updateDto.type;
      if (updateDto.walletAddress !== undefined)
        updateData.walletAddress = updateDto.walletAddress;
      if (updateDto.status !== undefined) updateData.status = updateDto.status;
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: updateData,
    });

    // Record audit log
    await this.prisma.auditLog
      .create({
        data: {
          userId: currentUser.id,
          organizationId: updated.id,
          action: 'ORGANIZATION_UPDATED',
          entityType: 'Organization',
          entityId: updated.id,
          metadata: {
            updatedFields: Object.keys(updateData),
            updatedById: currentUser.id,
          },
        },
      })
      .catch(() => {});

    return updated;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateOrganizationStatusDto,
    currentUser: any,
  ) {
    const existing = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Organization with ID '${id}' not found`);
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: { status: updateStatusDto.status },
    });

    // Record audit log
    await this.prisma.auditLog
      .create({
        data: {
          userId: currentUser.id,
          organizationId: updated.id,
          action: 'ORGANIZATION_STATUS_CHANGED',
          entityType: 'Organization',
          entityId: updated.id,
          metadata: {
            previousStatus: existing.status,
            newStatus: updateStatusDto.status,
            reason: updateStatusDto.reason || 'Status updated by administrator',
            updatedById: currentUser.id,
          },
        },
      })
      .catch(() => {});

    return updated;
  }
}
