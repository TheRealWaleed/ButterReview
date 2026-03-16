#!/usr/bin/env node

import { loadConfig, type Config } from "./config.js";
import { parseUrl, resolveGitLabProjectId, type ParsedUrl } from "./url-parser.js";
import type { PlatformIdentifier } from "./types/platform.types.js";
import { GitHubPlatformClient } from "./clients/github.client.js";
import { GitLabPlatformClient } from "./clients/gitlab.platform.js";
import { analyzeMergeRequest, postReviewResults } from "./services/review.service.js";
import { reviewComments, reviewSummary, promptUrl } from "./interactive.js";
import * as ui from "./ui.js";

async function main(): Promise<void> {
  const arg = process.argv[2];

  if (arg === "--help" || arg === "-h") {
    ui.help();
    process.exit(0);
  }

  ui.banner();

  const config = loadConfig();

  // If a URL was passed as argument, run once and exit
  if (arg) {
    const exitCode = await processReview(arg, config);
    process.exit(exitCode);
  }

  // Interactive loop — keep asking for URLs
  while (true) {
    const url = await promptUrl();

    if (!url) {
      console.log("");
      ui.done("Goodbye!");
      console.log("");
      process.exit(0);
    }

    await processReview(url, config);
    ui.divider();
  }
}

async function processReview(url: string, config: Config): Promise<number> {
  // ── Parse URL ───────────────────────────────────────────────────────────

  let parsed: ParsedUrl;
  try {
    parsed = parseUrl(url, config);
  } catch (err) {
    ui.fail((err as Error).message);
    return 1;
  }

  let identifier: PlatformIdentifier;
  let client: GitHubPlatformClient | GitLabPlatformClient;

  if (parsed.platform === "github") {
    if (!config.githubToken) {
      ui.fail("GITHUB_TOKEN is required for GitHub PRs.");
      ui.info("Set it via environment variable or ~/.cr.json");
      return 1;
    }

    identifier = {
      platform: "github",
      owner: parsed.owner,
      repo: parsed.repo,
      pullNumber: parsed.pullNumber,
    };
    client = new GitHubPlatformClient(config.githubToken);
    ui.platformLabel("github", `${parsed.owner}/${parsed.repo}#${parsed.pullNumber}`);
  } else {
    const gitlabUrl = parsed.host || config.gitlabUrl;

    if (!config.gitlabToken) {
      ui.fail("GITLAB_TOKEN is required for GitLab MRs.");
      ui.info("Set it via environment variable or ~/.cr.json");
      return 1;
    }

    ui.step("Resolving GitLab project...");
    let projectId: number;
    try {
      projectId = await resolveGitLabProjectId(parsed.projectPath, gitlabUrl, config.gitlabToken);
    } catch (err) {
      ui.stepDone();
      ui.fail((err as Error).message);
      return 1;
    }
    ui.stepDone(`Project ID: ${projectId}`);

    identifier = {
      platform: "gitlab",
      projectId,
      mrIid: parsed.mrIid,
    };
    client = new GitLabPlatformClient(config.gitlabToken, gitlabUrl);
    ui.platformLabel("gitlab", `${parsed.projectPath}!${parsed.mrIid}`);
  }

  // ── Phase 1: Analyze ──────────────────────────────────────────────────

  let result;
  try {
    result = await analyzeMergeRequest(client, identifier);
  } catch (err) {
    ui.fail((err as Error).message);
    return 1;
  }

  if (!result) {
    ui.done("Nothing to review.");
    return 0;
  }

  if (result.comments.length === 0 && result.summaries.length === 0) {
    ui.done("Review complete \u2014 no issues found.");
    return 0;
  }

  // ── Phase 2: Interactive comment review ───────────────────────────────

  ui.divider();

  const { approved, stats } = await reviewComments(result.comments);

  // ── Phase 3: Interactive summary review ───────────────────────────────

  ui.divider();

  const summaryText = await reviewSummary(
    result.summaries,
    result.approval,
    approved.length,
  );

  // ── Phase 4: Post approved results ────────────────────────────────────

  ui.divider();

  if (approved.length === 0 && !summaryText) {
    ui.info("Nothing to post \u2014 all comments and summary were skipped.");
  } else {
    try {
      await postReviewResults(client, identifier, result, approved, summaryText);
    } catch (err) {
      ui.fail(`Failed to post: ${(err as Error).message}`);
      return 1;
    }
  }

  // ── Phase 5: Final verdict ────────────────────────────────────────────

  ui.divider();
  ui.verdictBanner(result.approval, stats);
  ui.info(`Review URL: ${url}`);
  console.log("");

  return result.approval === "request_changes" ? 1 : 0;
}

main().catch((err: Error) => {
  console.log("");
  ui.fail(err.message);
  process.exit(1);
});
