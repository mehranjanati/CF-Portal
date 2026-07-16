import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

export interface BuilderPrompt {
  id: string;
  session_id: string;
  prompt: string;
  response_summary?: string;
  status: string;
  created_at: string;
}

export class PromptManager {
  constructor(private db: D1Database) {}

  async create(data: { id: string; sessionId: string; prompt: string; status: string }) {
    return this.prepareCreate(data).run();
  }

  prepareCreate(data: { id: string; sessionId: string; prompt: string; status: string }): D1PreparedStatement {
    return this.db.prepare(`
      INSERT INTO builder_prompts (id, session_id, prompt, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(data.id, data.sessionId, data.prompt, data.status, new Date().toISOString());
  }

  async updateStatus(id: string, status: string, responseSummary?: string) {
    return this.prepareUpdateStatus(id, status, responseSummary).run();
  }

  prepareUpdateStatus(id: string, status: string, responseSummary?: string): D1PreparedStatement {
    return this.db.prepare(`
      UPDATE builder_prompts 
      SET status = ?, response_summary = ?
      WHERE id = ?
    `).bind(status, responseSummary || null, id);
  }

  async listBySession(sessionId: string): Promise<BuilderPrompt[]> {
    const result = await this.db.prepare(`
      SELECT * FROM builder_prompts WHERE session_id = ? ORDER BY created_at ASC
    `).bind(sessionId).all<BuilderPrompt>();
    return result.results || [];
  }
}
