// Simple JSON-based database for Railway deployment (fallback for SQLite issues)
import fs from 'fs';
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

class JSONDatabase {
  private dataDir: string;
  private sessionsFile: string;
  private lapsFile: string;
  private nextSessionId = 1;
  private nextLapId = 1;

  constructor() {
    this.dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(process.cwd(), 'data');
    this.sessionsFile = path.join(this.dataDir, 'sessions.json');
    this.lapsFile = path.join(this.dataDir, 'laps.json');
    
    this.ensureDataDir();
    this.initializeFiles();
  }

  private ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private initializeFiles() {
    if (!fs.existsSync(this.sessionsFile)) {
      fs.writeFileSync(this.sessionsFile, JSON.stringify([]));
    }
    if (!fs.existsSync(this.lapsFile)) {
      fs.writeFileSync(this.lapsFile, JSON.stringify([]));
    }

    // Load existing data to set next IDs
    const sessions = this.readSessions();
    const laps = this.readLaps();
    
    this.nextSessionId = sessions.length > 0 ? Math.max(...sessions.map(s => s.id || 0)) + 1 : 1;
    this.nextLapId = laps.length > 0 ? Math.max(...laps.map(l => l.id || 0)) + 1 : 1;
  }

  private readSessions(): SessionData[] {
    try {
      const data = fs.readFileSync(this.sessionsFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private writeSessions(sessions: SessionData[]) {
    fs.writeFileSync(this.sessionsFile, JSON.stringify(sessions, null, 2));
  }

  private readLaps(): LapRecord[] {
    try {
      const data = fs.readFileSync(this.lapsFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private writeLaps(laps: LapRecord[]) {
    fs.writeFileSync(this.lapsFile, JSON.stringify(laps, null, 2));
  }

  // Session methods
  createSession(session: Omit<SessionData, 'id' | 'createdAt'>): number {
    const sessions = this.readSessions();
    const newSession: SessionData = {
      ...session,
      id: this.nextSessionId++,
      createdAt: new Date().toISOString(),
    };
    
    sessions.push(newSession);
    this.writeSessions(sessions);
    
    return newSession.id!;
  }

  getSession(id: number): SessionData | null {
    const sessions = this.readSessions();
    return sessions.find(s => s.id === id) || null;
  }

  getAllSessions(): SessionData[] {
    return this.readSessions().sort((a, b) => 
      new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    );
  }

  getSessionsByCircuit(circuit: string): SessionData[] {
    return this.readSessions()
      .filter(s => s.circuit === circuit)
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }

  deleteSession(id: number): boolean {
    const sessions = this.readSessions();
    const initialLength = sessions.length;
    const filteredSessions = sessions.filter(s => s.id !== id);
    
    if (filteredSessions.length < initialLength) {
      this.writeSessions(filteredSessions);
      
      // Also delete associated laps
      const laps = this.readLaps();
      const filteredLaps = laps.filter(l => l.sessionId !== id);
      this.writeLaps(filteredLaps);
      
      return true;
    }
    
    return false;
  }

  // Lap methods
  createLap(lap: Omit<LapRecord, 'id'>): number {
    const laps = this.readLaps();
    const newLap: LapRecord = {
      ...lap,
      id: this.nextLapId++,
    };
    
    laps.push(newLap);
    this.writeLaps(laps);
    
    return newLap.id!;
  }

  getLapsBySession(sessionId: number): LapRecord[] {
    return this.readLaps()
      .filter(l => l.sessionId === sessionId)
      .sort((a, b) => a.lapNumber - b.lapNumber);
  }

  getBestLapByCircuit(circuit: string): LapRecord | null {
    const sessions = this.getSessionsByCircuit(circuit);
    if (sessions.length === 0) return null;
    
    const sessionIds = sessions.map(s => s.id!);
    const laps = this.readLaps().filter(l => sessionIds.includes(l.sessionId));
    
    if (laps.length === 0) return null;
    
    return laps.reduce((best, current) => 
      current.lapTime < best.lapTime ? current : best
    );
  }

  // Analytics methods
  getSessionStats(sessionId: number) {
    const laps = this.getLapsBySession(sessionId);
    
    if (laps.length === 0) {
      return {
        total_laps: 0,
        best_lap_time: null,
        worst_lap_time: null,
        avg_lap_time: null,
        max_speed_overall: null,
        avg_speed_overall: null,
      };
    }
    
    const lapTimes = laps.map(l => l.lapTime);
    const maxSpeeds = laps.map(l => l.maxSpeed);
    const avgSpeeds = laps.map(l => l.avgSpeed);
    
    return {
      total_laps: laps.length,
      best_lap_time: Math.min(...lapTimes),
      worst_lap_time: Math.max(...lapTimes),
      avg_lap_time: lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length,
      max_speed_overall: Math.max(...maxSpeeds),
      avg_speed_overall: avgSpeeds.reduce((a, b) => a + b, 0) / avgSpeeds.length,
    };
  }

  getCircuitStats(circuit: string) {
    const sessions = this.getSessionsByCircuit(circuit);
    const sessionIds = sessions.map(s => s.id!);
    const laps = this.readLaps().filter(l => sessionIds.includes(l.sessionId));
    
    if (laps.length === 0) {
      return {
        total_sessions: sessions.length,
        total_laps: 0,
        best_lap_time: null,
        avg_lap_time: null,
        max_speed_overall: null,
      };
    }
    
    const lapTimes = laps.map(l => l.lapTime);
    const maxSpeeds = laps.map(l => l.maxSpeed);
    
    return {
      total_sessions: sessions.length,
      total_laps: laps.length,
      best_lap_time: Math.min(...lapTimes),
      avg_lap_time: lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length,
      max_speed_overall: Math.max(...maxSpeeds),
    };
  }

  close() {
    // No-op for JSON database
  }
}

// Create singleton instance
let dbInstance: JSONDatabase | null = null;

export function getRaceDatabase(): JSONDatabase {
  if (!dbInstance) {
    dbInstance = new JSONDatabase();
  }
  return dbInstance;
}

export function closeDatabaseConnection() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
