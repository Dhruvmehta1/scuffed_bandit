import React, { useState } from 'react';
import { Key, Copy, Check, X, ShieldCheck, Users } from 'lucide-react';
import { soundFx } from '../utils/audio';

export function PasswordVaultModal({ isOpen, onClose, levels, unlockedLevel, teamName }) {
  const [copiedIdx, setCopiedIdx] = useState(null);

  if (!isOpen) return null;

  const handleCopyPass = (password, idx) => {
    navigator.clipboard.writeText(password);
    setCopiedIdx(idx);
    soundFx.playKeyClick();
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content vault-modal">
        <div className="modal-header">
          <div className="modal-title">
            <Key className="modal-icon text-yellow" />
            <h2>SHARED VAULT • TEAM: {teamName || 'YOUR TEAM'}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="vault-body">
          <div className="vault-intro-card">
            <Users className="icon-sm text-cyan" />
            <p>
              This Vault is shared live between both teammates in <strong>{teamName || 'your team'}</strong>. When either teammate solves a level, the password unlocks here instantly!
            </p>
          </div>

          <div className="vault-list">
            {levels.map((lvl, idx) => {
              if (idx >= 10) return null; // Skip Level 10 Victory entry
              
              // Unlocked if team level progress is greater than idx
              const isSolved = unlockedLevel > idx;

              return (
                <div key={lvl.id} className={`vault-card ${isSolved ? 'unlocked' : 'locked'}`}>
                  <div className="vault-card-header">
                    <span className="vault-level-name">{lvl.name} (Key for {lvl.nextUser})</span>
                    {isSolved ? (
                      <span className="vault-status unlocked-tag"><ShieldCheck className="icon-xs" /> UNLOCKED FOR TEAM</span>
                    ) : (
                      <span className="vault-status locked-tag">🔒 LOCKED</span>
                    )}
                  </div>

                  <div className="vault-card-body">
                    {isSolved ? (
                      <div className="pass-key-row">
                        <code className="pass-code">{lvl.password}</code>
                        <button
                          className="btn copy-btn"
                          onClick={() => handleCopyPass(lvl.password, idx)}
                          title="Copy Password"
                        >
                          {copiedIdx === idx ? <Check className="btn-icon-xs text-green" /> : <Copy className="btn-icon-xs" />}
                        </button>
                      </div>
                    ) : (
                      <span className="locked-msg">Either teammate can solve {lvl.name} to reveal this key.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
