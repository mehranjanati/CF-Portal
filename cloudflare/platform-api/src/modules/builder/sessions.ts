import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

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
  version: number;
  version_vector: Record<string, number>;
}

export class SessionManager {
  constructor(private db: D1Database) {}

  prepareCreate(data: { id: string; tenantId: string; appId: string; template: string; intent: string; versionVector?: Record<string, number> }): D1PreparedStatement {
    const now = new Date().toISOString();
    const versionVector = data.versionVector ? JSON.stringify(data.versionVector) : '{}';
    return this.db.prepare(`
      INSERT INTO builder_sessions (id, tenant_id, app_id, template, intent, status, created_at, updated_at, version, version_vector)
      VALUES (?, ?, ?, ?, ?, 'idle', ?, ?, 1, ?)
    `).bind(data.id, data.tenantId, data.appId, data.template, data.intent, now, now, versionVector);
  }

  async create(data: { id: string; tenantId: string; appId: string; template: string; intent: string; versionVector?: Record<string, number> }) {
    await this.prepareCreate(data).run();
  }

  async get(id: string): Promise<BuilderSession | null> {
    const session = await this.db.prepare(`
      SELECT * FROM builder_sessions WHERE id = ?
    `).bind(id).first<any>();

    if (!session) return null;

    return {
      ...session,
      version_vector: session.version_vector ? JSON.parse(session.version_vector) : {}
    } as BuilderSession;
  }

  async updateStatus(id: string, status: string, expectedVersion: number) {
    const result = await this.prepareUpdateStatus(id, status, expectedVersion).run();
    const changes = (result as any).meta?.changes ?? (result as any).changes;
    if (changes === 0) {
      throw new Error('Conflict detected: session status update failed');
    }
  }

  prepareUpdateStatus(id: string, status: string, expectedVersion: number): D1PreparedStatement {
    const now = new Date().toISOString();
    return this.db.prepare(`
      UPDATE builder_sessions SET status = ?, updated_at = ?, version = version + 1 WHERE id = ? AND version = ?
    `).bind(status, now, id, expectedVersion);
  }

  async updateResult(id: string, result: { summary: string; files: any[]; nextActions: any[] }, expectedVersion: number) {
    const result_status = await this.prepareUpdateResult(id, result, expectedVersion).run();
    const changes = (result_status as any).meta?.changes ?? (result_status as any).changes;
    if (changes === 0) {
      throw new Error('Conflict detected: session result update failed');
    }
  }

  prepareUpdateResult(id: string, result: { summary: string; files: any[]; nextActions: any[] }, expectedVersion: number): D1PreparedStatement {
    const now = new Date().toISOString();
    return this.db.prepare(`
      UPDATE builder_sessions 
      SET status = 'completed', 
          result_summary = ?, 
          result_files_json = ?, 
          result_next_actions_json = ?, 
          updated_at = ?,
          version = version + 1
      WHERE id = ? AND version = ?
    `).bind(
      result.summary,
      JSON.stringify(result.files),
      JSON.stringify(result.nextActions),
      now,
      id,
      expectedVersion
    );
  }

  async update(id: string, data: Partial<BuilderSession>, expectedVersion: number) {
    const result = await this.prepareUpdate(id, data, expectedVersion).run();
    const changes = (result as any).meta?.changes ?? (result as any).changes;
    if (changes === 0) {
      throw new Error('Conflict detected: session update failed');
    }
  }

  prepareUpdate(id: string, data: Partial<BuilderSession>, expectedVersion: number): D1PreparedStatement {
    const fields = Object.keys(data).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'version');
    if (fields.length === 0) {
      return this.db.prepare('SELECT 1');
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => {
      const val = (data as any)[field];
      if (field === 'version_vector' && typeof val === 'object') {
        return JSON.stringify(val);
      }
      return val;
    });

    return this.db.prepare(`
      UPDATE builder_sessions 
      SET ${setClause}, updated_at = ?, version = version + 1
      WHERE id = ? AND version = ?
    `).bind(...values, new Date().toISOString(), id, expectedVersion);
  }

  async listByApp(appId: string): Promise<BuilderSession[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM builder_sessions WHERE app_id = ? ORDER BY created_at DESC
    `).bind(appId).all<BuilderSession>();
    return results || [];
  }
}