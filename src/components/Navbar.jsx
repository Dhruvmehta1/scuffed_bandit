import React from 'react';
import { Shield, Volume2, VolumeX, BookOpen, Key, Monitor, Users, Lock, LogOut } from 'lucide-react';
import { soundFx } from '../utils/audio';

export function Navbar({
  player,
  roomCode,
  timerSeconds,
  soundEnabled,
  setSoundEnabled,
  theme,
  setTheme,
  crtEnabled,
  setCrtEnabled,
  openCheatSheet,
  openVault,
  openAdminModal,
  onSwitchPlayer
}) {
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSoundToggle = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    soundFx.enabled = nextState;
    if (nextState) soundFx.playKeyClick();
  };

  return (
    <header className="navbar">
      <div className="nav-brand">
        <Shield className="nav-icon brand-logo" />
        <div>
          <h1 className="nav-title">OVERTHEWIRE <span className="highlight">CYBERBANDIT</span></h1>
          <p className="nav-subtitle">Fresher Linux CTF Edition • 10 Levels</p>
        </div>
      </div>

      <div className="nav-center-stats">
        <div className="stat-pill room-pill">
          <Users className="pill-icon" />
          <span>ROOM: <strong className="room-code">{roomCode}</strong></span>
        </div>
        <div className="stat-pill timer-pill">
          <span className="timer-dot"></span>
          <span>ELAPSED: <strong>{formatTime(timerSeconds)}</strong></span>
        </div>
      </div>

      <div className="nav-actions">
        {/* Player Badge with Switch Option */}
        {player && (
          <div className="player-badge" title="Click to switch profile handle" onClick={onSwitchPlayer} style={{ cursor: 'pointer' }}>
            <span className="player-avatar">{player.avatar || '⚡'}</span>
            <span className="player-handle">{player.handle}</span>
            <LogOut className="btn-icon-xs text-muted" />
          </div>
        )}

        {/* Cheat Sheet */}
        <button className="btn nav-btn" onClick={openCheatSheet} title="Linux Cheat Sheet">
          <BookOpen className="btn-icon" />
          <span className="btn-label">Cheat Sheet</span>
        </button>

        {/* Passwords Vault */}
        <button className="btn nav-btn" onClick={openVault} title="Password Vault">
          <Key className="btn-icon" />
          <span className="btn-label">Vault</span>
        </button>

        {/* Audio Toggle */}
        <button className="btn icon-btn" onClick={handleSoundToggle} title="Toggle Sound FX">
          {soundEnabled ? <Volume2 className="icon-active" /> : <VolumeX />}
        </button>

        {/* CRT Overlay Toggle */}
        <button className="btn icon-btn" onClick={() => setCrtEnabled(!crtEnabled)} title="Toggle CRT Screen Scanlines">
          <Monitor className={crtEnabled ? "icon-active" : ""} />
        </button>

        {/* Theme Selector */}
        <select
          className="theme-select"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          title="Change Theme"
        >
          <option value="matrix">Matrix Green</option>
          <option value="cyberpunk">Cyber Neon</option>
          <option value="amber">Hacker Amber</option>
          <option value="dark">Dark Slate</option>
        </select>

        {/* Password-Protected Admin Panel Launcher */}
        <button className="btn admin-launch-btn" onClick={openAdminModal} title="Admin Dashboard (Exclusive Leaderboard)">
          <Lock className="btn-icon" />
          <span>ADMIN</span>
        </button>
      </div>
    </header>
  );
}
