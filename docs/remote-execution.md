# Remote Execution with `claude --remote`

Cell worker agents can be run on Anthropic-hosted virtual machines instead of locally using the `--remote` flag. This offloads compute from your local machine, eliminating resource contention with Docker and other services while keeping all subscription-plan usage.

---

## Prerequisites

### 1. Claude Code CLI ≥ v2.1.63

Remote execution requires Claude Code v2.1.63 or higher.

```bash
# Check current version
claude --version

# Update via npm if needed
npm install -g @anthropic-ai/claude-code@latest

# Verify
claude --version   # should be 2.1.63 or higher
```

### 2. Claude GitHub Application (nodots org)

The remote VM needs read access to your repository to check out code and run the agent. Grant this by installing the Claude GitHub Application on the `nodots` organization.

**One-time setup (organization owner required):**

1. Open [Claude.ai → Settings → Integrations → GitHub](https://claude.ai/settings/integrations)
2. Click **Connect GitHub**
3. Select the **`nodots`** organization (not your personal account)
4. Under *Repository access*, choose **All repositories** or restrict to the specific repos used as cell targets (e.g. `nodots/gnubg-hints`, `nodots/backgammon-core`, `nodots/backgammon-api`)
5. Click **Install**

After this, any `claude --remote` session that targets a `nodots` repository will be able to clone and work with it.

---

## Running a Cell Worker Remotely

Replace the local `claude` invocation with `claude --remote`:

```bash
# Local execution (current default)
claude

# Remote execution on Anthropic-hosted VM
claude --remote
```

The agent session behaves identically. All hooks, SCOPE.json enforcement, and handoff checks still fire — they run on the remote VM.

---

## Session Start Hook: Dependency Installation

Remote VMs start with a freshly checked-out workspace. Node modules are **not** pre-installed. The `SessionStart` hook configured by `setup-claude-infra.sh` handles this automatically:

```
.claude/hooks/session-start-install-deps.sh
```

This hook runs `npm install` at the start of every session, which:

- Installs JavaScript/TypeScript dependencies
- Compiles native Node.js addons (via `node-gyp`) against the VM's Node.js version

> **gnubg-hints:** The `gnubg-node-addon` package compiles a C++ binary at install time. The session-start hook ensures this compilation succeeds in the remote environment before the agent writes any code.

No manual action is required — `auto-shop infra setup` installs this hook automatically (see below).

---

## Infrastructure Setup for Remote Execution

Run the standard setup command before launching a remote session:

```bash
# Via auto-shop CLI (preferred)
auto-shop infra setup gnubg-hints

# Or directly
./scripts/setup-claude-infra.sh /path/to/gnubg-hints gnubg-hints
```

This creates (or updates) `.claude/settings.json` with all three hook events:

| Hook event | Script | Purpose |
|---|---|---|
| `SessionStart` | `session-start-install-deps.sh` | Install npm deps + compile native addons |
| `PreToolUse` | `enforce-scope-pretooluse.js` | Block edits outside `SCOPE.json` allowedPaths |
| `Stop` | `check-handoff-on-stop.sh` | Require HANDOFF.md or BLOCKER.md before stopping |

Commit the `.claude/` directory to the target repo's `main` branch so every session (local or remote) picks it up:

```bash
cd /path/to/target-repo
git add .claude/
git commit -m "Add Claude Code cell infrastructure (remote-ready)"
git push origin main
```

---

## Validation Checklist

Before running a remote cell session, verify:

- [ ] `claude --version` ≥ 2.1.63
- [ ] Claude GitHub Application installed on `nodots` org with access to the target repo
- [ ] `.claude/settings.json` present in the target repo with `SessionStart`, `PreToolUse`, and `Stop` hooks
- [ ] `SCOPE.json` present on the feature branch
- [ ] `auto-shop infra setup <project>` has been run (or `.claude/` committed to main)

---

## Testing gnubg-hints Native Compilation Remotely

To verify the remote environment can compile the gnubg native addon:

```bash
# Start a remote session on the gnubg-hints feature branch
git checkout feat/<your-feature>
claude --remote

# Inside the remote session, the SessionStart hook will run npm install.
# Verify compilation succeeded:
ls gnubg-node-addon/build/Release/*.node    # should exist after install
```

If compilation fails, check the remote VM has the system-level build tools installed. The gnubg-hints repo's `package.json` `install` script should handle the rest.

---

## Troubleshooting

### "GitHub repository not accessible in remote VM"

The Claude GitHub Application is not installed for the `nodots` org or doesn't include the target repo.

**Fix:** Repeat the [GitHub Application setup](#2-claude-github-application-nodots-org) and ensure the correct repositories are included.

### "npm install failed in session-start hook"

The session-start hook blocks the session if `npm install` exits non-zero.

**Steps:**
1. Check the full npm output in the agent session log for the root cause.
2. **Missing system build tools** (e.g. `node-gyp` requires `python3`, `make`, and a C++ compiler): Remote VMs are provisioned by Anthropic and you cannot install system packages directly. Options:
   - Open a support request with Anthropic to confirm which build tools are available on remote VMs.
   - If the repo uses a native addon, add a pre-built binary path or a `.npmrc` / `package.json` `optionalDependencies` fallback so `npm install` can succeed without compilation.
   - Write `BLOCKER.md` and stop the session — include the exact npm error so the coordinator can evaluate alternatives.
3. **Network/registry issues**: retry the session; transient failures are usually self-resolving.

### "claude --remote command not found / flag not recognized"

Your Claude Code CLI is older than v2.1.63.

```bash
npm install -g @anthropic-ai/claude-code@latest
claude --version
```

---

## See Also

- [docs/coordinator-workflow.md](coordinator-workflow.md) — daily session management
- [docs/quickstart.md](quickstart.md) — getting started with cells
- [scripts/setup-claude-infra.sh](../scripts/setup-claude-infra.sh) — infrastructure setup script
- [scripts/hooks/session-start-install-deps.sh](../scripts/hooks/session-start-install-deps.sh) — session start hook
