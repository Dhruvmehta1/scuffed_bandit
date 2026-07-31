// Multi-Room & Admin WebSocket Broadcast Hub

const WEBSOCKET_RELAY_URL = 'wss://free.piesocket.com/v3/ctf_bandit_teams_room_2026?api_key=VCx2ivjtEaAfOiStcrMIhhIcDqkyBAA28kO7jEjj&notify_self=1';

export class MultiplayerSyncHub {
  constructor(onEventCallback) {
    this.onEventCallback = onEventCallback;
    this.ws = null;
    this.connectWebSocket();
  }

  connectWebSocket() {
    try {
      this.ws = new WebSocket(WEBSOCKET_RELAY_URL);

      this.ws.onopen = () => {
        // Request global team state sync upon connecting
        this.broadcast('GLOBAL_SYNC_REQ', {});
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
        setTimeout(() => this.connectWebSocket(), 3000);
      };

      this.ws.onerror = () => {};
    } catch (e) {}
  }

  broadcast(type, payload) {
    const eventData = {
      type,
      payload,
      timestamp: Date.now()
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(eventData));
      } catch (err) {}
    }

    if (this.onEventCallback) {
      this.onEventCallback(eventData);
    }
  }
}
