/**
 * AG-UI Protocol Types and Parser
 * 
 * This utility handles the parsing of structured text packets sent over 
 * Server-Sent Events (SSE) between the Cloudflare Worker and the Svelte client.
 */

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

export type AGUIStateUpdate = {
  type: 'state_update';
  payload: Record<string, any>;
};

export type AGUIPacket = AGUIMessage | AGUIToolCall | AGUIStateUpdate;

/**
 * Parses a raw string (potentially from an SSE stream) into an AG-UI packet.
 * Handles 'data: ' prefixes commonly found in SSE streams.
 * 
 * @param raw The raw string received from the stream.
 * @returns A structured AG-UI packet.
 * @throws Error if the packet is malformed or missing a type.
 */
export function parseAGUIPacket(raw: string): AGUIPacket {
  let cleaned = raw.trim();

  // Handle SSE 'data: ' prefix
  if (cleaned.startsWith('data: ')) {
    cleaned = cleaned.substring(6).trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Parsed content is not a valid object');
    }

    if (!parsed.type) {
      throw new Error('Missing packet type in AG-UI packet');
    }

    return parsed as AGUIPacket;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to parse AG-UI packet: ${message}`);
  }
}
