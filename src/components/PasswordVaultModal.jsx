import React, { useState } from 'react';
import { Key, Copy, Check, X, ShieldCheck } from 'lucide-react';
import { soundFx } from '../utils/audio';

export function PasswordVaultModal({ isOpen, onClose, levels, unlockedLevel }) {
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
            <h2>PASSWORD VAULT • DISCOVERED KEYS</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="vault-body">
          <p className="vault-intro">
            Vault stores passwords for levels you have already completed. Complete levels in the terminal to unlock their keys!
          </p>

          <div className="vault-list">
            {levels.map((lvl, idx) => {
              if (idx >= 10) return null; // Skip Level 10 Victory entry
              
              // Key for level 'idx' is only revealed after the player has solved level 'idx' (unlockedLevel > idx)
              const isSolved = unlockedLevel > idx;

              return (
                <div key={lvl.id} className={`vault-card ${isSolved ? 'unlocked' : 'locked'}`}>
                  <div className="vault-card-header">
                    <span className="vault-level-name">{lvl.name} (Key for {lvl.nextUser})</span>
                    {isSolved ? (
                      <span className="vault-status unlocked-tag"><ShieldCheck className="icon-xs" /> SOLVED</span>
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
                      <span className="locked-msg">Solve {lvl.name} in the terminal to reveal this key.</span>
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
