# Release Guide for Cypher Log

This guide covers version control and release best practices for Cypher Log.

## Branch Strategy

### Main Branches

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `main` | Production-ready code | Live site |
| `feature/*` | New features in development | Preview URLs (optional) |
| `fix/*` | Bug fixes | Preview URLs (optional) |

### Branch Naming Conventions

```
feature/add-calendar-export     # New feature
fix/maintenance-date-bug        # Bug fix
refactor/cleanup-hooks          # Code cleanup
docs/update-readme              # Documentation only
```

## Version Numbering (Semantic Versioning)

Use **MAJOR.MINOR.PATCH** format:

| Version | When to Increment | Example |
|---------|-------------------|---------|
| MAJOR (1.x.x) | Breaking changes, major rewrites | 1.0.0 → 2.0.0 |
| MINOR (x.1.x) | New features, backwards compatible | 1.0.0 → 1.1.0 |
| PATCH (x.x.1) | Bug fixes, small improvements | 1.0.0 → 1.0.1 |

### Your First Release

Since this is your first release, start with **v1.0.0**

```bash
# Update version in package.json
# "version": "1.0.0"

# Create a git tag
git tag -a v1.0.0 -m "Initial public release"

# Push the tag
git push origin v1.0.0
```

## Release Checklist

### Before Release

- [ ] All tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] README.md is up to date
- [ ] NIP.md documents all custom event kinds
- [ ] No console.log statements left in code
- [ ] No hardcoded test data
- [ ] Privacy features working correctly
- [ ] Tested on mobile browsers
- [ ] Tested with different Nostr signers (Alby, nos2x, etc.)

### Release Process

1. **Ensure main is stable**
   ```bash
   git checkout main
   git pull origin main
   npm run test
   ```

2. **Update version number**
   - Edit `package.json` version field
   - Commit the change

3. **Create a release tag**
   ```bash
   git tag -a v1.0.0 -m "Version 1.0.0 - Initial release"
   git push origin v1.0.0
   ```

4. **Create GitHub Release**
   - Go to GitHub → Releases → "Create a new release"
   - Select your tag
   - Write release notes
   - Publish

### Release Notes Template

```markdown
## What's New in v1.0.0

### Features
- Track home appliances with maintenance schedules
- Vehicle management with mileage-based maintenance
- Subscription and warranty tracking
- Pet records with vet visit history
- Project management with budgeting
- NIP-44 encryption for all data categories by default

### Technical
- Built on Nostr protocol
- Local-first with IndexedDB caching
- Multi-relay support

### Known Issues
- (List any known issues)

### Contributors
- @homebrew-gh
```

## Working with Feature Branches

### Creating a Feature Branch

```bash
# Start from main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/new-awesome-feature

# Work on your feature...
# Make commits...

# Push to GitHub
git push origin feature/new-awesome-feature
```

### Merging a Feature Branch

When ready to merge:

```bash
# Update main first
git checkout main
git pull origin main

# Merge the feature
git merge feature/new-awesome-feature

# Push to main
git push origin main

# Delete the feature branch (optional)
git branch -d feature/new-awesome-feature
git push origin --delete feature/new-awesome-feature
```

### Pull Requests (Recommended)

Instead of merging directly, use GitHub Pull Requests:

1. Push your feature branch to GitHub
2. Go to GitHub → Pull Requests → "New Pull Request"
3. Select your feature branch → main
4. Review the changes
5. Merge via GitHub UI

Benefits:
- See all changes before merging
- GitHub runs any configured checks
- Creates a record of what was merged and why

## Protecting Your Main Branch

On GitHub, you can protect main from accidental changes:

1. Go to Settings → Branches → "Add branch protection rule"
2. Branch name pattern: `main`
3. Recommended settings:
   - ✅ Require pull request before merging
   - ✅ Require status checks to pass (if you have CI)
   - ✅ Do not allow bypassing the above settings

This forces all changes to go through Pull Requests.

## Handling Hotfixes

If you find a critical bug in production:

```bash
# Create hotfix branch from main
git checkout main
git checkout -b fix/critical-bug

# Fix the bug, commit
git commit -m "fix: resolve critical issue with X"

# Merge back to main quickly
git checkout main
git merge fix/critical-bug
git push origin main

# Tag if it's significant
git tag -a v1.0.1 -m "Hotfix for critical bug"
git push origin v1.0.1
```

## Commit Message Guidelines

Use clear, descriptive commit messages:

### Format
```
type: short description

Longer description if needed
```

### Types
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code restructuring
- `style:` - Formatting, no code change
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### Examples
```
feat: add calendar export for maintenance schedules

fix: correct date calculation for overdue maintenance

docs: update README with new installation steps

refactor: extract maintenance logic into separate hook
```

## Backup and Recovery

### Before Major Changes

Always create a backup tag before major refactoring:

```bash
git tag backup/before-major-refactor
git push origin backup/before-major-refactor
```

### If Something Goes Wrong

```bash
# See recent commits
git log --oneline -10

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Go back to a specific commit
git checkout <commit-hash>

# Restore from backup tag
git checkout backup/before-major-refactor
```

## Recommended Workflow Summary

1. **Main branch** = always production-ready
2. **Feature branches** = where development happens
3. **Pull Requests** = how features get merged
4. **Tags** = mark releases (v1.0.0, v1.1.0, etc.)
5. **Small commits** = easier to understand and revert
6. **Clear messages** = future you will thank present you

## Tools That Help

- **GitHub Desktop** - Visual git interface if command line is intimidating
- **VS Code Git** - Built-in git support with visual diffs
- **GitKraken** - Popular visual git client

## Getting Help

If you get stuck with git:

```bash
# See what branch you're on
git status

# See recent history
git log --oneline -10

# See all branches
git branch -a

# Undo uncommitted changes to a file
git checkout -- filename

# Start fresh (nuclear option - loses uncommitted work!)
git reset --hard HEAD
```

Remember: Git is designed to prevent data loss. Even if you make a mistake, there's almost always a way to recover!
