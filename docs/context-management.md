# Context Management

## Context Window

Claude Code operates with a large context window (up to 1M tokens). Most single-package codebases fit entirely within one session, eliminating the need for frequent context switching or manual summarization.

However, context is not infinite, and automatic compaction will compress earlier parts of the conversation as the window fills.

## Compaction and File-Based Artifacts

When compaction occurs, information held only in conversation may be summarized or lost. The mitigation is straightforward: write important decisions and findings to files.

**What to write to files (not just conversation):**

- Architectural decisions and their rationale (code comments, HANDOFF.md)
- API shapes and interface contracts (type definitions, HANDOFF.md)
- Debugging findings that took significant effort to discover (code comments)
- Test descriptions that explain *why* a test exists, not just *what* it tests

**What is fine to keep in conversation only:**

- Exploratory questions and intermediate reasoning
- Build output and error messages (transient)
- File contents already read (can be re-read)

## HANDOFF.md Remains Required

The large context window does not eliminate the need for HANDOFF.md. HANDOFF.md serves a different purpose than in-session context:

- It bridges across sessions (context is session-scoped, not persistent)
- It communicates with the coordinator (who is not in the session)
- It documents the final state for PR review
- It provides instructions for the next session if work is incomplete

## Cell Worker Template Integration

The cell-worker subagent template includes a compaction awareness instruction:

> Important decisions and findings should be written to files rather than held only in conversation. If the context compresses mid-session, your file-based artifacts preserve continuity.

This instruction is already included in `templates/agents/cell-worker.md` and project-specific variants.

## Practical Guidelines

1. **Do not rely on conversation memory for decisions made early in a long session.** If you made a key architectural choice 500 messages ago, write it down.
2. **Re-read files rather than trusting conversation summaries.** After compaction, file contents in conversation may be stale summaries. Use the Read tool to get current content.
3. **HANDOFF.md is the canonical session output.** Even if the conversation is available, the HANDOFF.md is what the coordinator and next session will reference.
