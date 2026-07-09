# Task 06.1: Portal Route Map

## Goal
Define the complete route structure for the new Builder UX in the portal, ensuring it aligns with the feature-based architecture and project coupling requirements.

## Route Structure
- **Main Entry**: `/builder` (mounted on `portal/src/routes/(app)/builder/+page.svelte`)
- **Nested Routes**:
  - `/builder/prompt` (for prompt input)
  - `/builder/result` (for generation summary)
  - `/builder/history` (for session history)
- **Navigation**:
  - Accessible from `Project Detail` via `Open Builder` CTA
  - Integrated with `portal/src/lib/features/builder/` components
- **Access Control**:
  - Route only available when a valid `appId`/`tenantId` context is present
  - Fallback to `Coming Soon` gating for incomplete features

## Route File Conventions
- **Thin wrapper**: `+page.svelte` only mounts the component tree
- **Dynamic parameters**: use `[...slug]` for flexible path segments if needed
- **Metadata**: set `meta.title = "Builder"` and `meta.icon = "builder"` in `+page.ts`

## Security & Auth
- Protected by `auth` store check in `+page.svelte`
- Requires active `workspace` context from store
- Redirect to project selection if no context exists

## Future Expansion
- Support for nested builder features (e.g., `/builder/template-library`)
- Multi-step wizard routing (`/builder/step-1`, `/builder/step-2`)

---