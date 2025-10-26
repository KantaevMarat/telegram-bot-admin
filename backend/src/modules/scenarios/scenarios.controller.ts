import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ScenariosService } from './scenarios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';

@ApiTags('admin')
@Controller('admin/scenarios')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class ScenariosController {
  constructor(private readonly scenariosService: ScenariosService) {}

  @Get()
  @ApiOperation({ summary: 'Get all scenarios' })
  async findAll(@Query('active') active?: string) {
    const activeFilter = active === 'true' ? true : active === 'false' ? false : undefined;
    return await this.scenariosService.findAll(activeFilter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scenario by ID' })
  async findOne(@Param('id') id: string) {
    return await this.scenariosService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new scenario' })
  async create(@Body() createScenarioDto: CreateScenarioDto) {
    return await this.scenariosService.create(createScenarioDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update scenario' })
  async update(@Param('id') id: string, @Body() updateScenarioDto: UpdateScenarioDto) {
    return await this.scenariosService.update(id, updateScenarioDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete scenario' })
  async remove(@Param('id') id: string) {
    return await this.scenariosService.remove(id);
  }
}
