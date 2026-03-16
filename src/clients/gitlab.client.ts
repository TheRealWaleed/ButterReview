import { z } from "zod";
import { withRetry } from "../utils/retry.js";
import {
  GitLabMRChangesResponseSchema,
  GitLabMRVersionsSchema,
  GitLabFileContentSchema,
} from "../types/gitlab.types.js";
import type {
  GitLabMRChangesResponse,
  GitLabMRVersions,
  GitLabDiffPosition,
} from "../types/gitlab.types.js";

export class GitLabApiError extends Error {
  constructor(
    public readonly statusCode: number,
    path: string,
    body: string,
  ) {
    super(`GitLab API error ${statusCode} on ${path}: ${body}`);
  }
}

export class GitLabClient {
  private headers: Record<string, string>;
  private apiUrl: string;

  constructor(token: string, gitlabUrl: string) {
    this.headers = {
      "PRIVATE-TOKEN": token,
      "Content-Type": "application/json",
    };
    this.apiUrl = `${gitlabUrl}/api/v4`;
  }

  private async request<T>(path: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> {
    return withRetry(async () => {
      const res = await fetch(`${this.apiUrl}${path}`, {
        ...options,
        headers: { ...this.headers, ...options?.headers },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new GitLabApiError(res.status, path, body);
      }
      const json: unknown = await res.json();
      return schema.parse(json);
    });
  }

  private async requestVoid(path: string, options?: RequestInit): Promise<void> {
    const res = await fetch(`${this.apiUrl}${path}`, {
      ...options,
      headers: { ...this.headers, ...options?.headers },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new GitLabApiError(res.status, path, body);
    }
  }

  async getMRChanges(projectId: number, mrIid: number): Promise<GitLabMRChangesResponse> {
    return this.request(
      `/projects/${projectId}/merge_requests/${mrIid}/changes`,
      GitLabMRChangesResponseSchema,
    );
  }

  async getMRVersions(projectId: number, mrIid: number): Promise<GitLabMRVersions[]> {
    return this.request(
      `/projects/${projectId}/merge_requests/${mrIid}/versions`,
      z.array(GitLabMRVersionsSchema),
    );
  }

  async getFileContent(projectId: number, filePath: string, ref: string): Promise<string | null> {
    try {
      const encoded = encodeURIComponent(filePath);
      const data = await this.request(
        `/projects/${projectId}/repository/files/${encoded}?ref=${encodeURIComponent(ref)}`,
        GitLabFileContentSchema,
      );
      return Buffer.from(data.content, "base64").toString("utf-8");
    } catch (err) {
      if (err instanceof GitLabApiError && err.statusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  async postInlineComment(
    projectId: number,
    mrIid: number,
    position: GitLabDiffPosition,
    body: string,
  ): Promise<void> {
    await this.requestVoid(`/projects/${projectId}/merge_requests/${mrIid}/discussions`, {
      method: "POST",
      body: JSON.stringify({ body, position }),
    });
  }

  async postMRNote(projectId: number, mrIid: number, body: string): Promise<void> {
    await this.requestVoid(`/projects/${projectId}/merge_requests/${mrIid}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }
}
