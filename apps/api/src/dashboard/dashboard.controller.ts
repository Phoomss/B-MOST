import {
  Controller,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  DashboardStatisticsResponseDto,
  DashboardChartsResponseDto,
  RecentActivityItem,
} from './dto/dashboard-stats.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(OptionalJwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description:
      'Calculates real operational metrics across products, active shipments, custody statuses, and blockchain transactions. Tenant-isolated when authenticated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics calculated from actual records',
    type: DashboardStatisticsResponseDto,
  })
  async getStatistics(
    @CurrentUser() user: any,
  ): Promise<DashboardStatisticsResponseDto> {
    return this.dashboardService.getStatistics(user);
  }

  @Get('charts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get dashboard visual analytics and charts data',
    description:
      'Returns distributions for product status, shipment activities, organization participation, and blockchain transactions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chart datasets and metrics',
    type: DashboardChartsResponseDto,
  })
  async getCharts(
    @CurrentUser() user: any,
  ): Promise<DashboardChartsResponseDto> {
    return this.dashboardService.getCharts(user);
  }

  @Get('recent-activity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get recent supply chain activity stream',
    description:
      'Returns a chronological activity stream combining products registered, quality checks, shipment dispatches, and blockchain transactions.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of recent supply chain events',
    type: [RecentActivityItem],
  })
  async getRecentActivity(
    @CurrentUser() user: any,
  ): Promise<RecentActivityItem[]> {
    return this.dashboardService.getRecentActivity(user);
  }
}
