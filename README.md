# 🧈 ButterReview — Smooth Code Reviews

<p align="center">
  <img src="assets/robot.png" alt="ButterReview Robot" width="400" />
</p>

<p align="center">
  <em>"What is my purpose?" — "You review code." — "Oh my god."</em>
</p>

---

Paste a GitHub PR or GitLab MR link, get an AI-powered code review posted under **your name** — using the Claude CLI installed on your machine.

```
  ╭──────────────────────────────────────────────────────────╮
  │            🧈 ButterReview — Smooth Code Reviews         │
  ╰──────────────────────────────────────────────────────────╯

  Paste a GitHub PR or GitLab MR link (or q to quit)
  ❯ URL: https://github.com/octokit/rest/pull/42

  📦 octokit/rest#42

  ✔ Branch: feature/auth → main
  ✔ Found 5 changed files
  ✔ TypeScript | React, Vite
  ✔ Review complete — 3 comment(s)

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Comment 1/3
  ╭──────────────────────────────────────────────────────────╮
  │ 🚨 CRITICAL ─── src/auth.ts:42                          │
  │                                                          │
  │   The JWT secret is hardcoded. This is a security        │
  │   vulnerability. Use an environment variable instead.    │
  ╰──────────────────────────────────────────────────────────╯
  [p] Post  [e] Edit  [s] Skip  [P] Post all  [S] Skip all
  > p ✔ Posted

  ...

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Paste a GitHub PR or GitLab MR link (or q to quit)
  ❯ URL:
```

## Features

- **Dual platform** — GitHub PRs and GitLab MRs (including self-hosted)
- **Your identity** — reviews are posted under your account, not a bot
- **Interactive review** — approve, edit, or skip each comment before posting
- **`$EDITOR` integration** — edit any comment in vim/nano/your editor before posting
- **Tech-aware** — detects languages, frameworks, and build tools for context-aware reviews
- **Colorful DX** — severity-colored cards, spinners, box drawing, emoji icons
- **Large diff support** — auto-chunks diffs at 150K characters per batch
- **Interactive loop** — keeps prompting for URLs, review multiple MRs in one session
- **CI-friendly** — pass a URL as argument for single-run mode (exits with code `1` on changes requested)

## Installation

**Prerequisites:**
- Node.js >= 20
- [Claude CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

```bash
# Clone and install
git clone https://github.com/TheRealWaleed/butter-review.git
cd butter-review
pnpm install

# Build and link globally
pnpm build
npm link
```

Now you can use `butter-review` from anywhere.

## Usage

### Interactive mode (recommended)

Just run `butter-review` with no arguments. It will prompt you for a URL, run the review, then ask for the next one:

```bash
export GITHUB_TOKEN=ghp_...   # or GITLAB_TOKEN=glpat-...
butter-review
```

Type `q` to quit.

### Single-run mode

Pass a URL as argument to review once and exit (useful for CI/scripts):

```bash
butter-review https://github.com/owner/repo/pull/123
butter-review https://gitlab.com/group/project/-/merge_requests/42
butter-review https://git.company.com/team/project/-/merge_requests/99
```

## Interactive Review

After Claude analyzes the diff, each comment is presented for your approval:

| Key | Action |
|-----|--------|
| `p` | **Post** — post this comment as-is |
| `e` | **Edit** — open in `$EDITOR`, then post |
| `s` | **Skip** — don't post this comment |
| `P` | **Post all** — bulk-post all remaining |
| `S` | **Skip all** — bulk-skip all remaining |

The summary gets the same treatment (`p` / `e` / `s`).

Pressing `e` opens the comment in your default editor (`$EDITOR` → `$VISUAL` → `vi`). Save and quit to post the edited version. Empty file or editor error = skip.

## Severity Levels

| Terminal | Markdown | Meaning |
|----------|----------|---------|
| 🚨 **CRITICAL** (red) | :rotating_light: | Bugs, security issues, data loss — must fix |
| ⚠️ **MAJOR** (yellow) | :warning: | Design/performance problems |
| 💬 **MINOR** (cyan) | :information_source: | Style inconsistencies, naming |
| 💡 **SUGGESTION** (green) | :bulb: | Optional improvements, nice-to-haves |

## Configuration

Tokens can be set via environment variables or a config file.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_TOKEN` | For GitHub PRs | — | GitHub personal access token |
| `GITLAB_TOKEN` | For GitLab MRs | — | GitLab personal access token |
| `GITLAB_URL` | No | `https://gitlab.com` | GitLab instance URL |

### Config File

Create `~/.butter-review.json` as an alternative to env vars:

```json
{
  "githubToken": "ghp_...",
  "gitlabToken": "glpat-...",
  "gitlabUrl": "https://gitlab.com"
}
```

Environment variables take priority over the config file.

## How It Works

1. **Parse URL** — detects GitHub/GitLab, extracts owner/repo/PR number
2. **Fetch diff** — retrieves all changed files via platform API
3. **Detect tech stack** — scans file extensions and config files (package.json, go.mod, etc.)
4. **Build prompt** — constructs a review prompt following [Google's code review guidelines](https://google.github.io/eng-practices/review/)
5. **Run Claude** — pipes the prompt to your local `claude` CLI session
6. **Interactive review** — presents each comment for your approval
7. **Post** — posts only approved comments and summary under your account

Claude is invoked as:
```
claude -p --output-format text --system-prompt "..." "<diff>"
```

No API key needed — it uses whatever Claude session you already have authenticated.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Review complete — approved or commented |
| `1` | Review complete — changes requested |
| `1` | Error (missing token, invalid URL, etc.) |
| `130` | User cancelled with Ctrl+C |

## Development

```bash
# Run in dev mode — interactive
pnpm dev

# Run in dev mode — single URL
pnpm dev https://github.com/owner/repo/pull/123

# Build
pnpm build

# Run built version
pnpm start
```

## Tech Stack

- **TypeScript** — strict mode, ES2024 target, ESM
- **[@octokit/rest](https://github.com/octokit/rest.js)** — GitHub API
- **[zod](https://zod.dev)** — runtime validation
- **[picocolors](https://github.com/alexeyraspopov/picocolors)** — terminal colors
- **Claude CLI** — AI review engine (your local installation)

## License

MIT
