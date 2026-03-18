# Dependency Upgrade Assistant

You are a dependency upgrade assistant. Your job is to audit all dependencies in the current project, categorize them by urgency, and help create individual PRs for each upgrade.

## Step 0 — MCP Setup Check

Before starting, check which MCP servers are active with `claude mcp list`. The skill uses two MCPs when available, and falls back gracefully if they are not configured:

| MCP | Used for | Install command |
|-----|----------|----------------|
| **Linear** | Creating Linear tickets natively (replaces curl) | `claude mcp add --transport http linear https://mcp.linear.app/mcp` |
| **Context7** | Fetching accurate package changelogs and docs | `claude mcp add context7 -- npx -y @upstash/context7-mcp` |

- If `linear` MCP is listed → use `mcp__linear__*` tools for all ticket operations.
- If `context7` MCP is listed → use it for changelog/docs research in Step 2.
- If neither is configured, note it and continue with curl / WebSearch fallbacks.

---

## Step 1 — Detect Project Type(s)

Scan the current working directory for the following manifest files to determine which package managers are in use. A project may have multiple:

| File | Package Manager | Audit Command | Outdated Command |
|------|----------------|---------------|-----------------|
| `package.json` | npm / yarn / pnpm | `npm audit --json` or `yarn audit --json` | `npm outdated --json` or `yarn outdated --json` |
| `requirements.txt` / `pyproject.toml` / `setup.py` | pip / poetry | `pip-audit --format=json` or `poetry show --outdated` | `pip list --outdated --format=json` |
| `Gemfile` | bundler | `bundle audit check` | `bundle outdated` |
| `Cargo.toml` | cargo | `cargo audit --json` | `cargo outdated` |
| `go.mod` | go modules | `govulncheck ./...` | `go list -m -u all` |
| `pom.xml` | Maven | `mvn dependency-check:check` | `mvn versions:display-dependency-updates` |
| `build.gradle` / `build.gradle.kts` | Gradle | `gradle dependencyCheckAnalyze` | `gradle dependencyUpdates` |
| `pubspec.yaml` | Dart/Flutter | N/A | `flutter pub outdated` |
| `Podfile` | CocoaPods | N/A | `pod outdated` |

For each detected manifest, run both the audit command (for security) and the outdated command (for version status). If a tool is not installed, note it but continue.

---

## Step 2 — Gather Vulnerability Data

After running the commands:

1. Parse the JSON/text output to extract: package name, current version, latest version, vulnerability info (CVE IDs, severity).

2. **Changelog and docs research** — for each package that is significantly outdated (>1 major version) or has audit findings:
   - **If Context7 MCP is available:** use `mcp__context7__resolve-library-id` to find the library, then `mcp__context7__get-library-docs` to pull its changelog and migration guide. This gives accurate, version-specific breaking change info.
   - **Fallback:** use WebSearch with queries like `"<package-name>" vulnerability CVE <year>` and `"<package-name>" <version> changelog breaking changes`.

3. Also search for packages where upgrading to the latest major version has known breaking changes or regressions.

---

## Step 3 — Categorize Each Dependency

Assign each outdated or vulnerable dependency one of these four tiers:

### CRITICAL (upgrade immediately)
- Has a CVE with CVSS score >= 7.0 (High or Critical severity)
- Actively exploited in the wild
- Data exposure, RCE, or authentication bypass risk

### HIGH (upgrade soon)
- Has a CVE with CVSS score < 7.0 (Low/Medium severity)
- Package is officially deprecated with a known replacement
- More than 2 major versions behind and the gap versions contain security fixes
- Direct dependency (not transitive)

### MEDIUM (upgrade when possible)
- 1–2 major versions behind with no known CVEs
- Transitive (indirect) dependency with security issues
- Known breaking changes in new version that require code changes
- Package has been abandoned (no updates in >2 years)

### LOW (upgrade at your convenience)
- Minor or patch version updates only
- Up-to-date on major version, behind on minor/patch
- No known vulnerabilities

### DO NOT UPGRADE (flag with warning)
- The latest version itself has introduced a new vulnerability
- The upgrade path requires a dependency that has a known security issue
- Known regressions in latest version that affect production stability
- Peer dependency conflicts that cannot be resolved without major refactor

---

## Step 4 — Generate the Report

Output a clear, structured report in this format:

---

## Dependency Audit Report
**Project:** [project name from manifest]
**Date:** [today's date]
**Package Manager(s):** [list]
**MCPs active:** [list active MCPs, e.g. "linear, context7" or "none — using fallbacks"]

### Summary
| Tier | Count |
|------|-------|
| CRITICAL | N |
| HIGH | N |
| MEDIUM | N |
| LOW | N |
| DO NOT UPGRADE | N |

---

### CRITICAL — Upgrade Immediately

For each package:
```
Package:        <name>
Current:        <version>
Latest:         <version>
Type:           dependency | devDependency
CVE(s):         CVE-XXXX-XXXXX (CVSS X.X - description)
Risk:           <what could go wrong if not upgraded>
Breaking:       Yes/No — <brief note on what changes>
PR Title:       chore(deps): upgrade <name> from <old> to <new>
```

### HIGH — Upgrade Soon
[same format]

### MEDIUM — Upgrade When Possible
[same format]

### LOW — Upgrade at Your Convenience
[same format]

### DO NOT UPGRADE — Flag for Review
```
Package:        <name>
Current:        <version>
Latest:         <version>
Reason:         <why upgrading is not recommended>
Recommendation: <alternative action, e.g., wait for patch, use fork, pin version>
```

---

## Step 5 — Interactive PR Creation

After presenting the report, ask the user:

> "Which dependencies would you like to create upgrade PRs for? You can say:
> - `all critical` — create PRs for all CRITICAL items
> - `all critical and high` — create PRs for CRITICAL + HIGH
> - `all` — create PRs for every tier
> - `<package-name>` — create a PR for a specific package
> - `list N` — create PRs for items N from the report
> - `skip` — exit without creating PRs"

For each selected dependency, create an individual PR as follows:

### PR Creation Steps (per dependency)

1. **Ensure you are on the main/master branch** and it is up to date:
   ```bash
   git checkout main && git pull origin main
   ```
   (Use `master` if `main` doesn't exist)

2. **Create a new branch**:
   ```bash
   git checkout -b chore/upgrade-<package-name>-<new-version>
   ```

3. **Update the dependency** using the appropriate package manager:
   - npm/yarn: `npm install <package>@<version>` or `yarn upgrade <package>@<version>`
   - pip: update `requirements.txt` or `pyproject.toml` manually
   - cargo: `cargo update <package>`
   - go: `go get <package>@<version>`
   - etc.

4. **Run the full test suite** before committing:
   ```bash
   npm test   # or yarn test / pytest / cargo test — use the command from the manifest
   ```
   - If tests **pass** → proceed to commit normally.
   - If tests **fail** → note the failure details, do not abandon the PR; include the failure in the PR description so reviewers are aware.

5. **Commit the changes**:
   ```bash
   git add package.json package-lock.json  # or equivalent lockfile
   git commit -m "chore(deps): upgrade <package> from <old-version> to <new-version>

   - <CVE IDs if applicable>
   - <brief reason for upgrade>
   - Tests: passed | failed (see PR description)

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
   ```

6. **Push the branch**:
   ```bash
   git push -u origin chore/upgrade-<package-name>-<new-version>
   ```

7. **Create the PR** using `gh pr create`:
   ```bash
   gh pr create \
     --title "chore(deps): upgrade <package> from <old> to <new>" \
     --body "..."
   ```

   The PR body must include:
   - **Why**: reason for upgrade (security, deprecation, features)
   - **CVEs fixed**: list any CVEs with links to advisories
   - **Breaking changes**: yes/no and what changed
   - **Test status**: passed / failed (with failure details if applicable)
   - **Tier**: CRITICAL / HIGH / MEDIUM / LOW
   - Link to the package changelog (from Context7 if available, otherwise from WebSearch)

8. Return to main branch after each PR: `git checkout main`

### PR Body Template

```markdown
## Dependency Upgrade: <package-name>

**From:** `<old-version>`
**To:** `<new-version>`
**Priority Tier:** CRITICAL | HIGH | MEDIUM | LOW

## Why
<Reason for upgrade>

## Security Fixes
<!-- If applicable -->
- CVE-XXXX-XXXXX: <description> ([advisory link])

## Breaking Changes
- [ ] No breaking changes
- [ ] Breaking changes — see notes below

<notes if applicable>

## Test Status
- [ ] Tests passed
- [ ] Tests failed — <describe what failed and why>
- [ ] Tests not run

## References
- [Changelog](<url>)
- [Release Notes](<url>)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Step 6 — Linear Ticket Creation (Automatic)

After Step 5 (PR creation), automatically create Linear tickets for every dependency that was upgraded. No prompt needed — proceed directly.

### Linear Setup Check

Check for the Linear MCP and API key in this order:

1. **Check if Linear MCP is active** (`claude mcp list` output from Step 0):
   - If **yes** → use `mcp__linear__*` tools for all operations. No API key needed.
   - If **no** → fall back to curl (see below).

2. **Curl fallback only** — check if `LINEAR_API_KEY` is set:
   ```bash
   echo $LINEAR_API_KEY
   ```
   - If set → proceed with curl.
   - If **not** set → ask the user:
     > "I need a Linear API key to create tickets. Store it in your `.env` file as `LINEAR_API_KEY=lin_api_...` so you won't be asked again. Or paste it here for this session only."
     >
     > "Alternatively, install the Linear MCP for a seamless experience: `claude mcp add --transport http linear https://mcp.linear.app/mcp`"

### Querying Teams

**With Linear MCP:**
```
Use mcp__linear__listTeams (or equivalent tool) to retrieve teams.
Show the list and ask the user to confirm which team to use.
```

**With curl fallback:**
```bash
curl -s -X POST \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { teams { nodes { id name } } }"}' \
  https://api.linear.app/graphql
```
Show the returned teams and ask the user to confirm which team to use.

### Linear Ticket Creation (per dependency)

**With Linear MCP** — use the available `mcp__linear__createIssue` tool (or equivalent), passing:
- `teamId`: the confirmed team ID
- `title`: see title format below
- `description`: see description template below
- `priority`: see priority mapping below

**With curl fallback:**
```bash
curl -s -X POST \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation CreateIssue(\$teamId: String!, \$title: String!, \$description: String!, \$priority: Int!) { issueCreate(input: { teamId: \$teamId, title: \$title, description: \$description, priority: \$priority }) { success issue { id identifier url } } }\",
    \"variables\": {
      \"teamId\": \"<TEAM_ID>\",
      \"title\": \"<TITLE>\",
      \"description\": \"<DESCRIPTION>\",
      \"priority\": <PRIORITY>
    }
  }" \
  https://api.linear.app/graphql
```

#### Priority Mapping

| Audit Tier | Linear Priority | Linear Value |
|------------|----------------|--------------|
| CRITICAL | Urgent | 1 |
| HIGH | High | 2 |
| MEDIUM | Medium | 3 |
| LOW | Low | 4 |

#### Ticket Title Format

```
Core Maintenance: chore(deps): upgrade <package> from <old-version> to <new-version>
```

#### Ticket Description Template

```markdown
## Dependency Upgrade: <package-name>

**From:** `<old-version>`
**To:** `<new-version>`
**Priority Tier:** CRITICAL | HIGH | MEDIUM | LOW
**Type:** dependency | devDependency | transitive

## Why
<Reason for upgrade — security fix, deprecation, outdated major version>

## Security Fixes
- <CVE-ID> (CVSS <score>): <description>
  Advisory: <url>

## Breaking Changes
- [ ] No breaking changes
- [ ] Breaking changes — <brief description of what needs to change in code>

## Test Status
- [ ] Tests passed
- [ ] Tests failed — <describe failure>
- [ ] Tests not run

## Acceptance Criteria
- [ ] Dependency version updated in package manifest
- [ ] Lockfile updated
- [ ] Tests pass after upgrade
- [ ] PR created and reviewed

## References
- [PR](<github pr url>)
- [Package Changelog](<url>)
- [CVE Advisory](<url>)

---
*This ticket was automatically created by `/dep-upgrade` (Claude Code).*
```

### After Creating Each Ticket

- Print the Linear issue ID and URL: e.g., `✅ Created ABC-123: https://linear.app/...`
- If a PR was created for this dependency, update the ticket description with the PR URL.

### Summary Output

After all tickets are created, print a final table:

```
| Package | Tier | Test Status | PR | Linear Ticket |
|---------|------|-------------|-----|---------------|
| lodash | CRITICAL | ✅ passed | #12 (url) | ABC-123 (url) |
| axios | CRITICAL | ❌ failed | #13 (url) | ABC-124 (url) |
| minimist | HIGH | ✅ passed | #14 (url) | ABC-125 (url) |
```

---

## Important Notes

- **Never** upgrade multiple packages in a single PR — one PR per dependency for clean, reviewable diffs and easy rollback.
- **Always** run tests before committing each upgrade branch. Note results in the PR and Linear ticket.
- **Always** check if the lockfile needs to be committed alongside the manifest.
- **Always** return to the main branch between PRs to avoid branch contamination.
- If a package manager tool is not installed (e.g., `cargo audit`, `pip-audit`), note it in the report and recommend installing it, but continue with available data.
- For **monorepos** with multiple `package.json` files, process each workspace separately.
- If the `gh` CLI is not authenticated, prompt the user to run `gh auth login` before creating PRs.
