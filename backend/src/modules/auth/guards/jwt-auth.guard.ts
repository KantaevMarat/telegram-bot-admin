import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    this.logger.debug(`🔐 JWT Auth attempt: hasAuthHeader=${!!authHeader}, method=${request.method}, url=${request.url}`);
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      this.logger.error(`❌ JWT Auth failed: err=${err?.message || 'none'}, info=${info?.message || 'none'}, url=${request.url}`);
      if (info) {
        this.logger.error(`❌ JWT Info: ${JSON.stringify(info)}`);
      }
    } else {
      this.logger.debug(`✅ JWT Auth successful: user=${user.tg_id}, type=${user.type}`);
    }
    return super.handleRequest(err, user, info, context);
  }
}
