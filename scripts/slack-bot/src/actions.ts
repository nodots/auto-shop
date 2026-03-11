/**
 * Action handlers for interactive Slack buttons (approve, merge, cancel).
 */

import { GitHubClient } from './github';

interface ActionContext {
  github: GitHubClient;
  respond: (payload: Record<string, unknown>) => Promise<void>;
  actionId: string;
  value: string;
}

export async function handleApproveAction(ctx: ActionContext): Promise<void> {
  const prNumber = parseInt(ctx.value, 10);
  try {
    await ctx.github.approvePR(prNumber);
    await ctx.respond({
      replace_original: true,
      text: `:white_check_mark: PR #${prNumber} approved.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.respond({
      replace_original: true,
      text: `:x: Failed to approve PR #${prNumber}: ${message}`,
    });
  }
}

export async function handleMergeAction(ctx: ActionContext): Promise<void> {
  const prNumber = parseInt(ctx.value, 10);
  try {
    const result = await ctx.github.mergePR(prNumber);
    if (result.merged) {
      await ctx.respond({
        replace_original: true,
        text: `:white_check_mark: PR #${prNumber} merged (squash).`,
      });
    } else {
      await ctx.respond({
        replace_original: true,
        text: `:warning: PR #${prNumber}: ${result.message}`,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.respond({
      replace_original: true,
      text: `:x: Failed to merge PR #${prNumber}: ${message}`,
    });
  }
}

export async function handleCancelAction(ctx: ActionContext): Promise<void> {
  await ctx.respond({
    replace_original: true,
    text: 'Action cancelled.',
  });
}

export function getActionHandler(
  actionId: string
): ((ctx: ActionContext) => Promise<void>) | null {
  if (actionId.startsWith('approve_pr_')) return handleApproveAction;
  if (actionId.startsWith('merge_pr_')) return handleMergeAction;
  if (actionId === 'cancel_action') return handleCancelAction;
  return null;
}
