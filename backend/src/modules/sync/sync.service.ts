import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

/**
 * SyncService - Централизованный сервис синхронизации
 * 
 * Отвечает за:
 * 1. Redis pub/sub для распределенных событий
 * 2. Кеширование данных с автоматической инвалидацией
 * 3. Broadcast событий всем подключенным компонентам
 * 
 * События:
 * - scenarios.created, scenarios.updated, scenarios.deleted
 * - buttons.created, buttons.updated, buttons.deleted
 * - tasks.created, tasks.updated, tasks.deleted
 * - settings.updated
 * - users.updated, users.balance_updated
 * - payouts.created, payouts.updated
 */
@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncService.name);
  
  // Redis clients for pub/sub (separate clients required)
  private publisherClient: RedisClientType | null;
  private subscriberClient: RedisClientType | null;
  
  // Event handlers registry
  private eventHandlers = new Map<string, Set<(data: any) => void>>();
  
  // Cache storage
  private cache = new Map<string, { data: any; expiry: number }>();

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connectRedis();
  }

  async onModuleDestroy() {
    await this.disconnectRedis();
  }

  /**
   * Connect to Redis for pub/sub
   */
  private async connectRedis() {
    const redisHost = this.configService.get('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get('REDIS_PORT', 6379);

    this.logger.log(`Connecting to Redis at ${redisHost}:${redisPort}...`);

    try {
      // Publisher client
      this.publisherClient = createClient({
        socket: {
          host: redisHost,
          port: redisPort,
          connectTimeout: 5000,
        },
      }) as RedisClientType;

      // Subscriber client
      this.subscriberClient = createClient({
        socket: {
          host: redisHost,
          port: redisPort,
          connectTimeout: 5000,
        },
      }) as RedisClientType;

      // Add error handlers to prevent unhandled rejections
      this.publisherClient.on('error', (err) => {
        this.logger.warn('Redis Publisher error:', err.message);
      });

      this.subscriberClient.on('error', (err) => {
        this.logger.warn('Redis Subscriber error:', err.message);
      });

      await this.publisherClient.connect();
      await this.subscriberClient.connect();

      this.logger.log('✅ Redis connected successfully');

      // Subscribe to all sync events
      await this.subscriberClient.pSubscribe('sync:*', (message, channel) => {
        this.handleRedisMessage(channel, message);
      });

      this.logger.log('✅ Subscribed to sync:* events');
    } catch (error) {
      this.logger.error('❌ Failed to connect to Redis:', error.message);
      this.logger.warn('⚠️ Sync service will work in local-only mode (without Redis)');
      
      // Set clients to null so we know Redis is not available
      this.publisherClient = null;
      this.subscriberClient = null;
    }
  }

  /**
   * Disconnect from Redis
   */
  private async disconnectRedis() {
    try {
      if (this.publisherClient?.isReady) {
        await this.publisherClient.quit();
      }
      if (this.subscriberClient?.isReady) {
        await this.subscriberClient.quit();
      }
      this.logger.log('Redis disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting from Redis:', error);
    }
  }

  /**
   * Handle incoming Redis messages
   */
  private handleRedisMessage(channel: string, message: string) {
    try {
      const eventType = channel.replace('sync:', '');
      const data = JSON.parse(message);

      this.logger.debug(`📨 Redis event: ${eventType}`, data);

      // Invalidate cache for this event
      this.invalidateCacheForEvent(eventType);

      // Trigger local event handlers
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            this.logger.error(`Error in event handler for ${eventType}:`, error);
          }
        });
      }
    } catch (error) {
      this.logger.error('Error handling Redis message:', error);
    }
  }

  /**
   * Publish event to all connected services (Redis pub/sub)
   */
  async publish(eventType: string, data: any) {
    const channel = `sync:${eventType}`;
    const message = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`📤 Publishing event: ${eventType}`);

    try {
      // Publish to Redis if available
      if (this.publisherClient?.isReady) {
        await this.publisherClient.publish(channel, message);
        this.logger.debug(`✅ Published to Redis: ${eventType}`);
      } else {
        this.logger.debug(`⚠️ Redis not available, event ${eventType} only local`);
      }

      // Always trigger local handlers immediately (for WebSocket)
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            this.logger.error(`Error in local event handler for ${eventType}:`, error);
          }
        });
      }
    } catch (error) {
      this.logger.error(`Error publishing event ${eventType}:`, error.message);
      // Don't throw - allow system to continue working
    }
  }

  /**
   * Subscribe to specific event type
   */
  on(eventType: string, handler: (data: any) => void) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);

    this.logger.debug(`Subscribed to event: ${eventType}`);
  }

  /**
   * Unsubscribe from event
   */
  off(eventType: string, handler: (data: any) => void) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Cache data with TTL
   */
  setCache(key: string, data: any, ttlSeconds = 300) {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data, expiry });
    this.logger.debug(`💾 Cached: ${key} (TTL: ${ttlSeconds}s)`);
  }

  /**
   * Get cached data
   */
  getCache<T = any>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(`✅ Cache hit: ${key}`);
    return cached.data as T;
  }

  /**
   * Invalidate cache by key
   */
  invalidateCache(key: string) {
    this.cache.delete(key);
    this.logger.debug(`🗑️ Cache invalidated: ${key}`);
  }

  /**
   * Invalidate cache based on event type
   */
  private invalidateCacheForEvent(eventType: string) {
    // Extract entity type from event
    // e.g., "scenarios.updated" -> "scenarios"
    const entityType = eventType.split('.')[0];

    // Invalidate all cache entries for this entity type
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(entityType)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.invalidateCache(key));

    if (keysToDelete.length > 0) {
      this.logger.debug(`🗑️ Invalidated ${keysToDelete.length} cache entries for ${entityType}`);
    }
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.log('🗑️ All cache cleared');
  }

  /**
   * Helper method to emit sync events for CRUD operations
   */
  async emitEntityEvent(entityType: string, action: 'created' | 'updated' | 'deleted', data: any) {
    const eventType = `${entityType}.${action}`;
    await this.publish(eventType, {
      entityType,
      action,
      data,
    });
  }
}

