import React, { useState } from 'react';
import { HelpCircle, Terminal as TermIcon, Lightbulb, Copy, Check } from 'lucide-react';
import { soundFx } from '../utils/audio';

export function LevelDetail({ level, copyToTerminal }) {
  const [revealedHintCount, setRevealedHintCount] = useState(0);
  const [copiedTip, setCopiedTip] = useState(false);

  const handleRevealHint = () => {
    if (revealedHintCount < level.hints.length) {
      setRevealedHintCount(prev => prev + 1);
      soundFx.playKeyClick();
    }
  };

  const handleCopyTip = () => {
    if (level.commandTip) {
      copyToTerminal(level.commandTip);
      setCopiedTip(true);
      soundFx.playKeyClick();
      setTimeout(() => setCopiedTip(false), 2000);
    }
  };

  return (
    <div className="level-detail-card">
      <div className="level-detail-header">
        <div>
          <span className="user-badge">{level.user} → {level.nextUser}</span>
          <h2 className="level-heading">{level.name}</h2>
        </div>
        {level.commandTip && (
          <div className="recommended-cmd">
            <span className="tip-label">Try command:</span>
            <code className="cmd-pill">{level.commandTip}</code>
            <button className="copy-btn" onClick={handleCopyTip} title="Copy command to terminal">
              {copiedTip ? <Check className="btn-icon-sm success-icon" /> : <Copy className="btn-icon-sm" />}
            </button>
          </div>
        )}
      </div>

      {/* Goal Objective */}
      <div className="objective-box">
        <h4 className="box-title"><TermIcon className="box-icon-sm" /> LEVEL OBJECTIVE</h4>
        <p className="objective-text">{level.objective}</p>
      </div>

      {/* Fresher Concept Explanation */}
      <div className="concept-box">
        <h4 className="box-title"><HelpCircle className="box-icon-sm" /> FRESHER CONCEPT breakdown</h4>
        <p className="concept-text">{level.concept}</p>
      </div>

      {/* Progressive Multi-Tier Hints */}
      <div className="hints-box">
        <div className="hints-header">
          <h4 className="box-title"><Lightbulb className="box-icon-sm" /> GUIDED HINTS ({revealedHintCount}/{level.hints.length})</h4>
          {revealedHintCount < level.hints.length && (
            <button className="btn reveal-hint-btn" onClick={handleRevealHint}>
              Reveal Hint #{revealedHintCount + 1}
            </button>
          )}
        </div>

        <div className="hints-list">
          {level.hints.slice(0, revealedHintCount).map((hint, idx) => (
            <div key={idx} className="hint-card">
              <span className="hint-number">Hint #{idx + 1}</span>
              <p className="hint-text">{hint}</p>
            </div>
          ))}
          {revealedHintCount === 0 && (
            <p className="hints-prompt">Stuck? Click 'Reveal Hint' for guided step-by-step assistance.</p>
          )}
        </div>
      </div>
    </div>
  );
}
