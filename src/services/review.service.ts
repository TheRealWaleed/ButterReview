import type { ReviewResponse, InlineComment } from "../types/review.types.js";
import type {
  PlatformClient,
  PlatformIdentifier,
  FileDiff,
  CommentPositionContext,
} from "../types/platform.types.js";
import { detectTechStack } from "./tech-detector.service.js";
import { buildSystemPrompt } from "../prompts/system.prompt.js";
import { buildReviewPrompt, chunkChanges } from "../prompts/review.prompt.js";
import { getReview } from "../claude.js";
import { formatInlineComment, formatSummaryNote } from "./review.formatter.js";
import * as ui from "../ui.js";

// ── Analysis result (no posting yet) ─────────────────────────────────────────

export interface AnalysisResult {
  comments: InlineComment[];
  summaries: string[];
  approval: ReviewResponse["approval"];
  changes: FileDiff[];
  positionCtx: CommentPositionContext;
}

// ── Analyze (fetch + Claude review, no posting) ──────────────────────────────

export async function analyzeMergeRequest(
  client: PlatformClient,
  identifier: PlatformIdentifier,
): Promise<AnalysisResult | null> {
  // 1. Fetch branch info
  ui.step("Fetching branch info...");
  const { sourceBranch, targetBranch } = await client.getBranchInfo(identifier);
  ui.stepDone(`Branch: ${sourceBranch} \u2192 ${targetBranch}`);

  // 2. Fetch changes
  ui.step("Fetching changes...");
  const changes = await client.getChanges(identifier);

  if (changes.length === 0) {
    ui.stepDone("No changes found, nothing to review.");
    return null;
  }

  ui.stepDone(`Found ${changes.length} changed file(s)`);

  // 3. Fetch comment position context
  ui.step("Fetching diff position context...");
  const positionCtx = await client.getCommentPositionContext(identifier);
  ui.stepDone();

  // 4. Detect tech stack
  ui.step("Detecting tech stack...");
  const techContext = await detectTechStack(client, identifier, targetBranch, changes);
  if (techContext.languages.length > 0) {
    const techStr = techContext.frameworks.length > 0
      ? `${techContext.languages.join(", ")} | ${techContext.frameworks.join(", ")}`
      : techContext.languages.join(", ");
    ui.stepDone(techStr);
  } else {
    ui.stepDone();
  }

  // 5. Build system prompt
  const systemPrompt = buildSystemPrompt(techContext);

  // 6. Chunk and review
  const chunks = chunkChanges(changes);
  const spin = ui.spinner(`Reviewing with Claude (${chunks.length} chunk(s))...`);

  const allComments: InlineComment[] = [];
  const summaries: string[] = [];
  let finalApproval: ReviewResponse["approval"] = "approve";

  for (let i = 0; i < chunks.length; i++) {
    const hasReviewableContent = chunks[i].some((c) => !c.isDeleted && c.diff);
    if (!hasReviewableContent) continue;

    const userPrompt = buildReviewPrompt(chunks[i]);
    const review = await getReview(systemPrompt, userPrompt);

    allComments.push(...review.comments);
    summaries.push(review.summary);

    if (review.approval === "request_changes") {
      finalApproval = "request_changes";
    } else if (review.approval === "comment" && finalApproval !== "request_changes") {
      finalApproval = "comment";
    }
  }

  spin.stop(`Review complete \u2014 ${allComments.length} comment(s)`);

  return {
    comments: allComments,
    summaries,
    approval: finalApproval,
    changes,
    positionCtx,
  };
}

// ── Post approved results ────────────────────────────────────────────────────

const COMMENT_CONCURRENCY = 5;

export async function postReviewResults(
  client: PlatformClient,
  identifier: PlatformIdentifier,
  result: AnalysisResult,
  approvedComments: InlineComment[],
  summaryText: string | null,
): Promise<void> {
  // Build change metadata lookup
  const changeByPath = new Map<string, FileDiff>();
  for (const change of result.changes) {
    changeByPath.set(change.newPath, change);
  }

  // Post inline comments
  if (approvedComments.length > 0) {
    const spin = ui.spinner(`Posting ${approvedComments.length} inline comment(s)...`);
    let posted = 0;
    let failed = 0;

    for (let i = 0; i < approvedComments.length; i += COMMENT_CONCURRENCY) {
      const batch = approvedComments.slice(i, i + COMMENT_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map((comment) => {
          const change = changeByPath.get(comment.file);
          const oldPath = change?.oldPath ?? comment.file;
          const body = formatInlineComment(comment);
          return client.postInlineComment(
            identifier, result.positionCtx, comment.file, comment.line, body, oldPath,
          );
        }),
      );

      for (const r of results) {
        if (r.status === "fulfilled") posted++;
        else failed++;
      }
    }

    if (failed > 0) {
      spin.stop(`Posted ${posted} comment(s), ${failed} failed`);
    } else {
      spin.stop(`Posted ${posted} inline comment(s)`);
    }
  }

  // Post summary
  if (summaryText) {
    const spin = ui.spinner("Posting summary...");
    const summaryNote = formatSummaryNote(
      [summaryText], approvedComments, result.approval,
    );
    await client.postSummaryComment(identifier, summaryNote);
    spin.stop("Summary posted");
  }
}
