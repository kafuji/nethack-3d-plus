# Fork Maintenance

NetHack 3D Plus is a fork of [JamesIV4/nethack-3d](https://github.com/JamesIV4/nethack-3d).
This document describes how to keep the fork in sync with upstream while
minimizing merge conflicts.

## Remotes

| Remote     | URL                                            | Purpose                 |
| ---------- | ---------------------------------------------- | ----------------------- |
| `origin`   | `https://github.com/kafuji/nethack-3d-plus`    | This fork (push here)   |
| `upstream` | `https://github.com/JamesIV4/nethack-3d.git`   | Original project (read) |

Add the upstream remote once per clone:

```bash
git remote add upstream https://github.com/JamesIV4/nethack-3d.git
```

## Syncing with upstream

1. Fetch upstream and check what is new:

   ```bash
   git fetch upstream main
   ```

   ```bash
   git log --oneline HEAD..upstream/main
   ```

2. Merge on a dedicated branch (merge, not rebase, so fork history stays intact):

   ```bash
   git checkout -b sync/upstream-YYYYMMDD main
   ```

   ```bash
   git merge upstream/main
   ```

3. Resolve conflicts. Search for fork markers to find our edits in upstream files:

   ```bash
   git grep -n "nh3d-plus:"
   ```

4. Verify before opening a PR into `main`:

   ```bash
   npm run check:tsc && npx vitest run && npm run i18n:check
   ```

5. Record the new upstream base in the README "Fork Changes" section
   (upstream version and commit).

## Keeping conflicts small

- **Put new features in `src/plus/`** (or a `plus/` subfolder next to the code
  they extend). Upstream never touches these paths.
- **Keep edits to upstream files minimal**: prefer a one-line hook that calls
  into `src/plus/` over rewriting upstream logic in place.
- **Mark every edit to an upstream file** with a `nh3d-plus:` comment explaining
  why, e.g. `// nh3d-plus: register fork-only hotbar actions`. This makes
  conflicts easy to locate and review during a sync.
- **Add new i18n keys under a `plus` namespace** in each locale so translation
  updates from upstream merge cleanly.
- Do not reformat or reorganize upstream files unless the change is also worth
  proposing upstream.

## Intentionally upstream-pointing references

These still reference upstream on purpose:

- `scripts/quest/webxr/dependencies.lock.json` and
  `scripts/quest/webxr/package-dependency-release.mjs`: the pinned Quest
  runtime dependency archive is hosted on upstream releases. Switch to a fork
  release only if the archive is republished here.
- README and `public/privacy.html` credit the upstream project and author.

App identity (display name, `appId`, Android package name) is unchanged for now
and will be decided once the fork's feature set settles.
