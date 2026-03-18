# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This is a demo project used to showcase the `/dep-upgrade` custom skill — a dependency audit and upgrade automation tool. It is an intentionally simple Node.js/Express REST API with **outdated dependencies** so the skill has real data to work with during demos.

## Commands

```bash
npm install          # install dependencies
npm start            # run the server (port 3000)
npm run dev          # run with nodemon (hot reload)
npm test             # run Jest tests with coverage
npm run lint         # run ESLint over src/
```

## Architecture

- **`src/index.js`** — Express app entry point; mounts `/api/tasks` and `/api/auth` routers
- **`src/routes/tasks.js`** — CRUD endpoints for in-memory task list; uses `lodash` and `moment`
- **`src/routes/auth.js`** — Register/login with `bcryptjs` + `jsonwebtoken`; GitHub profile proxy via `axios`
- **`src/utils/fetch.js`** — Thin wrappers around `node-fetch` and `minimist`
- **`src/tests/`** — Jest + Supertest integration tests

## The `/dep-upgrade` Skill

Located at `.claude/commands/dep-upgrade.md`. When invoked, it:

1. Scans `package.json`, runs `npm audit` and `npm outdated`
2. Searches for CVEs on significantly outdated packages
3. Categorizes each dependency as CRITICAL / HIGH / MEDIUM / LOW / DO NOT UPGRADE
4. Presents a structured report
5. Asks which packages to create upgrade PRs for (one PR per dependency)
6. **Automatically creates Linear tickets** for every upgraded dependency — no extra prompt

### Key behaviors
- One PR per dependency, never batched
- Always returns to `main` between PRs
- Linear ticket priority maps directly to audit tier (CRITICAL → Urgent, etc.)
- If `gh` CLI is not authenticated, prompts `gh auth login` before creating PRs
- If Linear API key is not set, prompts for it before creating tickets

## Outdated Dependencies (intentional, for demo)

| Package | Pinned Version | Known Issues |
|---|---|---|
| `axios` | 0.21.1 | CVE-2020-28168 (SSRF) |
| `lodash` | 4.17.4 | CVE-2019-10744 (prototype pollution) |
| `minimist` | 1.2.0 | CVE-2020-7598 (prototype pollution) |
| `moment` | 2.24.0 | Deprecated; ReDoS issues |
| `node-fetch` | 2.6.0 | CVE-2022-0235 (exposure of sensitive info) |
| `jsonwebtoken` | 8.5.1 | CVE-2022-23529, CVE-2022-23541 |
| `jest` | 26.6.3 | Multiple minor versions behind |
| `express` | 4.17.1 | Behind current 4.x and 5.x |
