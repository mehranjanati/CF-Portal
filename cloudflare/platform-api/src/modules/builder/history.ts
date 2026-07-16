import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

export interface BuilderHistoryEntry {
  id: string;
  app_id: string;
  session_id?: string;
  generation_id?: string;
  status?: string;
  created_at: string;
}

export class HistoryManager {
  constructor(private db: D1Database) {}

  async create(data: {
    id: string;
    appId: string;
    sessionId?: string;
    generationId?: string;
    status?: string;
  }) {
    return this.prepareCreate(data).run();
  }

  prepareCreate(data: {
    id: string;
    appId: string;
    sessionId?: string;
    generationId?: string;
    status?: string;
  }): D1PreparedStatement {
    return this.db.prepare(`
      INSERT INTO builder_history (id, app_id, session_id, generation_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      data.id,
      data.appId,
      data.sessionId || null,
      data.generationId || null,
      data.status || null,
      new Date().toISOString()
    );
  }

  async get(id: string): Promise<BuilderHistoryEntry | null> {
    return await this.db.prepare(`
      SELECT * FROM builder_history WHERE id = ?
    `).bind(id).first<BuilderHistoryEntry>();
  }

  async listByApp(appId: string, limit = 50): Promise<BuilderHistoryEntry[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM builder_history 
      WHERE app_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).bind(appId, limit).all<BuilderHistoryEntry>();
    return results || [];
  }

  async getLatestByApp(appId: string): Promise<BuilderHistoryEntry | null> {
    const { results } = await this.db.prepare(`
      SELECT * FROM builder_history 
      WHERE app_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).bind(appId).all<BuilderHistoryEntry>();
    return results?.[0] ?? null;
  }
}
