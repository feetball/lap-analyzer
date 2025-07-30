// Database abstraction layer - switches between SQLite and JSON based on environment
import type { SessionData, LapRecord } from './database';

// Define the interface that both database implementations must follow
export interface DatabaseInterface {
  createSession(session: Omit<SessionData, 'id' | 'createdAt'>): number;
  getSession(id: number): SessionData | null;
  getAllSessions(): SessionData[];
  getSessionsByCircuit(circuit: string): SessionData[];
  deleteSession(id: number): boolean;
  createLap(lap: Omit<LapRecord, 'id'>): number;
  getLapsBySession(sessionId: number): LapRecord[];
  getBestLapByCircuit(circuit: string): LapRecord | null;
  getSessionStats(sessionId: number): any;
  getCircuitStats(circuit: string): any;
  close(): void;
}

let database: DatabaseInterface | null = null;

export async function getRaceDatabase(): Promise<DatabaseInterface> {
  if (database) return database;

  // Try to use SQLite first, fallback to JSON if it fails
  try {
    // Check if we're in a Railway environment or have specific flag to use JSON
    if (process.env.RAILWAY_ENVIRONMENT || process.env.USE_JSON_DB === 'true') {
      throw new Error('Using JSON database for Railway deployment');
    }

    // Try to import and use SQLite database
    const { getRaceDatabase: getSQLiteDB } = await import('./database');
    database = getSQLiteDB();
    console.log('✅ Using SQLite database');
  } catch (error) {
    console.log('⚠️ SQLite unavailable, falling back to JSON database:', error instanceof Error ? error.message : 'Unknown error');
    
    // Fallback to JSON database
    const { getRaceDatabase: getJSONDB } = await import('./database-json');
    database = getJSONDB();
    console.log('✅ Using JSON file database');
  }

  return database;
}

export function closeDatabaseConnection() {
  if (database) {
    database.close();
    database = null;
  }
}

// Re-export types for convenience
export type { SessionData, LapRecord };
