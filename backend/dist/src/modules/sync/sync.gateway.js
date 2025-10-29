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
var SyncGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const socket_io_2 = require("socket.io");
const sync_service_1 = require("./sync.service");
let SyncGateway = SyncGateway_1 = class SyncGateway {
    constructor(syncService) {
        this.syncService = syncService;
        this.logger = new common_1.Logger(SyncGateway_1.name);
        this.clientSubscriptions = new Map();
        this.logger.log('🔄 SyncGateway initialized with WebSocket support');
    }
    afterInit(server) {
        this.logger.log('🌐 WebSocket Gateway initialized');
        this.setupEventForwarding();
    }
    setupEventForwarding() {
        const eventTypes = [
            'scenarios.created',
            'scenarios.updated',
            'scenarios.deleted',
            'buttons.created',
            'buttons.updated',
            'buttons.deleted',
            'tasks.created',
            'tasks.updated',
            'tasks.deleted',
            'settings.updated',
            'users.created',
            'users.updated',
            'users.balance_updated',
            'payouts.created',
            'payouts.updated',
            'payouts.approved',
            'payouts.declined',
            'messages.created',
        ];
        eventTypes.forEach(eventType => {
            this.syncService.on(eventType, (data) => {
                this.broadcastToSubscribers(eventType, data);
            });
        });
        this.logger.log(`✅ Forwarding ${eventTypes.length} event types to WebSocket clients`);
    }
    broadcastToSubscribers(eventType, data) {
        let clientCount = 0;
        this.clientSubscriptions.forEach((subscriptions, clientId) => {
            if (subscriptions.has(eventType) || subscriptions.has('*')) {
                this.server.to(clientId).emit('sync:event', {
                    type: eventType,
                    data,
                    timestamp: new Date().toISOString(),
                });
                clientCount++;
            }
        });
        if (clientCount > 0) {
            this.logger.debug(`📡 Broadcasted ${eventType} to ${clientCount} client(s)`);
        }
    }
    handleConnection(client) {
        this.logger.log(`✅ Client connected: ${client.id}`);
        this.clientSubscriptions.set(client.id, new Set());
        client.emit('connected', {
            message: 'Connected to sync service',
            clientId: client.id,
            timestamp: new Date().toISOString(),
        });
    }
    handleDisconnect(client) {
        this.logger.log(`❌ Client disconnected: ${client.id}`);
        this.clientSubscriptions.delete(client.id);
    }
    handleSubscribe(client, payload) {
        const subscriptions = this.clientSubscriptions.get(client.id);
        if (!subscriptions) {
            return { error: 'Client not registered' };
        }
        payload.events.forEach(eventType => {
            subscriptions.add(eventType);
        });
        this.logger.log(`📌 Client ${client.id} subscribed to: ${payload.events.join(', ')}`);
        return {
            success: true,
            message: `Subscribed to ${payload.events.length} event(s)`,
            events: Array.from(subscriptions),
        };
    }
    handleUnsubscribe(client, payload) {
        const subscriptions = this.clientSubscriptions.get(client.id);
        if (!subscriptions) {
            return { error: 'Client not registered' };
        }
        payload.events.forEach(eventType => {
            subscriptions.delete(eventType);
        });
        this.logger.log(`🔕 Client ${client.id} unsubscribed from: ${payload.events.join(', ')}`);
        return {
            success: true,
            message: `Unsubscribed from ${payload.events.length} event(s)`,
            events: Array.from(subscriptions),
        };
    }
    async broadcastToAll(eventType, data) {
        this.server.emit('sync:event', {
            type: eventType,
            data,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`📡 Broadcasted ${eventType} to all clients`);
    }
};
exports.SyncGateway = SyncGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], SyncGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_2.Socket, Object]),
    __metadata("design:returntype", void 0)
], SyncGateway.prototype, "handleSubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_2.Socket, Object]),
    __metadata("design:returntype", void 0)
], SyncGateway.prototype, "handleUnsubscribe", null);
exports.SyncGateway = SyncGateway = SyncGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/sync',
        cors: {
            origin: '*',
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [sync_service_1.SyncService])
], SyncGateway);
//# sourceMappingURL=sync.gateway.js.map