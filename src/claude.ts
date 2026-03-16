import { execFile } from "node:child_process";
import { ReviewResponseSchema } from "./types/review.types.js";
import type { ReviewResponse } from "./types/review.types.js";

export class ClaudeNotFoundError extends Error {
  constructor() {
    super(
      "Claude CLI not found. Install it from https://docs.anthropic.com/en/docs/claude-code\n" +
        "  brew install claude-code   (macOS)\n" +
        "  npm install -g @anthropic-ai/claude-code",
    );
  }
}

export class ClaudeParseError extends Error {
  constructor(public readonly rawText: string) {
    super(`Failed to parse Claude response as JSON: ${rawText.slice(0, 500)}`);
  }
}

export class ClaudeSchemaError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Claude response does not match expected schema: ${issues.join("; ")}`);
  }
}

/**
 * Run a review using the locally installed Claude CLI (`claude -p`).
 * The review is performed under the user's own Claude session.
 */
export async function getReview(
  systemPrompt: string,
  userPrompt: string,
): Promise<ReviewResponse> {
  const stdout = await runClaude(systemPrompt, userPrompt);

  // Strip markdown code fences if Claude wraps the JSON
  const cleaned = stdout.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ClaudeParseError(cleaned);
  }

  const result = ReviewResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new ClaudeSchemaError(
      result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    );
  }

  return result.data;
}

function runClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "-p",
      "--output-format",
      "text",
      "--system-prompt",
      systemPrompt,
      userPrompt,
    ];

    const child = execFile("claude", args, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        // Check if claude is not installed
        if ("code" in error && error.code === "ENOENT") {
          return reject(new ClaudeNotFoundError());
        }
        // Include stderr in error for debugging
        const msg = stderr ? `${error.message}\nstderr: ${stderr}` : error.message;
        return reject(new Error(`Claude CLI failed: ${msg}`));
      }

      const output = stdout.trim();
      if (!output) {
        return reject(new Error("Claude CLI returned empty output"));
      }

      resolve(output);
    });

    // Suppress stderr — the spinner in review.service handles progress
    child.stderr?.resume();
  });
}
