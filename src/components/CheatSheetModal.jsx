import React from 'react';
import { BookOpen, Copy, X } from 'lucide-react';
import { soundFx } from '../utils/audio';

const CHEAT_SHEET_ITEMS = [
  {
    category: "📁 File System & Navigation",
    commands: [
      { cmd: "pwd", desc: "Print current working directory path" },
      { cmd: "ls -la", desc: "List all files including hidden dotfiles with details" },
      { cmd: "cd folder", desc: "Change directory to 'folder'" },
      { cmd: "cd ..", desc: "Move up one parent directory" }
    ]
  },
  {
    category: "📄 Reading & Searching Files",
    commands: [
      { cmd: "cat readme.txt", desc: "Print text file contents to screen" },
      { cmd: "cat ./-", desc: "Read a file named '-' using relative pathing" },
      { cmd: "cat \"file with spaces\"", desc: "Read file names containing spaces using quotes" },
      { cmd: "grep 'keyword' data.txt", desc: "Search and filter lines containing 'keyword'" }
    ]
  },
  {
    category: "🔍 Finding & Type Inspection",
    commands: [
      { cmd: "file ./inhere/*", desc: "Determine file type (ASCII text, binary, PNG)" },
      { cmd: "find inhere -type f -size 1033c", desc: "Find files under 1033 bytes in size" },
      { cmd: "sort data.txt | uniq -u", desc: "Sort text and print ONLY non-duplicate lines" }
    ]
  },
  {
    category: "🔐 Encodings, Strings & Network",
    commands: [
      { cmd: "base64 -d encoded.txt", desc: "Decode Base64 encoded string" },
      { cmd: "tr 'A-Za-z' 'N-ZA-Mn-za-m'", desc: "Decipher ROT13 text substitution" },
      { cmd: "strings data.dat | grep '='", desc: "Extract printable text from binary executable" },
      { cmd: "nc localhost 1337", desc: "Connect to local netcat port listener" }
    ]
  }
];

export function CheatSheetModal({ isOpen, onClose, copyToTerminal }) {
  if (!isOpen) return null;

  const handleCopy = (cmd) => {
    copyToTerminal(cmd);
    soundFx.playKeyClick();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content cheatsheet-modal">
        <div className="modal-header">
          <div className="modal-title">
            <BookOpen className="modal-icon text-cyan" />
            <h2>LINUX CLI CHEAT SHEET (FRESHER EDITION)</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="cheatsheet-body">
          {CHEAT_SHEET_ITEMS.map((section, idx) => (
            <div key={idx} className="sheet-section">
              <h3 className="section-header">{section.category}</h3>
              <div className="sheet-grid">
                {section.commands.map((item, i) => (
                  <div key={i} className="sheet-card">
                    <div className="sheet-cmd-row">
                      <code>{item.cmd}</code>
                      <button
                        className="copy-btn"
                        onClick={() => handleCopy(item.cmd)}
                        title="Copy command to terminal"
                      >
                        <Copy className="btn-icon-xs" />
                      </button>
                    </div>
                    <p className="sheet-desc">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
