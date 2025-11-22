import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommandsService } from './commands.service';
import { CreateCommandDto } from './dto/create-command.dto';
import { UpdateCommandDto } from './dto/update-command.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('admin')
@Controller('admin/commands')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new command' })
  create(@Body() createCommandDto: CreateCommandDto) {
    return this.commandsService.create(createCommandDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all commands' })
  findAll() {
    return this.commandsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get command by ID' })
  findOne(@Param('id') id: string) {
    return this.commandsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update command' })
  update(@Param('id') id: string, @Body() updateCommandDto: UpdateCommandDto) {
    return this.commandsService.update(id, updateCommandDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete command' })
  async remove(@Param('id') id: string) {
    await this.commandsService.remove(id);
    return { message: 'Command deleted successfully' };
  }
}

