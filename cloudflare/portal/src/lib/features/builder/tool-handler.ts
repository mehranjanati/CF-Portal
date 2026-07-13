/**
 * Type definition for a tool function that can be called by the agent.
 */
import type { AGUIToolCall } from '../../types/builder';
import { builderStore } from '../../stores/builder.svelte';

export type ToolFunction = (args: Record<string, any>) => Promise<void> | void;

/**
 * Registry of available tools that can be called by the agent.
 */
const toolRegistry: Record<string, ToolFunction> = {};

/**
 * Handles incoming tool calls from the AG-UI protocol.
 * This function should be called whenever a new tool call is added to the activeToolCalls list.
 */
export async function handleToolCalls() {
  // We use a loop to process all currently active tool calls.
  // In a real implementation, we might want to process them one by one 
  // or in parallel depending on the tool requirements.
  
  const calls = [...builderStore.activeToolCalls];
  
  for (const call of calls) {
    const tool = toolRegistry[call.tool_name];
    
    if (!tool) {
      console.error(`[ToolHandler] Tool "${call.tool_name}" not found in registry.`);
      // Remove the unknown tool call so it doesn't block the loop
      builderStore.activeToolCalls = builderStore.activeToolCalls.filter((c) => c.call_id !== call.call_id);
      continue;
    }

    try {
      console.log(`[ToolHandler] Executing tool: ${call.tool_name}`, call.args);
      await tool(call.args);
      
      // Remove the successful tool call
      builderStore.activeToolCalls = builderStore.activeToolCalls.filter((c) => c.call_id !== call.call_id);
    } catch (err) {
      console.error(`[ToolHandler] Error executing tool "${call.tool_name}":`, err);
      // Optionally, we could notify the agent about the error via a message packet
      // builderStore.addMessage({ type: 'message', role: 'assistant', content: `Tool ${call.tool_name} failed: ${err}` });
      
      // For now, we remove it to prevent infinite loops
      builderStore.activeToolCalls = builderStore.activeToolCalls.filter((c) => c.call_id !== call.call_id);
    }
  }
}

/**
 * Helper to register new tools into the handler.
 */
export function registerTool(name: string, fn: ToolFunction) {
  toolRegistry[name] = fn;
}

/**
 * Clears the tool registry. 
 * Use this for testing purposes.
 */
export function clearRegistry() {
  for (const key in toolRegistry) {
    delete toolRegistry[key];
  }
}

/**
 * Returns the current registry of tools (for debugging).
 * 
 */
export function getRegisteredTools() {
  return Object.keys(toolRegistry);
}
