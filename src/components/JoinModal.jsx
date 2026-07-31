import React, { useState } from 'react';
import { Shield, Terminal, User, Sparkles } from 'lucide-react';
import { soundFx } from '../utils/audio';

const AVATARS = ['⚡', '👾', '🚀', '🥷', '🛡️', '💻', '🔮', '🔥'];

export function JoinModal({ onJoin }) {
  const [handle, setHandle] = useState('');
  const [avatar, setAvatar] = useState('⚡');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!handle.trim()) {
      setError('Please enter a player handle!');
      soundFx.playErrorBeep();
      return;
    }
    soundFx.playSuccessChime();
    onJoin(handle.trim(), avatar);
  };

  return (
    <div className="modal-overlay join-overlay">
      <div className="modal-content join-modal">
        <div className="join-header">
          <Shield className="join-logo" />
          <h2>WELCOME TO CYBERBANDIT CTF</h2>
          <p className="join-subtitle">10-Level Linux Terminal Wargame • Fresher Edition</p>
        </div>

        <form onSubmit={handleSubmit} className="join-form">
          {/* Handle Input */}
          <div className="form-group">
            <label className="form-label"><User className="label-icon" /> Choose Your Hacker Handle:</label>
            <input
              type="text"
              className="input-field join-input"
              placeholder="e.g. Hacker_Fresher_01"
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value);
                setError('');
              }}
              maxLength={20}
              autoFocus
            />
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

          {error && <div className="join-error">{error}</div>}

          <button type="submit" className="btn primary-btn join-submit-btn">
            <Terminal className="btn-icon" /> ENTER CTF TERMINAL
          </button>
        </form>

        <div className="join-footer-tip">
          ℹ️ Leaderboard rankings are tracked live in the password-protected Admin Dashboard!
        </div>
      </div>
    </div>
  );
}
