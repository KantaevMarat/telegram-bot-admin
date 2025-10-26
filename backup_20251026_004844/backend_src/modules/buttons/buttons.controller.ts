import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ButtonsService } from './buttons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateButtonDto } from './dto/create-button.dto';
import { UpdateButtonDto } from './dto/update-button.dto';

@ApiTags('admin')
@Controller('admin/buttons')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class ButtonsController {
  constructor(private readonly buttonsService: ButtonsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all buttons' })
  async findAll(@Query('active') active?: string) {
    const activeFilter = active === 'true' ? true : active === 'false' ? false : undefined;
    return await this.buttonsService.findAll(activeFilter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get button by ID' })
  async findOne(@Param('id') id: string) {
    return await this.buttonsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new button' })
  async create(@Body() createButtonDto: CreateButtonDto) {
    return await this.buttonsService.create(createButtonDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update button' })
  async update(@Param('id') id: string, @Body() updateButtonDto: UpdateButtonDto) {
    return await this.buttonsService.update(id, updateButtonDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete button' })
  async remove(@Param('id') id: string) {
    return await this.buttonsService.remove(id);
  }
}

