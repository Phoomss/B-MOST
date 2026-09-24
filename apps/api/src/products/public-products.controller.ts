import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import type { Response } from 'express';
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
    description: 'Unique product code (e.g. PRD-2026-0001) or serial number',
  })
  @ApiResponse({
    status: 200,
    description: 'Public verification report',
  })
  async verifyProduct(@Param('productCode') productCode: string) {
    return this.productsService.verifyPublicProduct(productCode);
  }

  @Get('verify/:productCode/qr')
  @ApiOperation({
    summary: 'Public QR Code PNG image streaming',
    description: 'Streams the raw PNG QR code image for a product code or serial number.',
  })
  @ApiParam({
    name: 'productCode',
    description: 'Unique product code (e.g. PRD-2026-0001) or serial number',
  })
  @ApiResponse({
    status: 200,
    description: 'PNG image binary stream',
  })
  async getQrImage(
    @Param('productCode') productCode: string,
    @Res() res: Response,
  ) {
    const buffer = await this.productsService.getQrImageBuffer(productCode);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${productCode.toUpperCase()}-qr.png"`,
    );
    res.send(buffer);
  }
}

