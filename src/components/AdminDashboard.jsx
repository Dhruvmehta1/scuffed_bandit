import React, { useState } from 'react';
import { ShieldAlert, Trophy, Radio, Play, Pause, RotateCcw, Download, X, Lock, CheckCircle2, Award, UserX } from 'lucide-react';
import { soundFx } from '../utils/audio';

export function AdminDashboard({
  isOpen,
  onClose,
  players,
  broadcastAnnouncement,
  timer,
  setTimerState,
  resetPlayerProgress,
  kickPlayer
}) {
  const [adminPass, setAdminPass] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passError, setPassError] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e) => {
    e.preventDefault();
    if (adminPass.trim() === 'admin123' || adminPass.trim() === 'bandit2026') {
      setIsAuthenticated(true);
      setPassError('');
      soundFx.playSuccessChime();
    } else {
      setPassError('Invalid Admin Passkey! Try: admin123');
      soundFx.playErrorBeep();
    }
  };

  const handleSendBroadcast = (e) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    broadcastAnnouncement(broadcastText.trim());
    setBroadcastSent(true);
    setBroadcastText('');
    soundFx.playSuccessChime();
    setTimeout(() => setBroadcastSent(false), 3000);
  };

  const handleExportCSV = () => {
    const headers = ['Rank', 'Handle', 'Current Level', 'Solved Count', 'Status'];
    const rows = players.map((p, idx) => [
      idx + 1,
      `"${p.handle}"`,
      p.level || 0,
      `${p.level || 0}/10`,
      p.level >= 10 ? 'WINNER' : 'PLAYING'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bandit_ctf_leaderboard_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundFx.playKeyClick();
  };

  // Sort players by highest level solved first
  const sortedPlayers = [...players].sort((a, b) => (b.level || 0) - (a.level || 0));

  return (
    <div className="modal-overlay">
      <div className="modal-content admin-modal">
        <div className="modal-header admin-header">
          <div className="modal-title">
            <ShieldAlert className="modal-icon text-red" />
            <h2>ADMIN DASHBOARD • EXCLUSIVE LEADERBOARD</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X />
          </button>
        </div>

        {!isAuthenticated ? (
          /* Admin Password Screen */
          <div className="admin-auth-box">
            <Lock className="auth-lock-icon" />
            <h3>RESTRICTED ACCESS AREA</h3>
            <p>Leaderboard & CTF Master controls are restricted to Event Admins.</p>
            <form onSubmit={handleLogin} className="auth-form">
              <input
                type="password"
                className="input-field"
                placeholder="Enter Admin Passkey (default: admin123)"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn primary-btn auth-btn">
                Authenticate Admin
              </button>
            </form>
            {passError && <p className="auth-error">{passError}</p>}
          </div>
        ) : (
          /* Authenticated Admin View */
          <div className="admin-body">

            {/* Quick Action Control Bar */}
            <div className="admin-control-bar">
              {/* Timer Controls */}
              <div className="control-group">
                <span className="control-label">CTF TIMER:</span>
                <button
                  className={`btn ctrl-btn ${timer.running ? 'btn-warning' : 'btn-success'}`}
                  onClick={() => setTimerState(!timer.running)}
                >
                  {timer.running ? <Pause className="btn-icon-sm" /> : <Play className="btn-icon-sm" />}
                  {timer.running ? 'Pause Timer' : 'Resume Timer'}
                </button>
              </div>

              {/* Broadcast Announcement */}
              <form onSubmit={handleSendBroadcast} className="broadcast-form">
                <Radio className="form-icon text-neon" />
                <input
                  type="text"
                  className="input-field broadcast-input"
                  placeholder="Broadcast message to all active players..."
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                />
                <button type="submit" className="btn primary-btn broadcast-btn">
                  Send Alert
                </button>
              </form>

              {/* Export CSV */}
              <button className="btn nav-btn export-btn" onClick={handleExportCSV}>
                <Download className="btn-icon-sm" /> Export CSV
              </button>
            </div>

            {broadcastSent && (
              <div className="broadcast-toast">
                <CheckCircle2 className="toast-icon" /> Broadcast alert sent live to all player screens!
              </div>
            )}

            {/* EXCLUSIVE LEADERBOARD MATRIX */}
            <div className="leaderboard-section">
              <div className="section-title">
                <Trophy className="title-icon text-gold" />
                <h3>EXCLUSIVE LIVE CTF LEADERBOARD MATRIX</h3>
                <span className="player-count">Connected Players: {sortedPlayers.length}</span>
              </div>

              <div className="table-wrapper">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>RANK</th>
                      <th>PLAYER HANDLE</th>
                      <th>CURRENT LEVEL</th>
                      <th>SOLVED COUNT</th>
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center">No active players registered yet.</td>
                      </tr>
                    ) : (
                      sortedPlayers.map((player, idx) => {
                        const rank = idx + 1;
                        const isWinner = (player.level || 0) >= 10;

                        return (
                          <tr key={player.id || idx} className={isWinner ? 'row-winner' : ''}>
                            <td className="rank-cell">
                              {rank === 1 ? (
                                <span className="badge rank-1"><Award className="badge-icon" /> 1st</span>
                              ) : rank === 2 ? (
                                <span className="badge rank-2">2nd</span>
                              ) : rank === 3 ? (
                                <span className="badge rank-3">3rd</span>
                              ) : (
                                `#${rank}`
                              )}
                            </td>

                            <td className="player-cell">
                              <span className="player-avatar">{player.avatar || '👤'}</span>
                              <strong className="player-name">{player.handle}</strong>
                            </td>

                            <td>
                              <span className="level-badge">Level {player.level || 0}</span>
                            </td>

                            <td>
                              <div className="mini-progress">
                                <span>{player.level || 0} / 10</span>
                                <div className="mini-bar-bg">
                                  <div
                                    className="mini-bar-fill"
                                    style={{ width: `${Math.min(((player.level || 0) / 10) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>

                            <td>
                              {isWinner ? (
                                <span className="status-tag status-win">🏆 WINNER</span>
                              ) : (
                                <span className="status-tag status-active">ONLINE</span>
                              )}
                            </td>

                            <td>
                              <div className="action-row">
                                <button
                                  className="btn action-btn btn-reset"
                                  onClick={() => resetPlayerProgress(player.id)}
                                  title="Reset Level to 0"
                                >
                                  <RotateCcw className="btn-icon-xs" /> Reset
                                </button>
                                <button
                                  className="btn action-btn btn-kick"
                                  onClick={() => kickPlayer(player.id)}
                                  title="Remove Player"
                                >
                                  <UserX className="btn-icon-xs" /> Kick
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
