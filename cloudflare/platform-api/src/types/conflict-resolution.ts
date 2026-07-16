export enum ConflictResolutionStrategy {
  LAST_WRITE_WINS = 'LAST_WRITE_WINS',
  VERSION_VECTORS = 'VERSION_VECTORS',
  OPTIMISTIC_CONCURRENCY = 'OPTIMISTIC_CONCURRENCY',
  MANUAL = 'MANUAL',
}

export interface Conflict {
  sessionId: string;
  baseState: any;
  clientState: any;
  serverState: any;
  strategy: ConflictResolutionStrategy;
}
