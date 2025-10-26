import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (payload.type === 'admin') {
      const admin = await this.authService.validateAdmin(payload.tg_id);
      return { ...admin, type: 'admin' };
    } else if (payload.type === 'user') {
      const user = await this.authService.validateUser(payload.tg_id);
      return { ...user, type: 'user' };
    }

    throw new UnauthorizedException();
  }
}

