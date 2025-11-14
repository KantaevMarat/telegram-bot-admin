import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PremiumService } from './premium.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('admin')
@Controller('admin/premium')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class PremiumController {
  constructor(private readonly premiumService: PremiumService) {}

  @Get('requests')
  @ApiOperation({ summary: 'Get all premium requests' })
  async getAllRequests(
    @Query('status') status?: string,
    @Query('currency') currency?: string,
  ) {
    return await this.premiumService.getAllRequests(status as any, currency);
  }

  @Post('requests/:id/requisites-sent')
  @ApiOperation({ summary: 'Mark requisites as sent' })
  async markRequisitesSent(
    @Param('id') id: string,
    @Request() req,
  ) {
    return await this.premiumService.markRequisitesSent(id, req.user.tg_id);
  }

  @Post('requests/:id/confirm-payment')
  @ApiOperation({ summary: 'Confirm payment received' })
  async confirmPayment(
    @Param('id') id: string,
    @Request() req,
  ) {
    return await this.premiumService.confirmPayment(id, req.user.tg_id);
  }

  @Post('requests/:id/activate')
  @ApiOperation({ summary: 'Activate platinum subscription' })
  async activateSubscription(
    @Param('id') id: string,
    @Request() req,
  ) {
    return await this.premiumService.activateSubscription(id, req.user.tg_id);
  }

  @Post('requests/:id/cancel')
  @ApiOperation({ summary: 'Cancel request' })
  async cancelRequest(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return await this.premiumService.cancelRequest(id, reason);
  }
}

