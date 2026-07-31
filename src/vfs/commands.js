// Linux Command Implementations for Browser Virtual Shell

export const executeCommand = (cmdName, args, inputPipe, vfs, state) => {
  const cleanCmd = cmdName.toLowerCase().trim();

  switch (cleanCmd) {
    case 'pwd':
      return { stdout: vfs.currentPath + '\n', stderr: '', exitCode: 0 };

    case 'whoami':
      return { stdout: (state.levelUser || 'bandit') + '\n', stderr: '', exitCode: 0 };

    case 'id': {
      const user = state.levelUser || 'bandit';
      return { stdout: `uid=1000(${user}) gid=1000(${user}) groups=1000(${user})\n`, stderr: '', exitCode: 0 };
    }

    case 'clear':
      return { stdout: '', stderr: '', exitCode: 0, action: 'CLEAR' };

    case 'cd': {
      const target = args[0] || '~';
      const res = vfs.changeDirectory(target);
      if (!res.success) {
        return { stdout: '', stderr: res.error + '\n', exitCode: 1 };
      }
      return { stdout: '', stderr: '', exitCode: 0 };
    }

    case 'ls': {
      let showHidden = false;
      let longFormat = false;
      const targets = [];

      for (const arg of args) {
        if (arg.startsWith('-')) {
          if (arg.includes('a')) showHidden = true;
          if (arg.includes('l')) longFormat = true;
        } else {
          targets.push(arg);
        }
      }

      const targetPath = targets[0] || '.';
      const res = vfs.listFiles(targetPath, showHidden);
      if (!res.success) {
        return { stdout: '', stderr: res.error + '\n', exitCode: 1 };
      }

      if (longFormat) {
        const lines = res.files.map(f => {
          const typeChar = f.isDirectory ? 'd' : '-';
          const size = String(f.size).padStart(6, ' ');
          const name = f.isDirectory ? `${f.name}/` : f.name;
          return `${typeChar}${f.permissions} 1 ${f.owner} ${f.group} ${size} Jul 31 22:48 ${name}`;
        });
        return { stdout: `total ${res.files.length}\n` + lines.join('\n') + '\n', stderr: '', exitCode: 0 };
      } else {
        const names = res.files.map(f => f.isDirectory ? `${f.name}/` : f.name);
        return { stdout: names.join('  ') + (names.length ? '\n' : ''), stderr: '', exitCode: 0 };
      }
    }

    case 'cat': {
      if (args.length === 0 && inputPipe !== null) {
        return { stdout: inputPipe, stderr: '', exitCode: 0 };
      }
      if (args.length === 0) {
        return { stdout: '', stderr: 'cat: missing filename argument\n', exitCode: 1 };
      }

      let output = '';
      for (const arg of args) {
        const res = vfs.readFile(arg);
        if (!res.success) {
          return { stdout: output, stderr: res.error + '\n', exitCode: 1 };
        }
        output += res.content + (res.content.endsWith('\n') ? '' : '\n');
      }
      return { stdout: output, stderr: '', exitCode: 0 };
    }

    case 'grep': {
      let pattern = '';
      let fileArgs = [];
      let ignoreCase = false;
      let invertMatch = false;

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('-')) {
          if (arg.includes('i')) ignoreCase = true;
          if (arg.includes('v')) invertMatch = true;
        } else if (!pattern) {
          pattern = arg.replace(/^['"]|['"]$/g, '');
        } else {
          fileArgs.push(arg);
        }
      }

      let contentToSearch = inputPipe;
      if (fileArgs.length > 0) {
        const res = vfs.readFile(fileArgs[0]);
        if (!res.success) {
          return { stdout: '', stderr: res.error + '\n', exitCode: 1 };
        }
        contentToSearch = res.content;
      }

      if (contentToSearch === null) {
        return { stdout: '', stderr: 'grep: no input specified\n', exitCode: 1 };
      }

      const lines = contentToSearch.split('\n');
      const matched = lines.filter(line => {
        let l = ignoreCase ? line.toLowerCase() : line;
        let p = ignoreCase ? pattern.toLowerCase() : pattern;
        const contains = l.includes(p);
        return invertMatch ? !contains : contains;
      });

      return { stdout: matched.join('\n') + (matched.length ? '\n' : ''), stderr: '', exitCode: 0 };
    }

    case 'find': {
      let targetPath = '.';
      let typeFilter = null;
      let sizeFilter = null;
      let userFilter = null;
      let groupFilter = null;

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (!arg.startsWith('-') && i === 0) {
          targetPath = arg;
        } else if (arg === '-type' && args[i + 1]) {
          typeFilter = args[i + 1];
          i++;
        } else if (arg === '-size' && args[i + 1]) {
          sizeFilter = args[i + 1];
          i++;
        } else if (arg === '-user' && args[i + 1]) {
          userFilter = args[i + 1];
          i++;
        } else if (arg === '-group' && args[i + 1]) {
          groupFilter = args[i + 1];
          i++;
        }
      }

      const results = [];
      const traverse = (node, currentPath) => {
        if (!node) return;
        let matches = true;

        if (typeFilter === 'f' && node.isDirectory) matches = false;
        if (typeFilter === 'd' && !node.isDirectory) matches = false;

        if (sizeFilter) {
          let reqSize = parseInt(sizeFilter.replace(/c$/, ''), 10);
          if (!isNaN(reqSize) && node.size !== reqSize) matches = false;
        }

        if (userFilter && node.owner !== userFilter) matches = false;
        if (groupFilter && node.group !== groupFilter) matches = false;

        if (matches) results.push(currentPath);

        if (node.isDirectory && node.children) {
          for (const child of Object.values(node.children)) {
            traverse(child, `${currentPath === '/' ? '' : currentPath}/${child.name}`);
          }
        }
      };

      const startNode = vfs.resolvePath(targetPath);
      if (!startNode) {
        return { stdout: '', stderr: `find: '${targetPath}': No such file or directory\n`, exitCode: 1 };
      }

      const startNorm = vfs.getNormalizedPath(targetPath);
      traverse(startNode, startNorm);
      return { stdout: results.join('\n') + (results.length ? '\n' : ''), stderr: '', exitCode: 0 };
    }

    case 'file': {
      if (args.length === 0) {
        return { stdout: '', stderr: 'file: missing argument\n', exitCode: 1 };
      }
      const outputs = [];
      for (const target of args) {
        const node = vfs.resolvePath(target);
        if (!node) {
          outputs.push(`${target}: cannot open (No such file or directory)`);
        } else if (node.isDirectory) {
          outputs.push(`${target}: directory`);
        } else {
          outputs.push(`${target}: ${node.fileType || 'ASCII text'}`);
        }
      }
      return { stdout: outputs.join('\n') + '\n', stderr: '', exitCode: 0 };
    }

    case 'base64': {
      let decode = false;
      let targetFile = null;

      for (const arg of args) {
        if (arg === '-d' || arg === '--decode') decode = true;
        else if (!arg.startsWith('-')) targetFile = arg;
      }

      let text = inputPipe;
      if (targetFile) {
        const res = vfs.readFile(targetFile);
        if (!res.success) return { stdout: '', stderr: res.error + '\n', exitCode: 1 };
        text = res.content;
      }

      if (text === null) return { stdout: '', stderr: 'base64: missing input\n', exitCode: 1 };

      try {
        if (decode) {
          const decoded = atob(text.trim());
          return { stdout: decoded + '\n', stderr: '', exitCode: 0 };
        } else {
          const encoded = btoa(text);
          return { stdout: encoded + '\n', stderr: '', exitCode: 0 };
        }
      } catch (err) {
        return { stdout: '', stderr: 'base64: invalid input data\n', exitCode: 1 };
      }
    }

    case 'tr': {
      let text = inputPipe;
      if (!text) return { stdout: '', stderr: 'tr: expects piped input\n', exitCode: 1 };

      const set1 = args[0] || '';
      const set2 = args[1] || '';

      if (set1.includes('A-Za-z') && set2.includes('N-ZA-Mn-za-m')) {
        const rot13 = (str) =>
          str.replace(/[a-zA-Z]/g, (c) =>
            String.fromCharCode(
              c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13)
            )
          );
        return { stdout: rot13(text) + '\n', stderr: '', exitCode: 0 };
      }

      return { stdout: text + '\n', stderr: '', exitCode: 0 };
    }

    case 'strings': {
      let targetFile = args.find(a => !a.startsWith('-'));
      let text = inputPipe;

      if (targetFile) {
        const res = vfs.readFile(targetFile);
        if (!res.success) return { stdout: '', stderr: res.error + '\n', exitCode: 1 };
        text = res.content;
      }

      if (text === null) return { stdout: '', stderr: 'strings: missing input\n', exitCode: 1 };

      const matches = text.match(/[A-Za-z0-9_=+\-/.:!@#$%^&*()]{4,}/g) || [];
      return { stdout: matches.join('\n') + (matches.length ? '\n' : ''), stderr: '', exitCode: 0 };
    }

    case 'sort': {
      let text = inputPipe;
      const targetFile = args.find(a => !a.startsWith('-'));
      if (targetFile) {
        const res = vfs.readFile(targetFile);
        if (!res.success) return { stdout: '', stderr: res.error + '\n', exitCode: 1 };
        text = res.content;
      }
      if (text === null) return { stdout: '', stderr: 'sort: missing input\n', exitCode: 1 };

      const lines = text.trim().split('\n').sort();
      return { stdout: lines.join('\n') + '\n', stderr: '', exitCode: 0 };
    }

    case 'uniq': {
      let uniqueOnly = args.includes('-u');
      let text = inputPipe;
      const targetFile = args.find(a => !a.startsWith('-'));
      if (targetFile) {
        const res = vfs.readFile(targetFile);
        if (!res.success) return { stdout: '', stderr: res.error + '\n', exitCode: 1 };
        text = res.content;
      }
      if (text === null) return { stdout: '', stderr: 'uniq: missing input\n', exitCode: 1 };

      const lines = text.trim().split('\n');
      const counts = {};
      lines.forEach(l => counts[l] = (counts[l] || 0) + 1);

      let resultLines = [];
      if (uniqueOnly) {
        resultLines = lines.filter(l => counts[l] === 1);
      } else {
        resultLines = Array.from(new Set(lines));
      }

      return { stdout: resultLines.join('\n') + '\n', stderr: '', exitCode: 0 };
    }

    case 'nc':
    case 'netcat': {
      const host = args[0];
      const port = args[1];

      if ((host === 'localhost' || host === '127.0.0.1') && (port === '1337' || port === '30000')) {
        return {
          stdout: `[+] Connected to ${host}:${port}.\n[+] Banner: OverTheWire CTF Authentication Daemon v1.0\nPASS: cyber_fresher_netcat_master_9921\n`,
          stderr: '',
          exitCode: 0
        };
      }
      return { stdout: '', stderr: `nc: connect to ${host} port ${port} failed: Connection refused\n`, exitCode: 1 };
    }

    case 'echo': {
      return { stdout: args.join(' ') + '\n', stderr: '', exitCode: 0 };
    }

    case 'help': {
      const helpText = `
OverTheWire Bandit CTF Shell Help
==================================
Available commands:
  ls [-la]       : List directory contents
  cd <dir>       : Change working directory
  pwd            : Print working directory
  cat <file>     : Read file contents
  grep <pattern> : Search text patterns inside files
  find <opts>    : Search files by size, type, or permissions
  file <file>    : Determine file type
  base64 [-d]    : Encode/decode base64 data
  tr <s1> <s2>   : Translate characters (e.g. ROT13)
  strings <file> : Extract printable strings from binary
  sort <file>    : Sort text lines
  uniq [-u]      : Report or omit repeated lines
  nc <host> <port>: Connect to network socket
  whoami / id    : Display user info
  clear          : Clear terminal screen
  help           : Display this help message
`;
      return { stdout: helpText, stderr: '', exitCode: 0 };
    }

    default: {
      let suggestion = '';
      if (cleanCmd === 'dir') suggestion = ' (Did you mean "ls"?)';
      if (cleanCmd === 'type') suggestion = ' (Did you mean "cat"?)';
      if (cleanCmd === 'cls') suggestion = ' (Did you mean "clear"?)';

      return { stdout: '', stderr: `bash: ${cmdName}: command not found${suggestion}\n`, exitCode: 127 };
    }
  }
};
