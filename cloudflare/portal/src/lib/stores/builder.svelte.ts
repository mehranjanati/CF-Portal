import type { BuilderSession, BuilderResult, AGUIMessage, AGUIToolCall, AGUIStateUpdate, AGUIPacket } from '../types/builder';
import { builder } from '../api';
import { parseAGUIPacket } from '../utils/agui-parser';
import { handleToolCalls } from '../features/builder/tool-handler';

export class BuilderStore {
  session = $state<BuilderSession | null>(null);
  result = $state<BuilderResult | null>(null);
  history = $state<BuilderSession[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);

  // AG-UI Protocol State
  messages = $state<AGUIMessage[]>([]);
  applicationState = $state<Record<string, any>>({});
  activeToolCalls = $state<AGUIToolCall[]>([]);

  // Original app code for diff comparison (keyed by file path)
  originalCode = $state<Record<string, string>>({});

  // Derived state
  isGenerating = $derived(this.session?.status === 'generating');

  async handleIncomingPacket(rawPacket: string) {
    try {
      const packet = parseAGUIPacket(rawPacket);
      
      switch (packet.type) {
        case 'message':
          this.messages.push(packet);
          break;
        case 'tool_call':
          this.activeToolCalls.push(packet);
          // Trigger the tool handler to process the new call
          handleToolCalls();
          break;
        case 'state_update':
          Object.assign(this.applicationState, packet.payload);
          break;
      }
    } catch (err) {
      console.error('[BuilderStore] Failed to handle incoming packet:', err);
    }
  }

  async createSession(tenantId: string, appId: string, template: string, intent: string) {
    this.isLoading = true;
    this.error = null;
    this.messages = [];
    this.applicationState = {};
    this.activeToolCalls = [];

    try {
      const data = await builder.createSession({
        tenantId,
        appId,
        template,
        intent
      });
      this.session = data;
      // Refresh history after creating session
      await this.loadHistory(appId);
    } catch (err: any) {
      this.error = err.message || 'Failed to create builder session';
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }

  async loadSession(sessionId: string) {
    this.isLoading = true;
    this.error = null;
    this.messages = [];
    this.applicationState = {};
    this.activeToolCalls = [];

    try {
      const data = await builder.loadSession(sessionId);
      this.session = data.session;
      if (data.result) {
        this.result = data.result;
      }
    } catch (err: any) {
      this.error = err.message || 'Failed to load session';
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }

  async loadHistory(appId: string) {
    if (!appId) return;
    try {
      const data = await builder.listHistory(appId);
      this.history = data?.items || [];
    } catch (err: any) {
      console.error('Failed to load history:', err);
      this.history = [];
    }
  }

  async selectSession(sessionId: string) {
    await this.loadSession(sessionId);
  }

  async generate(prompt: string) {
    if (!this.session) {
      this.error = 'No active session';
      return;
    }
    
    this.isLoading = true;
    this.error = null;
    
    // Update local state optimistically
    this.session.status = 'generating';
    
    try {
      const data = await builder.generate(this.session.id, prompt);
      
      this.session.status = data.session.status;
      this.result = data.result;
      
      // Capture original code for diff view when we receive generated code
      if (data.result?.files) {
        for (const file of data.result.files) {
          // Only store original code if we haven't already captured it for this path
          if (!this.originalCode[file.path]) {
            this.originalCode[file.path] = '';
          }
        }
      }
    } catch (err: any) {
      this.error = err.message || 'Generation failed';
      this.session.status = 'failed';
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }

  async apply() {
    if (!this.session) return;
    this.isLoading = true;
    this.error = null;
    try {
      const result = await builder.apply(this.session.id);
      return result;
    } catch (err: any) {
      this.error = err.message || 'Failed to apply result';
      console.error('Failed to apply result:', err);
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  async publish(appId: string) {
    this.isLoading = true;
    try {
      await builder.publish(appId);
    } catch (err) {
      console.error('Failed to publish app:', err);
    } finally {
      this.isLoading = false;
    }
  }

  async getSession(sessionId: string) {
    console.log('[BuilderStore] getSession called with id:', sessionId);
    const data = await builder.loadSession(sessionId);
    return data;
  }

  reset() {
    this.session = null;
    this.result = null;
    this.error = null;
    this.isLoading = false;
    this.messages = [];
    this.applicationState = {};
    this.activeToolCalls = [];
    this.originalCode = {};
  }
}

export const builderStore = new BuilderStore();
