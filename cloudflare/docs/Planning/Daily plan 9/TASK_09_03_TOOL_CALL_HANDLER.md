# TASK 09-03: Tool Call Handler

## Objective
Implement the mechanism to intercept "Action Calls" from the parsed AG-UI stream and execute corresponding local Svelte functions.

## Requirements
- Map tool names from `tool_call` packets to registered frontend functions.
- Handle asynchronous tool execution.
- Update the agent's state to reflect tool execution status (running, completed, failed).
- Support "Generative UI" by allowing tools to return component data.

## Deliverables
- `src/lib/features/builder/tool-handler.ts` (or integrated into existing feature logic).
- Integration with `useCopilotKit` or custom handler logic.
