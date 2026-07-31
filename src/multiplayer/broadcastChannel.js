// Real-Time Multi-Team Sync Engine (Native WebSocket Relay + BroadcastChannel)

const CHANNEL_NAME = 'bandit_ctf_teams_channel_v5';
const STORAGE_KEY = 'bandit_ctf_teams_state_v5';

// Free, Zero-Config Public WebSocket Relay URL (No DB tables or backend needed!)
const WEBSOCKET_RELAY_URL = 'wss://free.piesocket.com/v3/ctf_bandit_room_2026?api_key=VCx2ivjtEaAfOiStcrMIhhIcDqkyBAA28kO7jEjj&notify_self=1';

export class MultiplayerSyncHub {
  constructor(onEventCallback, onTeamsUpdatedCallback) {
    this.onEventCallback = onEventCallback;
    this.onTeamsUpdatedCallback = onTeamsUpdatedCallback;
    this.channel = null;
    this.ws = null;
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

    // 3. Native WebSocket Relay (Global Internet Cross-Device Sync)
    this.connectWebSocket();
  }

  connectWebSocket() {
    try {
      this.ws = new WebSocket(WEBSOCKET_RELAY_URL);

      this.ws.onopen = () => {
        // Request sync from connected clients upon connecting
        this.broadcast('TEAM_SYNC_REQUEST', { timestamp: Date.now() });

        // If player is already logged in, re-broadcast presence
        if (this.currentTrackData) {
          this.broadcast('TEAM_JOIN', {
            teamName: this.currentTrackData.teamName,
            player: this.currentTrackData,
            message: `🎉 ${this.currentTrackData.handle} reconnected!`
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type && this.onEventCallback) {
            this.onEventCallback(data);
          }
        } catch (err) {}
      };

      this.ws.onclose = () => {
        // Auto-reconnect after 3 seconds if disconnected
        setTimeout(() => this.connectWebSocket(), 3000);
      };

      this.ws.onerror = () => {};
    } catch (e) {}
  }

  trackPlayer(teamName, handle, avatar, level = 0) {
    this.currentTrackData = {
      id: 'player-' + handle.toLowerCase(),
      teamName: teamName.trim(),
      handle: handle.trim(),
      avatar,
      level,
      joinedAt: Date.now()
    };
  }

  untrackPlayer() {
    this.currentTrackData = null;
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

    // Broadcast over WebSocket Relay
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(eventData));
      } catch (err) {}
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
