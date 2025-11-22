import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
    this.logger.log('JwtStrategy initialized');
  }

  async validate(payload: any) {
    this.logger.debug(`🔐 Validating JWT payload: type=${payload.type}, tg_id=${payload.tg_id}, sub=${payload.sub}`);
    
    if (payload.type === 'admin') {
      try {
        const admin = await this.authService.validateAdmin(payload.tg_id);
        this.logger.debug(`✅ Admin validated: ${admin.tg_id}`);
        return { ...admin, type: 'admin' };
      } catch (error) {
        this.logger.error(`❌ Admin validation failed: ${error.message}`);
        throw error;
      }
    } else if (payload.type === 'user') {
      try {
        const user = await this.authService.validateUser(payload.tg_id);
        this.logger.debug(`✅ User validated: ${user.tg_id}`);
        return { ...user, type: 'user' };
      } catch (error) {
        this.logger.error(`❌ User validation failed: ${error.message}`);
        throw error;
      }
    }

    this.logger.error(`❌ Invalid payload type: ${payload.type}`);
    throw new UnauthorizedException('Invalid token type');
  }
}
