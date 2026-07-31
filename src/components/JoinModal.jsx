import React, { useState } from 'react';
import { Shield, Terminal, User, Users, Sparkles, AlertCircle } from 'lucide-react';
import { soundFx } from '../utils/audio';

const AVATARS = ['⚡', '👾', '🚀', '🥷', '🛡️', '💻', '🔮', '🔥'];

export function JoinModal({ teams, onJoin }) {
  const [teamName, setTeamName] = useState('');
  const [handle, setHandle] = useState('');
  const [avatar, setAvatar] = useState('⚡');
  const [error, setError] = useState('');

  const formattedTeamName = teamName.trim();

  // Find existing team data
  const existingTeam = teams.find(t => t.name.toLowerCase() === formattedTeamName.toLowerCase());
  const currentCount = existingTeam ? existingTeam.players.length : 0;
  const maxAllowed = 2;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formattedTeamName) {
      setError('Please enter a Team Name!');
      soundFx.playErrorBeep();
      return;
    }

    if (!handle.trim()) {
      setError('Please enter your Username!');
      soundFx.playErrorBeep();
      return;
    }

    // Check if player is rejoining existing session in team
    const isRejoin = existingTeam && existingTeam.players.some(p => p.handle.toLowerCase() === handle.trim().toLowerCase());

    // Team capacity check (max 2 players per team) if not rejoining
    if (!isRejoin && existingTeam && existingTeam.players.length >= maxAllowed) {
      setError(`Team "${formattedTeamName}" is already full (${currentCount}/${maxAllowed} teammates). Enter your exact username to rejoin or choose a different Team Name.`);
      soundFx.playErrorBeep();
      return;
    }

    soundFx.playSuccessChime();
    onJoin(formattedTeamName, handle.trim(), avatar, isRejoin);
  };

  return (
    <div className="modal-overlay join-overlay">
      <div className="modal-content join-modal">
        <div className="join-header">
          <Shield className="join-logo" />
          <h2>CYBERBANDIT 2-PLAYER TEAM CTF</h2>
          <p className="join-subtitle">Enter Team Name & Username to Connect</p>
        </div>

        <form onSubmit={handleSubmit} className="join-form">
          {/* Team Name Input */}
          <div className="form-group">
            <label className="form-label"><Users className="label-icon" /> Team Name (Max 2 Players/Team):</label>
            <input
              type="text"
              className="input-field join-input"
              placeholder="e.g. CyberDragons or TeamAlpha"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                setError('');
              }}
              maxLength={25}
              autoFocus
            />
            <span className="input-hint">💡 Teammate tip: Your partner must enter the EXACT SAME Team Name to join your team!</span>
          </div>

          {/* Player Username Input */}
          <div className="form-group">
            <label className="form-label"><User className="label-icon" /> Your Username:</label>
            <input
              type="text"
              className="input-field join-input"
              placeholder="e.g. Alice or Bob"
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value);
                setError('');
              }}
              maxLength={20}
            />
            <span className="input-hint">ℹ️ Refreshing logs you out. To rejoin, enter the SAME Team Name and Username.</span>
          </div>

          {/* Avatar Selector */}
          <div className="form-group">
            <label className="form-label"><Sparkles className="label-icon" /> Select Avatar:</label>
            <div className="avatar-grid">
              {AVATARS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`avatar-btn ${avatar === item ? 'selected' : ''}`}
                  onClick={() => {
                    setAvatar(item);
                    soundFx.playKeyClick();
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="join-error">
              <AlertCircle className="icon-xs" /> {error}
            </div>
          )}

          <button type="submit" className="btn primary-btn join-submit-btn">
            <Terminal className="btn-icon" /> ENTER TEAM CTF
          </button>
        </form>

        <div className="join-footer-tip">
          🤝 When your teammate solves a level, the password unlocks in your Vault instantly!
        </div>
      </div>
    </div>
  );
}
