import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class SyncService implements OnModuleInit, OnModuleDestroy {
    private configService;
    private readonly logger;
    private publisherClient;
    private subscriberClient;
    private eventHandlers;
    private cache;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private connectRedis;
    private disconnectRedis;
    private handleRedisMessage;
    publish(eventType: string, data: any): Promise<void>;
    on(eventType: string, handler: (data: any) => void): void;
    off(eventType: string, handler: (data: any) => void): void;
    setCache(key: string, data: any, ttlSeconds?: number): void;
    getCache<T = any>(key: string): T | null;
    invalidateCache(key: string): void;
    private invalidateCacheForEvent;
    clearCache(): void;
    emitEntityEvent(entityType: string, action: 'created' | 'updated' | 'deleted', data: any): Promise<void>;
}
