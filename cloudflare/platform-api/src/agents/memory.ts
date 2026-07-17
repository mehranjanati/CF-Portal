export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export class SimpleMemory {
  private kv: KVNamespace;
  private maxMessages = 20;
  private ttl = 86400; // 24 hours

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    const data = await this.kv.get(`memory:${sessionId}`, 'json');
    return (data as Message[]) || [];
  }

  async addMessage(sessionId: string, message: Message): Promise<void> {
    const messages = await this.getMessages(sessionId);
    messages.push(message);

    // Keep only last N messages
    const trimmed = messages.slice(-this.maxMessages);

    await this.kv.put(`memory:${sessionId}`, JSON.stringify(trimmed), {
      expirationTtl: this.ttl,
    });
  }

  async clear(sessionId: string): Promise<void> {
    await this.kv.delete(`memory:${sessionId}`);
  }
}