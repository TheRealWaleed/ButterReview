import { z } from "zod";

export const GitLabMRChangeSchema = z
  .object({
    old_path: z.string(),
    new_path: z.string(),
    a_mode: z.string(),
    b_mode: z.string(),
    new_file: z.boolean(),
    renamed_file: z.boolean(),
    deleted_file: z.boolean(),
    diff: z.string(),
  })
  .passthrough();

export const GitLabMRChangesResponseSchema = z
  .object({
    id: z.number(),
    iid: z.number(),
    title: z.string(),
    description: z.string().nullable().default(""),
    source_branch: z.string(),
    target_branch: z.string(),
    changes: z.array(GitLabMRChangeSchema),
  })
  .passthrough();

export const GitLabDiffPositionSchema = z.object({
  base_sha: z.string(),
  start_sha: z.string(),
  head_sha: z.string(),
  position_type: z.literal("text"),
  old_path: z.string(),
  new_path: z.string(),
  new_line: z.number(),
});

export const GitLabMRVersionsSchema = z
  .object({
    id: z.number(),
    head_commit_sha: z.string(),
    base_commit_sha: z.string(),
    start_commit_sha: z.string(),
  })
  .passthrough();

export const GitLabFileContentSchema = z
  .object({
    content: z.string(),
  })
  .passthrough();

export const GitLabProjectSchema = z
  .object({
    id: z.number(),
  })
  .passthrough();

export type GitLabMRChange = z.infer<typeof GitLabMRChangeSchema>;
export type GitLabMRChangesResponse = z.infer<typeof GitLabMRChangesResponseSchema>;
export type GitLabDiffPosition = z.infer<typeof GitLabDiffPositionSchema>;
export type GitLabMRVersions = z.infer<typeof GitLabMRVersionsSchema>;
