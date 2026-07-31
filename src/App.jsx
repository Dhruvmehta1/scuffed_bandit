import React, { useState, useEffect, useMemo } from 'react';
import { LEVELS } from './data/levels';
import { VirtualFileSystem } from './vfs/virtualFileSystem';
import { ShellEngine } from './vfs/shellEngine';
import { MultiplayerSyncHub } from './multiplayer/broadcastChannel';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LevelDetail } from './components/LevelDetail';
import { Terminal } from './components/Terminal';
import { JoinModal } from './components/JoinModal';
import { VictoryModal } from './components/VictoryModal';
import { AdminDashboard } from './components/AdminDashboard';
import { CheatSheetModal } from './components/CheatSheetModal';
import { PasswordVaultModal } from './components/PasswordVaultModal';
import { soundFx } from './utils/audio';

export default function App() {
  const [player, setPlayer] = useState(null);
  const [roomCode] = useState('BANDIT-' + Math.floor(1000 + Math.random() * 9000));
  const [currentLevelId, setCurrentLevelId] = useState(0);
  const [unlockedLevel, setUnlockedLevel] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);

  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState('matrix'); // matrix, cyberpunk, amber, dark
  const [crtEnabled, setCrtEnabled] = useState(true);

  // Modals
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [showVictory, setShowVictory] = useState(false);

  // Live Broadcast & Activity Ticker
  const [activityFeed, setActivityFeed] = useState([]);
  const [adminBanner, setAdminBanner] = useState(null);
  const [connectedPlayers, setConnectedPlayers] = useState([]);

  // Terminal Input State
  const [cmdInputValue, setCmdInputValue] = useState('');

  // Initialize VFS for current level
  const currentLevel = LEVELS[currentLevelId] || LEVELS[0];
  
  const vfs = useMemo(() => {
    return new VirtualFileSystem(currentLevel.initialVFS, currentLevel.user);
  }, [currentLevelId, currentLevel]);

  const shellEngine = useMemo(() => {
    return new ShellEngine(vfs);
  }, [vfs]);

  // Real-time Multiplayer Hub initialization
  const syncHub = useMemo(() => {
    return new MultiplayerSyncHub((event) => {
      if (!event) return;

      if (event.type === 'ADMIN_BROADCAST') {
        setAdminBanner(event.payload.message);
        soundFx.playSuccessChime();
      } else if (event.type === 'TIMER_STATE') {
        setTimerRunning(event.payload.running);
      } else if (event.type === 'PLAYER_JOIN' || event.type === 'LEVEL_UP' || event.type === 'BOT_LEVEL_UP' || event.type === 'PLAYER_SYNC') {
        setActivityFeed(prev => [...prev, event]);

        if (event.payload && event.payload.player) {
          const incoming = event.payload.player;
          setConnectedPlayers(prev => {
            const exists = prev.some(p => p.id === incoming.id || p.handle === incoming.handle);
            const newList = exists
              ? prev.map(p => (p.id === incoming.id || p.handle === incoming.handle) ? incoming : p)
              : [...prev, incoming];

            // Persist merged list to storage
            const state = syncHub.getStoredState();
            state.players = newList;
            syncHub.saveStoredState(state);

            return newList;
          });
        }
      }
    });
  }, []);

  // Load initial players list on mount & request sync
  useEffect(() => {
    const stored = syncHub.getStoredState();
    if (stored.players) {
      setConnectedPlayers(stored.players);
    }
  }, [syncHub]);

  // Timer Tick Interval
  useEffect(() => {
    let interval = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Handle Player Registration
  const handleJoin = (handle, avatar) => {
    const newPlayer = {
      id: 'player-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      handle,
      avatar,
      level: 0,
      attempts: 0,
      startTime: Date.now()
    };
    setPlayer(newPlayer);

    // Merge into local list
    setConnectedPlayers(prev => {
      const newList = [...prev.filter(p => p.handle !== handle), newPlayer];
      const state = syncHub.getStoredState();
      state.players = newList;
      syncHub.saveStoredState(state);
      return newList;
    });

    // Broadcast Join globally to all connected devices over Supabase
    syncHub.broadcast('PLAYER_JOIN', {
      player: newPlayer,
      message: `🎉 Player ${handle} joined the room CTF!`
    });
  };

  // Submit Password Handler
  const submitPassword = (submittedPass) => {
    if (!currentLevel) return { success: false };

    if (submittedPass === currentLevel.password) {
      const nextLvl = currentLevelId + 1;
      const nextUnlocked = Math.max(unlockedLevel, nextLvl);
      setUnlockedLevel(nextUnlocked);

      if (nextLvl < LEVELS.length) {
        setCurrentLevelId(nextLvl);
      }

      // Update Player Progress in Storage & Broadcast Globally
      if (player) {
        const updatedPlayer = { ...player, level: nextUnlocked };
        setPlayer(updatedPlayer);

        setConnectedPlayers(prev => {
          const newList = prev.map(p => (p.id === player.id || p.handle === player.handle) ? updatedPlayer : p);
          const state = syncHub.getStoredState();
          state.players = newList;
          syncHub.saveStoredState(state);
          return newList;
        });

        syncHub.broadcast('LEVEL_UP', {
          player: updatedPlayer,
          message: `🔥 ${player.handle} solved Level ${currentLevelId}!`
        });
      }

      // Check Win Condition (Level 10)
      if (nextLvl >= 10 || nextUnlocked >= 10) {
        setShowVictory(true);
      }

      return { success: true };
    }
    return { success: false };
  };

  // Admin Actions
  const broadcastAnnouncement = (message) => {
    syncHub.broadcast('ADMIN_BROADCAST', { message });
  };

  const setTimerState = (running) => {
    setTimerRunning(running);
    syncHub.broadcast('TIMER_STATE', { running });
  };

  const resetPlayerProgress = (playerId) => {
    setConnectedPlayers(prev => {
      const newList = prev.map(p => p.id === playerId ? { ...p, level: 0 } : p);
      const state = syncHub.getStoredState();
      state.players = newList;
      syncHub.saveStoredState(state);
      return newList;
    });

    if (player && player.id === playerId) {
      setUnlockedLevel(0);
      setCurrentLevelId(0);
    }
  };

  const kickPlayer = (playerId) => {
    setConnectedPlayers(prev => {
      const newList = prev.filter(p => p.id !== playerId);
      const state = syncHub.getStoredState();
      state.players = newList;
      syncHub.saveStoredState(state);
      return newList;
    });
  };

  const copyToTerminal = (cmd) => {
    setCmdInputValue(cmd);
  };

  return (
    <div className={`app-root theme-${theme}`}>
      {/* Navbar */}
      <Navbar
        player={player}
        roomCode={roomCode}
        timerSeconds={timerSeconds}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        theme={theme}
        setTheme={setTheme}
        crtEnabled={crtEnabled}
        setCrtEnabled={setCrtEnabled}
        openCheatSheet={() => setIsCheatSheetOpen(true)}
        openVault={() => setIsVaultOpen(true)}
        openAdminModal={() => setIsAdminOpen(true)}
      />

      {/* Admin Broadcast Banner Popup */}
      {adminBanner && (
        <div className="admin-banner-popup">
          <span className="banner-badge">⚡ BROADCAST ALERT</span>
          <span className="banner-text">{adminBanner}</span>
          <button className="banner-close" onClick={() => setAdminBanner(null)}>✕</button>
        </div>
      )}

      {/* Main CTF Workspace */}
      <div className="workspace">
        {/* Left Sidebar Navigator */}
        <Sidebar
          levels={LEVELS}
          currentLevelId={currentLevelId}
          setCurrentLevelId={setCurrentLevelId}
          unlockedLevel={unlockedLevel}
          submitPassword={submitPassword}
          activityFeed={activityFeed}
        />

        {/* Center Panel: Level Objectives & Interactive Terminal */}
        <main className="main-content">
          <LevelDetail level={currentLevel} copyToTerminal={copyToTerminal} />
          
          <Terminal
            shellEngine={shellEngine}
            vfs={vfs}
            currentLevel={currentLevel}
            crtEnabled={crtEnabled}
            cmdInputValue={cmdInputValue}
            setCmdInputValue={setCmdInputValue}
          />
        </main>
      </div>

      {/* Player Registration Modal */}
      {!player && <JoinModal onJoin={handleJoin} />}

      {/* Victory Modal */}
      {showVictory && (
        <VictoryModal
          player={player}
          timerSeconds={timerSeconds}
          onClose={() => setShowVictory(false)}
          onRestart={() => {
            setUnlockedLevel(0);
            setCurrentLevelId(0);
            setShowVictory(false);
          }}
        />
      )}

      {/* Exclusive Admin Dashboard */}
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        players={connectedPlayers}
        broadcastAnnouncement={broadcastAnnouncement}
        timer={{ running: timerRunning }}
        setTimerState={setTimerState}
        resetPlayerProgress={resetPlayerProgress}
        kickPlayer={kickPlayer}
      />

      {/* Linux Cheat Sheet Modal */}
      <CheatSheetModal
        isOpen={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
        copyToTerminal={copyToTerminal}
      />

      {/* Password Vault Modal */}
      <PasswordVaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        levels={LEVELS}
        unlockedLevel={unlockedLevel}
      />
    </div>
  );
}
