# auto-shop
Coordination Layer for Multi-Project Agentic AI-Driven Software Development

---

## Quick Start

👉 **New to this system?** Start with **[Quick Start Guide](docs/quickstart.md)** (30 minutes)

For detailed architecture: **[Implementation Plan](docs/ai-dev-scaling-plan.md)**

---

## What Is This?

**auto-shop** enables running **4+ AI agents working on different features simultaneously** without conflicts. Each agent gets a bounded scope, works asynchronously, and a single human coordinator manages the boundaries.

### How It Works

1. **AI Dev Cell** — One agent, one feature, one branch, one scoped environment
2. **Scope Manifest** (SCOPE.json) — Declares exactly which files the agent can modify
3. **Pre-Commit Hook** — Prevents commits outside the scope
4. **Async Coordination** — Two 30-minute sessions per day manages 4 concurrent cells
5. **Contract Freezing** — Shared interfaces change via dedicated contract-change cells

### Result

- **No conflicts** — Each cell is isolated
- **Sustainable** — 1 hour/day coordinator overhead
- **Scalable** — Works for 4+ concurrent cells
- **Testable** — Clear acceptance criteria per cell

---

## Documentation

| Document | Purpose |
|----------|---------|
| **[quickstart.md](docs/quickstart.md)** | 30-minute getting started guide |
| **[coordinator-workflow.md](docs/coordinator-workflow.md)** | Your daily morning/evening checklists |
| **[merge-procedure.md](docs/merge-procedure.md)** | Step-by-step merge guide |
| **[scope-design-guide.md](docs/scope-design-guide.md)** | How to write SCOPE.json |
| **[contract-workflow.md](docs/contract-workflow.md)** | How to handle contract changes |
| **[ai-dev-scaling-plan.md](docs/ai-dev-scaling-plan.md)** | Complete technical architecture |
| **[CLAUDE.md](CLAUDE.md)** | Agent and coordinator instructions |

---

## File Structure

```
auto-shop/
├── CLAUDE.md                          # Agent & coordinator instructions
├── ISSUES_CREATED.md                  # GitHub issues tracking implementation
├── templates/                         # Reusable templates
│   ├── SCOPE.json.template
│   ├── SCOPE-{project}.template.json
│   ├── agent-prompt.template.md
│   ├── BLOCKER.md.template
│   ├── HANDOFF.md.template
│   └── README.md
├── scripts/                           # Automation scripts
│   ├── enforce-scope.js               # Pre-commit hook
│   ├── provision-feature-env.sh       # Create feature database
│   └── teardown-feature-env.sh        # Clean up feature database
├── contracts/                         # Shared interfaces (frozen)
│   ├── README.md
│   ├── CHANGELOG.md
│   └── index.ts
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── feature-cell.md
│   │   ├── contract-change.md
│   │   └── blocker.md
│   └── workflows/
│       └── feature-ci.yml
└── docs/
    ├── quickstart.md
    ├── coordinator-workflow.md
    ├── merge-procedure.md
    ├── scope-design-guide.md
    ├── contract-workflow.md
    ├── railway-setup.md
    ├── ai-dev-scaling-plan.md
    ├── active-cells.md
    └── retrospectives/
        ├── TEMPLATE.md
        ├── INSIGHTS.md
        └── {feature-name}.md (created per cell)
```

---

## Projects Using This System

- **nodots-backgammon** — Backgammon AI and UI
- **a2z-freight-claims** — Email provider integration

---

## Status Labels

Use these labels to track cell status on GitHub:

| Label | Meaning |
|-------|---------|
| `cell:active` | Agent is currently working |
| `cell:blocked` | Agent stopped, needs coordinator action |
| `cell:awaiting-review` | [READY] PR open, needs review |
| `cell:queued` | Ready to start, waiting for capacity |
| `cell:merged` | Complete |
| `cell:contract-change` | Modifies contracts (high priority) |

---

## Installation

```bash
# Clone and install
git clone https://github.com/nodots/auto-shop.git
cd auto-shop
npm install

# Initialize Husky hooks
npx husky install
```

---

## Getting Started

1. **Read [quickstart.md](docs/quickstart.md)** (30 min)
2. **Read [CLAUDE.md](CLAUDE.md)** for your role
3. **Start your first feature cell** using the checklist in CLAUDE.md

---

## Daily Coordinator Workflow

**Morning (20–30 min):**
- Review blocked cells
- Review completed cells ready to merge
- Start new cells if capacity
- Update labels

**Evening (20–30 min):**
- Merge completed cells (in dependency order)
- Teardown environments
- Pre-write scope manifests for tomorrow
- Reprioritize queue

See **[coordinator-workflow.md](docs/coordinator-workflow.md)** for detailed checklists.

---

## CLI Workflows

`auto-shop` includes a small coordinator CLI in [`bin/auto-shop`](bin/auto-shop).

Common issue-driven commands:

```bash
# Start a feature implementation session from a GitHub issue
./bin/auto-shop launch nodots/PoslunsLaw#352

# Generate, but do not launch, the implementation prompt
./bin/auto-shop prompt nodots/PoslunsLaw#352 --clipboard

# Audit open issues against the current code and get a close/modify/open checklist
./bin/auto-shop audit a2z-freight-claims --state=open --limit=50

# Generate the issue-audit prompt without launching Claude
./bin/auto-shop issues prompt nodots/PoslunsLaw --state=open --limit=25
```

---

## Capacity Management

- **1–2 cells**: Very safe
- **3 cells**: Comfortable (normal)
- **4 cells**: At maximum capacity
- **5+ cells**: Too many (rethink approach)

---

## License

[See LICENSE file](LICENSE)

---

## Contributing

This repository is for coordination and documentation. Feature code goes to the individual project repositories.

For improvements to the coordination system itself, file a GitHub issue.
