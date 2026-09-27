import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

@Injectable()
export class OrganizationIsolationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User context is missing');
    }

    // SUPER_ADMIN and AUDITOR have cross-organization visibility
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.AUDITOR) {
      return true;
    }

    const targetOrgId = request.params.id || request.params.organizationId;

    if (targetOrgId) {
      if (!user.organizationId || user.organizationId !== targetOrgId) {
        throw new ForbiddenException(
          'Access denied: You do not have permission to access another organization’s data',
        );
      }
    }

    return true;
  }
}
