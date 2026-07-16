# Daily Plan 8: Phase 2 - Builder Refinement & Deployment Loop (MERGED with Plan 12)

## Status: PENDING (Partially Implemented)

## Goal
Connect all existing UI components to real backend data, implement the GitHub deployment loop, and deliver a working end-to-end experience.

## 🚨 Critical Context: Current State
After auditing all plans against actual code:

| Aspect | Status |
|--------|--------|
| Frontend UI components | ✅ **All 13 components exist** (FileExplorer, CodeViewer, DiffView, HTMLPreview, PRStatus, VersionSelector, RefinementPanel, etc.) |
| GitHub API service | ⚠️ **Stub only** — returns mock data, no real GitHub API calls |
| Apply endpoint | ⚠️ **Route exists** but backend not connected to real GitHub |
| Preview components | ❌ **Not wired to real data** — show empty/mock content |
| Skeleton loading | ❌ **File missing** — `Skeleton.svelte` doesn't exist |
| Navigation Builder→Project | ❌ No route linking project detail to builder |

---

## Milestones (What Actually Needs to Be Done)

### Milestone 1: Connect Preview System to Real Data
**🟡 Most UI exists, but NOT connected to actual generation results**

| Component | Exists? | What's Missing |
|-----------|---------|----------------|
| `BuilderFileExplorer.svelte` | ✅ | Needs to read `builderStore.result.files` instead of mock data |
| `BuilderCodeViewer.svelte` | ✅ | Needs to show file content from selected file in explorer |
| `BuilderDiffView.svelte` | ✅ | Needs real diff between current app code and generated code |
| `BuilderHTMLPreview.svelte` | ✅ | Needs to render actual generated HTML in sandboxed iframe |
| `BuilderResultPanel.svelte` | ✅ | Needs to integrate all 4 components with real state coordination |

**Tasks:**
- [ ] Wire `BuilderFileExplorer` to `builderStore.result.files`
- [ ] Wire `BuilderCodeViewer` to selected file content from explorer
- [ ] Wire `BuilderDiffView` to compare current vs generated files
- [ ] Wire `BuilderHTMLPreview` to render generated HTML sandboxed
- [ ] Wire `BuilderResultPanel` to coordinate state between all 4 components
- [ ] Add `Skeleton.svelte` component (missing file)
- [ ] Add "Open Builder" button in project detail page

### Milestone 2: Real GitHub API Integration
**🔴 Critical — Currently returns mock data only**

**Backend (`platform-api/src/modules/github/service.ts`):**
- [ ] Implement real GitHub API client with Octokit
- [ ] `createBranch()` — Create a new branch from main
- [ ] `commitFiles()` — Commit generated files to the branch
- [ ] `createPullRequest()` — Open a PR with generated changes
- [ ] `getPRStatus()` — Poll GitHub Actions check status
- [ ] Store PR URL and status in D1 session metadata

**Frontend (`portal/src/lib/api.ts`):**
- [ ] Add GitHub OAuth flow button in Project settings
- [ ] Wire "Apply to GitHub" button in `BuilderResultPanel.svelte` (missing)
- [ ] Wire `BuilderPRStatus.svelte` to poll real PR status
- [ ] Show PR URL as clickable link after apply

### Milestone 3: Connect Workspace → Builder Navigation
**🔴 Missing — No way for user to reach Builder from Project**

- [ ] Add "Open AI Builder" button in project detail page
- [ ] Create route: `/project/{appId}/builder` that passes app context
- [ ] Wire `BuilderPage` to receive `tenantId` and `appId` from route params
- [ ] Ensure SSE connection starts when builder page loads with session

### Milestone 4: Deployment Workflow File
**🔴 Missing — No GitHub Actions workflow exists**

- [ ] Create `.github/workflows/deploy.yml` in the cloudflare repo
- [ ] Workflow: install → build → wrangler deploy to Cloudflare Pages
- [ ] Workflow: report status back to Platform API via webhook
- [ ] Workflow: comment PR with preview URL

---

## File Changes Summary

| File | Action | What |
|------|--------|------|
| `portal/src/lib/components/ui/Skeleton.svelte` | **CREATE** | Loading skeleton component |
| `portal/src/lib/features/builder/BuilderFileExplorer.svelte` | **UPDATE** | Connect to real store data |
| `portal/src/lib/features/builder/BuilderCodeViewer.svelte` | **UPDATE** | Show real file content |
| `portal/src/lib/features/builder/BuilderDiffView.svelte` | **UPDATE** | Real diff logic |
| `portal/src/lib/features/builder/BuilderHTMLPreview.svelte` | **UPDATE** | Real sandboxed rendering |
| `portal/src/lib/features/builder/BuilderResultPanel.svelte` | **UPDATE** | State coordination + Apply button |
| `portal/src/lib/features/builder/BuilderPRStatus.svelte` | **UPDATE** | Real polling + display |
| `portal/src/lib/stores/builder.svelte.ts` | **UPDATE** | Add apply state, PR status |
| `portal/src/routes/(app)/project/[appId]/builder/+page.svelte` | **CREATE** | Builder route with context |
| `platform-api/src/modules/github/service.ts` | **REWRITE** | Real GitHub API with Octokit |
| `platform-api/src/modules/builder/service.ts` | **UPDATE** | Real GitHub integration in apply() |
| `platform-api/src/modules/builder/routes.ts` | **UPDATE** | Pass env to service |
| `.github/workflows/deploy.yml` | **CREATE** | CI/CD pipeline |

## Success Criteria
- [ ] User opens builder from project detail page
- [ ] User generates code → sees real files in FileExplorer
- [ ] User clicks file → sees syntax-highlighted code in CodeViewer
- [ ] User sees diff between current and generated code
- [ ] User clicks "Apply to GitHub" → PR is created on real repo
- [ ] PR status shows real GitHub Actions check status
- [ ] User can see preview URL after successful deploy
- [ ] All loading states show skeleton components
- [ ] Errors show toast notifications

## Dependencies
- **Plan 13 (AI Gateway)** must be done first — without real AI, there's no generated code to preview or apply
- GitHub personal access token or GitHub App installation for API access
- Cloudflare API token for wrangler deploy in CI/CD

## References
- `docs/Architecture/ARCHITECTURE_V5_GITHUB_ACTIONS_USER_CF.md`
- `docs/Ops/GITHUB_ACTIONS_DEPLOYMENT_CONTRACT.md`
- `docs/Ops/GITOPS_WORKFLOW.md`
- `docs/FrontEnd/FEATURE_PATTERNS.md`