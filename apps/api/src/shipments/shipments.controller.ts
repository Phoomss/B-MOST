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
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { QueryShipmentDto } from './dto/query-shipment.dto';
import { DispatchShipmentDto } from './dto/dispatch-shipment.dto';
import { ReceiveShipmentDto } from './dto/receive-shipment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Shipments')
@Controller('shipments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.MANUFACTURER,
    UserRole.DISTRIBUTOR,
    UserRole.WAREHOUSE,
    UserRole.RETAILER,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create shipment reference and register on blockchain (FR-06)',
    description:
      'Creates a new shipment record, assigns recipient and carrier, executes createShipment on SupplyChainRegistry smart contract, and sets product state to READY_TO_SHIP.',
  })
  @ApiResponse({ status: 201, description: 'Shipment created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid state or same sender/receiver',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not own product',
  })
  @ApiResponse({
    status: 404,
    description: 'Product or organization not found',
  })
  async create(@Body() dto: CreateShipmentDto, @CurrentUser() user: any) {
    return this.shipmentsService.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'List shipments',
    description:
      'Returns paginated list of shipments with multi-tenant data isolation. Filterable by product, sender, receiver, carrier, and status.',
  })
  @ApiResponse({ status: 200, description: 'Shipments retrieved successfully' })
  async findAll(@Query() query: QueryShipmentDto, @CurrentUser() user: any) {
    return this.shipmentsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get shipment by ID or shipment code',
    description:
      'Retrieves complete shipment tracking details including sender, receiver, carrier, and on-chain identifiers.',
  })
  @ApiParam({ name: 'id', description: 'Shipment UUID or unique shipmentCode' })
  @ApiResponse({ status: 200, description: 'Shipment details returned' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.shipmentsService.findOne(id, user);
  }

  @Post(':id/ship')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dispatch shipment (ship product)',
    description:
      'Dispatches product for shipment. Invokes shipProduct on Ethereum smart contract and advances status to SHIPPED.',
  })
  @ApiParam({ name: 'id', description: 'Shipment UUID or unique shipmentCode' })
  @ApiResponse({ status: 200, description: 'Shipment dispatched' })
  @ApiResponse({ status: 400, description: 'Invalid shipment status' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only sender or carrier can ship',
  })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async ship(
    @Param('id') id: string,
    @Body() dto: DispatchShipmentDto,
    @CurrentUser() user: any,
  ) {
    return this.shipmentsService.ship(id, dto, user);
  }

  @Post(':id/in-transit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a shipped product as in transit' })
  async markInTransit(
    @Param('id') id: string,
    @Body() dto: DispatchShipmentDto,
    @CurrentUser() user: any,
  ) {
    return this.shipmentsService.markInTransit(id, dto, user);
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm receipt & transfer ownership (FR-07 & FR-08)',
    description:
      'Confirms arrival at destination. Invokes receiveProduct on smart contract, sets status to DELIVERED, and automatically transfers product ownership to the recipient organization.',
  })
  @ApiParam({ name: 'id', description: 'Shipment UUID or unique shipmentCode' })
  @ApiResponse({
    status: 200,
    description: 'Shipment received and ownership transferred',
  })
  @ApiResponse({ status: 400, description: 'Invalid shipment status' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only receiver can confirm receipt',
  })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async receive(
    @Param('id') id: string,
    @Body() dto: ReceiveShipmentDto,
    @CurrentUser() user: any,
  ) {
    return this.shipmentsService.receive(id, dto, user);
  }
}
