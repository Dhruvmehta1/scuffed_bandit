// Supabase Database Table Realtime Sync Hub

import { supabase, isSupabaseConfigured } from './supabaseClient';

const CHANNEL_NAME = 'bandit_ctf_teams_channel_v7';
const STORAGE_KEY = 'bandit_ctf_teams_state_v7';

export class MultiplayerSyncHub {
  constructor(onEventCallback, onTeamsUpdatedCallback) {
    this.onEventCallback = onEventCallback;
    this.onTeamsUpdatedCallback = onTeamsUpdatedCallback;
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

    // 3. Supabase Postgres Realtime Table Subscription
    if (isSupabaseConfigured && supabase) {
      try {
        this.supabaseChannel = supabase
          .channel('public:ctf_teams')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'ctf_teams' },
            (payload) => {
              if (payload && payload.new && payload.new.data) {
                if (this.onTeamsUpdatedCallback) {
                  this.onTeamsUpdatedCallback(payload.new.data);
                }
              }
            }
          )
          .on('broadcast', { event: 'game_event' }, (envelope) => {
            if (this.onEventCallback && envelope && envelope.payload) {
              this.onEventCallback(envelope.payload);
            }
          })
          .subscribe();
      } catch (e) {}
    }
  }

  // Save team to Supabase Database Table
  async saveTeamToDatabase(team) {
    if (!team || !team.name) return;
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('ctf_teams').upsert({
          id: team.name.toLowerCase().trim(),
          data: team,
          updated_at: new Date().toISOString()
        });
      } catch (e) {}
    }
  }

  // Fetch all teams from Supabase Database Table
  async fetchAllTeamsFromDatabase() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('ctf_teams').select('*');
        if (!error && data && Array.isArray(data)) {
          return data.map(row => row.data);
        }
      } catch (e) {}
    }
    return this.getStoredRooms();
  }

  broadcast(type, payload) {
    const eventData = {
      type,
      payload,
      timestamp: Date.now()
    };

    if (this.channel) {
      try { this.channel.postMessage(eventData); } catch (e) {}
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eventData));

    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'game_event',
          payload: eventData
        });
      } catch (e) {}
    }

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
