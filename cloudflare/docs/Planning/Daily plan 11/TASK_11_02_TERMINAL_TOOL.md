# TASK 11-02: Terminal / Command Execution Tool

## Objective
Implement a tool that allows the agent to execute shell commands in a controlled environment.

## Requirements
- Implement `runCommand(command)`: Execute a command and return stdout/stderr.
- Support common development commands (e.g., `npm install`, `npm run build`, `npm run dev`).
- Implement a way to manage long-running processes (like dev servers) and their output.
- Ensure commands are executed within the project directory and have appropriate permissions.

## Deliverables
- `src/lib/features/builder/tools/terminal.ts`
- Integration with the Tool Call Handler.
