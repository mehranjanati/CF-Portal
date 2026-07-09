import type { D1Database } from '@cloudflare/workers-types';

export interface BuilderSession {
  id: string;
  tenant_id: string;
  app_id: string;
  template: string;
  intent: string;
  status: string;
  result_summary?: string;
  result_files_json?: string;
  result_next_actions_json?: string;
  created_at: string;
  updated_at: string;
}

export class SessionManager {
  constructor(private db: D1Database) {}

  async create(data: { id: string; tenantId: string; appId: string; template: string; intent: string }) {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO builder_sessions (id, tenant_id, app_id, template, intent, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'idle', ?, ?)
    `).bind(data.id, data.tenantId, data.appId, data.template, data.intent, now, now).run();
  }

  async get(id: string): Promise<BuilderSession | null> {
    return await this.db.prepare(`
      SELECT * FROM builder_sessions WHERE id = ?
    `).bind(id).first<BuilderSession>();
  }

  async updateStatus(id: string, status: string) {
    await this.db.prepare(`
      UPDATE builder_sessions SET status = ?, updated_at = ? WHERE id = ?
    `).bind(status, new Date().toISOString(), id).run();
  }

  async updateResult(id: string, result: { summary: string; files: any[]; nextActions: any[] }) {
    await this.db.prepare(`
      UPDATE builder_sessions 
      SET status = 'completed', 
          result_summary = ?, 
          result_files_json = ?, 
          result_next_actions_json = ?, 
          updated_at = ?
      WHERE id = ?
    `).bind(
      result.summary,
      JSON.stringify(result.files),
      JSON.stringify(result.nextActions),
      new Date().toISOString(),
      id
    ).run();
  }

  async listByApp(appId: string): Promise<BuilderSession[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM builder_sessions WHERE app_id = ? ORDER BY created_at DESC
    `).bind(appId).all<BuilderSession>();
    return results || [];
  }
}