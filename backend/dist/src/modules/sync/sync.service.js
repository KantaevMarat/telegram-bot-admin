"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const redis_1 = require("redis");
let SyncService = SyncService_1 = class SyncService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(SyncService_1.name);
        this.eventHandlers = new Map();
        this.cache = new Map();
    }
    async onModuleInit() {
        await this.connectRedis();
    }
    async onModuleDestroy() {
        await this.disconnectRedis();
    }
    async connectRedis() {
        const redisHost = this.configService.get('REDIS_HOST', 'localhost');
        const redisPort = this.configService.get('REDIS_PORT', 6379);
        const redisPassword = this.configService.get('REDIS_PASSWORD');
        this.logger.log(`Connecting to Redis at ${redisHost}:${redisPort}...`);
        try {
            this.publisherClient = (0, redis_1.createClient)({
                socket: {
                    host: redisHost,
                    port: redisPort,
                    connectTimeout: 5000,
                },
                password: redisPassword,
            });
            this.subscriberClient = (0, redis_1.createClient)({
                socket: {
                    host: redisHost,
                    port: redisPort,
                    connectTimeout: 5000,
                },
                password: redisPassword,
            });
            this.publisherClient.on('error', (err) => {
                this.logger.warn('Redis Publisher error:', err.message);
            });
            this.subscriberClient.on('error', (err) => {
                this.logger.warn('Redis Subscriber error:', err.message);
            });
            await this.publisherClient.connect();
            await this.subscriberClient.connect();
            this.logger.log('✅ Redis connected successfully');
            await this.subscriberClient.pSubscribe('sync:*', (message, channel) => {
                this.handleRedisMessage(channel, message);
            });
            this.logger.log('✅ Subscribed to sync:* events');
        }
        catch (error) {
            this.logger.error('❌ Failed to connect to Redis:', error.message);
            this.logger.warn('⚠️ Sync service will work in local-only mode (without Redis)');
            this.publisherClient = null;
            this.subscriberClient = null;
        }
    }
    async disconnectRedis() {
        try {
            if (this.publisherClient?.isReady) {
                await this.publisherClient.quit();
            }
            if (this.subscriberClient?.isReady) {
                await this.subscriberClient.quit();
            }
            this.logger.log('Redis disconnected');
        }
        catch (error) {
            this.logger.error('Error disconnecting from Redis:', error);
        }
    }
    handleRedisMessage(channel, message) {
        try {
            const eventType = channel.replace('sync:', '');
            const data = JSON.parse(message);
            this.logger.debug(`📨 Redis event: ${eventType}`, data);
            this.invalidateCacheForEvent(eventType);
            const handlers = this.eventHandlers.get(eventType);
            if (handlers) {
                handlers.forEach(handler => {
                    try {
                        handler(data);
                    }
                    catch (error) {
                        this.logger.error(`Error in event handler for ${eventType}:`, error);
                    }
                });
            }
        }
        catch (error) {
            this.logger.error('Error handling Redis message:', error);
        }
    }
    async publish(eventType, data) {
        const channel = `sync:${eventType}`;
        const message = JSON.stringify({
            ...data,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`📤 Publishing event: ${eventType}`);
        try {
            if (this.publisherClient?.isReady) {
                await this.publisherClient.publish(channel, message);
                this.logger.debug(`✅ Published to Redis: ${eventType}`);
            }
            else {
                this.logger.debug(`⚠️ Redis not available, event ${eventType} only local`);
            }
            const handlers = this.eventHandlers.get(eventType);
            if (handlers) {
                handlers.forEach(handler => {
                    try {
                        handler(data);
                    }
                    catch (error) {
                        this.logger.error(`Error in local event handler for ${eventType}:`, error);
                    }
                });
            }
        }
        catch (error) {
            this.logger.error(`Error publishing event ${eventType}:`, error.message);
        }
    }
    on(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, new Set());
        }
        this.eventHandlers.get(eventType).add(handler);
        this.logger.debug(`Subscribed to event: ${eventType}`);
    }
    off(eventType, handler) {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            handlers.delete(handler);
        }
    }
    setCache(key, data, ttlSeconds = 300) {
        const expiry = Date.now() + ttlSeconds * 1000;
        this.cache.set(key, { data, expiry });
        this.logger.debug(`💾 Cached: ${key} (TTL: ${ttlSeconds}s)`);
    }
    getCache(key) {
        const cached = this.cache.get(key);
        if (!cached) {
            return null;
        }
        if (Date.now() > cached.expiry) {
            this.cache.delete(key);
            return null;
        }
        this.logger.debug(`✅ Cache hit: ${key}`);
        return cached.data;
    }
    invalidateCache(key) {
        this.cache.delete(key);
        this.logger.debug(`🗑️ Cache invalidated: ${key}`);
    }
    invalidateCacheForEvent(eventType) {
        const entityType = eventType.split('.')[0];
        const keysToDelete = [];
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
    clearCache() {
        this.cache.clear();
        this.logger.log('🗑️ All cache cleared');
    }
    async emitEntityEvent(entityType, action, data) {
        const eventType = `${entityType}.${action}`;
        await this.publish(eventType, {
            entityType,
            action,
            data,
        });
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = SyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SyncService);
//# sourceMappingURL=sync.service.js.map