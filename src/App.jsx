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
    return new MultiplayerSyncHub(
      (event) => {
        if (!event) return;

        if (event.type === 'ADMIN_BROADCAST') {
          setAdminBanner(event.payload.message);
          soundFx.playSuccessChime();
        } else if (event.type === 'TIMER_STATE') {
          setTimerRunning(event.payload.running);
        } else if (event.type === 'PLAYER_JOIN_TEAM' || event.type === 'TEAM_LEVEL_SOLVED' || event.type === 'PLAYER_LEAVE_TEAM') {
          setActivityFeed(prev => [...prev, event]);
        }
      },
      (allTeamsFromDB) => {
        // Automatic live update whenever any player or team changes in Supabase DB
        if (Array.isArray(allTeamsFromDB)) {
          setTeams(allTeamsFromDB);
          syncHub.saveStoredRooms(allTeamsFromDB);
        }
      }
    );
  }, []);

  // Fetch all teams from Supabase DB on load and poll every 2 seconds as fail-safe
  useEffect(() => {
    const loadTeams = async () => {
      const dbTeams = await syncHub.fetchAllTeamsFromDatabase();
      if (dbTeams && Array.isArray(dbTeams)) {
        setTeams(dbTeams);
      }
    };
    loadTeams();

    const interval = setInterval(loadTeams, 2000);
    return () => clearInterval(interval);
  }, [syncHub]);

  // Auto-sync active player to Supabase DB whenever logged in
  useEffect(() => {
    if (player && activeTeamName) {
      syncHub.registerPlayerToTeam(activeTeamName, player.handle, player.avatar);
    }
  }, [player, activeTeamName, syncHub]);

  // Handle Player Registration / Team Join
  const handleJoin = async (teamNameInput, handle, avatar, isRejoin) => {
    setActiveTeamName(teamNameInput);

    const newPlayer = {
      id: `${teamNameInput.toLowerCase()}_${handle.toLowerCase()}`,
      handle,
      avatar,
      startTime: Date.now()
    };

    setPlayer(newPlayer);

    // Save player and team to Supabase Relational Database
    await syncHub.registerPlayerToTeam(teamNameInput, handle, avatar);

    // Broadcast JOIN event
    syncHub.broadcast('PLAYER_JOIN_TEAM', {
      teamName: teamNameInput,
      player: newPlayer,
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
  const submitPassword = async (submittedPass) => {
    if (!currentLevel) return { success: false };

    if (submittedPass === currentLevel.password) {
      const nextLvl = currentLevelId + 1;
      const nextUnlocked = Math.max(unlockedLevel, nextLvl);
      setUnlockedLevel(nextUnlocked);

      if (nextLvl < LEVELS.length) {
        setCurrentLevelId(nextLvl);
      }

      // Update Team Level in Supabase Relational Database
      if (activeTeamName) {
        await syncHub.updateTeamLevel(activeTeamName, nextUnlocked);
      }

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

  const resetTeamProgress = async (teamName) => {
    await syncHub.updateTeamLevel(teamName, 0);

    if (activeTeamName.toLowerCase() === teamName.toLowerCase()) {
      setUnlockedLevel(0);
      setCurrentLevelId(0);
    }
  };

  const clearTeamPlayers = (teamName) => {
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
