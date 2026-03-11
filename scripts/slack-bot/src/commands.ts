/**
 * Slash command handlers for /autoshop.
 *
 * Commands:
 *   /autoshop status   — Unified view of all cells
 *   /autoshop cells    — List active/blocked/queued
 *   /autoshop blocked  — List blocked cells
 *   /autoshop approve <pr> — Approve a PR (with confirmation)
 *   /autoshop merge <pr>   — Merge a PR (with confirmation)
 */

import { GitHubClient, GitHubIssue } from './github';

interface CommandContext {
  github: GitHubClient;
  respond: (payload: Record<string, unknown>) => Promise<void>;
  args: string[];
}

function issueList(issues: GitHubIssue[], emptyMsg: string): string {
  if (issues.length === 0) return emptyMsg;
  return issues
    .map((i) => `- <${i.html_url}|#${i.number} ${i.title}>`)
    .join('\n');
}

export async function handleStatus(ctx: CommandContext): Promise<void> {
  const status = await ctx.github.getCellStatus();
  const total =
    status.active.length +
    status.blocked.length +
    status.queued.length +
    status.awaitingReview.length;

  await ctx.respond({
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `Auto-Shop Status (${total} cells)` },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `:large_green_circle: *Active:* ${status.active.length}`,
          },
          {
            type: 'mrkdwn',
            text: `:red_circle: *Blocked:* ${status.blocked.length}`,
          },
          {
            type: 'mrkdwn',
            text: `:white_circle: *Queued:* ${status.queued.length}`,
          },
          {
            type: 'mrkdwn',
            text: `:eyes: *Awaiting Review:* ${status.awaitingReview.length}`,
          },
        ],
      },
      ...(status.blocked.length > 0
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Blocked cells need attention:*\n${issueList(status.blocked, '')}`,
              },
            },
          ]
        : []),
      ...(status.awaitingReview.length > 0
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Ready for review:*\n${issueList(status.awaitingReview, '')}`,
              },
            },
          ]
        : []),
    ],
  });
}

export async function handleCells(ctx: CommandContext): Promise<void> {
  const status = await ctx.github.getCellStatus();

  const sections: Array<Record<string, unknown>> = [];

  if (status.active.length > 0) {
    sections.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:large_green_circle: *Active (${status.active.length}):*\n${issueList(status.active, '')}`,
      },
    });
  }
  if (status.blocked.length > 0) {
    sections.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:red_circle: *Blocked (${status.blocked.length}):*\n${issueList(status.blocked, '')}`,
      },
    });
  }
  if (status.queued.length > 0) {
    sections.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:white_circle: *Queued (${status.queued.length}):*\n${issueList(status.queued, '')}`,
      },
    });
  }
  if (status.awaitingReview.length > 0) {
    sections.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:eyes: *Awaiting Review (${status.awaitingReview.length}):*\n${issueList(status.awaitingReview, '')}`,
      },
    });
  }

  if (sections.length === 0) {
    sections.push({
      type: 'section',
      text: { type: 'mrkdwn', text: 'No active cells found.' },
    });
  }

  await ctx.respond({
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'All Cells' },
      },
      ...sections,
    ],
  });
}

export async function handleBlocked(ctx: CommandContext): Promise<void> {
  const blocked = await ctx.github.listIssuesByLabel('cell:blocked');
  await ctx.respond({
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `Blocked Cells (${blocked.length})` },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: issueList(blocked, 'No blocked cells. All clear.'),
        },
      },
    ],
  });
}

export async function handleApprove(ctx: CommandContext): Promise<void> {
  const prNumber = parseInt(ctx.args[0], 10);
  if (!prNumber) {
    await ctx.respond({
      response_type: 'ephemeral',
      text: 'Usage: `/autoshop approve <pr-number>`',
    });
    return;
  }

  // Send confirmation with action buttons
  const pr = await ctx.github.getPR(prNumber);
  await ctx.respond({
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Approve <${pr.html_url}|PR #${prNumber}: ${pr.title}>?\nBranch: \`${pr.head.ref}\`\nState: ${pr.state}${pr.draft ? ' (draft)' : ''}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Approve' },
            style: 'primary',
            action_id: `approve_pr_${prNumber}`,
            value: String(prNumber),
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Cancel' },
            action_id: 'cancel_action',
          },
        ],
      },
    ],
  });
}

export async function handleMerge(ctx: CommandContext): Promise<void> {
  const prNumber = parseInt(ctx.args[0], 10);
  if (!prNumber) {
    await ctx.respond({
      response_type: 'ephemeral',
      text: 'Usage: `/autoshop merge <pr-number>`',
    });
    return;
  }

  const pr = await ctx.github.getPR(prNumber);
  await ctx.respond({
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:warning: Merge <${pr.html_url}|PR #${prNumber}: ${pr.title}>?\nBranch: \`${pr.head.ref}\`\nState: ${pr.state}${pr.merged ? ' (already merged)' : ''}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Merge (squash)' },
            style: 'danger',
            action_id: `merge_pr_${prNumber}`,
            value: String(prNumber),
            confirm: {
              title: { type: 'plain_text', text: 'Confirm Merge' },
              text: {
                type: 'mrkdwn',
                text: `This will squash-merge PR #${prNumber} into main. Are you sure?`,
              },
              confirm: { type: 'plain_text', text: 'Merge' },
              deny: { type: 'plain_text', text: 'Cancel' },
            },
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Cancel' },
            action_id: 'cancel_action',
          },
        ],
      },
    ],
  });
}

export function getCommandHandler(
  subcommand: string
): ((ctx: CommandContext) => Promise<void>) | null {
  switch (subcommand) {
    case 'status':
      return handleStatus;
    case 'cells':
      return handleCells;
    case 'blocked':
      return handleBlocked;
    case 'approve':
      return handleApprove;
    case 'merge':
      return handleMerge;
    default:
      return null;
  }
}
