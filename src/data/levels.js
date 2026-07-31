// 10 Beginner-Friendly Bandit Levels Dataset for College Freshers

export const LEVELS = [
  {
    id: 0,
    name: "Level 0: Hello Terminal",
    user: "bandit0",
    nextUser: "bandit1",
    concept: "The 'cat' command prints the contents of a text file to your terminal screen.",
    objective: "The password for the next level is stored in a file called 'readme' in the home directory.",
    commandTip: "cat readme",
    password: "bandit_pass_lvl1_welcome_fresher_882",
    hints: [
      "Use 'ls' to list the files in your current folder.",
      "Type 'cat readme' and press Enter to read the file.",
      "Copy the password output and submit it in the Password Box on the right!"
    ],
    initialVFS: {
      "readme": "Congratulations! You completed Level 0. Here is your password for Level 1: bandit_pass_lvl1_welcome_fresher_882"
    }
  },
  {
    id: 1,
    name: "Level 1: Special Characters",
    user: "bandit1",
    nextUser: "bandit2",
    concept: "In UNIX, a single hyphen '-' usually represents standard input or command flags. To read a file named '-', specify its relative path './-'.",
    objective: "The password for Level 2 is stored in a file named '-' located in the home directory.",
    commandTip: "cat ./-",
    password: "bandit_pass_lvl2_hyphen_master_441",
    hints: [
      "If you run 'cat -', cat waits for keyboard input because it thinks '-' is stdin.",
      "Use explicit pathing: type 'cat ./-' to tell bash that '-' is a file in the current directory ('.').",
      "Notice how relative paths ('./') bypass command flag confusion!"
    ],
    initialVFS: {
      "-": "Awesome! You mastered hyphen file paths. Level 2 Password: bandit_pass_lvl2_hyphen_master_441"
    }
  },
  {
    id: 2,
    name: "Level 2: Escaping Spaces",
    user: "bandit2",
    nextUser: "bandit3",
    concept: "The shell uses spaces to separate arguments. If a filename contains spaces, wrap it in double quotes or escape spaces with backslashes '\\'.",
    objective: "The password for Level 3 is stored in a file called 'spaces in this filename' in the home directory.",
    commandTip: 'cat "spaces in this filename"',
    password: "bandit_pass_lvl3_spaces_escaped_903",
    hints: [
      "If you run 'cat spaces in this filename', bash thinks you are trying to read 4 separate files!",
      "Wrap the filename in quotes: cat \"spaces in this filename\"",
      "Alternatively, use backslashes: cat spaces\\ in\\ this\\ filename"
    ],
    initialVFS: {
      "spaces in this filename": "Great job! Escaping spaces is an essential shell skill. Level 3 Password: bandit_pass_lvl3_spaces_escaped_903"
    }
  },
  {
    id: 3,
    name: "Level 3: Hidden Files",
    user: "bandit3",
    nextUser: "bandit4",
    concept: "Files whose names begin with a dot '.' are hidden files in Linux. Standard 'ls' skips them unless you pass the '-a' (all) flag.",
    objective: "The password for Level 4 is stored in a hidden file inside the 'inhere' directory.",
    commandTip: "cd inhere && ls -a",
    password: "bandit_pass_lvl4_hidden_dotfile_119",
    hints: [
      "First, change into the 'inhere' folder: type 'cd inhere'",
      "Running plain 'ls' shows nothing! Run 'ls -a' (or 'ls -la') to list hidden files.",
      "Read the hidden dotfile using 'cat .hidden_pass'"
    ],
    initialVFS: {
      "inhere": {
        ".hidden_pass": "Secret uncovered! You found the hidden dotfile. Level 4 Password: bandit_pass_lvl4_hidden_dotfile_119"
      }
    }
  },
  {
    id: 4,
    name: "Level 4: Human-Readable Files",
    user: "bandit4",
    nextUser: "bandit5",
    concept: "The 'file' command inspects file headers to tell you if a file is human-readable ASCII text or binary code.",
    objective: "The password for Level 5 is stored in the only human-readable ASCII file inside the 'inhere' directory.",
    commandTip: "file inhere/*",
    password: "bandit_pass_lvl5_ascii_readable_773",
    hints: [
      "Navigate to the directory: 'cd inhere'",
      "Inspect all files using: 'file ./*'",
      "Look for the one marked 'ASCII text' and read it with 'cat'."
    ],
    initialVFS: {
      "inhere": {
        "-file00": { content: "\x00\x01\x02\x03\x04\x05data", _meta: { fileType: "data" } },
        "-file01": { content: "\x89PNG\r\n\x1a\n", _meta: { fileType: "PNG image data" } },
        "-file02": { content: "Nice work! You identified the ASCII text file. Level 5 Password: bandit_pass_lvl5_ascii_readable_773", _meta: { fileType: "ASCII text" } },
        "-file03": { content: "\x7fELF\x02\x01\x01", _meta: { fileType: "ELF 64-bit LSB executable" } }
      }
    }
  },
  {
    id: 5,
    name: "Level 5: File Search & Filters",
    user: "bandit5",
    nextUser: "bandit6",
    concept: "The 'find' command searches file trees by criteria like size ('-size 1033c') or type ('-type f').",
    objective: "The password for Level 6 is stored in a file under 'inhere' that is human-readable, 1033 bytes in size, and non-executable.",
    commandTip: "find inhere -type f -size 1033c",
    password: "bandit_pass_lvl6_find_master_512",
    hints: [
      "Use the 'find' command to search through directories.",
      "Run: 'find inhere -type f -size 1033c'",
      "Read the matching file path with 'cat'."
    ],
    initialVFS: {
      "inhere": {
        "maybehere0": { "file1": "too small" },
        "maybehere1": { "file2": "too large " + "x".repeat(2000) },
        "maybehere2": {
          "file3": {
            content: "Excellent! You mastered the find command. Level 6 Password: bandit_pass_lvl6_find_master_512" + " ".repeat(937),
            _meta: { size: 1033 }
          }
        }
      }
    }
  },
  {
    id: 6,
    name: "Level 6: Grep Search",
    user: "bandit6",
    nextUser: "bandit7",
    concept: "The 'grep' utility searches text files line-by-line for lines that match a specific keyword.",
    objective: "The password for Level 7 is stored in 'data.txt' next to the word 'millionth'.",
    commandTip: "grep millionth data.txt",
    password: "bandit_pass_lvl7_grep_millionth_309",
    hints: [
      "Opening 'data.txt' with cat shows thousands of lines!",
      "Use 'grep' to filter only lines containing the keyword: 'grep millionth data.txt'",
      "Copy the password right beside 'millionth'!"
    ],
    initialVFS: {
      "data.txt": Array.from({ length: 50 }, (_, i) => `random_line_${i} dummy_pass_${i}`).join('\n') +
        "\nmillionth bandit_pass_lvl7_grep_millionth_309\n" +
        Array.from({ length: 50 }, (_, i) => `random_line_post_${i} dummy_pass_${i}`).join('\n')
    }
  },
  {
    id: 7,
    name: "Level 7: Unique Lines",
    user: "bandit7",
    nextUser: "bandit8",
    concept: "'sort' arranges text alphabetically, and 'uniq -u' filters out duplicate lines to print ONLY the unique line.",
    objective: "The password for Level 8 is stored in 'data.txt' and is the ONLY line that occurs only once.",
    commandTip: "sort data.txt | uniq -u",
    password: "bandit_pass_lvl8_unique_line_601",
    hints: [
      "'uniq' only works on sorted files! Always pipe sort into uniq.",
      "Run: 'sort data.txt | uniq -u'",
      "The '-u' flag tells uniq to output ONLY lines that are not repeated."
    ],
    initialVFS: {
      "data.txt": [
        "duplicate_line_alpha", "duplicate_line_alpha",
        "duplicate_line_beta", "duplicate_line_beta",
        "bandit_pass_lvl8_unique_line_601",
        "duplicate_line_gamma", "duplicate_line_gamma"
      ].join('\n')
    }
  },
  {
    id: 8,
    name: "Level 8: Extracting Binary Strings",
    user: "bandit8",
    nextUser: "bandit9",
    concept: "The 'strings' command scans binary files and extracts printable ASCII character sequences.",
    objective: "The password for Level 9 is stored in 'data.dat' (a binary file) preceded by several '=' characters.",
    commandTip: "strings data.dat | grep '='",
    password: "bandit_pass_lvl9_strings_extracted_248",
    hints: [
      "If you try 'cat data.dat', you will see messy binary code.",
      "Extract printable text first: 'strings data.dat'",
      "Pipe into grep to find the equal signs: 'strings data.dat | grep \"=\"'"
    ],
    initialVFS: {
      "data.dat": "\x00\x01\x02\x03\xFF\xFE\xFD========\n========== bandit_pass_lvl9_strings_extracted_248\n\x00\x00\x00"
    }
  },
  {
    id: 9,
    name: "Level 9: Base64 & Network Netcat",
    user: "bandit9",
    nextUser: "bandit10",
    concept: "Networking tools like 'nc' (netcat) let you connect directly to network ports on localhost.",
    objective: "The final password for Level 10 VICTORY is retrieved by connecting to port 1337 on localhost using 'nc'.",
    commandTip: "nc localhost 1337",
    password: "cyber_fresher_netcat_master_9921",
    hints: [
      "Use netcat: 'nc localhost 1337'",
      "Netcat will connect to the local CTF server daemon and display the victory password!",
      "Submit the password to unlock Level 10 Victory!"
    ],
    initialVFS: {
      "notes.txt": "Connect to local auth daemon on port 1337 using netcat (nc)."
    }
  },
  {
    id: 10,
    name: "Level 10: VICTORY & CTF FINISH!",
    user: "bandit10",
    nextUser: "WINNER",
    concept: "CONGRATULATIONS! You have successfully mastered 10 levels of Linux terminal fundamentals!",
    objective: "You cleared all 10 Bandit levels! Claim your CTF Champion status on the Admin Dashboard.",
    commandTip: "echo 'I AM A LINUX MASTER!'",
    password: "VICTORY_CLAIMED",
    hints: [
      "You beat the wargame!",
      "Check with your CTF Host/Admin to claim your leaderboard ranking!",
      "Keep practicing your Linux command-line skills!"
    ],
    initialVFS: {
      "TROPHY.txt": "🏆 YOU ARE A CERTIFIED LINUX CYBER BANDIT! 🏆\nCompleted all 10 OverTheWire Levels!"
    }
  }
];
