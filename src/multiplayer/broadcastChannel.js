// Real-Time Multiplayer Sync Hub (Supports Local Broadcast + Supabase Realtime Cloud Sync)

import { supabase, isSupabaseConfigured } from './supabaseClient';

const CHANNEL_NAME = 'bandit_ctf_multiplayer_channel';
const STORAGE_KEY = 'bandit_ctf_room_state_v1';

export class MultiplayerSyncHub {
  constructor(onEventCallback) {
    this.onEventCallback = onEventCallback;
    this.channel = null;
    this.supabaseChannel = null;
    this.initChannel();
    this.cleanUpBots();
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

    // 2. Fallback sync via window storage event
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (this.onEventCallback) this.onEventCallback(data);
        } catch (err) {}
      }
    });

    // 3. Supabase Realtime WebSockets (Global Internet Sync)
    if (isSupabaseConfigured && supabase) {
      this.supabaseChannel = supabase.channel('ctf_global_room')
        .on('broadcast', { event: 'game_event' }, (payload) => {
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

    // Broadcast to local tabs
    if (this.channel) {
      this.channel.postMessage(eventData);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eventData));

    // Broadcast to global internet via Supabase Realtime
    if (this.supabaseChannel) {
      this.supabaseChannel.send({
        type: 'broadcast',
        event: 'game_event',
        data: eventData
      });
    }

    // Self callback
    if (this.onEventCallback) {
      this.onEventCallback(eventData);
    }
  }

  // Remove any legacy bot entries from storage
  cleanUpBots() {
    let state = this.getStoredState();
    if (state.players && state.players.length > 0) {
      const realPlayers = state.players.filter(p => p.id && !p.id.startsWith('bot-'));
      if (realPlayers.length !== state.players.length) {
        state.players = realPlayers;
        this.saveStoredState(state);
      }
    }
  }

  getStoredState() {
    try {
      const raw = localStorage.getItem('bandit_master_game_data');
      if (!raw) return { players: [], announcements: [], timer: { running: true, seconds: 0 } };
      
      const state = JSON.parse(raw);
      if (state.players) {
        state.players = state.players.filter(p => p.id && !p.id.startsWith('bot-'));
      }
      return state;
    } catch (e) {
      return { players: [], announcements: [], timer: { running: true, seconds: 0 } };
    }
  }

  saveStoredState(state) {
    if (state.players) {
      state.players = state.players.filter(p => p.id && !p.id.startsWith('bot-'));
    }
    localStorage.setItem('bandit_master_game_data', JSON.stringify(state));
  }
}
