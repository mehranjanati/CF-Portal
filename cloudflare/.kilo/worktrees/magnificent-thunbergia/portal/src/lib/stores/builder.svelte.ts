import type { BuilderSession, BuilderResult, BuilderTemplate, BuilderSessionStatus } from '../types/builder';
import { builder } from '../api';

export class BuilderStore {
  session = $state<BuilderSession | null>(null);
  result = $state<BuilderResult | null>(null);
  history = $state<BuilderSession[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);

  async createSession(tenantId: string, appId: string, template: BuilderTemplate, intent: string) {
    this.isLoading = true;
    this.error = null;
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
    try {
      const data = await builder.loadSession(sessionId);
      this.session = data;
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
      this.history = data.items || [];
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
    try {
      await builder.apply(this.session.id);
    } catch (err) {
      console.error('Failed to apply result:', err);
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

  reset() {
    this.session = null;
    this.result = null;
    this.error = null;
    this.isLoading = false;
  }
}

export const builderStore = new BuilderStore();
