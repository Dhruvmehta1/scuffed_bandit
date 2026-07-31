// Real-Time Multi-Team Sync Engine (Local Broadcast + Supabase Realtime WebSockets)

import { supabase, isSupabaseConfigured } from './supabaseClient';

const CHANNEL_NAME = 'bandit_ctf_teams_channel_v3';
const STORAGE_KEY = 'bandit_ctf_teams_state_v3';

export class MultiplayerSyncHub {
  constructor(onEventCallback) {
    this.onEventCallback = onEventCallback;
    this.channel = null;
    this.supabaseChannel = null;
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

    // 3. Supabase Realtime WebSockets (Global Cross-Device Internet Sync)
    if (isSupabaseConfigured && supabase) {
      this.supabaseChannel = supabase.channel('ctf_global_teams_room', {
        config: {
          broadcast: { self: true }
        }
      });

      this.supabaseChannel
        .on('broadcast', { event: 'game_event' }, (envelope) => {
          if (this.onEventCallback && envelope && envelope.payload) {
            this.onEventCallback(envelope.payload);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Request sync from existing clients upon connecting
            this.broadcast('TEAM_SYNC_REQUEST', { timestamp: Date.now() });
          }
        });
    }
  }

  broadcast(type, payload) {
    const eventData = {
      type,
      payload,
      timestamp: Date.now()
    };

    // Broadcast to local tabs
    if (this.channel) {
      this.channel.postMessage(eventData);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eventData));

    // Broadcast to global internet via Supabase Realtime (v2 payload structure)
    if (this.supabaseChannel) {
      this.supabaseChannel.send({
        type: 'broadcast',
        event: 'game_event',
        payload: eventData
      });
    }

    // Self callback
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
