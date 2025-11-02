import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@ApiTags('Channels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all channels' })
  findAll() {
    return this.channelsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active channels only' })
  findActive() {
    return this.channelsService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get channel by ID' })
  findOne(@Param('id') id: string) {
    return this.channelsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new channel' })
  create(@Body() dto: CreateChannelDto) {
    return this.channelsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update channel' })
  update(@Param('id') id: string, @Body() dto: UpdateChannelDto) {
    return this.channelsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete channel' })
  remove(@Param('id') id: string) {
    return this.channelsService.remove(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle channel active status' })
  toggleActive(@Param('id') id: string) {
    return this.channelsService.toggleActive(id);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder channels' })
  reorder(@Body() body: { ids: string[] }) {
    return this.channelsService.reorder(body.ids);
  }
}

