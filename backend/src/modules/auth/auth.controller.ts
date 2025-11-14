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
    this.logger.log(`📥 Admin login request received`);
    this.logger.debug(`initData present: ${!!loginDto.initData}`);
    this.logger.debug(`initData length: ${loginDto.initData?.length || 0}`);
    this.logger.debug(`initData preview: ${loginDto.initData?.substring(0, 50) || 'N/A'}...`);
    
    // Check if this is a development request (no initData or special format)
    if (!loginDto.initData || loginDto.initData === 'dev') {
      this.logger.log('🔧 Development mode login detected');
      return await this.authService.devLogin(6971844353); // Use superadmin ID
    }
    
    try {
      const result = await this.authService.loginAdmin(loginDto.initData);
      this.logger.log('✅ Admin login successful');
      return result;
    } catch (error) {
      this.logger.error('❌ Admin login failed:', error.message);
      throw error;
    }
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
