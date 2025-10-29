import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SyncService } from './sync.service';
import { SyncGateway } from './sync.gateway';

/**
 * Global Sync Module - Provides real-time synchronization across all components
 * 
 * This module handles:
 * - Redis pub/sub for distributed events
 * - WebSocket connections for real-time updates
 * - Event broadcasting to Admin Panel, Bot, and Mini App
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [SyncService, SyncGateway],
  exports: [SyncService],
})
export class SyncModule {}

