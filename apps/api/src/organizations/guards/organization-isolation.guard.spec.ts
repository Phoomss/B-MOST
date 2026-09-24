import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OrganizationIsolationGuard } from './organization-isolation.guard';

describe('OrganizationIsolationGuard', () => {
  let guard: OrganizationIsolationGuard;

  beforeEach(() => {
    guard = new OrganizationIsolationGuard();
  });

  const createMockContext = (user?: any, params: Record<string, string> = {}): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user,
          params,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should throw ForbiddenException if user context is missing', () => {
    const context = createMockContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('User context is missing'),
    );
  });

  it('should allow SUPER_ADMIN cross-organization access', () => {
    const context = createMockContext(
      { role: UserRole.SUPER_ADMIN, organizationId: null },
      { id: 'org-another-uuid' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow AUDITOR cross-organization access', () => {
    const context = createMockContext(
      { role: UserRole.AUDITOR, organizationId: 'org-auditor-uuid' },
      { id: 'org-another-uuid' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow user accessing their own organization data', () => {
    const context = createMockContext(
      { role: UserRole.ORG_ADMIN, organizationId: 'org-own-uuid' },
      { id: 'org-own-uuid' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject user attempting to access another organization data with ForbiddenException', () => {
    const context = createMockContext(
      { role: UserRole.ORG_ADMIN, organizationId: 'org-own-uuid' },
      { id: 'org-foreign-uuid' },
    );
    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException(
        'Access denied: You do not have permission to access another organization’s data',
      ),
    );
  });

  it('should allow user if no organization ID parameter is present in the route', () => {
    const context = createMockContext(
      { role: UserRole.ORG_ADMIN, organizationId: 'org-own-uuid' },
      {},
    );
    expect(guard.canActivate(context)).toBe(true);
  });
});
