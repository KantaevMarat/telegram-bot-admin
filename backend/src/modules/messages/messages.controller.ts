import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('admin')
@Controller('admin/chats')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all chats with users' })
  async getChats() {
    return await this.messagesService.getChats();
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread messages count' })
  async getUnreadCount() {
    const count = await this.messagesService.getUnreadCount();
    return { unread: count };
  }

  @Get(':userId/messages')
  @ApiOperation({ summary: 'Get messages with user' })
  async getMessages(@Param('userId') userId: string, @Query('limit') limit?: number) {
    return await this.messagesService.getMessages(userId, limit ? parseInt(limit.toString()) : 100);
  }

  @Post(':userId/send')
  @ApiOperation({ summary: 'Send message to user' })
  async sendMessage(
    @Param('userId') userId: string,
    @Body() sendMessageDto: SendMessageDto,
    @Request() req,
  ) {
    return await this.messagesService.sendMessage(
      userId,
      sendMessageDto.text,
      req.user.tg_id,
      sendMessageDto.media_url,
    );
  }
}
