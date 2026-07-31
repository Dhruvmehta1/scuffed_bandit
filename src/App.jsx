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
  // Player session starts null on refresh so user must enter Team Name & Username
  const [player, setPlayer] = useState(null);
  const [activeTeamName, setActiveTeamName] = useState('');

  // Teams state
  const [teams, setTeams] = useState([]);

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

  // Terminal Input State
  const [cmdInputValue, setCmdInputValue] = useState('');

  // Clear legacy stored session on load so Login Modal pops up on every refresh
  useEffect(() => {
    localStorage.removeItem('bandit_active_player');
  }, []);

  // Find active team object
  const activeTeamData = useMemo(() => {
    const safeTeams = Array.isArray(teams) ? teams : [];
    return safeTeams.find(t => t && t.name && t.name.toLowerCase() === activeTeamName.toLowerCase()) || { name: activeTeamName, unlockedLevel: 0, players: [] };
  }, [teams, activeTeamName]);

  // Sync level state with active team data
  useEffect(() => {
    if (activeTeamData && activeTeamData.unlockedLevel !== undefined) {
      setUnlockedLevel(activeTeamData.unlockedLevel);
      setCurrentLevelId(Math.min(activeTeamData.unlockedLevel, LEVELS.length - 1));
    }
  }, [activeTeamData.unlockedLevel]);

  // Initialize VFS for current level
  const currentLevel = LEVELS[currentLevelId] || LEVELS[0];
  
  const vfs = useMemo(() => {
    return new VirtualFileSystem(currentLevel.initialVFS, currentLevel.user);
  }, [currentLevelId, currentLevel]);

  const shellEngine = useMemo(() => {
    return new ShellEngine(vfs);
  }, [vfs]);

  // Real-time Multi-Team Sync Hub
  const syncHub = useMemo(() => {
    return new MultiplayerSyncHub((event) => {
      if (!event) return;

      if (event.type === 'ADMIN_BROADCAST') {
        setAdminBanner(event.payload.message);
        soundFx.playSuccessChime();
      } else if (event.type === 'TIMER_STATE') {
        setTimerRunning(event.payload.running);
      } else if (event.type === 'TEAM_JOIN' || event.type === 'TEAM_HEARTBEAT' || event.type === 'TEAM_LEVEL_UP' || event.type === 'TEAM_LEAVE') {
        if (event.type !== 'TEAM_HEARTBEAT') {
          setActivityFeed(prev => [...prev, event]);
        }

        if (event.payload && event.payload.teamName && event.payload.player) {
          const tName = event.payload.teamName.trim();
          const incomingPlayer = event.payload.player;
          const incomingLevel = event.payload.unlockedLevel || 0;

          setTeams(prevTeams => {
            const safe = Array.isArray(prevTeams) ? prevTeams : [];
            let targetTeam = safe.find(t => t && t.name && t.name.toLowerCase() === tName.toLowerCase());
            if (!targetTeam) {
              targetTeam = { name: tName, maxPlayers: 2, players: [], unlockedLevel: incomingLevel };
            }

            let updatedPlayers = Array.isArray(targetTeam.players) ? [...targetTeam.players] : [];

            if (event.type === 'TEAM_LEAVE') {
              updatedPlayers = updatedPlayers.filter(p => p && p.handle && p.handle.toLowerCase() !== incomingPlayer.handle.toLowerCase());
            } else {
              // Add or update player in team
              const existsIdx = updatedPlayers.findIndex(p => p && p.handle && p.handle.toLowerCase() === incomingPlayer.handle.toLowerCase());
              const pData = {
                id: incomingPlayer.id || ('player-' + incomingPlayer.handle.toLowerCase()),
                handle: incomingPlayer.handle,
                avatar: incomingPlayer.avatar || '⚡',
                lastActive: Date.now()
              };

              if (existsIdx >= 0) {
                updatedPlayers[existsIdx] = pData;
              } else {
                updatedPlayers.push(pData);
              }
            }

            const updatedTeam = {
              ...targetTeam,
              players: updatedPlayers,
              unlockedLevel: Math.max(targetTeam.unlockedLevel || 0, incomingLevel)
            };

            const newTeams = safe.map(t => (t && t.name && t.name.toLowerCase() === tName.toLowerCase()) ? updatedTeam : t);
            if (!safe.some(t => t && t.name && t.name.toLowerCase() === tName.toLowerCase())) {
              newTeams.push(updatedTeam);
            }

            syncHub.saveStoredRooms(newTeams);
            return newTeams;
          });
        }
      }
    });
  }, []);

  // Periodic Heartbeat Broadcaster while active in a team (Every 3 seconds)
  useEffect(() => {
    if (!player || !activeTeamName) return;

    // Send immediate heartbeat on join
    syncHub.broadcast('TEAM_HEARTBEAT', {
      teamName: activeTeamName,
      player,
      unlockedLevel
    });

    const interval = setInterval(() => {
      syncHub.broadcast('TEAM_HEARTBEAT', {
        teamName: activeTeamName,
        player,
        unlockedLevel
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [player, activeTeamName, unlockedLevel, syncHub]);

  // Clean up inactive players who haven't sent a heartbeat in 15 seconds
  useEffect(() => {
    const cleanInterval = setInterval(() => {
      const now = Date.now();
      setTeams(prevTeams => {
        const safe = Array.isArray(prevTeams) ? prevTeams : [];
        let changed = false;

        const updatedTeams = safe.map(team => {
          if (!team || !Array.isArray(team.players)) return team;
          const activePlayers = team.players.filter(p => p.lastActive && (now - p.lastActive < 15000));
          if (activePlayers.length !== team.players.length) {
            changed = true;
            return { ...team, players: activePlayers };
          }
          return team;
        }).filter(team => team.players.length > 0 || team.unlockedLevel > 0);

        if (changed) {
          syncHub.saveStoredRooms(updatedTeams);
          return updatedTeams;
        }
        return safe;
      });
    }, 5000);

    return () => clearInterval(cleanInterval);
  }, [syncHub]);

  // Load stored teams on mount
  useEffect(() => {
    const stored = syncHub.getStoredRooms();
    if (stored && Array.isArray(stored)) {
      setTeams(stored);
    }
  }, [syncHub]);

  // Broadcast TEAM_LEAVE on refresh/unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (player && activeTeamName) {
        syncHub.broadcast('TEAM_LEAVE', {
          teamName: activeTeamName,
          player,
          message: `👋 ${player.handle} left ${activeTeamName}.`
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [player, activeTeamName, syncHub]);

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

  // Handle Player Registration / Team Join
  const handleJoin = (teamNameInput, handle, avatar, isRejoin) => {
    setActiveTeamName(teamNameInput);

    const newPlayer = {
      id: 'player-' + handle.toLowerCase(),
      handle,
      avatar,
      startTime: Date.now()
    };

    setPlayer(newPlayer);

    // Broadcast JOIN event
    syncHub.broadcast('TEAM_JOIN', {
      teamName: teamNameInput,
      player: newPlayer,
      unlockedLevel,
      message: `🎉 ${handle} joined team ${teamNameInput}!`
    });
  };

  const handleSwitchPlayer = () => {
    if (player && activeTeamName) {
      syncHub.broadcast('TEAM_LEAVE', {
        teamName: activeTeamName,
        player,
        message: `👋 ${player.handle} left ${activeTeamName}.`
      });
    }
    setPlayer(null);
  };

  // Submit Password Handler (Shared Team Progress)
  const submitPassword = (submittedPass) => {
    if (!currentLevel) return { success: false };

    if (submittedPass === currentLevel.password) {
      const nextLvl = currentLevelId + 1;
      const nextUnlocked = Math.max(unlockedLevel, nextLvl);
      setUnlockedLevel(nextUnlocked);

      if (nextLvl < LEVELS.length) {
        setCurrentLevelId(nextLvl);
      }

      // Broadcast LEVEL UP to teammate & admin
      if (player && activeTeamName) {
        syncHub.broadcast('TEAM_LEVEL_UP', {
          teamName: activeTeamName,
          player,
          unlockedLevel: nextUnlocked,
          password: currentLevel.password,
          message: `🔥 ${player.handle} in team ${activeTeamName} solved Level ${currentLevelId}! Password unlocked in Vault!`
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

  const resetTeamProgress = (teamName) => {
    setTeams(prevTeams => {
      const safe = Array.isArray(prevTeams) ? prevTeams : [];
      const newTeams = safe.map(t => (t && t.name && t.name.toLowerCase() === teamName.toLowerCase()) ? { ...t, unlockedLevel: 0 } : t);
      syncHub.saveStoredRooms(newTeams);
      return newTeams;
    });

    if (activeTeamName.toLowerCase() === teamName.toLowerCase()) {
      setUnlockedLevel(0);
      setCurrentLevelId(0);
    }
  };

  const clearTeamPlayers = (teamName) => {
    setTeams(prevTeams => {
      const safe = Array.isArray(prevTeams) ? prevTeams : [];
      const newTeams = safe.map(t => (t && t.name && t.name.toLowerCase() === teamName.toLowerCase()) ? { ...t, players: [] } : t);
      syncHub.saveStoredRooms(newTeams);
      return newTeams;
    });
    if (activeTeamName.toLowerCase() === teamName.toLowerCase()) {
      handleSwitchPlayer();
    }
  };

  const copyToTerminal = (cmd) => {
    setCmdInputValue(cmd);
  };

  return (
    <div className={`app-root theme-${theme}`}>
      {/* Navbar */}
      <Navbar
        player={player}
        roomCode={activeTeamName ? `TEAM: ${activeTeamName}` : 'SELECT TEAM'}
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
        onSwitchPlayer={handleSwitchPlayer}
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

      {/* Player Login / Team Name Input Modal */}
      {!player && <JoinModal teams={teams} onJoin={handleJoin} />}

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
        teams={teams}
        broadcastAnnouncement={broadcastAnnouncement}
        timer={{ running: timerRunning }}
        setTimerState={setTimerState}
        resetTeamProgress={resetTeamProgress}
        clearTeamPlayers={clearTeamPlayers}
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
        teamName={activeTeamName}
      />
    </div>
  );
}
