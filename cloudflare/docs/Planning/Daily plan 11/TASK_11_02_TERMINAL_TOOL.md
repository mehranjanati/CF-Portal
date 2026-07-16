# TASK 11-02: Terminal / Command Execution Tool

## Objective
Implement a tool that allows the agent to execute shell commands as an MCP tool.

## Requirements
- Implement `runCommand(command)`: Execute a command and return stdout/stderr.
- Support common development commands (e.g., `npm install`, `npm run build`, `npm run dev`).
- **Long-running processes**: Implement a way to manage and track output from long-running processes (like dev servers).
- **Security**: Implement command sandboxing and ensure commands are executed within the project directory.
- **Human-in-the-loop**: Implement a permission prompting mechanism for high-impact/destructive commands.
- **Structure**: Implement using MCP tool definitions.

## Deliverables
- `src/lib/features/builder/tools/terminal.ts`
- Integration with the Tool Call Handler and MCP protocol.
