import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TermIcon, Trash2, HelpCircle, CornerDownLeft } from 'lucide-react';
import { soundFx } from '../utils/audio';

export function Terminal({
  shellEngine,
  vfs,
  currentLevel,
  crtEnabled,
  cmdInputValue,
  setCmdInputValue
}) {
  const [history, setHistory] = useState([
    { type: 'sys', text: `Linux bandit.labs 5.15.0-generic x86_64\nWelcome to OverTheWire Bandit CTF (Fresher Edition)!\nType 'help' for a list of Linux commands.` }
  ]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cmdHistory, setCmdHistory] = useState([]);

  const inputRef = useRef(null);
  const terminalEndRef = useRef(null);

  // Auto scroll to bottom on new output
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Focus terminal input on click unless user is selecting text
  const handleTerminalClick = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return; // Preserve user's text selection
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    soundFx.playKeyClick();

    if (e.key === 'Enter') {
      e.preventDefault();
      const command = cmdInputValue.trim();
      if (!command) return;

      setCmdHistory(prev => [...prev, command]);
      setHistoryIndex(-1);

      // Add user command line to history
      const promptLine = `${currentLevel.user}@bandit:${vfs.currentPath}$ ${command}`;
      setHistory(prev => [...prev, { type: 'cmd', text: promptLine }]);

      // Execute command in shell engine
      const res = shellEngine.run(command, { levelUser: currentLevel.user });

      if (res.action === 'CLEAR') {
        setHistory([]);
      } else {
        if (res.stdout) setHistory(prev => [...prev, { type: 'out', text: res.stdout }]);
        if (res.stderr) setHistory(prev => [...prev, { type: 'err', text: res.stderr }]);
      }

      setCmdInputValue('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < cmdHistory.length) {
          setHistoryIndex(nextIdx);
          setCmdInputValue(cmdHistory[cmdHistory.length - 1 - nextIdx]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCmdInputValue(cmdHistory[cmdHistory.length - 1 - nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCmdInputValue('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple tab completion for files
      const parts = cmdInputValue.split(' ');
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        const filesRes = vfs.listFiles('.', true);
        if (filesRes.success) {
          const match = filesRes.files.find(f => f.name.startsWith(lastPart));
          if (match) {
            parts[parts.length - 1] = match.name;
            setCmdInputValue(parts.join(' '));
          }
        }
      }
    }
  };

  const handleClear = () => {
    setHistory([]);
    soundFx.playKeyClick();
  };

  const handleHelp = () => {
    setCmdInputValue('help');
    inputRef.current?.focus();
  };

  return (
    <div className={`terminal-container ${crtEnabled ? 'crt-overlay' : ''}`} onClick={handleTerminalClick}>
      {/* Terminal Title Bar */}
      <div className="terminal-header">
        <div className="terminal-dots">
          <span className="dot dot-red"></span>
          <span className="dot dot-yellow"></span>
          <span className="dot dot-green"></span>
        </div>
        <div className="terminal-title">
          <TermIcon className="term-icon-sm" />
          <span>{currentLevel.user}@bandit.labs: {vfs.currentPath}</span>
        </div>
        <div className="terminal-actions">
          <button className="btn term-btn" onClick={handleHelp} title="Show Help">
            <HelpCircle className="btn-icon-sm" /> Help
          </button>
          <button className="btn term-btn" onClick={handleClear} title="Clear Screen">
            <Trash2 className="btn-icon-sm" /> Clear
          </button>
        </div>
      </div>

      {/* Terminal Output Screen */}
      <div className="terminal-body">
        {history.map((item, idx) => (
          <pre key={idx} className={`term-line term-${item.type}`}>
            {item.text}
          </pre>
        ))}

        {/* Command Input Prompt */}
        <div className="prompt-line">
          <span className="prompt-user">{currentLevel.user}@bandit</span>
          <span className="prompt-sep">:</span>
          <span className="prompt-path">{vfs.currentPath}</span>
          <span className="prompt-symbol">$</span>
          <input
            ref={inputRef}
            type="text"
            className="term-input"
            value={cmdInputValue}
            onChange={(e) => setCmdInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            spellCheck="false"
            autoComplete="off"
          />
          <CornerDownLeft className="enter-icon" />
        </div>
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
