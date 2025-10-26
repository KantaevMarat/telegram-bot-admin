import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { BotService } from './bot.service';

@ApiTags('bot')
@Controller('bot')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post('webhook')
  @ApiExcludeEndpoint()
  async webhook(@Body() update: any) {
    await this.botService.handleWebhook(update);
    return { ok: true };
  }

  @Post('set-webhook')
  @ApiOperation({ summary: 'Set Telegram bot webhook (for testing)' })
  async setWebhook(@Body() body: { url: string }) {
    return await this.botService.setWebhook(body.url);
  }
}

