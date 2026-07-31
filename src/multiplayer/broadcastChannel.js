// Clean Local Event Hub (No external network/DB calls)

export class MultiplayerSyncHub {
  constructor(onEventCallback, onTeamsUpdatedCallback) {
    this.onEventCallback = onEventCallback;
    this.onTeamsUpdatedCallback = onTeamsUpdatedCallback;
  }

  async fetchAllTeamsFromDatabase() {
    return this.getStoredRooms();
  }

  async registerPlayerToTeam(teamName, handle, avatar = '⚡') {
    return;
  }

  async updateTeamLevel(teamName, unlockedLevel) {
    return;
  }

  broadcast(type, payload) {
    const eventData = {
      type,
      payload,
      timestamp: Date.now()
    };
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
