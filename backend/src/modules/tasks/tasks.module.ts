import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from '../../entities/task.entity';
import { UserTask } from '../../entities/user-task.entity';
import { User } from '../../entities/user.entity';
import { BalanceLog } from '../../entities/balance-log.entity';
import { RanksModule } from '../ranks/ranks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, UserTask, User, BalanceLog]),
    forwardRef(() => RanksModule),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
