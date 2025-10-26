import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BroadcastService } from './broadcast.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { BroadcastDto } from './dto/broadcast.dto';

@ApiTags('admin')
@Controller('admin/broadcast')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class BroadcastController {
  constructor(private readonly broadcastService: BroadcastService) {}

  @Post()
  @ApiOperation({ summary: 'Send broadcast to all users' })
  async broadcast(@Body() broadcastDto: BroadcastDto) {
    return await this.broadcastService.sendBroadcast(broadcastDto);
  }
}

