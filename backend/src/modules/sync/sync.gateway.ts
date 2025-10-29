import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Socket as SocketType } from 'socket.io';
import { SyncService } from './sync.service';

/**
 * WebSocket Gateway для real-time коммуникации
 *
 * Endpoints:
 * - ws://localhost:3000/sync (WebSocket)
 *
 * Events:
 * - Client -> Server: 'subscribe', 'unsubscribe'
 * - Server -> Client: 'sync:event', 'connected', 'error'
 */
@WebSocketGateway({
  namespace: '/sync',
  cors: {
    origin: '*', // В production ограничить!
    credentials: true,
  },
})
export class SyncGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SyncGateway.name);
  private clientSubscriptions = new Map<string, Set<string>>(); // clientId -> Set<eventType>

  constructor(private syncService: SyncService) {
    this.logger.log('🔄 SyncGateway initialized with WebSocket support');
  }

  afterInit(server: Server) {
    this.logger.log('🌐 WebSocket Gateway initialized');

    // Subscribe to all sync events and broadcast to connected clients
    this.setupEventForwarding();
  }

  /**
   * Setup automatic event forwarding from SyncService to WebSocket clients
   */
  private setupEventForwarding() {
    // List of all event types we want to forward
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

  /**
   * Broadcast event to all subscribed clients
   */
  private broadcastToSubscribers(eventType: string, data: any) {
    let clientCount = 0;

    this.clientSubscriptions.forEach((subscriptions, clientId) => {
      // Check if client is subscribed to this event type or to all events ('*')
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

  handleConnection(client: SocketType) {
    this.logger.log(`✅ Client connected: ${client.id}`);

    // Initialize empty subscription set for this client
    this.clientSubscriptions.set(client.id, new Set());

    // Send connection confirmation
    client.emit('connected', {
      message: 'Connected to sync service',
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: SocketType) {
    this.logger.log(`❌ Client disconnected: ${client.id}`);
    this.clientSubscriptions.delete(client.id);
  }

  /**
   * Client subscribes to specific event types
   *
   * Example:
   * socket.emit('subscribe', { events: ['scenarios.updated', 'buttons.created'] })
   * socket.emit('subscribe', { events: ['*'] }) // Subscribe to all events
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(client: SocketType, payload: { events: string[] }) {
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

  /**
   * Client unsubscribes from event types
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: SocketType, payload: { events: string[] }) {
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

  /**
   * Broadcast event to all connected clients (admin use only)
   */
  async broadcastToAll(eventType: string, data: any) {
    this.server.emit('sync:event', {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`📡 Broadcasted ${eventType} to all clients`);
  }
}

