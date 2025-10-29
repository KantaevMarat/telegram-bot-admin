import { create } from 'zustand';

/**
 * Global sync state store
 * 
 * Tracks:
 * - WebSocket connection status
 * - Last sync events
 * - Connection metrics
 */
interface SyncState {
  isConnected: boolean;
  lastEvent: { type: string; data: any; timestamp: string } | null;
  eventCount: number;
  connectionTime: Date | null;
  
  setConnected: (connected: boolean) => void;
  addEvent: (type: string, data: any) => void;
  setConnectionTime: (time: Date) => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isConnected: false,
  lastEvent: null,
  eventCount: 0,
  connectionTime: null,

  setConnected: (connected) => set({ 
    isConnected: connected,
    connectionTime: connected ? new Date() : null,
  }),

  addEvent: (type, data) => set((state) => ({
    lastEvent: { type, data, timestamp: new Date().toISOString() },
    eventCount: state.eventCount + 1,
  })),

  setConnectionTime: (time) => set({ connectionTime: time }),

  reset: () => set({
    isConnected: false,
    lastEvent: null,
    eventCount: 0,
    connectionTime: null,
  }),
}));

