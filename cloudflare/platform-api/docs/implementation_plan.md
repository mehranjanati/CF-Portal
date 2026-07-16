# Plan for Implementing Agentic Loop in platform-api

## 1. Update Provider Interfaces
- Modify `cloudflare/platform-api/src/modules/builder/providers/index.ts`:
    - Update `ProviderGenerateResult` to support both final results and tool calls.
    - Update `ProviderEvent` to include a `thought` type for reasoning streaming.
    - Define `ToolCall` interface.

## 2. Update CFAIProvider
- Modify `cloudflare/platform-api/src/modules/builder/providers/cfai.ts`:
    - Update `generate` method to return either a `final` result or `tool_calls`.
    - Improve the system prompt to instruct the model on how to use tools (simulated or real).
    - For now, implement a more realistic simulation of tool calling in `generate` to test the loop in `BuilderService`.
    - Ensure `onEvent` is called for `thought`, `tool_call`, and `tool_result`.

## 3. Implement Decision-Making Loop in BuilderService
- Modify `cloudflare/platform-api/src/modules/builder/service.ts`:
    - Update `generate` method to implement the loop:
        - While the result from `this.provider.generate` is `tool_calls`:
            - Execute the tools.
            - Capture tool results.
            - Emit `tool_result` via `notifyStream`.
            - Call `this.provider.generate` again with the tool results added to the context.
        - Once a `final` result is received:
            - Update the session with the final result.
            - Proceed with normal post-generation logic (history, generations, etc.).
    - Implement a basic `executeTool` method within `BuilderService` (or a separate helper) to handle the tool execution. For now, it can be a mock that handles a few predefined tools like `list_files`.

## 4. Verification
- Verify the implementation by running the `platform-api` and observing the logs/streams (if possible) or by adding more logging.
- Ensure that `notifyStream` is correctly used to emit all necessary events during the loop.
