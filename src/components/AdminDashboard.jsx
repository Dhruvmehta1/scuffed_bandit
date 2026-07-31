import React, { useState } from 'react';
import { ShieldAlert, Trophy, Radio, Play, Pause, RotateCcw, Download, X, Lock, CheckCircle2, Award, Users, Trash2 } from 'lucide-react';
import { soundFx } from '../utils/audio';

export function AdminDashboard({
  isOpen,
  onClose,
  teams,
  broadcastAnnouncement,
  timer,
  setTimerState,
  resetTeamProgress,
  clearTeamPlayers
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
    const headers = ['Rank', 'Team Name', 'Connected Teammates', 'Current Level', 'Solved Progress', 'Status'];
    const rows = sortedTeams.map((t, idx) => [
      idx + 1,
      `"${t.name}"`,
      `"${t.players.map(p => p.handle).join(', ')}"`,
      t.unlockedLevel || 0,
      `${t.unlockedLevel || 0}/10`,
      (t.unlockedLevel || 0) >= 10 ? 'WINNER' : 'PLAYING'
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bandit_ctf_teams_leaderboard_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundFx.playKeyClick();
  };

  // Sort teams by highest unlocked level first
  const sortedTeams = [...teams].sort((a, b) => (b.unlockedLevel || 0) - (a.unlockedLevel || 0));

  return (
    <div className="modal-overlay">
      <div className="modal-content admin-modal">
        <div className="modal-header admin-header">
          <div className="modal-title">
            <ShieldAlert className="modal-icon text-red" />
            <h2>ADMIN DASHBOARD • EXCLUSIVE TEAM LEADERBOARD</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X />
          </button>
        </div>

        {!isAuthenticated ? (
          /* Admin Password Screen */
          <div className="admin-auth-box">
            <Lock className="auth-lock-icon" />
            <h3>RESTRICTED ADMIN DASHBOARD</h3>
            <p>Master CTF Team Leaderboard & CTF controls are restricted to Event Admins.</p>
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
                  placeholder="Broadcast alert message to all teams..."
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
                <CheckCircle2 className="toast-icon" /> Broadcast alert sent live across all CTF teams!
              </div>
            )}

            {/* EXCLUSIVE MULTI-TEAM LEADERBOARD */}
            <div className="leaderboard-section">
              <div className="section-title">
                <Trophy className="title-icon text-gold" />
                <h3>EXCLUSIVE LIVE TEAM LEADERBOARD MATRIX</h3>
                <span className="player-count">Active Teams: {sortedTeams.length}</span>
              </div>

              <div className="table-wrapper">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>RANK</th>
                      <th>TEAM NAME</th>
                      <th>CONNECTED TEAMMATES (MAX 2)</th>
                      <th>CURRENT LEVEL</th>
                      <th>PROGRESS</th>
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeams.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center">No active teams created yet.</td>
                      </tr>
                    ) : (
                      sortedTeams.map((team, idx) => {
                        const rank = idx + 1;
                        const isWinner = (team.unlockedLevel || 0) >= 10;

                        return (
                          <tr key={team.name} className={isWinner ? 'row-winner' : ''}>
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

                            <td className="room-code-cell">
                              <strong className="room-code-badge">{team.name}</strong>
                            </td>

                            <td className="teammates-cell">
                              {team.players.length === 0 ? (
                                <span className="text-muted italic">Empty (0/2)</span>
                              ) : (
                                <div className="teammates-pills">
                                  {team.players.map((p, pIdx) => (
                                    <span key={pIdx} className="teammate-pill">
                                      <span className="avatar-mini">{p.avatar || '👤'}</span> {p.handle}
                                    </span>
                                  ))}
                                  <span className="count-tag">{team.players.length}/2</span>
                                </div>
                              )}
                            </td>

                            <td>
                              <span className="level-badge">Level {team.unlockedLevel || 0}</span>
                            </td>

                            <td>
                              <div className="mini-progress">
                                <span>{team.unlockedLevel || 0} / 10</span>
                                <div className="mini-bar-bg">
                                  <div
                                    className="mini-bar-fill"
                                    style={{ width: `${Math.min(((team.unlockedLevel || 0) / 10) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>

                            <td>
                              {isWinner ? (
                                <span className="status-tag status-win">🏆 WINNERS</span>
                              ) : (
                                <span className="status-tag status-active">ACTIVE</span>
                              )}
                            </td>

                            <td>
                              <div className="action-row">
                                <button
                                  className="btn action-btn btn-reset"
                                  onClick={() => resetTeamProgress(team.name)}
                                  title="Reset Team Progress to Level 0"
                                >
                                  <RotateCcw className="btn-icon-xs" /> Reset
                                </button>
                                <button
                                  className="btn action-btn btn-kick"
                                  onClick={() => clearTeamPlayers(team.name)}
                                  title="Clear Teammates from Team"
                                >
                                  <Trash2 className="btn-icon-xs" /> Clear
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
