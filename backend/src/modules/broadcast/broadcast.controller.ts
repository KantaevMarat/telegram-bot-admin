import { Controller, Post, Body, UseGuards, Get, Delete, Param } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Create and send/schedule broadcast' })
  async createBroadcast(@Body() broadcastDto: BroadcastDto) {
    return await this.broadcastService.sendBroadcast(broadcastDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all broadcasts' })
  async getAllBroadcasts() {
    return await this.broadcastService.getAllBroadcasts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get broadcast by ID' })
  async getBroadcast(@Param('id') id: string) {
    return await this.broadcastService.getBroadcastById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete scheduled broadcast' })
  async deleteBroadcast(@Param('id') id: string) {
    return await this.broadcastService.deleteBroadcast(id);
  }
}
