import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleToolCalls, registerTool, clearRegistry, getRegisteredTools } from './tool-handler';
import { builderStore } from '../../stores/builder.svelte';

describe('tool-handler', () => {
  beforeEach(() => {
    builderStore.reset();
    clearRegistry();
  });

  it('should do nothing when there are no active tool calls', async () => {
    await handleToolCalls();
    expect(builderStore.activeToolCalls).toHaveLength(0);
  });

  it('should execute a registered tool and remove it from activeToolCalls', async () => {
    const mockTool = vi.fn().mockResolvedValue(undefined);
    const toolName = 'test_tool_success';
    registerTool(toolName, mockTool);

    builderStore.activeToolCalls = [
      {
        call_id: 'call_1',
        tool_name: toolName,
        args: { foo: 'bar' },
        type: 'tool_call'
      }
    ];

    await handleToolCalls();

    expect(mockTool).toHaveBeenCalledWith({ foo: 'bar' });
    expect(builderStore.activeToolCalls).toHaveLength(0);
  });

  it('should remove the tool call if the tool is not found', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    builderStore.activeToolCalls = [
      {
        call_id: 'call_unknown',
        tool_name: 'unknown_tool',
        args: {},
        type: 'tool_call'
      }
    ];

    await handleToolCalls();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Tool "unknown_tool" not found'));
    expect(builderStore.activeToolCalls).toHaveLength(0);
    
    consoleSpy.mockRestore();
  });

  it('should remove the tool call if the tool execution fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('tool failed');
    const mockTool = vi.fn().mockRejectedValue(error);
    const toolName = 'test_tool_failure';
    registerTool(toolName, mockTool);

    builderStore.activeToolCalls = [
      {
        call_id: 'call_2',
        tool_name: toolName,
        args: {},
        type: 'tool_call'
      }
    ];

    await handleToolCalls();

    expect(mockTool).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`Error executing tool "${toolName}"`), error);
    expect(builderStore.activeToolCalls).toHaveLength(0);
    
    consoleSpy.mockRestore();
  });

  it('should register and retrieve tools', () => {
    const toolName = 'get_registered_tools_test';
    registerTool(toolName, async () => {});
    
    const registered = getRegisteredTools();
    expect(registered).toContain(toolName);
  });
});
