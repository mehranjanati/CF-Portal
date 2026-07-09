import { describe, it, expect } from 'vitest';
import { parseAGUIPacket, type AGUIMessage, type AGUIToolCall, type AGUIStateUpdate } from './agui-parser';

describe('AG-UI Parser', () => {
  it('should parse a message packet', () => {
    const raw = 'data: {"type": "message", "role": "user", "content": "hello"}';
    const parsed = parseAGUIPacket(raw) as AGUIMessage;
    expect(parsed.type).toBe('message');
    expect(parsed.role).toBe('user');
    expect(parsed.content).toBe('hello');
  });

  it('should parse a tool_call packet', () => {
    const raw = '{"type": "tool_call", "tool_name": "get_weather", "args": {"city": "London"}, "call_id": "call_123"}';
    const parsed = parseAGUIPacket(raw) as AGUIToolCall;
    expect(parsed.type).toBe('tool_call');
    expect(parsed.tool_name).toBe('get_weather');
    expect(parsed.args).toEqual({ city: 'London' });
    expect(parsed.call_id).toBe('call_123');
  });

  it('should parse a state_update packet', () => {
    const raw = 'data: {"type": "state_update", "payload": {"user_name": "Alice"}}';
    const parsed = parseAGUIPacket(raw) as AGUIStateUpdate;
    expect(parsed.type).toBe('state_update');
    expect(parsed.payload).toEqual({ user_name: 'Alice' });
  });

  it('should throw an error for malformed JSON', () => {
    const raw = 'data: { invalid json }';
    expect(() => parseAGUIPacket(raw)).toThrow('Failed to parse AG-UI packet');
  });

  it('should throw an error for missing type', () => {
    const raw = 'data: {"foo": "bar"}';
    expect(() => parseAGUIPacket(raw)).toThrow('Missing packet type in AG-UI packet');
  });

  it('should handle raw JSON without data: prefix', () => {
    const raw = '{"type": "message", "role": "assistant", "content": "hi"}';
    const parsed = parseAGUIPacket(raw) as AGUIMessage;
    expect(parsed.type).toBe('message');
  });
});
