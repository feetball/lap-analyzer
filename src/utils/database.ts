// Database utilities for storing race session data
import Database from 'better-sqlite3';
import path from 'path';

export interface SessionData {
  id?: number;
  name: string;
  date: string;
  circuit: string | null;
  data: any[];
  createdAt?: string;
}

export interface LapRecord {
  id?: number;
  sessionId: number;
  lapNumber: number;
  lapTime: number;
  maxSpeed: number;
  avgSpeed: number;
  data: any[];
}

class RaceDatabase {
  private db: Database.Database;

  constructor() {
    // Initialize database
    const dbPath = path.join(process.cwd(), 'data', 'race_data.db');
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  private initializeTables() {
    // Create sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        circuit TEXT,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create laps table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS laps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        lap_number INTEGER NOT NULL,
        lap_time REAL NOT NULL,
        max_speed REAL NOT NULL,
        avg_speed REAL NOT NULL,
        data TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (id)
      )
    `);

    // Create index for faster queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_laps_session_id ON laps (session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_circuit ON sessions (circuit);
    `);
  }

  // Session methods
  createSession(session: Omit<SessionData, 'id' | 'createdAt'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (name, date, circuit, data)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      session.name,
      session.date,
      session.circuit,
      JSON.stringify(session.data)
    );
    
    return result.lastInsertRowid as number;
  }

  getSession(id: number): SessionData | null {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions WHERE id = ?
    `);
    
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      date: row.date,
      circuit: row.circuit,
      data: JSON.parse(row.data),
      createdAt: row.created_at,
    };
  }

  getAllSessions(): SessionData[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions ORDER BY created_at DESC
    `);
    
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      date: row.date,
      circuit: row.circuit,
      data: JSON.parse(row.data),
      createdAt: row.created_at,
    }));
  }

  getSessionsByCircuit(circuit: string): SessionData[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions WHERE circuit = ? ORDER BY created_at DESC
    `);
    
    const rows = stmt.all(circuit) as any[];
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      date: row.date,
      circuit: row.circuit,
      data: JSON.parse(row.data),
      createdAt: row.created_at,
    }));
  }

  deleteSession(id: number): boolean {
    const stmt = this.db.prepare(`DELETE FROM sessions WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Lap methods
  createLap(lap: Omit<LapRecord, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO laps (session_id, lap_number, lap_time, max_speed, avg_speed, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      lap.sessionId,
      lap.lapNumber,
      lap.lapTime,
      lap.maxSpeed,
      lap.avgSpeed,
      JSON.stringify(lap.data)
    );
    
    return result.lastInsertRowid as number;
  }

  getLapsBySession(sessionId: number): LapRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM laps WHERE session_id = ? ORDER BY lap_number
    `);
    
    const rows = stmt.all(sessionId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      lapNumber: row.lap_number,
      lapTime: row.lap_time,
      maxSpeed: row.max_speed,
      avgSpeed: row.avg_speed,
      data: JSON.parse(row.data),
    }));
  }

  getBestLapByCircuit(circuit: string): LapRecord | null {
    const stmt = this.db.prepare(`
      SELECT l.* FROM laps l
      JOIN sessions s ON l.session_id = s.id
      WHERE s.circuit = ?
      ORDER BY l.lap_time ASC
      LIMIT 1
    `);
    
    const row = stmt.get(circuit) as any;
    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.session_id,
      lapNumber: row.lap_number,
      lapTime: row.lap_time,
      maxSpeed: row.max_speed,
      avgSpeed: row.avg_speed,
      data: JSON.parse(row.data),
    };
  }

  // Analytics methods
  getSessionStats(sessionId: number) {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_laps,
        MIN(lap_time) as best_lap_time,
        MAX(lap_time) as worst_lap_time,
        AVG(lap_time) as avg_lap_time,
        MAX(max_speed) as max_speed_overall,
        AVG(avg_speed) as avg_speed_overall
      FROM laps
      WHERE session_id = ?
    `);
    
    return stmt.get(sessionId) as any;
  }

  getCircuitStats(circuit: string) {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(l.id) as total_laps,
        MIN(l.lap_time) as best_lap_time,
        AVG(l.lap_time) as avg_lap_time,
        MAX(l.max_speed) as max_speed_overall
      FROM sessions s
      LEFT JOIN laps l ON s.id = l.session_id
      WHERE s.circuit = ?
    `);
    
    return stmt.get(circuit) as any;
  }

  close() {
    this.db.close();
  }
}

// Create singleton instance
let dbInstance: RaceDatabase | null = null;

export function getRaceDatabase(): RaceDatabase {
  if (!dbInstance) {
    dbInstance = new RaceDatabase();
  }
  return dbInstance;
}

export function closeDatabaseConnection() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
