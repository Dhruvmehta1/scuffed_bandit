// In-Memory Virtual File System (VFS) for Browser Terminal

export class VFSNode {
  constructor(name, isDirectory = false, content = '', metadata = {}) {
    this.name = name;
    this.isDirectory = isDirectory;
    this.content = content;
    this.children = isDirectory ? {} : null;
    this.owner = metadata.owner || 'bandit';
    this.group = metadata.group || 'bandit';
    this.permissions = metadata.permissions || (isDirectory ? 'rwxr-xr-x' : 'rw-r--r--');
    this.size = metadata.size !== undefined ? metadata.size : (isDirectory ? 4096 : (typeof content === 'string' ? content.length : content.byteLength || 0));
    this.mtime = metadata.mtime || new Date();
    this.isExecutable = metadata.isExecutable || false;
    this.fileType = metadata.fileType || (isDirectory ? 'directory' : 'ASCII text');
  }
}

export class VirtualFileSystem {
  constructor(rootStructure = {}, currentUser = 'bandit') {
    this.currentUser = currentUser;
    this.root = new VFSNode('/', true, '', { owner: 'root', group: 'root' });
    
    // Ensure /home and /home/user exist
    const homeNode = new VFSNode('home', true, '', { owner: 'root', group: 'root' });
    const userHomeNode = new VFSNode(currentUser, true, '', { owner: currentUser, group: currentUser });
    
    this.root.children['home'] = homeNode;
    homeNode.children[currentUser] = userHomeNode;

    this.currentPath = `/home/${currentUser}`;
    
    // Initialize structure inside user's home directory
    this.initStructure(rootStructure, userHomeNode);
  }

  // Initialize structure from object definition
  initStructure(structure, currentDirNode) {
    if (!structure || !currentDirNode || !currentDirNode.children) return;

    for (const [key, val] of Object.entries(structure)) {
      if (typeof val === 'object' && val !== null && !val.content && !val._meta) {
        // Subdirectory
        const dirNode = new VFSNode(key, true, '', val._meta || {});
        currentDirNode.children[key] = dirNode;
        this.initStructure(val, dirNode);
      } else if (val && typeof val === 'object' && val._meta) {
        const isDir = val.isDirectory || false;
        const node = new VFSNode(key, isDir, val.content || '', val._meta);
        if (isDir && val.children) {
          node.children = {};
          this.initStructure(val.children, node);
        }
        currentDirNode.children[key] = node;
      } else {
        // Plain file string content
        const node = new VFSNode(key, false, String(val));
        currentDirNode.children[key] = node;
      }
    }
  }

  // Resolve absolute or relative path to VFS Node
  resolvePath(pathStr) {
    if (!pathStr || pathStr === '.') return this.getNodeByParts(this.currentPath.split('/').filter(Boolean));
    
    let target = pathStr.startsWith('/') ? pathStr : `${this.currentPath}/${pathStr}`;
    const parts = target.split('/').filter(Boolean);
    const stack = [];
    
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        if (stack.length > 0) stack.pop();
      } else {
        stack.push(part);
      }
    }

    return this.getNodeByParts(stack);
  }

  getNodeByParts(parts) {
    let current = this.root;
    for (const p of parts) {
      if (!current || !current.isDirectory || !current.children || !current.children[p]) {
        return null;
      }
      current = current.children[p];
    }
    return current;
  }

  // Get normalized path string
  getNormalizedPath(pathStr) {
    if (!pathStr || pathStr === '.') return this.currentPath;
    let target = pathStr.startsWith('/') ? pathStr : `${this.currentPath}/${pathStr}`;
    const parts = target.split('/').filter(Boolean);
    const stack = [];
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        if (stack.length > 0) stack.pop();
      } else {
        stack.push(part);
      }
    }
    return '/' + stack.join('/');
  }

  changeDirectory(pathStr) {
    if (!pathStr || pathStr === '~') {
      this.currentPath = `/home/${this.currentUser}`;
      return { success: true, path: this.currentPath };
    }
    const node = this.resolvePath(pathStr);
    if (!node) {
      return { success: false, error: `cd: ${pathStr}: No such file or directory` };
    }
    if (!node.isDirectory) {
      return { success: false, error: `cd: ${pathStr}: Not a directory` };
    }
    this.currentPath = this.getNormalizedPath(pathStr);
    return { success: true, path: this.currentPath };
  }

  listFiles(pathStr = '.', showHidden = false) {
    const dirNode = this.resolvePath(pathStr);
    if (!dirNode) {
      return { success: false, error: `ls: cannot access '${pathStr}': No such file or directory` };
    }
    if (!dirNode.isDirectory) {
      return { success: true, files: [dirNode] };
    }

    let entries = Object.values(dirNode.children || {});
    if (!showHidden) {
      entries = entries.filter(e => !e.name.startsWith('.'));
    }
    return { success: true, files: entries };
  }

  readFile(pathStr) {
    const node = this.resolvePath(pathStr);
    if (!node) {
      return { success: false, error: `cat: ${pathStr}: No such file or directory` };
    }
    if (node.isDirectory) {
      return { success: false, error: `cat: ${pathStr}: Is a directory` };
    }
    return { success: true, content: node.content, node };
  }
}
