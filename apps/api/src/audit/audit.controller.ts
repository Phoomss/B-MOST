import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Audit')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List audit logs with filtering and pagination',
    description:
      'Retrieves system audit records for compliance and tracking. Accessible by auditors, super admins, and organization users (isolated to their own organization).',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated audit logs list',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(
    @Query() query: QueryAuditLogDto,
    @CurrentUser() user: any,
  ) {
    return this.auditService.findAll(query, user);
  }

  @Get('filters/options')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get audit log filter choices',
    description:
      'Returns distinct action names, entity types, and organizations for dashboard filter dropdowns.',
  })
  @ApiResponse({
    status: 200,
    description: 'Filter options for UI dropdowns',
  })
  async getFilterOptions(@CurrentUser() user: any) {
    return this.auditService.getFilterOptions(user);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get audit log entry details',
    description:
      'Retrieves single audit log record including complete actor, organization, entity, and JSON metadata.',
  })
  @ApiParam({ name: 'id', description: 'Audit log UUID' })
  @ApiResponse({
    status: 200,
    description: 'Audit log entry details',
  })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.auditService.findOne(id, user);
  }
}
