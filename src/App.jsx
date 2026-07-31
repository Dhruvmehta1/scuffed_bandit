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
      (singleUpdatedTeam) => {
        // Live update when any team changes in Supabase Postgres Realtime Table
        if (singleUpdatedTeam && singleUpdatedTeam.name) {
          setTeams(prevTeams => {
            const safe = Array.isArray(prevTeams) ? prevTeams : [];
            const exists = safe.some(t => t && t.name && t.name.toLowerCase() === singleUpdatedTeam.name.toLowerCase());
            const newTeams = exists
              ? safe.map(t => (t && t.name && t.name.toLowerCase() === singleUpdatedTeam.name.toLowerCase()) ? singleUpdatedTeam : t)
              : [...safe, singleUpdatedTeam];
            
            syncHub.saveStoredRooms(newTeams);

            // If incoming update is for our active team, sync level
            if (activeTeamName && singleUpdatedTeam.name.toLowerCase() === activeTeamName.toLowerCase()) {
              if (singleUpdatedTeam.unlockedLevel !== undefined && singleUpdatedTeam.unlockedLevel > unlockedLevel) {
                setUnlockedLevel(singleUpdatedTeam.unlockedLevel);
                setCurrentLevelId(Math.min(singleUpdatedTeam.unlockedLevel, LEVELS.length - 1));
              }
            }

            return newTeams;
          });
        }
      }
    );
  }, [activeTeamName, unlockedLevel]);

  // Load all teams from Supabase Database on mount
  useEffect(() => {
    const loadTeams = async () => {
      const fetched = await syncHub.fetchAllTeamsFromDatabase();
      if (fetched && Array.isArray(fetched)) {
        setTeams(fetched);
      }
    };
    loadTeams();

    // Poll Supabase DB every 4 seconds as fail-safe fallback
    const interval = setInterval(loadTeams, 4000);
    return () => clearInterval(interval);
  }, [syncHub]);

  // Handle Player Registration / Team Join
  const handleJoin = async (teamNameInput, handle, avatar, isRejoin) => {
    setActiveTeamName(teamNameInput);

    const newPlayer = {
      id: 'player-' + handle.toLowerCase(),
      handle,
      avatar,
      startTime: Date.now()
    };

    setPlayer(newPlayer);

    // Fetch latest teams to prevent race conditions
    const latestTeams = await syncHub.fetchAllTeamsFromDatabase();
    const safe = Array.isArray(latestTeams) ? latestTeams : (Array.isArray(teams) ? teams : []);

    let target = safe.find(t => t && t.name && t.name.toLowerCase() === teamNameInput.toLowerCase());
    if (!target) {
      target = { name: teamNameInput, maxPlayers: 2, players: [], unlockedLevel: 0 };
    }

    const existingPlayers = Array.isArray(target.players) ? target.players : [];
    const exists = existingPlayers.some(p => p && p.handle && p.handle.toLowerCase() === handle.toLowerCase());
    const updatedPlayers = exists ? existingPlayers : [...existingPlayers, newPlayer];

    const updatedTeam = { ...target, players: updatedPlayers };

    // Update local state and save to Supabase Database Table
    const newTeams = safe.map(t => (t && t.name && t.name.toLowerCase() === teamNameInput.toLowerCase()) ? updatedTeam : t);
    if (!safe.some(t => t && t.name && t.name.toLowerCase() === teamNameInput.toLowerCase())) {
      newTeams.push(updatedTeam);
    }

    setTeams(newTeams);
    syncHub.saveStoredRooms(newTeams);
    await syncHub.saveTeamToDatabase(updatedTeam);

    // Broadcast JOIN event
    syncHub.broadcast('PLAYER_JOIN_TEAM', {
      teamName: teamNameInput,
      player: newPlayer,
      unlockedLevel: updatedTeam.unlockedLevel || 0,
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

      // Update Team Level in state & save to Supabase Database
      let updatedTeamObj = null;
      setTeams(prevTeams => {
        const safe = Array.isArray(prevTeams) ? prevTeams : [];
        const newTeams = safe.map(t => {
          if (t && t.name && t.name.toLowerCase() === activeTeamName.toLowerCase()) {
            updatedTeamObj = { ...t, unlockedLevel: Math.max(t.unlockedLevel || 0, nextUnlocked) };
            return updatedTeamObj;
          }
          return t;
        });
        syncHub.saveStoredRooms(newTeams);
        return newTeams;
      });

      if (updatedTeamObj) {
        await syncHub.saveTeamToDatabase(updatedTeamObj);
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
    let updatedObj = null;
    setTeams(prevTeams => {
      const safe = Array.isArray(prevTeams) ? prevTeams : [];
      const newTeams = safe.map(t => {
        if (t && t.name && t.name.toLowerCase() === teamName.toLowerCase()) {
          updatedObj = { ...t, unlockedLevel: 0 };
          return updatedObj;
        }
        return t;
      });
      syncHub.saveStoredRooms(newTeams);
      return newTeams;
    });

    if (updatedObj) {
      await syncHub.saveTeamToDatabase(updatedObj);
    }

    if (activeTeamName.toLowerCase() === teamName.toLowerCase()) {
      setUnlockedLevel(0);
      setCurrentLevelId(0);
    }
  };

  const clearTeamPlayers = async (teamName) => {
    let updatedObj = null;
    setTeams(prevTeams => {
      const safe = Array.isArray(prevTeams) ? prevTeams : [];
      const newTeams = safe.map(t => {
        if (t && t.name && t.name.toLowerCase() === teamName.toLowerCase()) {
          updatedObj = { ...t, players: [] };
          return updatedObj;
        }
        return t;
      });
      syncHub.saveStoredRooms(newTeams);
      return newTeams;
    });

    if (updatedObj) {
      await syncHub.saveTeamToDatabase(updatedObj);
    }

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
