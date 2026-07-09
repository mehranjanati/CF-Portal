import type { D1Database } from '@cloudflare/workers-types';

export interface BuilderGeneration {
  id: string;
  session_id: string;
  prompt: string;
  summary?: string;
  result_json?: string;
  status?: string;
  error_code?: string;
  error_message?: string;
  created_at: string;
  updated_at?: string;
}

export class GenerationManager {
  constructor(private db: D1Database) {}

  async create(data: {
    id: string;
    sessionId: string;
    prompt: string;
    summary?: string;
    resultJson?: string;
    status?: string;
    errorCode?: string;
    errorMessage?: string;
  }) {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO builder_generations (id, session_id, prompt, summary, result_json, status, error_code, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.id,
      data.sessionId,
      data.prompt,
      data.summary || null,
      data.resultJson || null,
      data.status || null,
      data.errorCode || null,
      data.errorMessage || null,
      now
    ).run();
  }

  async get(id: string): Promise<BuilderGeneration | null> {
    return await this.db.prepare(`
      SELECT * FROM builder_generations WHERE id = ?
    `).bind(id).first<BuilderGeneration>();
  }

  async update(id: string, updates: {
    status?: string;
    summary?: string;
    resultJson?: string;
    errorCode?: string;
    errorMessage?: string;
    completedAt?: string;
  }) {
    const setClauses: string[] = [];
    const values: any[] = [];
    
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.summary !== undefined) {
      setClauses.push('summary = ?');
      values.push(updates.summary);
    }
    if (updates.resultJson !== undefined) {
      setClauses.push('result_json = ?');
      values.push(updates.resultJson);
    }
    if (updates.errorCode !== undefined) {
      setClauses.push('error_code = ?');
      values.push(updates.errorCode);
    }
    if (updates.errorMessage !== undefined) {
      setClauses.push('error_message = ?');
      values.push(updates.errorMessage);
    }
    if (updates.completedAt !== undefined) {
      setClauses.push('completed_at = ?');
      values.push(updates.completedAt);
    }
    
    if (setClauses.length === 0) return;
    
    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    await this.db.prepare(`
      UPDATE builder_generations 
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `).bind(...values).run();
  }

  async listBySession(sessionId: string): Promise<BuilderGeneration[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM builder_generations WHERE session_id = ? ORDER BY created_at ASC
    `).bind(sessionId).all<BuilderGeneration>();
    return results || [];
  }

  async getLatestByApp(appId: string): Promise<BuilderGeneration | null> {
    const { results } = await this.db.prepare(`
      SELECT bg.* FROM builder_generations bg
      JOIN builder_sessions bs ON bg.session_id = bs.id
      WHERE bs.app_id = ?
      ORDER BY bg.created_at DESC
      LIMIT 1
    `).bind(appId).first<BuilderGeneration>();
    return results?.[0] ?? null;
  }
}