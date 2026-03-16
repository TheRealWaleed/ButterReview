import pc from "picocolors";
import type { InlineComment, ReviewResponse } from "./types/review.types.js";

// ── Severity colors & icons ──────────────────────────────────────────────────

const SEVERITY_STYLE: Record<string, { icon: string; color: (s: string) => string; label: string }> = {
  critical: { icon: "\u{1F6A8}", color: pc.red,    label: "CRITICAL" },
  major:    { icon: "\u26A0\uFE0F",  color: pc.yellow, label: "MAJOR" },
  minor:    { icon: "\u{1F4AC}", color: pc.cyan,   label: "MINOR" },
  suggestion: { icon: "\u{1F4A1}", color: pc.green,  label: "SUGGESTION" },
};

const VERDICT_STYLE: Record<string, { icon: string; color: (s: string) => string; label: string }> = {
  approve:         { icon: "\u2705", color: pc.green,  label: "APPROVED" },
  request_changes: { icon: "\u274C", color: pc.red,    label: "CHANGES REQUESTED" },
  comment:         { icon: "\u{1F4AC}", color: pc.cyan,   label: "COMMENTED" },
};

// ── Box drawing ──────────────────────────────────────────────────────────────

const BOX = {
  tl: "\u256D", tr: "\u256E", bl: "\u2570", br: "\u256F",
  h: "\u2500", v: "\u2502", hBold: "\u2501",
} as const;

function repeat(char: string, n: number): string {
  return char.repeat(Math.max(0, n));
}

const WIDTH = 60;

// ── Banner ───────────────────────────────────────────────────────────────────

export function banner(): void {
  const inner = `  \u{1F50D} ${pc.bold("cr")} ${pc.dim("\u2014 AI Code Review")}  `;
  // Approximate visible length (strip ANSI for measurement)
  const visLen = 24;
  const pad = Math.max(0, WIDTH - 2 - visLen);
  const left = Math.floor(pad / 2);
  const right = pad - left;
  console.log("");
  console.log(`  ${pc.dim(BOX.tl + repeat(BOX.h, WIDTH - 2) + BOX.tr)}`);
  console.log(`  ${pc.dim(BOX.v)}${" ".repeat(left)}${inner}${" ".repeat(right)}${pc.dim(BOX.v)}`);
  console.log(`  ${pc.dim(BOX.bl + repeat(BOX.h, WIDTH - 2) + BOX.br)}`);
  console.log("");
}

// ── Progress steps ───────────────────────────────────────────────────────────

export function step(text: string): void {
  process.stdout.write(`  ${pc.magenta("\u25CF")} ${text}`);
}

export function stepDone(result?: string): void {
  process.stdout.write("\r\x1B[K"); // clear the line
  if (result) {
    console.log(`  ${pc.green("\u2714")} ${result}`);
  }
}

export function done(text: string): void {
  console.log(`  ${pc.green("\u2714")} ${text}`);
}

export function info(text: string): void {
  console.log(`  ${pc.cyan("\u25CB")} ${pc.dim(text)}`);
}

export function fail(text: string): void {
  console.log(`  ${pc.red("\u2716")} ${pc.red(text)}`);
}

export function warn(text: string): void {
  console.log(`  ${pc.yellow("\u26A0")} ${pc.yellow(text)}`);
}

// ── Divider ──────────────────────────────────────────────────────────────────

export function divider(): void {
  console.log(`\n  ${pc.dim(repeat(BOX.hBold, WIDTH - 2))}\n`);
}

// ── Spinner ──────────────────────────────────────────────────────────────────

const SPINNER_FRAMES = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];

export function spinner(text: string): { stop: (result?: string) => void } {
  let i = 0;
  const id = setInterval(() => {
    const frame = pc.magenta(SPINNER_FRAMES[i % SPINNER_FRAMES.length]);
    process.stdout.write(`\r  ${frame} ${text}`);
    i++;
  }, 80);

  return {
    stop(result?: string) {
      clearInterval(id);
      process.stdout.write("\r\x1B[K"); // clear the line
      if (result) {
        console.log(`  ${pc.green("\u2714")} ${result}`);
      }
    },
  };
}

// ── Comment card ─────────────────────────────────────────────────────────────

export function commentCard(comment: InlineComment, index: number, total: number): void {
  const style = SEVERITY_STYLE[comment.severity] ?? SEVERITY_STYLE.suggestion;
  const header = `${style.icon} ${style.color(pc.bold(style.label))} ${pc.dim("\u2500\u2500\u2500")} ${pc.white(comment.file)}${pc.dim(":")}${pc.white(String(comment.line))}`;

  console.log(`  ${pc.dim(`Comment ${index + 1}/${total}`)}`);
  console.log(`  ${pc.dim(BOX.tl + repeat(BOX.h, WIDTH - 2) + BOX.tr)}`);
  console.log(`  ${pc.dim(BOX.v)} ${header}`);
  console.log(`  ${pc.dim(BOX.v)}`);

  // Wrap comment text
  const lines = wrapText(comment.comment, WIDTH - 6);
  for (const line of lines) {
    console.log(`  ${pc.dim(BOX.v)}   ${line}`);
  }

  console.log(`  ${pc.dim(BOX.bl + repeat(BOX.h, WIDTH - 2) + BOX.br)}`);
}

// ── Summary card ─────────────────────────────────────────────────────────────

export function summaryCard(summary: string, approval: ReviewResponse["approval"]): void {
  const v = VERDICT_STYLE[approval] ?? VERDICT_STYLE.comment;

  console.log(`  ${pc.bold("Summary")}`);
  console.log(`  ${pc.dim(BOX.tl + repeat(BOX.h, WIDTH - 2) + BOX.tr)}`);

  const lines = wrapText(summary, WIDTH - 6);
  for (const line of lines) {
    console.log(`  ${pc.dim(BOX.v)}   ${line}`);
  }

  console.log(`  ${pc.dim(BOX.v)}`);
  console.log(`  ${pc.dim(BOX.v)}   ${pc.bold("Verdict:")} ${v.icon} ${v.color(v.label)}`);
  console.log(`  ${pc.dim(BOX.bl + repeat(BOX.h, WIDTH - 2) + BOX.br)}`);
}

// ── Action bar ───────────────────────────────────────────────────────────────

export function actionBar(options: { bulk?: boolean }): void {
  const parts = [
    `${pc.green(pc.bold("[p]"))} Post`,
    `${pc.yellow(pc.bold("[e]"))} Edit`,
    `${pc.dim(pc.bold("[s]"))} Skip`,
  ];
  if (options.bulk) {
    parts.push(`${pc.green(pc.bold("[P]"))} Post all`);
    parts.push(`${pc.dim(pc.bold("[S]"))} Skip all`);
  }
  console.log(`  ${parts.join("  ")}`);
}

export function actionResult(action: "posted" | "edited" | "skipped"): void {
  const map = {
    posted:  `${pc.green("\u2714")} Posted`,
    edited:  `${pc.yellow("\u2714")} Edited & queued`,
    skipped: `${pc.dim("\u2298")} Skipped`,
  };
  console.log(`  ${map[action]}`);
  console.log("");
}

// ── Verdict banner ───────────────────────────────────────────────────────────

export function verdictBanner(
  approval: ReviewResponse["approval"],
  stats: { posted: number; edited: number; skipped: number },
): void {
  const v = VERDICT_STYLE[approval] ?? VERDICT_STYLE.comment;
  const line1 = `${v.icon}  ${v.color(pc.bold(v.label))}`;
  const line2 = pc.dim(
    `${stats.posted} posted \u00B7 ${stats.edited} edited \u00B7 ${stats.skipped} skipped`,
  );

  console.log(`  ${pc.dim(BOX.tl + repeat(BOX.h, WIDTH - 2) + BOX.tr)}`);
  console.log(`  ${pc.dim(BOX.v)}  ${line1}${" ".repeat(Math.max(1, WIDTH - 30))}${pc.dim(BOX.v)}`);
  console.log(`  ${pc.dim(BOX.v)}  ${line2}${" ".repeat(Math.max(1, WIDTH - 38))}${pc.dim(BOX.v)}`);
  console.log(`  ${pc.dim(BOX.bl + repeat(BOX.h, WIDTH - 2) + BOX.br)}`);
  console.log("");
}

// ── Platform label ───────────────────────────────────────────────────────────

export function platformLabel(platform: "github" | "gitlab", ref: string): void {
  const icon = platform === "github" ? "\u{1F4E6}" : "\u{1F98A}";
  console.log(`  ${icon} ${pc.bold(ref)}`);
  console.log("");
}

// ── Prompt ───────────────────────────────────────────────────────────────────

export function prompt(text: string): void {
  process.stdout.write(`  ${pc.magenta("\u276F")} ${pc.bold(text)} `);
}

export function waitingForUrl(): void {
  console.log(`  ${pc.dim("Paste a GitHub PR or GitLab MR link (or")} ${pc.dim(pc.bold("q"))} ${pc.dim("to quit)")}`);
}

// ── Help (colorful) ──────────────────────────────────────────────────────────

export function help(): void {
  banner();
  console.log(`  ${pc.bold("Usage:")}`);
  console.log(`    ${pc.green("cr")}                  ${pc.dim("Interactive mode (recommended)")}`);
  console.log(`    ${pc.green("cr")} ${pc.dim("<url>")}            ${pc.dim("Review a single MR/PR and exit")}`);
  console.log("");
  console.log(`  ${pc.bold("Examples:")}`);
  console.log(`    ${pc.green("cr")} https://github.com/owner/repo/pull/123`);
  console.log(`    ${pc.green("cr")} https://gitlab.com/group/project/-/merge_requests/42`);
  console.log("");
  console.log(`  ${pc.bold("Environment:")}`);
  console.log(`    ${pc.cyan("GITHUB_TOKEN")}   GitHub personal access token`);
  console.log(`    ${pc.cyan("GITLAB_TOKEN")}   GitLab personal access token`);
  console.log(`    ${pc.cyan("GITLAB_URL")}     GitLab instance URL ${pc.dim("(default: https://gitlab.com)")}`);
  console.log("");
  console.log(`  ${pc.bold("Config file")} ${pc.dim("(optional)")}:`);
  console.log(`    ${pc.dim("~/.cr.json")}     { "githubToken": "...", "gitlabToken": "...", "gitlabUrl": "..." }`);
  console.log("");
}

// ── Text wrapping utility ────────────────────────────────────────────────────

function wrapText(text: string, maxWidth: number): string[] {
  const result: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.length === 0) {
      result.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      if (line.length + word.length + 1 > maxWidth && line.length > 0) {
        result.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) result.push(line);
  }
  return result;
}
