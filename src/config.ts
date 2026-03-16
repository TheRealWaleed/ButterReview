import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface Config {
  githubToken?: string;
  gitlabToken?: string;
  gitlabUrl: string;
}

function loadConfigFile(): Partial<Config> {
  try {
    const raw = readFileSync(join(homedir(), ".butter-review.json"), "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      githubToken: typeof parsed.githubToken === "string" ? parsed.githubToken : undefined,
      gitlabToken: typeof parsed.gitlabToken === "string" ? parsed.gitlabToken : undefined,
      gitlabUrl: typeof parsed.gitlabUrl === "string" ? parsed.gitlabUrl : undefined,
    };
  } catch {
    return {};
  }
}

export function loadConfig(): Config {
  const file = loadConfigFile();

  return {
    githubToken: process.env.GITHUB_TOKEN || file.githubToken,
    gitlabToken: process.env.GITLAB_TOKEN || file.gitlabToken,
    gitlabUrl: process.env.GITLAB_URL || file.gitlabUrl || "https://gitlab.com",
  };
}
