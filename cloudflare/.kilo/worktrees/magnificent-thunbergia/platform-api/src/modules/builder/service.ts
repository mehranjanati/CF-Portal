import type { D1Database } from '@cloudflare/workers-types';
import { V0Provider } from './providers/v0';
import { SessionManager } from './sessions';
import { PromptManager } from './prompts';
import { GenerationManager } from './generations';
import { HistoryManager } from './history';

export class BuilderService {
  private provider = new V0Provider();
  private sessions: SessionManager;
  private prompts: PromptManager;
  private generations: GenerationManager;
  private history: HistoryManager;

  constructor(db: D1Database) {
    this.sessions = new SessionManager(db);
    this.prompts = new PromptManager(db);
    this.generations = new GenerationManager(db);
    this.history = new HistoryManager(db);
  }

  async createSession(tenantId: string, appId: string, template: string, intent: string) {
    const sessionId = `bs_${crypto.randomUUID().replace(/-/g, '')}`;
    await this.sessions.create({ id: sessionId, tenantId, appId, template, intent });

    const session = await this.sessions.get(sessionId);
    return this.mapSession(session!);
  }

  async getSession(sessionId: string) {
    const session = await this.sessions.get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    const prompts = await this.prompts.listBySession(sessionId);

    return {
      session: this.mapSession(session),
      prompts: prompts.map(p => ({
        id: p.id,
        prompt: p.prompt,
        status: p.status,
        responseSummary: p.response_summary,
        createdAt: p.created_at
      })),
      result: session.result_summary ? {
        summary: session.result_summary,
        files: JSON.parse(session.result_files_json || '[]'),
        nextActions: JSON.parse(session.result_next_actions_json || '[]')
      } : null
    };
  }

  async generate(sessionId: string, prompt: string) {
    const session = await this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const promptId = `bp_${crypto.randomUUID().replace(/-/g, '')}`;
    await this.prompts.create({
      id: promptId,
      sessionId,
      prompt,
      status: 'generating'
    });

    await this.sessions.updateStatus(sessionId, 'generating');

    try {
      const fullContext = `Intent: ${session.intent}\nTemplate: ${session.template}\nPrompt: ${prompt}`;
      const result = await this.provider.generate(fullContext);

      await this.sessions.updateResult(sessionId, result);
      await this.prompts.updateStatus(promptId, 'completed', result.summary);

      return {
        session: {
          id: sessionId,
          status: 'completed'
        },
        result
      };
    } catch (error: any) {
      await this.sessions.updateStatus(sessionId, 'failed');
      await this.prompts.updateStatus(promptId, 'failed', error.message);
      throw error;
    }
  }

  async getHistoryByApp(appId: string) {
    const sessions = await this.sessions.listByApp(appId);

    return sessions.map(session => ({
      session: this.mapSession(session),
      result: session.result_summary ? {
        summary: session.result_summary,
        files: JSON.parse(session.result_files_json || '[]'),
        nextActions: JSON.parse(session.result_next_actions_json || '[]')
      } : null
    }));
  }

  async applyResult(sessionId: string) {
    const session = await this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // For now, this is just a draft intent. 
    // In the future, this will trigger the GitHub push flow.
    return {
      success: true,
      message: 'Result applied to project draft. GitHub integration will be triggered in the next phase.',
      sessionId
    };
  }

  async publishApp(appId: string) {
    // For now, this is just a draft intent.
    // In the future, this will trigger the Cloudflare Pages deployment.
    return {
      success: true,
      message: 'Publish intent received. Deployment flow will be triggered in the next phase.',
      appId
    };
  }

  private mapSession(s: any) {
    return {
      id: s.id,
      tenantId: s.tenant_id,
      appId: s.app_id,
      template: s.template,
      intent: s.intent,
      status: s.status,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    };
  }
}
