import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, CheckCircle, RefreshCw, X } from 'lucide-react';
import { soundFx } from '../utils/audio';

export function VictoryModal({ player, timerSeconds, onClose, onRestart }) {
  useEffect(() => {
    soundFx.playSuccessChime();
    // Launch celebratory confetti burst
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content victory-modal">
        <div className="victory-header">
          <Trophy className="victory-trophy-icon" />
          <h2>🏆 CTF VICTORY CHAMPION! 🏆</h2>
          <p className="victory-sub">You have successfully cleared all 10 Bandit Levels!</p>
        </div>

        <div className="victory-body">
          <div className="stats-card">
            <div className="stat-item">
              <Award className="stat-icon text-gold" />
              <div>
                <span className="stat-title">CHAMPION HANDLE</span>
                <strong className="stat-val">{player?.handle || 'Cyber Bandit'}</strong>
              </div>
            </div>

            <div className="stat-item">
              <CheckCircle className="stat-icon text-green" />
              <div>
                <span className="stat-title">LEVELS COMPLETED</span>
                <strong className="stat-val">10 / 10 LEVELS</strong>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon-text">⏱️</span>
              <div>
                <span className="stat-title">COMPLETION TIME</span>
                <strong className="stat-val">{formatTime(timerSeconds)}</strong>
              </div>
            </div>
          </div>

          <p className="victory-msg">
            Outstanding performance! Your score has been reported to the <strong>Admin Leaderboard</strong>.
          </p>

          <div className="victory-actions">
            <button className="btn primary-btn victory-btn" onClick={onClose}>
              Explore Terminal
            </button>
            <button className="btn nav-btn victory-btn" onClick={onRestart}>
              <RefreshCw className="btn-icon-sm" /> Restart Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
