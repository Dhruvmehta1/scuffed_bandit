// Pipeline and Redirection Shell Parsing Engine
import { executeCommand } from './commands';

export class ShellEngine {
  constructor(vfs) {
    this.vfs = vfs;
    this.history = [];
  }

  // Tokenize command string, preserving quotes
  parseCommandLine(commandStr) {
    const tokens = [];
    let currentToken = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < commandStr.length; i++) {
      const char = commandStr[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        if (currentToken.length > 0) {
          tokens.push(currentToken);
          currentToken = '';
        }
      } else {
        currentToken += char;
      }
    }
    if (currentToken.length > 0) {
      tokens.push(currentToken);
    }
    return tokens;
  }

  // Parse pipeline commands: cmd1 arg1 | cmd2 arg2
  run(commandLine, state = {}) {
    const raw = commandLine.trim();
    if (!raw) return { stdout: '', stderr: '', exitCode: 0 };

    this.history.push(raw);

    // Split pipeline by '|'
    const pipeSegments = raw.split('|').map(s => s.trim());
    let currentInput = null;
    let lastResult = { stdout: '', stderr: '', exitCode: 0 };

    for (let i = 0; i < pipeSegments.length; i++) {
      const segment = pipeSegments[i];
      const tokens = this.parseCommandLine(segment);
      if (tokens.length === 0) continue;

      const cmdName = tokens[0];
      const args = tokens.slice(1);

      lastResult = executeCommand(cmdName, args, currentInput, this.vfs, state);
      if (lastResult.exitCode !== 0) {
        return lastResult; // Abort pipeline on error
      }
      currentInput = lastResult.stdout;
    }

    return lastResult;
  }
}
