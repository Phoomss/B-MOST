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
import { TraceabilityService } from './traceability.service';
import { TraceabilityQueryDto } from './dto/traceability-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Traceability')
@Controller('traceability')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TraceabilityController {
  constructor(private readonly traceabilityService: TraceabilityService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search products for traceability lookup',
    description:
      'Search accessible products by productCode, serialNumber, or name for rapid traceability lookup with multi-tenant filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of matching products accessible to user',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async search(@Query() query: TraceabilityQueryDto, @CurrentUser() user: any) {
    return this.traceabilityService.search(query, user);
  }

  @Get(':identifier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get complete product traceability timeline and verification',
    description:
      'Retrieve complete chronological history, smart contract verification state, event timeline, and ownership provenance by productCode, serialNumber, or internal UUID.',
  })
  @ApiParam({
    name: 'identifier',
    description:
      'Product Code (e.g. PRD-APEX-001), Serial Number, or Product UUID',
    example: 'PRD-APEX-001',
  })
  @ApiResponse({
    status: 200,
    description:
      'Traceability history, timeline events, and blockchain verification payload',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Product belongs to another tenant',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getTraceability(
    @Param('identifier') identifier: string,
    @CurrentUser() user: any,
  ) {
    return this.traceabilityService.getTraceability(identifier, user);
  }
}
