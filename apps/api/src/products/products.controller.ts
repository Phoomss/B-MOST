import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { RegisterBlockchainDto } from './dto/register-blockchain.dto';
import { CreateQualityCheckDto } from '../quality-checks/dto/create-quality-check.dto';
import { QualityChecksService } from '../quality-checks/quality-checks.service';
import { ShipmentsService } from '../shipments/shipments.service';
import { DispatchShipmentDto } from '../shipments/dto/dispatch-shipment.dto';
import { ReceiveShipmentDto } from '../shipments/dto/receive-shipment.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { SellProductDto } from './dto/sell-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly qualityChecksService: QualityChecksService,
    private readonly shipmentsService: ShipmentsService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANUFACTURER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create product (Manufacturer & Super Admin)',
    description:
      'Creates a new product record in PostgreSQL, computes a deterministic Keccak-256 hash, generates a QR code, and optionally registers it onto the blockchain smart contract.',
  })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User must have MANUFACTURER or SUPER_ADMIN role',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - productCode or serialNumber already exists',
  })
  async create(@Body() createDto: CreateProductDto, @CurrentUser() user: any) {
    return this.productsService.create(createDto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'List products',
    description:
      'Returns paginated list of products. Enforces multi-tenant data isolation: non-admin users only see products manufactured or currently owned by their organization.',
  })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: QueryProductDto, @CurrentUser() user: any) {
    return this.productsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product by ID',
    description:
      'Retrieves complete product details, current owner, live on-chain status, and QR code representation.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product details returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot access another organization’s product',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.findOne(id, user);
  }

  @Get('code/:productCode')
  @ApiOperation({
    summary: 'Get product by unique product code',
    description: 'Retrieves product details matching the unique product code.',
  })
  @ApiParam({
    name: 'productCode',
    description: 'Unique product code identifier',
  })
  @ApiResponse({ status: 200, description: 'Product returned' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findByCode(
    @Param('productCode') productCode: string,
    @CurrentUser() user: any,
  ) {
    return this.productsService.findByCode(productCode, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update product metadata',
    description:
      'Updates non-immutable product metadata (name, description, category). Core tracking identifiers and blockchain states cannot be altered.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Only current owning organization or admin can update',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductDto,
    @CurrentUser() user: any,
  ) {
    return this.productsService.update(id, updateDto, user);
  }

  @Post(':id/register-blockchain')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANUFACTURER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register product on blockchain',
    description:
      'Invokes the SupplyChainRegistry smart contract registerProduct function with the deterministic product hash. Stores on-chain product ID and transaction hash in PostgreSQL.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({
    status: 200,
    description: 'Product registered on blockchain successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only authorized manufacturer can register',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({
    status: 409,
    description: 'Product is already registered on blockchain',
  })
  async registerOnBlockchain(
    @Param('id') id: string,
    @Body() registerDto: RegisterBlockchainDto,
    @CurrentUser() user: any,
  ) {
    return this.productsService.registerOnBlockchain(
      id,
      user,
      registerDto?.signerPrivateKey,
    );
  }

  @Post(':id/quality-check')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.AUDITOR,
    UserRole.MANUFACTURER,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Perform quality check (FR-05 & Phase 8)',
    description:
      'Records quality check inspection verdict (PASS / FAIL), executes on-chain verification on SupplyChainRegistry smart contract, and transitions product status.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID or unique productCode' })
  @ApiResponse({
    status: 200,
    description: 'Quality check verified and recorded on blockchain',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid result or recalled product',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User not authorized to perform quality check',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async qualityCheck(
    @Param('id') id: string,
    @Body() dto: CreateQualityCheckDto,
    @CurrentUser() user: any,
  ) {
    return this.qualityChecksService.performQualityCheck(id, dto, user);
  }

  @Get(':id/quality-checks')
  @ApiOperation({
    summary: 'Get quality checks for product',
    description:
      'Retrieves all historical quality check inspections conducted on this product.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Quality checks retrieved' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductQualityChecks(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.qualityChecksService.findByProductId(id, user);
  }

  @Post(':id/ship')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ship product (dispatch on-chain)',
    description:
      'Dispatches active pending shipment for the product. Submits shipProduct on smart contract and transitions status to SHIPPED.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID or Product Code' })
  @ApiResponse({ status: 200, description: 'Product dispatched successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid product or shipment state',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only sender or carrier can ship',
  })
  @ApiResponse({ status: 404, description: 'Product or shipment not found' })
  async shipProduct(
    @Param('id') id: string,
    @Body() dto: DispatchShipmentDto,
    @CurrentUser() user: any,
  ) {
    return this.shipmentsService.shipByProductId(id, dto, user);
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive product & transfer ownership (on-chain)',
    description:
      'Confirms delivery of product. Submits receiveProduct on smart contract, transitions status to RECEIVED, and transfers ownership to the receiver organization.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID or Product Code' })
  @ApiResponse({
    status: 200,
    description: 'Product received and ownership transferred',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid product or shipment state',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only receiver can confirm receipt',
  })
  @ApiResponse({ status: 404, description: 'Product or shipment not found' })
  async receiveProduct(
    @Param('id') id: string,
    @Body() dto: ReceiveShipmentDto,
    @CurrentUser() user: any,
  ) {
    return this.shipmentsService.receiveByProductId(id, dto, user);
  }

  @Post(':id/transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manual ownership transfer on blockchain',
    description:
      'Transfers product ownership directly to a new organization on the smart contract.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID or Product Code' })
  @ApiResponse({ status: 200, description: 'Ownership transferred' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only current owner can transfer',
  })
  @ApiResponse({
    status: 404,
    description: 'Product or organization not found',
  })
  async transferOwnership(
    @Param('id') id: string,
    @Body() dto: TransferOwnershipDto,
    @CurrentUser() user: any,
  ) {
    return this.shipmentsService.transferOwnership(id, dto, user);
  }

  @Post(':id/sell')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.RETAILER,
    UserRole.DISTRIBUTOR,
    UserRole.WAREHOUSE,
    UserRole.MANUFACTURER,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark product as sold to end consumer',
    description:
      'Marks product status as SOLD in database and triggers markAsSold on the smart contract.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID or Product Code' })
  @ApiResponse({
    status: 200,
    description: 'Product marked as sold successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid product state' })
  @ApiResponse({ status: 403, description: 'Forbidden - not current owner' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async sellProduct(
    @Param('id') id: string,
    @Body() dto: SellProductDto,
    @CurrentUser() user: any,
  ) {
    return this.productsService.sellProduct(id, dto, user);
  }

  @Get(':id/shipments')
  @ApiOperation({
    summary: 'Get product shipments history',
    description: 'Retrieves all shipments involving this product.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID or Product Code' })
  @ApiResponse({ status: 200, description: 'Shipments retrieved' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductShipments(@Param('id') id: string, @CurrentUser() user: any) {
    return this.shipmentsService.findByProductId(id, user);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Get product traceability history',
    description:
      'Returns complete chronological timeline combining smart contract events, database audit logs, quality control checks, and shipment milestones.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Traceability history returned' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getHistory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.getHistory(id, user);
  }

  @Get(':id/qr')
  @ApiOperation({
    summary: 'Get product QR code',
    description:
      'Returns a base64 Data URL and verification URL to render and download the product QR code.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'QR code generated' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getQr(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.getQr(id, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANUFACTURER)
  @ApiOperation({
    summary: 'Delete unregistered draft product',
    description:
      'Permanently deletes a draft product. Once a product has been committed to the blockchain ledger, deletion is strictly prohibited to guarantee immutability.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Cannot delete products committed to the blockchain or with existing supply chain history',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.remove(id, user);
  }
}
