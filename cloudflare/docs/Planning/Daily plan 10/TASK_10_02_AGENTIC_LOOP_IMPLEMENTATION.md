# TASK 10-02: Agentic Loop Implementation

## Objective
Implement the core "brain" of the agent on the edge, integrating an LLM (e.g., Claude 3.5 Sonson) with the agentic loop and the AG-UI protocol.

## Requirements
- Implement the decision-making loop: Input -> Reasoning -> Action/Response.
- Ensure the agent emits valid AG-UI protocol packets (Messages, Tool Calls, State Updates) via the SSE stream.
- Handle multi-step tool execution (Agent calls tool -> Tool executes -> Result returned to Agent -> Agent decides next step).
- Support reasoning streaming (streaming the agent's "thoughts" alongside the final response).

## Deliverables
- Core agentic loop logic in the `platform-api` service layer.
- Integration with an LLM provider (e.g., via Cloudflare AI or external API).
- Implementation of the AG-UI packet generator.
