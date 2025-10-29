import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('telegram/admin')
  @ApiOperation({ summary: 'Login as admin using Telegram Web App data' })
  async loginAdmin(@Body() loginDto: LoginDto) {
    // Check if this is a development request (no initData or special format)
    if (!loginDto.initData || loginDto.initData === 'dev') {
      this.logger.log('Development mode login detected');
      return await this.authService.devLogin(697184435);
    }
    return await this.authService.loginAdmin(loginDto.initData);
  }

  @Post('telegram/user')
  @ApiOperation({ summary: 'Login or register user using Telegram Web App data' })
  async loginUser(@Body() loginDto: LoginDto) {
    return await this.authService.loginUser(loginDto.initData);
  }

  @Get('test-admins')
  @ApiOperation({ summary: 'DEBUG: Test admin lookup' })
  async testAdmins() {
    return await this.authService.debugAdminLookup();
  }
}
