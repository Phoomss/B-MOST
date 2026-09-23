import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
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
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateOrganizationStatusDto } from './dto/update-organization-status.dto';
import { QueryOrganizationDto } from './dto/query-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrganizationIsolationGuard } from './guards/organization-isolation.guard';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new organization (SUPER_ADMIN only)',
    description:
      'Creates a new supply-chain organization entity with designated type and optional wallet address.',
  })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires SUPER_ADMIN' })
  @ApiResponse({ status: 409, description: 'Conflict - Code or wallet address already in use' })
  async create(
    @Body() createDto: CreateOrganizationDto,
    @CurrentUser() user: any,
  ) {
    return this.organizationsService.create(createDto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'List organizations',
    description:
      'Returns paginated list of organizations. Non-admin users are restricted to viewing only their own organization to enforce tenant isolation.',
  })
  @ApiResponse({ status: 200, description: 'List of organizations returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query() query: QueryOrganizationDto,
    @CurrentUser() user: any,
  ) {
    return this.organizationsService.findAll(query, user);
  }

  @Get(':id')
  @UseGuards(OrganizationIsolationGuard)
  @ApiOperation({
    summary: 'Get organization by ID',
    description:
      'Retrieves organization details. Users cannot access organizations other than their own unless possessing SUPER_ADMIN or AUDITOR privileges.',
  })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, description: 'Organization details returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot access another organization' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.organizationsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update organization details',
    description:
      'Updates organization profile. SUPER_ADMIN can update all fields; ORG_ADMIN can only update their own organization profile.',
  })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions or organization mismatch' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Code or wallet address already in use' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrganizationDto,
    @CurrentUser() user: any,
  ) {
    return this.organizationsService.update(id, updateDto, user);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Activate or deactivate organization status (SUPER_ADMIN only)',
    description:
      'Changes organization status to ACTIVE, INACTIVE, or SUSPENDED. Restricted to SUPER_ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, description: 'Organization status updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires SUPER_ADMIN' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrganizationStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.organizationsService.updateStatus(id, updateStatusDto, user);
  }
}
