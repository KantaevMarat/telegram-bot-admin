import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Custom hook for WebSocket synchronization
 * 
 * Usage:
 * ```tsx
 * const { subscribe, unsubscribe } = useSync();
 * 
 * useEffect(() => {
 *   const handler = (data) => {
 *     console.log('Scenario updated:', data);
 *     refetch(); // Refresh data
 *   };
 *   
 *   subscribe('scenarios.updated', handler);
 *   
 *   return () => unsubscribe('scenarios.updated', handler);
 * }, []);
 * ```
 */
export function useSync() {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  // Initialize WebSocket connection
  useEffect(() => {
    // Determine WebSocket URL based on API URL
    let apiUrl: string;
    
    if (window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1')) {
      apiUrl = 'http://localhost:3000';
    } else if (import.meta.env.VITE_API_URL) {
      apiUrl = import.meta.env.VITE_API_URL.replace('/api', '');
    } else {
      // Fallback to same origin
      apiUrl = window.location.origin;
    }

    const wsUrl = apiUrl.replace('/api', '');

    console.log('🔌 Connecting to WebSocket:', `${wsUrl}/sync`);

    const socket = io(`${wsUrl}/sync`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id);
      
      // Subscribe to all events by default
      socket.emit('subscribe', { events: ['*'] });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    socket.on('connected', (data) => {
      console.log('📡 WebSocket server confirmed connection:', data);
    });

    socket.on('sync:event', (payload) => {
      const { type, data } = payload;
      console.log('📨 Sync event received:', type, data);

      // Trigger all registered handlers for this event type
      const handlers = handlersRef.current.get(type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error(`Error in handler for ${type}:`, error);
          }
        });
      }

      // Also trigger wildcard handlers
      const wildcardHandlers = handlersRef.current.get('*');
      if (wildcardHandlers) {
        wildcardHandlers.forEach(handler => {
          try {
            handler({ type, data });
          } catch (error) {
            console.error('Error in wildcard handler:', error);
          }
        });
      }
    });

    socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    socket.on('connect_error', (error) => {
      console.warn('⚠️ WebSocket connection error:', error.message);
      console.warn('⚠️ Sync will work in polling mode or local-only');
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Attempting to reconnect... (${attemptNumber})`);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnection failed');
      console.warn('⚠️ Real-time sync disabled. Manual refresh required.');
    });

    socketRef.current = socket;

    return () => {
      console.log('🔌 Disconnecting WebSocket');
      socket.disconnect();
    };
  }, []);

  /**
   * Subscribe to specific event type
   */
  const subscribe = useCallback((eventType: string, handler: (data: any) => void) => {
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set());
    }
    handlersRef.current.get(eventType)!.add(handler);

    console.log(`📌 Subscribed to: ${eventType}`);
  }, []);

  /**
   * Unsubscribe from event type
   */
  const unsubscribe = useCallback((eventType: string, handler: (data: any) => void) => {
    const handlers = handlersRef.current.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        handlersRef.current.delete(eventType);
      }
    }

    console.log(`🔕 Unsubscribed from: ${eventType}`);
  }, []);

  /**
   * Check if socket is connected
   */
  const isConnected = useCallback(() => {
    return socketRef.current?.connected ?? false;
  }, []);

  return {
    subscribe,
    unsubscribe,
    isConnected,
    socket: socketRef.current,
  };
}

/**
 * Hook to automatically refetch data when specific events occur
 * 
 * Usage:
 * ```tsx
 * const { data, refetch } = useQuery(['scenarios'], fetchScenarios);
 * 
 * useSyncRefetch(['scenarios.created', 'scenarios.updated', 'scenarios.deleted'], refetch);
 * ```
 */
export function useSyncRefetch(eventTypes: string[], refetchFn: () => void) {
  const { subscribe, unsubscribe } = useSync();

  useEffect(() => {
    const handler = () => {
      console.log('🔄 Auto-refetching data due to sync event');
      refetchFn();
    };

    eventTypes.forEach(eventType => {
      subscribe(eventType, handler);
    });

    return () => {
      eventTypes.forEach(eventType => {
        unsubscribe(eventType, handler);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTypes.join(',')]); // Only re-subscribe if eventTypes change (by string comparison)

