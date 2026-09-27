import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  AUDIT_METADATA_KEY,
  AuditOptions,
} from '../decorators/audit.decorator';
import { AuditService } from '../audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditOptions>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    if (!auditOptions) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const ipAddress =
      req.headers['x-forwarded-for'] ||
      req.ip ||
      req.socket?.remoteAddress ||
      null;

    return next.handle().pipe(
      tap({
        next: (responseBody: any) => {
          try {
            let entityId = 'SYSTEM';
            if (auditOptions.getEntityId) {
              entityId = auditOptions.getEntityId(req, responseBody);
            } else if (req.params?.id) {
              entityId = req.params.id;
            } else if (responseBody?.id) {
              entityId = responseBody.id;
            } else if (responseBody?.product?.id) {
              entityId = responseBody.product.id;
            } else if (responseBody?.shipment?.id) {
              entityId = responseBody.shipment.id;
            } else if (responseBody?.qualityCheck?.id) {
              entityId = responseBody.qualityCheck.id;
            }

            const organizationId =
              user?.organizationId ||
              responseBody?.organizationId ||
              req.body?.organizationId ||
              null;

            // Record asynchronously
            this.auditService.record({
              userId: user?.id || null,
              organizationId,
              action: auditOptions.action,
              entityType: auditOptions.entityType,
              entityId: String(entityId),
              metadata: {
                method: req.method,
                url: req.originalUrl || req.url,
                body: req.body,
                params: req.params,
              },
              ipAddress: typeof ipAddress === 'string' ? ipAddress : null,
            });
          } catch (err: any) {
            this.logger.warn(`Audit interceptor error: ${err.message}`);
          }
        },
      }),
    );
  }
}
