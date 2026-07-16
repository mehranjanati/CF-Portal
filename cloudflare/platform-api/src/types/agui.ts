export type AGUIMessage = {
  type: 'message';
  role: 'user' | 'assistant';
  content: string;
};

export type AGUIToolCall = {
  type: 'tool_call';
  tool_name: string;
  args: Record<string, any>;
  call_id: string;
};

import { ConflictResolutionStrategy } from './conflict-resolution';

export type AGUIStateUpdate = {
  type: 'state_update';
  payload: {
    event: 'state_update';
    data: {
      [key: string]: any;
      version_vector?: Record<string, number>;
    };
  };
};

// ... other types


export type AGUIPacket = AGUIMessage | AGUIToolCall | AGUIStateUpdate;
