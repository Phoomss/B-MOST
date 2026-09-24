import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

export interface CreateAuditEntry {
  userId?: string | null;
  organizationId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to sanitize metadata and strip confidential keys.
   */
  private sanitizeMetadata(metadata: any): any {
    if (!metadata || typeof metadata !== 'object') return metadata;
    const sanitized = { ...metadata };
    const sensitiveKeys = ['password', 'passwordHash', 'token', 'accessToken', 'secret', 'privateKey'];
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  /**
   * Records a new audit log entry in PostgreSQL.
   */
  async record(entry: CreateAuditEntry) {
    try {
      const sanitized = this.sanitizeMetadata(entry.metadata);
      return await this.prisma.auditLog.create({
        data: {
          userId: entry.userId || null,
          organizationId: entry.organizationId || null,
          action: entry.action.trim().toUpperCase(),
          entityType: entry.entityType.trim(),
          entityId: entry.entityId.trim(),
          metadata: sanitized || undefined,
          ipAddress: entry.ipAddress || null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err.message}`, err.stack);
      return null;
    }
  }

  /**
   * Query audit logs with pagination, filtering, and multi-tenant access control.
   * Conforms to docs/API.md Section 11 (GET /audit-logs).
   */
  async findAll(query: QueryAuditLogDto, currentUser: any) {
    const isGlobalAuditor =
      !currentUser ||
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.AUDITOR;

    const where: any = {};

    // 1. Multi-tenant organization scoping
    if (!isGlobalAuditor) {
      if (!currentUser.organizationId) {
        throw new ForbiddenException('User must belong to an organization to view audit logs');
      }
      where.organizationId = currentUser.organizationId;
    } else if (query.organizationId) {
      where.organizationId = query.organizationId.trim();
    }

    // 2. Direct attribute filters
    if (query.userId) {
      where.userId = query.userId.trim();
    }

    if (query.action) {
      where.action = { equals: query.action.trim().toUpperCase() };
    }

    if (query.entityType) {
      where.entityType = { equals: query.entityType.trim() };
    }

    if (query.entityId) {
      where.entityId = query.entityId.trim();
    }

    // 3. Date range filters
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        where.createdAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.createdAt.lte = new Date(query.dateTo);
      }
    }

    // 4. Keyword search across action, entityType, and entityId
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { action: { contains: s, mode: 'insensitive' } },
        { entityType: { contains: s, mode: 'insensitive' } },
        { entityId: { contains: s, mode: 'insensitive' } },
      ];
    }

    // 5. Pagination
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
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
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves single audit log detail with multi-tenant access check.
   */
  async findOne(id: string, currentUser: any) {
    const auditLog = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
          },
        },
      },
    });

    if (!auditLog) {
      throw new NotFoundException(`Audit log entry '${id}' not found`);
    }

    const isGlobalAuditor =
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.AUDITOR;

    if (!isGlobalAuditor && auditLog.organizationId !== currentUser.organizationId) {
      throw new ForbiddenException('Access denied to other organization audit log');
    }

    return auditLog;
  }

  /**
   * Retrieves distinct filter options (actions, entity types, organizations) for UI dropdowns.
   */
  async getFilterOptions(currentUser: any) {
    const isGlobalAuditor =
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.AUDITOR;

    const orgWhere = isGlobalAuditor ? {} : { id: currentUser.organizationId };

    const [organizations, logs] = await Promise.all([
      this.prisma.organization.findMany({
        where: orgWhere,
        select: { id: true, name: true, code: true, type: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        where: isGlobalAuditor ? {} : { organizationId: currentUser.organizationId },
        select: { action: true, entityType: true },
        distinct: ['action', 'entityType'],
      }),
    ]);

    const actions = Array.from(new Set(logs.map((l) => l.action))).sort();
    const entityTypes = Array.from(new Set(logs.map((l) => l.entityType))).sort();

    return {
      actions,
      entityTypes,
      organizations,
    };
  }
}
