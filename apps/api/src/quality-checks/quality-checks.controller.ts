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
  GoneException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { QualityChecksService } from './quality-checks.service';
import { CreateQualityCheckDto } from './dto/create-quality-check.dto';
import { QueryQualityCheckDto } from './dto/query-quality-check.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Quality Checks')
@Controller('quality-checks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QualityChecksController {
  constructor(private readonly qualityChecksService: QualityChecksService) {}

  @Post()
  @HttpCode(HttpStatus.GONE)
  @ApiOperation({
    summary: 'Legacy quality write route; use wallet-signed blockchain actions',
    description:
      'Prepare recordQualityCheck with POST /api/blockchain/actions/prepare, sign in MetaMask, then confirm the receipt.',
  })
  @ApiResponse({ status: 410, description: 'Use wallet-signed blockchain actions' })
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
    void dto;
    void user;
    throw new GoneException(
      'ใช้ /api/blockchain/actions/prepare และ /api/blockchain/actions/confirm เพื่อให้ MetaMask ลงนามธุรกรรม',
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
