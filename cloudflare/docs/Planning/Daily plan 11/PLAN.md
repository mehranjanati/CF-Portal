# Plan: Tooling Phase (The Agent's "Hands")

This plan outlines the implementation of the tools required for the agent to interact with the real world (files, terminal, and browser).

## Overview

The goal of this phase is to transition from a "talking agent" (capable of reasoning and communication) to an "acting agent" (capable of executing tasks). This is achieved by providing the agent with a set of low-level, secure, and powerful tools.

## Tasks

### [ ] TASK 11-01: File System Tool Implementation
Implement core file operations (Read, Write, List, Delete, Move).

### [ ] TASK 11-02: Terminal / Command Execution Tool
Implement shell command execution for package management and build processes.

### [ ] TASK 11-03: Browser / Preview Tool
Implement a headless browser interface for visual verification and interaction.

## Implementation Details

### Tooling Architecture
All tools will be implemented as part of the `AG-UI` protocol. The agent will emit a `tool_call` packet, and the client-side `Tool Call Handler` will execute the corresponding local function.

### Security Considerations
- **Path Restriction**: All file system tools must be strictly scoped to the project directory to prevent unauthorized access to the host system.
- **Command Sandboxing**: Terminal commands should ideally run in a controlled environment to prevent destructive operations.
- **Permission Prompting**: For high-impact actions (e.g., `rm -rf`, `npm install`), the UI should implement a "Human-in-the-loop" approval step.

### Verification Strategy
- **Unit Tests**: Verify each tool's logic (e.g., file parsing, command execution).
- **End-to-End Tests**: Simulate an agentic workflow:
    1. Agent creates a new file.
    2. Agent runs `npm install`.
    3. Agent starts a dev server.
    4. Agent verifies the site via the Browser tool.
