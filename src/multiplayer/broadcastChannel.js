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
    this.initBotSimulation();
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

  // Simulated AI Bot Opponents for vibrant CTF environment
  initBotSimulation() {
    const bots = [
      { id: 'bot-1', handle: 'CyberGamer_01', level: 1, attempts: 2, startTime: Date.now() - 30000, avatar: '🤖' },
      { id: 'bot-2', handle: 'ByteNinja', level: 2, attempts: 3, startTime: Date.now() - 60000, avatar: '🥷' },
      { id: 'bot-3', handle: 'LinuxNoob', level: 0, attempts: 1, startTime: Date.now() - 10000, avatar: '🐣' }
    ];

    let storedState = this.getStoredState();
    if (!storedState.players || storedState.players.length === 0) {
      storedState.players = bots;
      this.saveStoredState(storedState);
    }

    // Periodic bot advancement every 45 seconds
    setInterval(() => {
      let state = this.getStoredState();
      if (!state.players) return;

      const randomBot = state.players.find(p => p.id && p.id.startsWith('bot-') && p.level < 9);
      if (randomBot) {
        randomBot.level += 1;
        randomBot.lastSolvedTime = Date.now();
        this.saveStoredState(state);
        this.broadcast('BOT_LEVEL_UP', {
          player: randomBot,
          message: `🤖 Bot ${randomBot.handle} solved Level ${randomBot.level - 1}!`
        });
      }
    }, 45000);
  }

  getStoredState() {
    try {
      const raw = localStorage.getItem('bandit_master_game_data');
      return raw ? JSON.parse(raw) : { players: [], announcements: [], timer: { running: true, seconds: 0 } };
    } catch (e) {
      return { players: [], announcements: [], timer: { running: true, seconds: 0 } };
    }
  }

  saveStoredState(state) {
    localStorage.setItem('bandit_master_game_data', JSON.stringify(state));
  }
}
