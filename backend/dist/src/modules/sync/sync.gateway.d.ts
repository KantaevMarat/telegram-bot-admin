import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Socket as SocketType } from 'socket.io';
import { SyncService } from './sync.service';
export declare class SyncGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private syncService;
    server: Server;
    private readonly logger;
    private clientSubscriptions;
    constructor(syncService: SyncService);
    afterInit(server: Server): void;
    private setupEventForwarding;
    private broadcastToSubscribers;
    handleConnection(client: SocketType): void;
    handleDisconnect(client: SocketType): void;
    handleSubscribe(client: SocketType, payload: {
        events: string[];
    }): {
        error: string;
        success?: undefined;
        message?: undefined;
        events?: undefined;
    } | {
        success: boolean;
        message: string;
        events: string[];
        error?: undefined;
    };
    handleUnsubscribe(client: SocketType, payload: {
        events: string[];
    }): {
        error: string;
        success?: undefined;
        message?: undefined;
        events?: undefined;
    } | {
        success: boolean;
        message: string;
        events: string[];
        error?: undefined;
    };
    broadcastToAll(eventType: string, data: any): Promise<void>;
}
