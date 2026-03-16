import { z } from "zod";
import type { Config } from "./config.js";

export interface GitHubParsed {
  platform: "github";
  owner: string;
  repo: string;
  pullNumber: number;
}

export interface GitLabParsed {
  platform: "gitlab";
  projectPath: string;
  mrIid: number;
  host: string;
}

export type ParsedUrl = GitHubParsed | GitLabParsed;

const GitLabProjectIdSchema = z.object({ id: z.number() }).passthrough();

/**
 * Parse a GitHub PR or GitLab MR URL into structured identifiers.
 *
 * Supports:
 *   https://github.com/owner/repo/pull/123
 *   https://gitlab.com/group/subgroup/project/-/merge_requests/42
 *   https://custom-gitlab.com/group/project/-/merge_requests/42
 */
export function parseUrl(url: string, config: Config): ParsedUrl {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  // GitHub
  const ghMatch = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (parsed.hostname === "github.com" && ghMatch) {
    return {
      platform: "github",
      owner: ghMatch[1],
      repo: ghMatch[2],
      pullNumber: parseInt(ghMatch[3], 10),
    };
  }

  // GitLab (gitlab.com or self-hosted matching configured URL)
  const glMatch = parsed.pathname.match(/^\/(.+)\/-\/merge_requests\/(\d+)/);
  if (glMatch) {
    return {
      platform: "gitlab",
      projectPath: glMatch[1],
      mrIid: parseInt(glMatch[2], 10),
      host: `${parsed.protocol}//${parsed.host}`,
    };
  }

  throw new Error(
    `Could not parse URL. Expected a GitHub PR or GitLab MR link.\n` +
      `  GitHub: https://github.com/owner/repo/pull/123\n` +
      `  GitLab: https://gitlab.com/group/project/-/merge_requests/42`,
  );
}

/**
 * Resolve a GitLab project path (e.g. "group/subgroup/project") to its numeric project ID.
 */
export async function resolveGitLabProjectId(
  projectPath: string,
  gitlabUrl: string,
  token: string,
): Promise<number> {
  const encoded = encodeURIComponent(projectPath);
  const res = await fetch(`${gitlabUrl}/api/v4/projects/${encoded}`, {
    headers: {
      "PRIVATE-TOKEN": token,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to resolve GitLab project "${projectPath}": ${res.status} ${body}`);
  }

  const json: unknown = await res.json();
  const project = GitLabProjectIdSchema.parse(json);
  return project.id;
}
