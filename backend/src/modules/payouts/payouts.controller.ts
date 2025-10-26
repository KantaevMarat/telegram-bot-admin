import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { DeclinePayoutDto } from './dto/decline-payout.dto';

@ApiTags('admin')
@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all payouts with filters' })
  async findAll(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.payoutsService.findAll(
      status,
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payout by ID' })
  async findOne(@Param('id') id: string) {
    return await this.payoutsService.findOne(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve payout' })
  async approve(@Param('id') id: string, @Request() req) {
    return await this.payoutsService.approve(id, req.user.tg_id);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline payout with reason' })
  async decline(@Param('id') id: string, @Body() declineDto: DeclinePayoutDto, @Request() req) {
    return await this.payoutsService.decline(id, req.user.tg_id, declineDto);
  }
}
