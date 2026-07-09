# Daily Plan 8: Phase 2 - Builder Refinement & Deployment Loop

## Status: PENDING

## Goal
Transform the Builder MVP into a production-ready tool by implementing a high-fidelity preview system and the actual deployment loop (GitHub integration).

## Phase 2 Milestones

### Milestone 1: High-Fidelity Result Preview
- [ ] File Tree explorer for generated results
- [ ] Code editor/viewer with syntax highlighting (Monaco or similar)
- [ ] Side-by-side diff view (Current vs Generated)
- [ ] Preview of generated HTML/CSS (Sandboxed iframe)

### Milestone 2: GitHub Integration (The "Apply" Flow)
- [ ] GitHub App/OAuth flow for repository access
- [ ] Implementation of `builder.apply()`:
    - Create a new branch for the generation
    - Commit generated files to the branch
    - Open a Pull Request for review
- [ ] Status tracking for GitHub Actions deployments

### Milestone 3: Iterative Refinement Loop
- [ ] Enhanced `generate()` to support context from previous turns
- [ ] Ability to "Undo" or "Revert" to a previous generation version
- [ ] Prompt history management in the UI

### Milestone 4: UX/UI Polish & Stability
- [ ] Loading skeletons for all async states
- [ ] Comprehensive toast notification system for API errors/success
- [ ] Responsive layout optimizations for mobile/tablet
- [ ] Form validation for intents and prompts

## Task Breakdown

### Task 8.1: Advanced Preview System
**Goal**: Allow users to actually read and review the code before applying it.

**Files to create/update:**
1. `portal/src/lib/features/builder/BuilderFileExplorer.svelte` - File tree component
2. `portal/src/lib/features/builder/BuilderCodeViewer.svelte` - Syntax highlighted viewer
3. `portal/src/lib/features/builder/BuilderDiffView.svelte` - Diffing logic and UI
4. `portal/src/lib/features/builder/BuilderResultPanel.svelte` - Integration of explorer and viewer

### Task 8.2: GitHub Deployment Loop
**Goal**: Move generated code from the database to the actual GitHub repository.

**Server-side (platform-api):**
- Implement GitHub API client for branch/commit/PR operations
- Update `builder.apply()` to handle the git workflow
- Store PR links in the session metadata

**Client-side (portal):**
- Add "Apply to GitHub" button to `BuilderResultPanel`
- Implement PR status polling/webhooks display

### Task 8.3: Refinement & Versioning
**Goal**: Enable a conversational building experience.

**Implementation:**
- Update `CFAIProvider` to include previous generations in the system prompt
- Implement a "version" system in the D1 `builder_generations` table
- UI for switching between different generation versions

### Task 8.4: UX Polish
**Goal**: Remove "MVP feel" and ensure stability.

**Implementation:**
- Implement Svelte-based skeleton loaders
- Integrate `toast` store for all API errors
- Final accessibility pass (keyboard navigation, ARIA)

## Success Criteria
- [ ] User can browse generated files in a tree view
- [ ] User can trigger a GitHub PR with one click
- [ ] User can refine the result through multiple prompts
- [ ] No "raw" API errors are shown to the user (all handled via UI)

## References
- ARCHITECTURE_V5_GITHUB_ACTIONS_USER_CF.md
- GITOPS_WORKFLOW.md
- FEATURE_PATTERNS.md
