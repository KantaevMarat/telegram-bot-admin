import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BroadcastService } from './broadcast.service';
import { BroadcastController } from './broadcast.controller';
import { BroadcastProcessor } from './broadcast.processor';
import { User } from '../../entities/user.entity';
import { Broadcast } from '../../entities/broadcast.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Broadcast]),
    BullModule.registerQueue({
      name: 'broadcast',
    }),
  ],
  controllers: [BroadcastController],
  providers: [BroadcastService, BroadcastProcessor],
  exports: [BroadcastService],
})
export class BroadcastModule {}
