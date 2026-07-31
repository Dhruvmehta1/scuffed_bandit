import React, { useState } from 'react';
import { CheckCircle, Lock, KeyRound, Trophy, Activity, ArrowRight } from 'lucide-react';
import { soundFx } from '../utils/audio';

export function Sidebar({
  levels,
  currentLevelId,
  setCurrentLevelId,
  unlockedLevel,
  submitPassword,
  activityFeed
}) {
  const [inputPass, setInputPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    if (!inputPass.trim()) return;

    const res = submitPassword(inputPass.trim());
    if (res.success) {
      soundFx.playSuccessChime();
      setPassSuccess('✅ Correct Password! Level Unlocked!');
      setInputPass('');
      setTimeout(() => setPassSuccess(''), 4000);
    } else {
      soundFx.playErrorBeep();
      setPassError('❌ Invalid Password! Check file output.');
      setTimeout(() => setPassError(''), 4000);
    }
  };

  const progressPercent = Math.min(Math.round((unlockedLevel / 10) * 100), 100);

  return (
    <aside className="sidebar">
      {/* CTF Progress Header */}
      <div className="sidebar-box progress-box">
        <div className="progress-header">
          <Trophy className="box-icon" />
          <div>
            <h3>CTF PROGRESS</h3>
            <p>{unlockedLevel} / 10 Levels Solved</p>
          </div>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      {/* Password Submitter */}
      <div className="sidebar-box submit-box">
        <h4><KeyRound className="box-icon-sm" /> SUBMIT PASSWORD</h4>
        <form onSubmit={handlePasswordSubmit} className="pass-form">
          <input
            type="text"
            className="input-field pass-input"
            placeholder="Paste next level password..."
            value={inputPass}
            onChange={(e) => setInputPass(e.target.value)}
          />
          <button type="submit" className="btn primary-btn submit-btn">
            Submit <ArrowRight className="btn-icon-sm" />
          </button>
        </form>
        {passSuccess && <div className="pass-feedback success">{passSuccess}</div>}
        {passError && <div className="pass-feedback error">{passError}</div>}
      </div>

      {/* 10 Level Selector List */}
      <div className="sidebar-box level-list-box">
        <h4>LEVEL SELECTOR (10 LEVELS)</h4>
        <ul className="level-list">
          {levels.map((lvl) => {
            const isUnlocked = lvl.id <= unlockedLevel;
            const isCurrent = lvl.id === currentLevelId;
            const isCompleted = lvl.id < unlockedLevel;

            return (
              <li
                key={lvl.id}
                className={`level-item ${isCurrent ? 'active' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`}
                onClick={() => isUnlocked && setCurrentLevelId(lvl.id)}
              >
                <div className="level-item-status">
                  {isCompleted ? (
                    <CheckCircle className="status-icon done" />
                  ) : isUnlocked ? (
                    <span className="status-badge active-badge">{lvl.id}</span>
                  ) : (
                    <Lock className="status-icon lock" />
                  )}
                </div>

                <div className="level-item-info">
                  <span className="level-user">{lvl.user}</span>
                  <span className="level-title-sm">{lvl.name}</span>
                </div>

                {isCurrent && <span className="current-indicator">▶</span>}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Live Activity Feed */}
      <div className="sidebar-box activity-box">
        <h4><Activity className="box-icon-sm" /> LIVE CTF ACTIVITY FEED</h4>
        <div className="activity-feed">
          {activityFeed.length === 0 ? (
            <p className="empty-feed">Waiting for live CTF events...</p>
          ) : (
            activityFeed.slice(-6).reverse().map((act, idx) => (
              <div key={idx} className="activity-item">
                <span className="activity-time">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span className="activity-text">{act.payload?.message || act.type}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
