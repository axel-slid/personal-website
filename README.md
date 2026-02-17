# personal-website

Static site (HTML/CSS/JS) with a password-protected in-browser editor that commits changes to GitHub via Vercel serverless functions.

## Vercel environment variables

### Required
- `EDIT_SECRET` – random long string used to sign editor tokens.

### Editor accounts (choose one approach)
- **Simple (single admin):** `EDIT_PASSWORD`
- **Role-based (recommended):** `EDITORS_JSON` as JSON mapping roles to passwords.
  - Example: `{"admin":"<pw>","editor":"<pw>"}`
  - `admin` can publish, `editor` can only save drafts.

### Draft / publish
- `DRAFT_BRANCH` – branch name for draft saves (default: `draft`).
- `GITHUB_BRANCH` – production branch (default: `main`).

### GitHub write access
- `GITHUB_TOKEN` – GitHub token with `repo` scope.
- `GITHUB_OWNER` – repo owner (user/org).
- `GITHUB_REPO` – repo name.

## How it works
- Pages render their main content from `content/*.md`.
- Edit button opens the editor console (right side).
- **Save draft** commits to `DRAFT_BRANCH`.
- **Publish** (admin only) commits to `GITHUB_BRANCH`.