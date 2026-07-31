// Real-Time Multi-Team Sync Engine (Supabase Realtime Presence + Broadcast)

import { supabase, isSupabaseConfigured } from './supabaseClient';

const CHANNEL_NAME = 'bandit_ctf_teams_channel_v4';
const STORAGE_KEY = 'bandit_ctf_teams_state_v4';

export class MultiplayerSyncHub {
  constructor(onEventCallback, onTeamsUpdatedCallback) {
    this.onEventCallback = onEventCallback;
    this.onTeamsUpdatedCallback = onTeamsUpdatedCallback;
    this.channel = null;
    this.supabaseChannel = null;
    this.currentTrackData = null;
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

    // 3. Supabase Realtime Presence & WebSockets (Global Internet Sync)
    if (isSupabaseConfigured && supabase) {
      this.supabaseChannel = supabase.channel('ctf_global_teams_presence', {
        config: {
          broadcast: { self: true },
          presence: { key: 'player_session' }
        }
      });

      // Handle presence sync (Automatic cross-device player tracking)
      this.supabaseChannel
        .on('presence', { event: 'sync' }, () => {
          const state = this.supabaseChannel.presenceState();
          this.processPresenceState(state);
        })
        .on('broadcast', { event: 'game_event' }, (envelope) => {
          if (this.onEventCallback && envelope && envelope.payload) {
            this.onEventCallback(envelope.payload);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED' && this.currentTrackData) {
            this.supabaseChannel.track(this.currentTrackData);
          }
        });
    }
  }

  // Track active player in Supabase Presence
  trackPlayer(teamName, handle, avatar, level = 0) {
    this.currentTrackData = {
      id: 'player-' + handle.toLowerCase(),
      teamName: teamName.trim(),
      handle: handle.trim(),
      avatar,
      level,
      joinedAt: Date.now()
    };

    if (this.supabaseChannel) {
      this.supabaseChannel.track(this.currentTrackData);
    }
  }

  // Untrack player on leave
  untrackPlayer() {
    this.currentTrackData = null;
    if (this.supabaseChannel) {
      this.supabaseChannel.untrack();
    }
  }

  // Process Supabase Presence State into aggregated Teams list
  processPresenceState(presenceState) {
    const teamMap = new Map();

    Object.values(presenceState).forEach(presenceList => {
      if (!Array.isArray(presenceList)) return;
      presenceList.forEach(user => {
        if (!user || !user.teamName || !user.handle) return;
        const tKey = user.teamName.toLowerCase();

        let team = teamMap.get(tKey);
        if (!team) {
          team = { name: user.teamName, maxPlayers: 2, players: [], unlockedLevel: 0 };
          teamMap.set(tKey, team);
        }

        const exists = team.players.some(p => p.handle.toLowerCase() === user.handle.toLowerCase());
        if (!exists) {
          team.players.push({
            id: user.id || ('player-' + user.handle.toLowerCase()),
            handle: user.handle,
            avatar: user.avatar || '⚡'
          });
        }
        team.unlockedLevel = Math.max(team.unlockedLevel || 0, user.level || 0);
      });
    });

    const aggregatedTeams = Array.from(teamMap.values());
    this.saveStoredRooms(aggregatedTeams);

    if (this.onTeamsUpdatedCallback) {
      this.onTeamsUpdatedCallback(aggregatedTeams);
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
        event: 'game_event',
        payload: eventData
      });
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
