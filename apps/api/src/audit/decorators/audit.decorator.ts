import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA_KEY = 'AUDIT_METADATA';

export interface AuditOptions {
  action: string;
  entityType: string;
  getEntityId?: (req: any, res: any) => string;
}

/**
 * Decorator to declare audit logging requirements on controller endpoints.
 * Processed by AuditInterceptor.
 */
export const Audit = (options: AuditOptions) =>
  SetMetadata(AUDIT_METADATA_KEY, options);
