import { AGUIMessage, AGUIToolCall, AGUIStateUpdate, AGUIPacket } from '../../types/agui';

export class AGUIPacketGenerator {
  static createMessage(role: 'user' | 'assistant', content: string): AGUIMessage {
    return {
      type: 'message',
      role,
      content,
    };
  }

  static createToolCall(tool_name: string, args: Record<string, any>, call_id: string): AGUIToolCall {
    return {
      type: 'tool_call',
      tool_name,
      args,
      call_id,
    };
  }

  static createStateUpdate(payload: Record<string, any>): AGUIStateUpdate {
    return {
      type: 'state_update',
      payload,
    };
  }

  static fromProviderEvent(event: any): AGUIPacket {
    switch (event.type) {
      case 'thought':
        return this.createMessage('assistant', event.data);
      case 'tool_call':
        return this.createToolCall(event.data.name, event.data.arguments, event.data.id);
      case 'tool_result':
        return this.createStateUpdate({ 
          event: 'tool_result', 
          tool_call_id: event.data.tool_call_id, 
          result: event.data.result 
        });
      case 'error':
        return this.createStateUpdate({ event: 'error', message: event.data });
      default:
        return this.createStateUpdate(event);
    }
  }
}
