# 🎯 Execution Plan: Phase 2 — From Mock to Real MVP

**Created:** 2026-07-15
**Based on:** Comprehensive audit of all 13 daily plans against actual code state

---

## 🚨 Key Finding

> **Most UI components exist but are NOT connected to real data.**
> The system currently generates hardcoded mock responses.
> This plan bridges the gap between "looks like it works" and "actually works."

---

## Phase 1: AI Gateway + Real LLM (Plan 13)

**Goal:** Replace hardcoded mock in `CFAIProvider` with real LLM calls via Cloudflare AI Gateway.

| # | Task | Files | Est. Time |
|---|------|-------|-----------|
| 1 | **Get OpenAI API Key + setup AI Gateway in Cloudflare Dashboard** | Cloudflare Dashboard | 30 min |
| 2 | **Write `AIGatewayProvider.ts`** — real HTTP calls to Gateway with SSE streaming, tool calling, and fallback | `platform-api/src/modules/builder/providers/ai-gateway.ts` **(NEW)** | 2h |
| 3 | **Add Factory + `MockProvider` to `providers/index.ts`** | `platform-api/src/modules/builder/providers/index.ts` **(UPDATE)** | 30 min |
| 4 | **Update `BuilderService.ts`** — use dynamic provider based on env | `platform-api/src/modules/builder/service.ts` **(UPDATE)** | 30 min |
| 5 | **Update `routes.ts`** — pass `c.env` to BuilderService constructor | `platform-api/src/modules/builder/routes.ts` **(UPDATE)** | 15 min |
| 6 | **Create `.dev.vars` + update `wrangler.toml`** with Gateway config | `platform-api/.dev.vars` **(NEW)**, `wrangler.toml` **(UPDATE)** | 15 min |
| 7 | **E2E test with real AI** — verify non-hardcoded output, SSE streaming, history | Smoke test + curl | 30 min |

**Total: ~5h** | **Dependency:** OpenAI API key, Cloudflare account

---

## Phase 2: GitHub Deployment Loop (Plan 8 — Milestone 2)

**Goal:** Generated code goes from DB → GitHub branch → PR → user can see status.

| # | Task | Files | Est. Time |
|---|------|-------|-----------|
| 8 | **Rewrite `github/service.ts` with real Octokit** — `createBranch()`, `commitFiles()`, `createPullRequest()`, `getPRStatus()` | `platform-api/src/modules/github/service.ts` **(REWRITE)** | 3h |
| 9 | **Connect `builder.apply()` to real GitHub** — wire route → service → GitHub API | `platform-api/src/modules/builder/service.ts`, `routes.ts` **(UPDATE)** | 1h |
| 10 | **Add "Apply to GitHub" button in BuilderResultPanel** | `portal/src/lib/features/builder/BuilderResultPanel.svelte` **(UPDATE)** | 1h |
| 11 | **Wire `BuilderPRStatus.svelte`** to poll real PR checks from backend | `portal/src/lib/features/builder/BuilderPRStatus.svelte` **(UPDATE)** | 1h |

**Total: ~6h** | **Dependency:** GitHub personal access token or GitHub App

---

## Phase 3: Wire Preview System to Real Data (Plan 8 — Milestone 1)

**Goal:** 7 existing UI components show real data instead of empty/mock content.

| # | Task | Files | Est. Time |
|---|------|-------|-----------|
| 12 | **Create `Skeleton.svelte`** (file missing from filesystem) | `portal/src/lib/components/ui/Skeleton.svelte` **(NEW)** | 30 min |
| 13 | **Wire `BuilderFileExplorer`** to `builderStore.result.files` | `BuilderFileExplorer.svelte` **(UPDATE)** | 30 min |
| 14 | **Wire `BuilderCodeViewer`** to selected file content | `BuilderCodeViewer.svelte` **(UPDATE)** | 30 min |
| 15 | **Wire `BuilderDiffView`** — compare current app code vs generated code | `BuilderDiffView.svelte` **(UPDATE)** | 1h |
| 16 | **Wire `BuilderHTMLPreview`** — sandboxed iframe rendering of generated HTML | `BuilderHTMLPreview.svelte` **(UPDATE)** | 1h |
| 17 | **Wire `BuilderResultPanel`** — coordinate state between all 4 components | `BuilderResultPanel.svelte` **(UPDATE)** | 1h |

**Total: ~4.5h** | **Dependency:** Phase 1 (need real generated content to preview)

---

## Phase 4: Navigation + CI/CD (Plan 8 — Milestones 3 & 4)

**Goal:** User can navigate from Project → Builder, and deployments work end-to-end.

| # | Task | Files | Est. Time |
|---|------|-------|-----------|
| 18 | **Add "Open AI Builder" button in project detail page** | Project detail route/page **(UPDATE)** | 30 min |
| 19 | **Create route: `/project/{appId}/builder`** that passes app context | `portal/src/routes/(app)/project/[appId]/builder/+page.svelte` **(NEW)** | 30 min |
| 20 | **Create `.github/workflows/deploy.yml`** — CI/CD pipeline: install → build → wrangler deploy | `.github/workflows/deploy.yml` **(NEW)** | 1h |

**Total: ~2h** | **Dependency:** Phase 2 (GitHub API + deploy loop)

---

## Summary

```
Phase 1: AI Gateway      →  7 tasks  ~5h    🔴 CRITICAL PATH — START HERE
Phase 2: GitHub Deploy   →  4 tasks  ~6h    🔴 NEEDS PHASE 1
Phase 3: Wire Preview    →  6 tasks  ~4.5h  🟡 NEEDS PHASE 1 (real content)
Phase 4: Nav + CI/CD     →  3 tasks  ~2h    🟢 CAN BE PARALLEL
─────────────────────────────────────────────────────
Total:                   20 tasks  ~17.5h
```

## Status Tracking

- [ ] **Phase 1** — 0/7 tasks complete
- [ ] **Phase 2** — 0/4 tasks complete
- [ ] **Phase 3** — 0/6 tasks complete
- [ ] **Phase 4** — 0/3 tasks complete
- [ ] **Total** — 0/20 tasks complete

## References

| Plan | File | Description |
|------|------|-------------|
| 13 | `Daily plan 13/PLAN.md` | AI Gateway architecture & approach |
| 13 | `Daily plan 13/TASK_13_01_AI_GATEWAY_SETUP.md` | Cloudflare Dashboard setup steps |
| 13 | `Daily plan 13/TASK_13_02_AI_GATEWAY_PROVIDER.md` | AIGatewayProvider class design |
| 13 | `Daily plan 13/TASK_13_03_PROVIDER_SELECTION.md` | Provider factory & env config |
| 13 | `Daily plan 13/TASK_13_04_VERIFICATION.md` | Test scenarios & smoke test |
| 8 | `Daily plan 8/PLAN.md` | GitHub deploy + Preview wiring |
| 8 | `Daily plan 8/Daily plan 8_Tasks/TASK_08_02_GITHUB_DEPLOYMENT_LOOP.md` | GitHub API integration details |
| — | `Architecture/ARCHITECTURE_V5_GITHUB_ACTIONS_USER_CF.md` | Overall V5 architecture |
| — | `Ops/GITHUB_ACTIONS_DEPLOYMENT_CONTRACT.md` | CI/CD contract spec |