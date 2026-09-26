import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
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
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { SetUserWalletDto } from './dto/set-user-wallet.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async listUserWallets() {
    return this.authService.listUserWallets();
  }

  @Patch('users/:id/wallet')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async setUserWallet(@Param('id') id: string, @Body() dto: SetUserWalletDto) {
    return this.authService.setUserWallet(id, dto.walletAddress);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and return JWT access token' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or inactive account',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile of currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Profile returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test endpoint accessible only to SUPER_ADMIN' })
  @ApiResponse({ status: 200, description: 'Authorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async adminOnly(@CurrentUser() user: any) {
    return {
      message: 'Access granted to super administrator',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  @Get('manufacturer-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANUFACTURER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Test endpoint accessible only to MANUFACTURER or SUPER_ADMIN',
  })
  @ApiResponse({ status: 200, description: 'Authorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async manufacturerOnly(@CurrentUser() user: any) {
    return {
      message: 'Access granted to manufacturer',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
