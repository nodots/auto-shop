/**
 * Auto-Shop Slack Bot — Cloudflare Worker entry point.
 *
 * Handles:
 * - /autoshop slash commands (status, cells, blocked, approve, merge)
 * - Interactive action buttons (confirm approve/merge, cancel)
 *
 * Secrets (set via wrangler secret put):
 * - SLACK_BOT_TOKEN
 * - SLACK_SIGNING_SECRET
 * - GITHUB_TOKEN
 *
 * Env vars (wrangler.toml [vars]):
 * - GITHUB_OWNER
 * - GITHUB_REPO
 */

import { GitHubClient } from './github';
import { getCommandHandler } from './commands';
import { getActionHandler } from './actions';

interface Env {
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
}

/** Verify Slack request signature using HMAC-SHA256 */
async function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBasestring = `v0:${timestamp}:${body}`;
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(sigBasestring));
  const hex = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const expected = `v0=${hex}`;
  return expected === signature;
}

/** JSON response helper */
function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const body = await request.text();

    // Verify Slack signature
    const timestamp = request.headers.get('X-Slack-Request-Timestamp') || '';
    const signature = request.headers.get('X-Slack-Signature') || '';

    // Reject requests older than 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
      return new Response('Request too old', { status: 403 });
    }

    const valid = await verifySlackSignature(
      env.SLACK_SIGNING_SECRET,
      timestamp,
      body,
      signature
    );
    if (!valid) {
      return new Response('Invalid signature', { status: 403 });
    }

    const github = new GitHubClient({
      token: env.GITHUB_TOKEN,
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
    });

    // Route: slash commands
    if (url.pathname === '/slack/commands') {
      const params = new URLSearchParams(body);
      const text = (params.get('text') || '').trim();
      const responseUrl = params.get('response_url') || '';
      const parts = text.split(/\s+/);
      const subcommand = parts[0] || 'status';
      const args = parts.slice(1);

      const handler = getCommandHandler(subcommand);
      if (!handler) {
        return jsonResponse({
          response_type: 'ephemeral',
          text: `Unknown command: \`${subcommand}\`.\nAvailable: \`status\`, \`cells\`, \`blocked\`, \`approve <pr>\`, \`merge <pr>\``,
        });
      }

      // Acknowledge immediately, then respond async
      const respond = async (payload: Record<string, unknown>) => {
        await fetch(responseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      };

      // Use waitUntil to process asynchronously
      const ctx = { github, respond, args };

      // Execute handler without blocking the response
      // In Cloudflare Workers, we need to use ctx.waitUntil from ExecutionContext
      // but since we only have env here, we respond immediately and use response_url
      handler(ctx).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        respond({ response_type: 'ephemeral', text: `Error: ${message}` });
      });

      // Immediate acknowledgment
      return jsonResponse({ response_type: 'ephemeral', text: 'Processing...' });
    }

    // Route: interactive actions (button clicks)
    if (url.pathname === '/slack/actions') {
      const params = new URLSearchParams(body);
      const payloadStr = params.get('payload') || '';
      const payload = JSON.parse(payloadStr);
      const action = payload.actions?.[0];

      if (!action) {
        return jsonResponse({ text: 'No action found' });
      }

      const responseUrl = payload.response_url || '';
      const respond = async (p: Record<string, unknown>) => {
        await fetch(responseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        });
      };

      const handler = getActionHandler(action.action_id);
      if (handler) {
        handler({
          github,
          respond,
          actionId: action.action_id,
          value: action.value || '',
        }).catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          respond({ replace_original: true, text: `Error: ${message}` });
        });
      }

      return new Response('', { status: 200 });
    }

    // Health check
    if (url.pathname === '/health') {
      return jsonResponse({ status: 'ok', service: 'auto-shop-slack-bot' });
    }

    return new Response('Not found', { status: 404 });
  },
};
