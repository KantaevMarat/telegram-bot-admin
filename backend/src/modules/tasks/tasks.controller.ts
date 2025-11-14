import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('admin')
@Controller('admin/tasks')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks' })
  async findAll(@Query('active') active?: string) {
    const activeFilter = active === 'true' ? true : active === 'false' ? false : undefined;
    return await this.tasksService.findAll(activeFilter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  async findOne(@Param('id') id: string) {
    return await this.tasksService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get task statistics' })
  async getStats(@Param('id') id: string) {
    return await this.tasksService.getTaskStats(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new task' })
  async create(@Body() createTaskDto: CreateTaskDto) {
    return await this.tasksService.create(createTaskDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update task' })
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return await this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  async remove(@Param('id') id: string) {
    return await this.tasksService.remove(id);
  }

  // 📋 MODERATION ENDPOINTS

  @Get('moderation/pending')
  @ApiOperation({ summary: 'Get tasks pending review' })
  async getPendingReview(@Query('status') status?: string, @Query('search') search?: string) {
    return await this.tasksService.getPendingReview(status, search);
  }

  @Post('moderation/:userTaskId/approve')
  @ApiOperation({ summary: 'Approve task submission' })
  async approveTask(@Param('userTaskId') userTaskId: string) {
    return await this.tasksService.approveTask(userTaskId);
  }

  @Post('moderation/:userTaskId/reject')
  @ApiOperation({ summary: 'Reject task submission' })
  async rejectTask(@Param('userTaskId') userTaskId: string, @Body() body?: { reason?: string }) {
    return await this.tasksService.rejectTask(userTaskId, body?.reason);
  }
}
