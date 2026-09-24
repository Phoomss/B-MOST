import {
  Controller,
  Get,
  Post,
  Body,
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
import { UserRole } from '@prisma/client';
import { QualityChecksService } from './quality-checks.service';
import { CreateQualityCheckDto } from './dto/create-quality-check.dto';
import { QueryQualityCheckDto } from './dto/query-quality-check.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Quality Checks')
@Controller('quality-checks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QualityChecksController {
  constructor(private readonly qualityChecksService: QualityChecksService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.AUDITOR,
    UserRole.MANUFACTURER,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record quality control inspection (Auditor & Manufacturer)',
    description:
      'Records inspection verdict (PASS / FAIL) for a product, submits an on-chain transaction to the SupplyChainRegistry smart contract, and writes an audit log.',
  })
  @ApiResponse({
    status: 201,
    description: 'Quality check completed and committed on-chain',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid result or recalled product',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Only authorized Auditor or Manufacturer can perform QC',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async create(@Body() dto: CreateQualityCheckDto, @CurrentUser() user: any) {
    return this.qualityChecksService.performQualityCheck(
      dto.productId || '',
      dto,
      user,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List quality control inspections',
    description:
      'Returns paginated list of quality check inspections. Enforces organization isolation for tenant users while auditors and admins have broad visibility.',
  })
  @ApiResponse({ status: 200, description: 'Quality checks retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query() query: QueryQualityCheckDto,
    @CurrentUser() user: any,
  ) {
    return this.qualityChecksService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get quality check details by ID',
    description:
      'Retrieves full details of a specific inspection, including product info, organization, inspector name, and blockchain transaction hash.',
  })
  @ApiParam({ name: 'id', description: 'Quality Check UUID' })
  @ApiResponse({ status: 200, description: 'Quality check details returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Quality check not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.qualityChecksService.findOne(id, user);
  }
}
