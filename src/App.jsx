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
  const [activeTeamName, setActiveTeamName] = useState('');
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

  // Real-time Multi-Room Sync Hub
  const syncHub = useMemo(() => {
    return new MultiplayerSyncHub((event) => {
      if (!event) return;

      if (event.type === 'ADMIN_BROADCAST') {
        setAdminBanner(event.payload.message);
        soundFx.playSuccessChime();
      } else if (event.type === 'TIMER_STATE') {
        setTimerRunning(event.payload.running);
      } else if (event.type === 'GLOBAL_SYNC_REQ') {
        // Active devices respond with their current team state so new clients or Admin Dashboard receive all teams
        if (player && activeTeamName) {
          syncHub.broadcast('TEAM_STATE_RESP', {
            teamName: activeTeamName,
            player,
            unlockedLevel
          });
        }
      } else if (event.type === 'PLAYER_JOIN_TEAM' || event.type === 'TEAM_STATE_RESP' || event.type === 'TEAM_LEVEL_SOLVED' || event.type === 'PLAYER_LEAVE_TEAM') {
        setActivityFeed(prev => [...prev, event]);

        if (event.payload && event.payload.teamName) {
          const tName = event.payload.teamName.trim();
          const incomingPlayer = event.payload.player;
          const incomingLevel = event.payload.unlockedLevel;

          setTeams(prevTeams => {
            const safe = Array.isArray(prevTeams) ? prevTeams : [];
            let targetTeam = safe.find(t => t && t.name && t.name.toLowerCase() === tName.toLowerCase());
            if (!targetTeam) {
              targetTeam = { name: tName, maxPlayers: 2, players: [], unlockedLevel: incomingLevel || 0 };
            }

            let updatedPlayers = Array.isArray(targetTeam.players) ? [...targetTeam.players] : [];

            if (event.type === 'PLAYER_LEAVE_TEAM' && incomingPlayer) {
              updatedPlayers = updatedPlayers.filter(p => p && p.handle && p.handle.toLowerCase() !== incomingPlayer.handle.toLowerCase());
            } else if (incomingPlayer) {
              const exists = updatedPlayers.some(p => p && p.handle && p.handle.toLowerCase() === incomingPlayer.handle.toLowerCase());
              if (!exists) updatedPlayers.push(incomingPlayer);
            }

            const newUnlockedLevel = incomingLevel !== undefined ? Math.max(targetTeam.unlockedLevel || 0, incomingLevel) : targetTeam.unlockedLevel;

            const updatedTeam = {
              ...targetTeam,
              players: updatedPlayers,
              unlockedLevel: newUnlockedLevel
            };

            const newTeams = safe.map(t => (t && t.name && t.name.toLowerCase() === tName.toLowerCase()) ? updatedTeam : t);
            if (!safe.some(t => t && t.name && t.name.toLowerCase() === tName.toLowerCase())) {
              newTeams.push(updatedTeam);
            }

            // If incoming event is from our team, sync teammate's level progress
            if (activeTeamName && tName.toLowerCase() === activeTeamName.toLowerCase() && newUnlockedLevel > unlockedLevel) {
              setUnlockedLevel(newUnlockedLevel);
              setCurrentLevelId(Math.min(newUnlockedLevel, LEVELS.length - 1));
            }

            // If we are already connected to this team, respond back to sync both teammates
            if (player && activeTeamName && tName.toLowerCase() === activeTeamName.toLowerCase() && event.type === 'PLAYER_JOIN_TEAM') {
              setTimeout(() => {
                syncHub.broadcast('TEAM_STATE_RESP', {
                  teamName: activeTeamName,
                  player,
                  unlockedLevel: newUnlockedLevel
                });
              }, 200);
            }

            return newTeams;
          });
        }
      }
    });
  }, [player, activeTeamName, unlockedLevel]);

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

    // Update local teams state immediately
    setTeams(prevTeams => {
      const safe = Array.isArray(prevTeams) ? prevTeams : [];
      let target = safe.find(t => t && t.name && t.name.toLowerCase() === teamNameInput.toLowerCase());
      if (!target) {
        target = { name: teamNameInput, maxPlayers: 2, players: [], unlockedLevel: 0 };
      }

      const existingPlayers = Array.isArray(target.players) ? target.players : [];
      const exists = existingPlayers.some(p => p && p.handle && p.handle.toLowerCase() === handle.toLowerCase());
      const updatedPlayers = exists ? existingPlayers : [...existingPlayers, newPlayer];

      const updatedTeam = { ...target, players: updatedPlayers };
      const newTeams = safe.map(t => (t && t.name && t.name.toLowerCase() === teamNameInput.toLowerCase()) ? updatedTeam : t);
      if (!safe.some(t => t && t.name && t.name.toLowerCase() === teamNameInput.toLowerCase())) {
        newTeams.push(updatedTeam);
      }

      return newTeams;
    });

    // Broadcast JOIN event to room & global admin dashboard over WebSocket
    syncHub.broadcast('PLAYER_JOIN_TEAM', {
      teamName: teamNameInput,
      player: newPlayer,
      unlockedLevel: activeTeamData.unlockedLevel || 0,
      message: `🎉 ${handle} joined team ${teamNameInput}!`
    });
  };

  const handleSwitchPlayer = () => {
    if (player && activeTeamName) {
      syncHub.broadcast('PLAYER_LEAVE_TEAM', {
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

      // Update Team Level in local state
      setTeams(prevTeams => {
        const safe = Array.isArray(prevTeams) ? prevTeams : [];
        return safe.map(t => {
          if (t && t.name && t.name.toLowerCase() === activeTeamName.toLowerCase()) {
            return { ...t, unlockedLevel: Math.max(t.unlockedLevel || 0, nextUnlocked) };
          }
          return t;
        });
      });

      // Broadcast level solution to teammate in room & admin dashboard
      if (player && activeTeamName) {
        syncHub.broadcast('TEAM_LEVEL_SOLVED', {
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
      return safe.map(t => (t && t.name && t.name.toLowerCase() === teamName.toLowerCase()) ? { ...t, unlockedLevel: 0 } : t);
    });

    if (activeTeamName.toLowerCase() === teamName.toLowerCase()) {
      setUnlockedLevel(0);
      setCurrentLevelId(0);
    }
  };

  const clearTeamPlayers = (teamName) => {
    setTeams(prevTeams => {
      const safe = Array.isArray(prevTeams) ? prevTeams : [];
      return safe.map(t => (t && t.name && t.name.toLowerCase() === teamName.toLowerCase()) ? { ...t, players: [] } : t);
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
