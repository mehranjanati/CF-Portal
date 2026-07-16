import type { DurableObjectState } from '@cloudflare/workers-types';
import type { AppBindings } from '../../types/env';

export class SessionStreamer {
  private controllers: Set<ReadableStreamDefaultController> = new Set();
  private heartbeatInterval?: ReturnType<typeof setInterval>;

  constructor(private state: DurableObjectState, private env: AppBindings) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'POST') {
      try {
        const event = await request.json();
        await this.publish(event);
        return new Response('OK');
      } catch (e) {
        return new Response('Error parsing JSON', { status: 400 });
      }
    }

    const stream = new ReadableStream({
      start: (controller) => {
        this.controllers.add(controller);
        
        if (!this.heartbeatInterval) {
          this.heartbeatInterval = setInterval(() => {
            try {
              controller.enqueue(': heartbeat\n\n');
            } catch (e) {
              this.controllers.delete(controller);
              if (this.controllers.size === 0) {
                this.stopHeartbeat();
              }
            }
          }, 15000);
        }
      },
      cancel: () => {
        // The controller is not directly available here.
        // We will handle removal in the publish method when enqueue fails.
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  async publish(message: any) {
    const data = `data: ${JSON.stringify(message)}\n\n`;
    for (const controller of this.controllers) {
      try {
        controller.enqueue(data);
      } catch (e) {
        this.controllers.delete(controller);
        if (this.controllers.size === 0) {
          this.stopHeartbeat();
        }
      }
    }
  }
}
