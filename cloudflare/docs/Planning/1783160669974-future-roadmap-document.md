# Plan: Add Future Roadmap Document to Stack

## Goal
Create a comprehensive future roadmap document extending beyond the current Phase 5, adding strategic phases for ecosystem growth, advanced AI capabilities, enterprise features, and self-hosted execution plane.

## Context
- Current roadmap in `STACK_REVIEW_AND_ROADMAP.md` covers Phases 0-5 (Documentation Closure → Managed Platform Tier)
- Need to document Phase 6+ for long-term vision
- Immediate models/observations needed based on current stack analysis

## Tasks

### 1. Create Future Roadmap Document
**File:** `docs/Architecture/FUTURE_ROADMAP.md`

**Content Structure:**
- **Phase 6: Marketplace & Ecosystem** (Q3-Q4 2026)
  - MCP Marketplace on Cloudflare (D1 registry, R2 assets, Agents SDK runtime)
  - Template marketplace with versioning
  - Community-contributed components
  - Revenue sharing model

- **Phase 7: Advanced AI Capabilities** (Q4 2026-Q1 2027)
  - Multi-model routing via AI Gateway (cost/latency optimization)
  - RAG pipeline with Vectorize (doc ingestion, chunking, retrieval)
  - Agent-to-agent communication protocol
  - Fine-tuning workflow for custom models

- **Phase 8: Enterprise & Compliance** (Q1-Q2 2027)
  - SSO/SAML/OIDC integration
  - Audit logging to R2/Analytics Engine
  - Data residency controls (Hyperdrive + regional D1)
  - SOC2/ISO27001 readiness

- **Phase 9: Self-Hosted Execution Plane** (Q2-Q3 2027)
  - wasmCloud lattice integration (Track C from CLOUDFLARE_FIRST_ECOSYSTEM.md)
  - Hybrid deployment targets (cloudflare-default | self-hosted-wasmcloud)
  - Cluster control plane via Durable Objects
  - GitHub Actions dual-route deployment

- **Phase 10: Global AI Execution Network** (2027+)
  - Cross-region agent federation
  - Edge inference with Workers AI
  - Distributed state sync via Durable Objects
  - Marketplace as deployment fabric

### 2. Add Immediate Models/Observations Document
**File:** `docs/Architecture/IMMEDIATE_MODELS_OBSERVATIONS.md`

**Content:**
- **Observability Stack** (add now):
  - Workers Tail + Logpush to R2 for centralized logs
  - Analytics Engine for custom metrics (deployment success rate, build duration)
  - Health checks endpoint in platform-api (already exists at /api/health)
  - OpenTelemetry tracing for Worker-to-Worker calls

- **Security Model** (decide now):
  - Token encryption: AES-GCM via Web Crypto API (already in platform-api?)
  - GitHub OAuth scopes: minimal (repo, workflow, admin:repo_hook)
  - Cloudflare OAuth scopes: account:read, workers:edit, pages:edit
  - Secret rotation policy (90 days)

- **Data Model Extensions** (needed for Phase 1):
  - Add `deployment_target` enum to DeploymentRecord (cloudflare-user | workers-for-platforms | wasmcloud-selfhosted)
  - Add `runtime_target` to AppRecord for future routing
  - Add `feature_flags` JSON column to TenantRecord for Flagship integration

- **API Contracts** (finalize before Phase 1):
  - Webhook payloads from GitHub (push, workflow_run, deployment)
  - Deployment callback schema (already in api.ts as DeploymentCallbackPayload)
  - Agent session protocol (WebSocket + Durable Objects)

### 3. Update Stack Documentation Index
**File:** `README.md` (append to reading order)
- Add FUTURE_ROADMAP.md after STACK_REVIEW_AND_ROADMAP.md
- Add IMMEDIATE_MODELS_OBSERVATIONS.md after FUTURE_ROADMAP.md

## Validation
- [ ] Future roadmap document created with phases 6-10
- [ ] Immediate models/observations document created
- [ ] README.md updated with new document references
- [ ] All new documents follow existing naming conventions
- [ ] Cross-references to CLOUDFLARE_FIRST_ECOSYSTEM.md and STACK_REVIEW_AND_ROADMAP.md added

## Risks
- Scope creep: Keep future phases at strategic level, not implementation detail
- Alignment: Ensure Phase 6+ decisions don't conflict with Phase 0-5 baseline
- Maintenance: Mark documents with status (Draft/Proposed/Accepted) and review cadence

## Out of Scope
- Implementation of any phase
- Detailed technical specs for Phase 6+
- Migration scripts for data model extensions