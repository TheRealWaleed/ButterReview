import { createInterface } from "node:readline";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import type { InlineComment, ReviewResponse } from "./types/review.types.js";
import * as ui from "./ui.js";

// ── Keypress reader ──────────────────────────────────────────────────────────

function readKey(prompt: string, validKeys: string[]): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    // Enable raw mode for single keypress
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    process.stdout.write(prompt);

    const onData = (key: Buffer) => {
      const ch = key.toString();

      // Handle Ctrl+C
      if (ch === "\x03") {
        process.stdin.setRawMode?.(false);
        process.stdin.removeListener("data", onData);
        rl.close();
        process.exit(130);
      }

      if (validKeys.includes(ch)) {
        process.stdin.setRawMode?.(false);
        process.stdin.removeListener("data", onData);
        rl.close();
        resolve(ch);
      }
    };

    process.stdin.on("data", onData);
  });
}

// ── Editor ───────────────────────────────────────────────────────────────────

function openInEditor(content: string): string | null {
  const editor = process.env.EDITOR || process.env.VISUAL || "vi";
  const tmpFile = join(tmpdir(), `cr-comment-${Date.now()}.md`);

  writeFileSync(tmpFile, content, "utf-8");

  const result = spawnSync(editor, [tmpFile], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    try { unlinkSync(tmpFile); } catch {}
    return null;
  }

  const edited = readFileSync(tmpFile, "utf-8").trim();
  try { unlinkSync(tmpFile); } catch {}

  return edited || null;
}

// ── URL prompt ───────────────────────────────────────────────────────────────

export function promptUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    ui.waitingForUrl();
    ui.prompt("URL:");

    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

    rl.once("line", (line) => {
      rl.close();
      const input = line.trim();
      if (!input || input === "q" || input === "quit" || input === "exit") {
        resolve(null);
      } else {
        resolve(input);
      }
    });
  });
}

// ── Interactive comment review ───────────────────────────────────────────────

export interface ReviewedComment extends InlineComment {
  action: "post" | "skip";
}

export interface ReviewStats {
  posted: number;
  edited: number;
  skipped: number;
}

export async function reviewComments(
  comments: InlineComment[],
): Promise<{ approved: ReviewedComment[]; stats: ReviewStats }> {
  const approved: ReviewedComment[] = [];
  const stats: ReviewStats = { posted: 0, edited: 0, skipped: 0 };

  if (comments.length === 0) {
    return { approved, stats };
  }

  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];

    ui.commentCard(comment, i, comments.length);
    ui.actionBar({ bulk: i < comments.length - 1 });

    const key = await readKey("  > ", ["p", "e", "s", "P", "S"]);
    process.stdout.write("\n");

    if (key === "P") {
      // Post all remaining (including current)
      approved.push({ ...comment, action: "post" });
      stats.posted++;
      ui.actionResult("posted");

      for (let j = i + 1; j < comments.length; j++) {
        approved.push({ ...comments[j], action: "post" });
        stats.posted++;
      }
      ui.done(`Bulk-posted ${comments.length - i - 1} remaining comment(s)`);
      break;
    }

    if (key === "S") {
      // Skip all remaining (including current)
      stats.skipped += comments.length - i;
      ui.actionResult("skipped");
      ui.done(`Bulk-skipped ${comments.length - i - 1} remaining comment(s)`);
      break;
    }

    if (key === "p") {
      approved.push({ ...comment, action: "post" });
      stats.posted++;
      ui.actionResult("posted");
    } else if (key === "e") {
      const edited = openInEditor(comment.comment);
      if (edited && edited !== comment.comment) {
        approved.push({ ...comment, comment: edited, action: "post" });
        stats.edited++;
        ui.actionResult("edited");
      } else if (edited) {
        // No change, post as-is
        approved.push({ ...comment, action: "post" });
        stats.posted++;
        ui.actionResult("posted");
      } else {
        stats.skipped++;
        ui.actionResult("skipped");
      }
    } else {
      // s = skip
      stats.skipped++;
      ui.actionResult("skipped");
    }
  }

  return { approved, stats };
}

// ── Interactive summary review ───────────────────────────────────────────────

export async function reviewSummary(
  summaries: string[],
  approval: ReviewResponse["approval"],
  commentCount: number,
): Promise<string | null> {
  const summaryText = summaries.join("\n\n");

  ui.summaryCard(summaryText, approval);
  ui.actionBar({ bulk: false });

  const key = await readKey("  > ", ["p", "e", "s"]);
  process.stdout.write("\n");

  if (key === "p") {
    ui.actionResult("posted");
    return summaryText;
  }

  if (key === "e") {
    const edited = openInEditor(summaryText);
    if (edited) {
      ui.actionResult("edited");
      return edited;
    }
    ui.actionResult("skipped");
    return null;
  }

  // s = skip
  ui.actionResult("skipped");
  return null;
}
