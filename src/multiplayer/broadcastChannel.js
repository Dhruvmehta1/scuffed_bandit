// Real-Time Multi-Room Team Sync Engine (Local Broadcast + Supabase Realtime)

import { supabase, isSupabaseConfigured } from './supabaseClient';

const CHANNEL_NAME = 'bandit_ctf_multiroom_channel';
const STORAGE_KEY = 'bandit_ctf_rooms_state_v2';

export class MultiplayerSyncHub {
  constructor(onEventCallback) {
    this.onEventCallback = onEventCallback;
    this.channel = null;
    this.supabaseChannel = null;
    this.initChannel();
  }

  initChannel() {
    // 1. Local BroadcastChannel API
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        if (this.onEventCallback) {
          this.onEventCallback(event.data);
        }
      };
    }

    // 2. Storage event listener fallback
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (this.onEventCallback) this.onEventCallback(data);
        } catch (err) {}
      }
    });

    // 3. Supabase Realtime WebSockets for global room sync
    if (isSupabaseConfigured && supabase) {
      this.supabaseChannel = supabase.channel('ctf_team_rooms')
        .on('broadcast', { event: 'room_event' }, (payload) => {
          if (this.onEventCallback && payload.data) {
            this.onEventCallback(payload.data);
          }
        })
        .subscribe();
    }
  }

  broadcast(type, payload) {
    const eventData = {
      type,
      payload,
      timestamp: Date.now()
    };

    if (this.channel) {
      this.channel.postMessage(eventData);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eventData));

    if (this.supabaseChannel) {
      this.supabaseChannel.send({
        type: 'broadcast',
        event: 'room_event',
        data: eventData
      });
    }

    if (this.onEventCallback) {
      this.onEventCallback(eventData);
    }
  }

  getStoredRooms() {
    try {
      const raw = localStorage.getItem('bandit_master_rooms_data');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  saveStoredRooms(roomsData) {
    localStorage.setItem('bandit_master_rooms_data', JSON.stringify(roomsData));
  }
}
