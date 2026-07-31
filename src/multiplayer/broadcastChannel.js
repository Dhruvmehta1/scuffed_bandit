// Supabase Relational Database Sync Hub (ctf_teams + ctf_players)

import { supabase } from './supabaseClient';

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
        // Subscribe to live database changes on ctf_teams & ctf_players
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

  // Fetch all teams & join their players from Supabase Relational Database
  async fetchAllTeamsFromDatabase() {
    if (!supabase) return [];
    try {
      const { data: teamsData, error: tErr } = await supabase.from('ctf_teams').select('*');
      const { data: playersData, error: pErr } = await supabase.from('ctf_players').select('*');

      if (tErr || !teamsData) return [];

      const players = playersData || [];
      const formattedTeams = teamsData.map(t => {
        const teamPlayers = players
          .filter(p => p.team_name && p.team_name.toLowerCase() === t.team_name.toLowerCase())
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

  // Register / Join Player to Team in Supabase DB
  async registerPlayerToTeam(teamName, handle, avatar = '⚡') {
    if (!supabase || !teamName || !handle) return;
    try {
      const tName = teamName.trim();
      const pHandle = handle.trim();
      const pId = `${tName.toLowerCase()}_${pHandle.toLowerCase()}`;

      // 1. Upsert Team
      await supabase.from('ctf_teams').upsert(
        { team_name: tName, updated_at: new Date().toISOString() },
        { onConflict: 'team_name' }
      );

      // 2. Insert Player (Will not overwrite existing teammates!)
      await supabase.from('ctf_players').upsert(
        { id: pId, team_name: tName, handle: pHandle, avatar },
        { onConflict: 'id' }
      );

      // Fetch and trigger update across all devices
      await this.fetchAndNotifyAllTeams();
    } catch (e) {}
  }

  // Update Team Level in Supabase DB
  async updateTeamLevel(teamName, unlockedLevel) {
    if (!supabase || !teamName) return;
    try {
      const tName = teamName.trim();
      await supabase.from('ctf_teams').upsert(
        { team_name: tName, unlocked_level: unlockedLevel, updated_at: new Date().toISOString() },
        { onConflict: 'team_name' }
      );

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
