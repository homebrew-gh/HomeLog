# Local Development Guide for Cypher Log

This guide is written for first-time developers who want to work on Cypher Log on their own computer. It assumes no prior experience with local development.

## Table of Contents

1. [What You're Setting Up](#what-youre-setting-up)
2. [Installing Required Software](#installing-required-software)
3. [Getting the Code](#getting-the-code)
4. [Running the Project](#running-the-project)
5. [Making Changes](#making-changes)
6. [Saving Your Work (Git)](#saving-your-work-git)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)
9. [Glossary](#glossary)

---

## What You're Setting Up

When you develop locally, you're creating a complete copy of the development environment on your computer. Here's what each piece does:

```
Your Computer
├── Node.js          → Runs JavaScript outside the browser
├── npm              → Installs packages (comes with Node.js)
├── Git              → Tracks changes to your code
├── VS Code/Cursor   → Where you write code
└── CypherLog/       → Your project folder
    ├── node_modules/  → Downloaded packages (auto-generated)
    ├── src/           → Your actual code
    ├── dist/          → Built website (auto-generated)
    └── package.json   → List of dependencies
```

---

## Installing Required Software

### Step 1: Install Node.js

Node.js lets you run JavaScript on your computer (not just in a browser).

#### On Mac

**Option A: Direct Download (Easiest)**
1. Go to https://nodejs.org
2. Download the **LTS** version (the one that says "Recommended")
3. Open the downloaded file and follow the installer

**Option B: Using Homebrew (If you have it)**
```bash
brew install node
```

#### On Windows

**Option A: Direct Download (Easiest)**
1. Go to https://nodejs.org
2. Download the **LTS** version
3. Run the installer, click "Next" through everything

**Option B: Using winget (Windows 10/11)**
```bash
winget install OpenJS.NodeJS
```

#### On Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install nodejs npm
```

#### Verify Installation

Open a terminal (Mac/Linux) or Command Prompt (Windows) and type:

```bash
node --version
```

You should see something like `v18.17.0` or higher. If you see an error, the installation didn't work.

---

### Step 2: Install Git

Git tracks changes to your code and syncs with GitHub.

#### On Mac

Git is often pre-installed. Check by running:
```bash
git --version
```

If not installed, you'll be prompted to install it, or:
```bash
brew install git
```

#### On Windows

1. Go to https://git-scm.com
2. Download and run the installer
3. Use all the default options (just keep clicking "Next")

#### On Linux

```bash
sudo apt install git
```

#### Configure Git (First Time Only)

Tell Git who you are:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Use the same email as your GitHub account.

---

### Step 3: Install a Code Editor

You need an application to edit code. I recommend **Cursor** for beginners because it has built-in AI assistance (similar to Shakespeare).

#### Option A: Cursor (Recommended for Beginners)

1. Go to https://cursor.sh
2. Download for your operating system
3. Install and open it

Cursor is a modified version of VS Code with AI built-in. It can help you write code, explain things, and fix errors.

#### Option B: VS Code (Industry Standard)

1. Go to https://code.visualstudio.com
2. Download for your operating system
3. Install and open it

If using VS Code, install these extensions (click the Extensions icon in the left sidebar):
- ESLint
- Tailwind CSS IntelliSense
- Prettier - Code formatter

---

## Getting the Code

### Step 1: Open Terminal

**On Mac:**
- Press `Cmd + Space`, type "Terminal", press Enter

**On Windows:**
- Press `Windows key`, type "Command Prompt" or "PowerShell", press Enter

**On Linux:**
- Press `Ctrl + Alt + T`

### Step 2: Choose Where to Put the Project

Navigate to where you want the project folder:

```bash
# Go to your home folder
cd ~

# Or go to a specific folder
cd ~/Projects        # Mac/Linux
cd C:\Projects       # Windows
```

**Tip:** If the folder doesn't exist, create it:
```bash
mkdir Projects
cd Projects
```

### Step 3: Clone the Repository

This downloads the code from GitHub:

```bash
git clone https://github.com/homebrew-gh/CypherLog.git
```

You'll now have a folder called `CypherLog`.

### Step 4: Enter the Project Folder

```bash
cd CypherLog
```

### Step 5: Install Dependencies

This downloads all the packages the project needs:

```bash
npm install
```

This will take a minute or two. You'll see a lot of text scrolling by - that's normal.

When it's done, you'll have a `node_modules` folder with thousands of files. **Never edit anything in node_modules** - it's auto-generated.

---

## Running the Project

### Start the Development Server

```bash
npm run dev
```

You'll see output like:

```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
```

### Open in Browser

1. Open your web browser (Chrome, Firefox, Safari, etc.)
2. Go to **http://localhost:5173**
3. You should see Cypher Log running!

### Stop the Server

Press `Ctrl + C` in the terminal (Mac, Windows, and Linux).

---

## Making Changes

### Opening the Project in Your Editor

**Using Cursor or VS Code:**

1. Open Cursor/VS Code
2. File → Open Folder
3. Navigate to the `CypherLog` folder
4. Click "Open"

**Or from terminal:**
```bash
# If using Cursor
cursor .

# If using VS Code
code .
```

The `.` means "current folder".

### Understanding the File Structure

```
CypherLog/
├── src/                    ← YOUR CODE LIVES HERE
│   ├── components/         ← React components (buttons, dialogs, etc.)
│   │   ├── ui/            ← Basic UI components (shadcn/ui)
│   │   ├── tabs/          ← Main tab views (Home, Vehicles, etc.)
│   │   └── auth/          ← Login components
│   ├── hooks/             ← Custom React hooks (data fetching)
│   ├── pages/             ← Full page components
│   ├── contexts/          ← Global state (themes, settings)
│   ├── lib/               ← Utility functions
│   ├── App.tsx            ← Main app component
│   └── main.tsx           ← Entry point
├── public/                ← Static files (images, icons)
├── docs/                  ← Documentation (you are here!)
├── package.json           ← Project configuration
├── tailwind.config.ts     ← Styling configuration
└── README.md              ← Project overview
```

### Making a Simple Change

Let's try changing something:

1. Open `src/components/Logo.tsx`
2. Find the text or component you want to change
3. Make your change
4. Save the file (`Cmd + S` on Mac, `Ctrl + S` on Windows)
5. Look at your browser - it should update automatically!

This is called **Hot Reload** - the browser refreshes when you save.

### If Something Breaks

Don't panic! Common fixes:

1. **Check the terminal** - error messages appear there
2. **Check the browser console** - Press `F12`, click "Console"
3. **Undo your change** - `Cmd + Z` (Mac) or `Ctrl + Z` (Windows)
4. **Restart the server** - `Ctrl + C`, then `npm run dev`

---

## Saving Your Work (Git)

Git saves snapshots of your code called "commits". This lets you:
- Go back if you break something
- Sync with GitHub
- Work on different features in parallel

### Check What's Changed

```bash
git status
```

This shows:
- **Red files** - Changed but not staged
- **Green files** - Staged, ready to commit

### Save Your Changes (Commit)

**Step 1: Stage the changes**
```bash
# Stage all changes
git add .

# Or stage specific files
git add src/components/MyFile.tsx
```

**Step 2: Commit with a message**
```bash
git commit -m "Add new feature X"
```

Write a brief description of what you changed.

### Push to GitHub

Send your commits to GitHub:

```bash
git push
```

If it's your first time pushing, you might need to set up authentication. GitHub will guide you through it.

### Pull Latest Changes

If you made changes on another computer (or in Shakespeare), get them:

```bash
git pull
```

### Using VS Code/Cursor for Git (Easier!)

Both editors have a visual Git interface:

1. Click the "Source Control" icon in the left sidebar (looks like a branch)
2. You'll see your changed files
3. Click the `+` next to a file to stage it
4. Type a message in the text box
5. Click the checkmark to commit
6. Click "Sync Changes" to push/pull

This is much easier than typing commands!

---

## Common Tasks

### Installing a New Package

```bash
# Regular dependency
npm install package-name

# Development-only dependency
npm install --save-dev package-name
```

Example:
```bash
npm install date-fns
```

### Updating Packages

```bash
# See what's outdated
npm outdated

# Update everything
npm update
```

### Building for Production

Creates optimized files for deployment:

```bash
npm run build
```

Output goes to the `dist/` folder.

### Running Tests

```bash
npm run test
```

This checks for errors and runs any automated tests.

### Checking for Errors Without Running

```bash
# Type checking
npx tsc --noEmit

# Linting (code style)
npx eslint .
```

---

## Troubleshooting

### "command not found: node"

Node.js isn't installed or isn't in your PATH.

**Fix:** Reinstall Node.js from https://nodejs.org, then restart your terminal.

### "command not found: git"

Git isn't installed.

**Fix:** Install Git from https://git-scm.com, then restart your terminal.

### "npm ERR! code EACCES"

Permission error on Mac/Linux.

**Fix:** Don't use `sudo`. Instead, fix npm permissions:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### "Cannot find module..."

Dependencies aren't installed.

**Fix:**
```bash
rm -rf node_modules
npm install
```

### "Port 5173 is already in use"

Another server is running on that port.

**Fix:**
```bash
# Find and kill the process (Mac/Linux)
lsof -i :5173
kill -9 <PID>

# Or just use a different port
npm run dev -- --port 3000
```

### "ENOSPC: System limit for number of file watchers reached"

Linux has a limit on file watchers.

**Fix:**
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Changes Not Showing in Browser

1. Make sure the dev server is running
2. Hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
3. Check for errors in the terminal

### "Your branch is behind 'origin/main'"

GitHub has changes you don't have locally.

**Fix:**
```bash
git pull
```

### Merge Conflicts

This happens when the same file was changed in two places.

**Fix:**
1. Open the file - you'll see conflict markers:
   ```
   <<<<<<< HEAD
   your changes
   =======
   their changes
   >>>>>>> origin/main
   ```
2. Edit the file to keep what you want
3. Remove the conflict markers
4. Save, then:
   ```bash
   git add .
   git commit -m "Resolve merge conflict"
   ```

---

## Glossary

| Term | Meaning |
|------|---------|
| **Terminal** | Text-based interface to run commands |
| **CLI** | Command Line Interface (same as terminal) |
| **Repository (Repo)** | A project tracked by Git |
| **Clone** | Download a copy of a repository |
| **Commit** | A saved snapshot of your code |
| **Push** | Upload commits to GitHub |
| **Pull** | Download commits from GitHub |
| **Branch** | A parallel version of the code |
| **Merge** | Combine two branches |
| **npm** | Node Package Manager - installs JavaScript packages |
| **Package** | A reusable piece of code (library) |
| **node_modules** | Folder containing installed packages |
| **Dependency** | A package your project needs |
| **Dev Server** | Local web server for development |
| **Hot Reload** | Auto-refresh when you save files |
| **Build** | Convert source code to optimized output |
| **Production** | The live, public version |
| **Development** | Your local testing version |

---

## Quick Reference Card

### Daily Workflow

```bash
# Start of session
cd ~/Projects/CypherLog    # Go to project folder
git pull                    # Get latest changes
npm run dev                 # Start dev server

# While working
# ... edit files in your editor ...
# ... save and see changes in browser ...

# End of session
Ctrl + C                    # Stop server
git add .                   # Stage changes
git commit -m "message"     # Save snapshot
git push                    # Upload to GitHub
```

### Essential Commands

| Command | What it does |
|---------|--------------|
| `cd folder` | Enter a folder |
| `cd ..` | Go up one folder |
| `ls` (Mac/Linux) or `dir` (Windows) | List files |
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run test` | Run tests |
| `git status` | See what's changed |
| `git add .` | Stage all changes |
| `git commit -m "msg"` | Save changes |
| `git push` | Upload to GitHub |
| `git pull` | Download from GitHub |

### Keyboard Shortcuts (in VS Code/Cursor)

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + S` | Save file |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + P` | Quick open file |
| `Cmd/Ctrl + Shift + P` | Command palette |
| `Cmd/Ctrl + /` | Toggle comment |
| `Cmd/Ctrl + B` | Toggle sidebar |
| `Cmd/Ctrl + ` ` | Toggle terminal |
| `Cmd/Ctrl + F` | Find in file |
| `Cmd/Ctrl + Shift + F` | Find in all files |

---

## Getting Help

### In Cursor
Just ask the AI! Press `Cmd/Ctrl + K` and type your question.

### Online Resources
- **React docs:** https://react.dev
- **Tailwind docs:** https://tailwindcss.com/docs
- **TypeScript docs:** https://www.typescriptlang.org/docs
- **Stack Overflow:** Search for error messages
- **ChatGPT/Claude:** Paste error messages and ask for help

### Nostr-Specific Help
- **Nostr docs:** https://nostr.com
- **Nostrify docs:** https://nostrify.dev
- **NIPs (Nostr specs):** https://github.com/nostr-protocol/nips

---

## Next Steps

Once you're comfortable:

1. **Learn React basics** - https://react.dev/learn
2. **Understand TypeScript** - https://www.typescriptlang.org/docs/handbook/intro.html
3. **Explore Tailwind** - https://tailwindcss.com/docs/utility-first
4. **Read the codebase** - Start with simple components and work up

You've got this! Every expert was once a beginner. Take it one step at a time.
