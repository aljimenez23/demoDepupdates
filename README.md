# demoDepupdates

A demo Node.js/Express REST API used to showcase the `/dep-upgrade` Claude Code skill — an automated dependency auditing and upgrade tool that creates GitHub PRs and Linear tickets for outdated or vulnerable packages.

## What this demo shows

The project intentionally uses outdated dependencies with known CVEs so the `/dep-upgrade` skill has real data to audit, categorize, and act on during a live demo.

## Getting started

```bash
npm install
npm run dev     # starts server with hot reload on port 3000
npm test        # runs Jest tests
npm run lint    # runs ESLint
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/auth/github/:username` | Fetch GitHub profile |

## The `/dep-upgrade` skill

This project is the demo target for the `/dep-upgrade` Claude Code custom skill. When run, it:

1. Audits all dependencies via `npm audit` and `npm outdated`
2. Searches for CVEs on significantly outdated packages
3. Categorizes findings into **CRITICAL / HIGH / MEDIUM / LOW / DO NOT UPGRADE**
4. Creates individual GitHub PRs for each selected upgrade (one PR per package)
5. Automatically creates Linear tickets for every upgrade — no extra prompting needed

### Prerequisites

- `gh` CLI authenticated (`gh auth login`)
- Linear API key set in `.env`:
  ```
  LINEAR_API_KEY=lin_api_your_key_here
  ```

### Running the skill

Open this project in Claude Code and run:

```
/dep-upgrade
```

## Intentionally outdated dependencies

| Package | Version | Issue |
|---------|---------|-------|
| `axios` | 0.21.1 | CVE-2020-28168 — SSRF |
| `lodash` | 4.17.4 | CVE-2019-10744 — prototype pollution |
| `minimist` | 1.2.0 | CVE-2020-7598 — prototype pollution |
| `moment` | 2.24.0 | Deprecated; ReDoS vulnerability |
| `node-fetch` | 2.6.0 | CVE-2022-0235 — exposure of sensitive info |
| `jsonwebtoken` | 8.5.1 | CVE-2022-23529, CVE-2022-23541 |
| `express` | 4.17.1 | Multiple versions behind |
| `jest` | 26.6.3 | Multiple versions behind |
