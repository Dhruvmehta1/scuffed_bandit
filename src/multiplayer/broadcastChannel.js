// Redundant Dual-Channel Realtime Engine (Supabase Realtime + Redundant WebSocket Relay)

import { supabase, isSupabaseConfigured } from './supabaseClient';

const CHANNEL_NAME = 'bandit_ctf_teams_channel_v6';
const STORAGE_KEY = 'bandit_ctf_teams_state_v6';

// Redundant WebSocket relays for maximum cross-network reliability
const PRIMARY_WS_URL = 'wss://free.piesocket.com/v3/ctf_bandit_teams_room_2026?api_key=VCx2ivjtEaAfOiStcrMIhhIcDqkyBAA28kO7jEjj&notify_self=1';
const SECONDARY_WS_URL = 'wss://socketsbay.com/wss/v2/1/demo/';

export class MultiplayerSyncHub {
  constructor(onEventCallback) {
    this.onEventCallback = onEventCallback;
    this.channel = null;
    this.supabaseChannel = null;
    this.wsPrimary = null;
    this.wsSecondary = null;
    this.initChannel();
  }

  initChannel() {
    // 1. Local BroadcastChannel API for multi-tab
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        if (this.onEventCallback) {
          this.onEventCallback(event.data);
        }
      };
    }

    // 2. LocalStorage event listener fallback
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (this.onEventCallback) this.onEventCallback(data);
        } catch (err) {}
      }
    });

    // 3. Supabase Realtime Channel
    if (isSupabaseConfigured && supabase) {
      try {
        this.supabaseChannel = supabase.channel('ctf_global_room_v6', {
          config: {
            broadcast: { self: true, ack: true }
          }
        });

        this.supabaseChannel
          .on('broadcast', { event: 'game_event' }, (envelope) => {
            if (this.onEventCallback && envelope && envelope.payload) {
              this.onEventCallback(envelope.payload);
            }
          })
          .subscribe();
      } catch (e) {}
    }

    // 4. Primary & Secondary WebSocket Relays
    this.connectWebSockets();
  }

  connectWebSockets() {
    try {
      this.wsPrimary = new WebSocket(PRIMARY_WS_URL);
      this.wsPrimary.onmessage = (event) => this.handleWsMessage(event);
      this.wsPrimary.onclose = () => setTimeout(() => this.connectPrimaryWs(), 4000);
      this.wsPrimary.onerror = () => {};
    } catch (e) {}

    try {
      this.wsSecondary = new WebSocket(SECONDARY_WS_URL);
      this.wsSecondary.onmessage = (event) => this.handleWsMessage(event);
      this.wsSecondary.onclose = () => setTimeout(() => this.connectSecondaryWs(), 4000);
      this.wsSecondary.onerror = () => {};
    } catch (e) {}
  }

  connectPrimaryWs() {
    try {
      this.wsPrimary = new WebSocket(PRIMARY_WS_URL);
      this.wsPrimary.onmessage = (event) => this.handleWsMessage(event);
    } catch (e) {}
  }

  connectSecondaryWs() {
    try {
      this.wsSecondary = new WebSocket(SECONDARY_WS_URL);
      this.wsSecondary.onmessage = (event) => this.handleWsMessage(event);
    } catch (e) {}
  }

  handleWsMessage(event) {
    try {
      const data = JSON.parse(event.data);
      if (data && data.type && this.onEventCallback) {
        this.onEventCallback(data);
      }
    } catch (err) {}
  }

  broadcast(type, payload) {
    const eventData = {
      type,
      payload,
      timestamp: Date.now()
    };

    // Broadcast to local tabs
    if (this.channel) {
      try { this.channel.postMessage(eventData); } catch (e) {}
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eventData));

    // Broadcast over Supabase Realtime
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'game_event',
          payload: eventData
        });
      } catch (e) {}
    }

    // Broadcast over Primary WebSocket Relay
    if (this.wsPrimary && this.wsPrimary.readyState === WebSocket.OPEN) {
      try { this.wsPrimary.send(JSON.stringify(eventData)); } catch (e) {}
    }

    // Broadcast over Secondary WebSocket Relay
    if (this.wsSecondary && this.wsSecondary.readyState === WebSocket.OPEN) {
      try { this.wsSecondary.send(JSON.stringify(eventData)); } catch (e) {}
    }

    // Local self callback
    if (this.onEventCallback) {
      this.onEventCallback(eventData);
    }
  }

  getStoredRooms() {
    try {
      const raw = localStorage.getItem('bandit_master_rooms_data');
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  saveStoredRooms(roomsData) {
    localStorage.setItem('bandit_master_rooms_data', JSON.stringify(roomsData));
  }
}
