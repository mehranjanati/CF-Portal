import type { D1Database } from '@cloudflare/workers-types';
import { createProvider, MockProvider, type ProviderEvent } from './providers/index';
import { SessionManager } from './sessions';
import { PromptManager } from './prompts';
import { GenerationManager } from './generations';
import { HistoryManager } from './history';
import { ToolCall } from './providers/index';
import { AGUIPacketGenerator } from './agui-packet-generator';
import { AGUIPacket } from '../../types/agui';
import { getAppById } from '../apps/queries';
import { listDeploymentSummaries } from '../deployments/queries';
import type { AppRecord, DeploymentRecord } from '../../types/api';
import { compareVersionVectors, mergeVersionVectors, type VersionVector } from '../../lib/conflict-resolution';
import { ConflictResolutionStrategy } from '../../types/conflict-resolution';
import { StateConflictError } from '../../lib/errors';
import type { Conflict } from '../../types/conflict-resolution';
import { GitHubIntegrationService } from '../github/service';
import { FileSystemTools } from '../../lib/features/builder/tools/file-system';
import { TerminalTools } from '../../lib/features/builder/tools/terminal';

declare var process: any;

export class BuilderService {
  private db: D1Database;
  private provider: any; // ProviderAdapter
  private sessions: SessionManager;
  private prompts: PromptManager;
  private generations: GenerationManager;
  private history: HistoryManager;
  private streamer: DurableObjectNamespace;
  private fileSystem: FileSystemTools;
  private terminal: TerminalTools;
  private github: GitHubIntegrationService;

  constructor(db: D1Database, ai?: any, streamer?: DurableObjectNamespace, env?: any) {
    this.db = db;
    this.sessions = new SessionManager(db);
    this.prompts = new PromptManager(db);
    this.generations = new GenerationManager(db);
    this.history = new HistoryManager(db);
    this.streamer = streamer!;
    this.fileSystem = new FileSystemTools(process.cwd());
    this.terminal = new TerminalTools(process.cwd());
    this.github = new GitHubIntegrationService();

    // Determine provider based on environment configuration
    if (env?.AI_GATEWAY_TOKEN && env?.AI_GATEWAY_URL) {
      console.log('[BuilderService] Using AIGatewayProvider');
      this.provider = createProvider({
        type: 'ai-gateway',
        gatewayUrl: env.AI_GATEWAY_URL,
        gatewayToken: env.AI_GATEWAY_TOKEN,
        primaryModel: env.AI_GATEWAY_PRIMARY_MODEL,
        fallbackModel: env.AI_GATEWAY_FALLBACK_MODEL,
        aiBinding: ai
      });
    } else if (ai) {
      console.log('[BuilderService] Using CFAIProvider (Workers AI)');
      this.provider = createProvider({
        type: 'cloudflare-ai',
        aiBinding: ai
      });
    } else {
      console.log('[BuilderService] Using MockProvider');
      this.provider = createProvider({
        type: 'mock'
      });
    }
  }

  private async notifyStream(sessionId: string, packet: AGUIPacket) {
    const id = this.streamer.idFromName(sessionId);
    const streamer = this.streamer.get(id);
    await streamer.fetch(new Request(`http://localhost/publish`, {
      method: 'POST',
      body: JSON.stringify(packet)
    }));
  }

  private async executeTool(toolCall: ToolCall): Promise<any> {
    console.log(`[BuilderService] Executing tool: ${toolCall.name} with args: ${JSON.stringify(toolCall.arguments)}`);
    
    switch (toolCall.name) {
      case 'list_files':
        // For now, we return a simulated list.
        return ['src/index.ts', 'src/lib/db.ts', 'src/modules/builder/service.ts'];
      
      case 'readFile':
        return this.fileSystem.readFile(toolCall.arguments.path);
      
      case 'writeFile':
        return this.fileSystem.writeFile(toolCall.arguments.path, toolCall.arguments.content);
      
      case 'listDirectory':
        return this.fileSystem.listDirectory(toolCall.arguments.path);
      
      case 'deleteFile':
        return this.fileSystem.deleteFile(toolCall.arguments.path);
      
      case 'moveFile':
        return this.fileSystem.moveFile(toolCall.arguments.oldPath, toolCall.arguments.newPath);

      case 'runCommand':
        return this.terminal.runCommand(toolCall.arguments.command);

      default:
        throw new Error(`Tool not implemented: ${toolCall.name}`);
    }
  }

  async createSession(tenantId: string, appId: string, template: string, intent: string) {
    const sessionId = `bs_${crypto.randomUUID().replace(/-/g, '')}`;
    const now = new Date().toISOString();
    const sessionStmt = this.sessions.prepareCreate({ id: sessionId, tenantId, appId, template, intent });
    const appUpdateStmt = this.db.prepare('UPDATE apps SET updated_at = ? WHERE id = ?').bind(now, appId);
    await this.db.batch([sessionStmt, appUpdateStmt]);

     const session = await this.sessions.get(sessionId);
     
     await this.notifyStream(sessionId, AGUIPacketGenerator.createStateUpdate({
       event: 'session_created',
       data: this.mapSession(session!)
     }));
 
     return this.mapSession(session!);
   }

   async getSession(sessionId: string) {
     const session = await this.sessions.get(sessionId);
 
     if (!session) {
       throw new Error('Session not found');
     }
 
     const prompts = await this.prompts.listBySession(sessionId);
     
     // Fetch application state
     const app = await getAppById(this.db, session.app_id);
     const deployments = await listDeploymentSummaries(this.db, { appId: session.app_id });
 
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
       } : null,
       app,
       deployments
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
 
     try {
       await this.sessions.updateStatus(sessionId, 'generating', session.version);
       await this.notifyStream(sessionId, AGUIPacketGenerator.createStateUpdate({ event: 'status_change', status: 'generating' }));
 
       let currentContext = `Intent: ${session.intent}\nTemplate: ${session.template}`;
       let toolResults: any[] = [];
       let result: any; // Will be ProviderGenerateResult
 
       while (true) {
         const combinedPrompt = `${currentContext}\n\n${toolResults.length > 0 ? 'Tool Results:\n' + JSON.stringify(toolResults, null, 2) : ''}\n\nUser Prompt: ${prompt}`;
         
         result = await this.provider.generate(combinedPrompt, undefined, async (event: ProviderEvent) => {
           await this.notifyStream(sessionId, AGUIPacketGenerator.fromProviderEvent(event));
         });
 
         if (result.type === 'tool_calls' && result.tool_calls) {
           for (const toolCall of result.tool_calls) {
             const toolResult = await this.executeTool(toolCall);
             toolResults.push({
               tool_call_id: toolCall.id,
               name: toolCall.name,
               result: toolResult
             });
             
             await this.notifyStream(sessionId, AGUIPacketGenerator.createStateUpdate({ 
               event: 'tool_result', 
               tool_call_id: toolCall.id, 
               result: toolResult 
             }));
           }
         } else {
           break;
         }
       }
 
       // At this point, result is expected to be a 'final' result
       const finalResult = result as any; 
 
       await this.notifyStream(sessionId, AGUIPacketGenerator.createStateUpdate({ event: 'generation_result', result: finalResult }));
 
       const generationId = `bg_${crypto.randomUUID().replace(/-/g, '')}`;
       const generationStmt = this.generations.prepareCreate({
         id: generationId,
         sessionId,
         prompt,
         summary: finalResult.summary,
         resultJson: JSON.stringify({
           files: finalResult.files,
           nextActions: finalResult.nextActions
         }),
         status: 'success'
       });
 
       const historyId = `bh_${crypto.randomUUID().replace(/-/g, '')}`;
       const historyStmt = this.history.prepareCreate({
         id: historyId,
         appId: session.app_id,
         sessionId,
         generationId,
         status: 'success'
       });
 
        const sessionStmt = this.sessions.prepareUpdateResult(sessionId, finalResult, session.version);
        const promptStmt = this.prompts.prepareUpdateStatus(promptId, 'completed', finalResult.summary);
        const appUpdateStmt = this.db.prepare('UPDATE apps SET updated_at = ? WHERE id = ?').bind(new Date().toISOString(), session.app_id);
 
        await this.db.batch([generationStmt, historyStmt, sessionStmt, promptStmt, appUpdateStmt]);
 
        return {
          session: {
            id: sessionId,
            status: 'completed'
          },
          result: finalResult
        };
      } catch (error: any) {
       try {
         await this.sessions.updateStatus(sessionId, 'failed', session.version);
        } catch (statusError: any) {
          console.error(`[BuilderService] Failed to update session status to failed: ${statusError.message}`);
        }
       await this.prompts.updateStatus(promptId, 'failed', error.message);
       await this.notifyStream(sessionId, AGUIPacketGenerator.createStateUpdate({ event: 'status_change', status: 'failed', error: error.message }));
 
       const generationId = `bg_${crypto.randomUUID().replace(/-/g, '')}`;
       await this.generations.create({
         id: generationId,
         sessionId,
         prompt,
         status: 'failed',
         errorCode: 'provider_error',
         errorMessage: error.message
       });
 
       const historyId = `bh_${crypto.randomUUID().replace(/-/g, '')}`;
       await this.history.create({
         id: historyId,
         appId: session.app_id,
         sessionId,
         generationId,
         status: 'failed'
       });
 
       throw error;
     }
   }
 
   async getHistoryByApp(appId: string) {
     const history = await this.history.listByApp(appId);
 
     return history.map(entry => ({
       id: entry.id,
       appId: entry.app_id,
       sessionId: entry.session_id,
       generationId: entry.generation_id,
       status: entry.status,
       createdAt: entry.created_at
     }));
   }
 
  async applyResult(sessionId: string) {
    const session = await this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    if (!session.result_summary || !session.result_files_json) {
      throw new Error('No result available to apply');
    }

    console.log('[BuilderService][applyResult] Starting applyResult for session:', sessionId);

    if (!session.result_summary || !session.result_files_json) {
      throw new Error('No result available to apply');
    }

    let files;
    try {
      files = JSON.parse(session.result_files_json);
      console.log('[BuilderService][applyResult] Successfully parsed result_files_json. Files count:', files.length);
    } catch (parseError: any) {
      console.error('[BuilderService][applyResult] Failed to parse result_files_json:', parseError.message);
      throw new Error(`Failed to parse result files: ${parseError.message}`);
    }
    
    const branchName = `builder-gen-${sessionId.slice(-6)}`;
    console.log('[BuilderService][applyResult] Generated branch name:', branchName);

    try {
      // 1. Create branch and commit files (simulated via fileSystem for now)
      console.log('[BuilderService][applyResult] Simulating file system operations...');
      for (const file of files) {
        console.log(`[BuilderService][applyResult] Processing file: ${file.path}, action: ${file.action}`);
        if (file.action !== 'delete') {
          await this.fileSystem.writeFile(file.path, file.content || '');
        } else {
          // await this.fileSystem.deleteFile(file.path); // In a real app
        }
      }
      console.log('[BuilderService][applyResult] File system operations simulated.');

      // 2. Create Pull Request via GitHub service
      console.log('[BuilderService][applyResult] Attempting to create Pull Request via GitHub service...');
      const pr = await this.github.createPullRequest(session.app_id, files, branchName);
      console.log('[BuilderService][applyResult] Pull Request created:', pr.url);

      return {
        success: true,
        message: 'Pull Request created successfully',
        prUrl: pr.url,
        prNumber: pr.prNumber,
        sessionId
      };
    } catch (err: any) {
      console.error('[BuilderService] Failed to apply result:', err);
      throw new Error(`Failed to apply result: ${err.message}`);
    }
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
 
   async updateSessionState(sessionId: string, state: any, clientVersionVector?: VersionVector, clientId?: string, strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.VERSION_VECTORS, expectedVersion?: number) {
     let attempt = 0;
     const maxAttempts = 5;
     let delay = 100;
 
     while (attempt < maxAttempts) {
       try {
         const session = await this.sessions.get(sessionId);
         if (!session) throw new Error('Session not found');
 
         if (strategy === ConflictResolutionStrategy.MANUAL) {
           const comparison = clientVersionVector ? compareVersionVectors(clientVersionVector, session.version_vector) : 'concurrent';
           if (comparison === 'less' || comparison === 'concurrent') {
             throw new StateConflictError({
               sessionId,
               baseState: null,
               clientState: state,
               serverState: session,
               strategy
             });
           }
         } else if (strategy === ConflictResolutionStrategy.OPTIMISTIC_CONCURRENCY) {
           if (expectedVersion !== undefined && session.version !== expectedVersion) {
             throw new Error('Conflict detected: state is out of sync');
           }
         } else if (strategy === ConflictResolutionStrategy.VERSION_VECTORS && clientVersionVector && clientId) {
           const comparison = compareVersionVectors(clientVersionVector, session.version_vector);
           if (comparison === 'less') {
             throw new Error('Conflict detected: state is out of sync');
           } else if (comparison === 'concurrent') {
             console.log('[BuilderService] Concurrent update detected, proceeding with automatic merge.');
           }
         }
 
         const updateData: any = { ...state };
 
         // Map high-level state fields to database columns
         if (updateData.files) {
           updateData.result_files_json = JSON.stringify(updateData.files);
           delete updateData.files;
         }
         if (updateData.nextActions) {
           updateData.result_next_actions_json = JSON.stringify(updateData.nextActions);
           delete updateData.nextActions;
         }
         if (updateData.summary) {
           updateData.result_summary = updateData.summary;
           delete updateData.summary;
         }
 
         if (state.nextActions) {
           updateData.result_next_actions_json = JSON.stringify(state.nextActions);
           delete updateData.nextActions;
         }
         if (state.summary) {
           updateData.result_summary = state.summary;
           delete updateData.summary;
         }
 
         let nextVersionVector = session.version_vector;
         if (clientId && clientVersionVector) {
           nextVersionVector = mergeVersionVectors(session.version_vector, clientVersionVector);
           nextVersionVector[clientId] = (nextVersionVector[clientId] || 0) + 1;
         }
         updateData.version_vector = JSON.stringify(nextVersionVector);
 
         const sessionUpdateStmt = this.sessions.prepareUpdate(sessionId, updateData, session.version);
         const appUpdateStmt = this.db.prepare('UPDATE apps SET updated_at = ? WHERE id = ?').bind(new Date().toISOString(), session.app_id);
         await this.db.batch([sessionUpdateStmt, appUpdateStmt]);
 
         // Notify the stream about the state update
         await this.notifyStream(sessionId, AGUIPacketGenerator.createStateUpdate({
           event: 'state_update',
           data: { ...state, version_vector: nextVersionVector }
         }));
 
         return { success: true };
       } catch (error: any) {
         if (error.message.includes('Conflict detected') && attempt < maxAttempts - 1) {
           attempt++;
           console.log(`[BuilderService] Conflict detected in updateSessionState, retrying (attempt ${attempt}/${maxAttempts})...`);
           await new Promise(resolve => setTimeout(resolve, delay));
           delay *= 2;
           continue;
         }
         throw error;
       }
     }
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
