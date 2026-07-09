# TASK 09-02: Svelte Runes Integration

## Objective
Create a reactive, rune-based state management system that consumes parsed AG-UI packets to update the application's core state.

## Requirements
- Use Svelte 5 `$state` and `$derived` runes.
- Implement a central `builderStore` (or similar) that acts as the single source of truth.
- Automate updates for:
    - `messages`: The conversation history.
    - `applicationState`: The current file tree, editor context, etc.
    - `activeToolCalls`: Tracking currently executing tool calls.
- Ensure high performance with minimal re-renders.

## Deliverables
- Updated `src/lib/stores/builder.svelte.ts`.
- Integration logic in relevant components.
