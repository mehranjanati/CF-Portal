/**
 * Service responsible for managing the real-time connection (SSE)
 * between the client and the Cloudflare Worker.
 */
import type { AGUIPacket } from '../types/builder';
import { builderStore } from '../stores/builder.svelte';
import { parseAGUIPacket } from '../utils/agui-parser';

export class AgentConnection {
  private eventSource: EventSource | null = null;
  private baseUrl: string;
  private currentSessionId: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Starts the connection to the server for a specific session.
   * If the session ID has changed, it will reconnect to the new session.
   * @param sessionId The ID of the active session.
   */
  connect(sessionId?: string) {
    if (!sessionId) {
      console.warn('[AgentConnection] connect called without a sessionId. Skipping.');
      return;
    }

    if (this.currentSessionId === sessionId && this.eventSource) {
      return;
    }

    if (this.eventSource) {
      this.disconnect();
    }

    this.currentSessionId = sessionId;
    const url = `${this.baseUrl}/api/builder/sessions/${sessionId}/stream`;
    console.log('[AgentConnection] Connecting to:', url);
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      if (event.data) {
        try {
          builderStore.handleIncomingPacket(event.data);
        } catch (err) {
          console.error('[AgentConnection] Error handling incoming packet:', err);
        }
      }
    };

    this.eventSource.onerror = (err) => {
      console.error('[AgentConnection] SSE Error:', err);
      this.reconnect();
    };

    this.eventSource.onopen = () => {
      console.log('[AgentConnection] Connection established for session:', sessionId);
    };
  }

  /**
   * Closes the connection.
   */
  disconnect() {
    if (this.eventSource) {
      console.log('[AgentConnection] Disconnecting...');
      this.eventSource.close();
      this.eventSource = null;
      this.currentSessionId = null;
    }
  }

  /**
   * Attempts to reconnect after a delay.
   */
  private reconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (!this.currentSessionId) return;

    console.log(`[AgentConnection] Attempting to reconnect session ${this.currentSessionId} in 5s...`);
    setTimeout(() => {
        if (this.currentSessionId) {
            this.connect(this.currentSessionId);
        }
    }, 5000);
  }
}

// Singleton instance
export const agentConnection = new AgentConnection(import.meta.env.VITE_API_BASE_URL);
