# Plan: Phase 2 - Builder Refinement & Deployment Loop

This plan covers the transition from a basic MVP to a production-ready builder, focusing on previewing, applying, and refining generated code.

## Overview

The goal of Phase 2 is to close the loop between "Agent generating code" and "Code being live in a repository." This involves high-fidelity previews, seamless GitHub integration, and an iterative refinement workflow.

## Tasks

### [ ] TASK 08-01: Advanced Preview System
Implement file exploration, code viewing, and side-by-side diffing.

### [ ] TASK 08-02: GitHub Deployment Loop
Implement the "Apply" flow via GitHub App/OAuth, creating branches and PRs.

### [ ] TASK 08-03: Refinement & Versioning
Enable conversational refinement and version switching.

### [ ] TASK 08-04: UX/UI Polish & Stability
Improve loading states, notifications, and accessibility.

## Implementation Details

### Previewing
Users will be able to browse the file tree and see code changes using a side-by-side diff view before committing them to GitHub.

### GitHub Workflow
The `builder.apply()` method will orchestrate:
1.  Creating a feature branch.
2.  Committing the generated files.
3.  Opening a Pull Request.

### Refinement Loop
The agent will maintain context from previous turns, allowing users to say "Change the color to blue" and have the agent understand which file and which line to target.

## Success Criteria
- [ ] Users can preview all generated files.
- [ ] One-click GitHub PR creation works.
- [ ] Users can iterate on a result multiple times.
- [ ] The interface feels stable and professional.
