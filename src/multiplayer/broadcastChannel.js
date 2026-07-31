// Supabase Direct REST API Sync Engine (Guaranteed HTTP Fetch)

import { supabase } from './supabaseClient';

const SUPABASE_URL = 'https://fdafaaozhnoymppohicf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkYWZhYW96aG5veW1wcG9oaWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MTY1MDYsImV4cCI6MjEwMTA5MjUwNn0.pwb7PSkPuDeOt_ghMa8ydyIa-wdTt6h33OPy82eyoPI';

const HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates'
};

export class MultiplayerSyncHub {
  constructor(onEventCallback, onTeamsUpdatedCallback) {
    this.onEventCallback = onEventCallback;
    this.onTeamsUpdatedCallback = onTeamsUpdatedCallback;
    this.supabaseChannel = null;
    this.initChannel();
  }

  initChannel() {
    if (supabase) {
      try {
        this.supabaseChannel = supabase
          .channel('public_ctf_realtime_db')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'ctf_teams' },
            () => this.fetchAndNotifyAllTeams()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'ctf_players' },
            () => this.fetchAndNotifyAllTeams()
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

  // Fetch all teams & join players via Supabase Direct REST API
  async fetchAllTeamsFromDatabase() {
    try {
      const resT = await fetch(`${SUPABASE_URL}/rest/v1/ctf_teams?select=*`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
      });
      const resP = await fetch(`${SUPABASE_URL}/rest/v1/ctf_players?select=*`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
      });

      if (!resT.ok) return [];

      const teamsData = await resT.json();
      const playersData = resP.ok ? await resP.json() : [];

      if (!Array.isArray(teamsData)) return [];

      const players = Array.isArray(playersData) ? playersData : [];

      const formattedTeams = teamsData.map(t => {
        const teamPlayers = players
          .filter(p => p.team_name && p.team_name.toLowerCase() === (t.team_name || '').toLowerCase())
          .map(p => ({
            id: p.id,
            handle: p.handle,
            avatar: p.avatar || '⚡'
          }));

        return {
          name: t.team_name,
          maxPlayers: 2,
          unlockedLevel: t.unlocked_level || 0,
          players: teamPlayers
        };
      });

      return formattedTeams;
    } catch (e) {
      return [];
    }
  }

  async fetchAndNotifyAllTeams() {
    const teams = await this.fetchAllTeamsFromDatabase();
    if (this.onTeamsUpdatedCallback && Array.isArray(teams)) {
      this.onTeamsUpdatedCallback(teams);
    }
  }

  // Register / Join Player to Team via Supabase Direct REST API
  async registerPlayerToTeam(teamName, handle, avatar = '⚡') {
    if (!teamName || !handle) return;
    try {
      const tName = teamName.trim();
      const pHandle = handle.trim();
      const pId = `${tName.toLowerCase()}_${pHandle.toLowerCase()}`;

      // 1. Upsert Team
      await fetch(`${SUPABASE_URL}/rest/v1/ctf_teams`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ team_name: tName, updated_at: new Date().toISOString() })
      });

      // 2. Upsert Player (Will not overwrite existing teammates!)
      await fetch(`${SUPABASE_URL}/rest/v1/ctf_players`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ id: pId, team_name: tName, handle: pHandle, avatar })
      });

      // Fetch and notify
      await this.fetchAndNotifyAllTeams();
    } catch (e) {}
  }

  // Update Team Level via Supabase Direct REST API
  async updateTeamLevel(teamName, unlockedLevel) {
    if (!teamName) return;
    try {
      const tName = teamName.trim();
      await fetch(`${SUPABASE_URL}/rest/v1/ctf_teams`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ team_name: tName, unlocked_level: unlockedLevel, updated_at: new Date().toISOString() })
      });

      await this.fetchAndNotifyAllTeams();
    } catch (e) {}
  }

  broadcast(type, payload) {
    const eventData = {
      type,
      payload,
      timestamp: Date.now()
    };

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
