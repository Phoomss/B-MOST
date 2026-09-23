import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('Public Verification')
@Controller('public')
export class PublicProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('verify/:productCode')
  @ApiOperation({
    summary: 'Public QR Code Product Verification',
    description:
      'Unauthenticated public verification endpoint accessed by consumers scanning product QR codes. Compares cryptographic hash and returns authentic provenance without exposing sensitive internal data.',
  })
  @ApiParam({
    name: 'productCode',
    description: 'Unique product code (e.g. PRD-2026-0001)',
  })
  @ApiResponse({
    status: 200,
    description: 'Public verification report',
  })
  async verifyProduct(@Param('productCode') productCode: string) {
    return this.productsService.verifyPublicProduct(productCode);
  }
}
