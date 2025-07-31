// Database utilities for storing race session data (Vercel-compatible JSON storage)
import path from 'path';
import fs from 'fs';

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

interface DatabaseSchema {
  sessions: SessionData[];
  laps: LapRecord[];
  nextId: number;
}

class RaceDatabase {
  private dataPath: string;
  private data: DatabaseSchema = {
    sessions: [],
    laps: [],
    nextId: 1
  };

  constructor() {
    // Use a temporary directory that works on Vercel
    const dataDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
    
    // Ensure data directory exists (only in non-Vercel environments)
    if (!process.env.VERCEL && !fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.dataPath = path.join(dataDir, 'race_data.json');
    this.loadData();
  }

  private loadData() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const rawData = fs.readFileSync(this.dataPath, 'utf8');
        this.data = JSON.parse(rawData);
      } else {
        this.data = {
          sessions: [],
          laps: [],
          nextId: 1
        };
        this.saveData();
      }
    } catch (error) {
      console.warn('Failed to load database, using in-memory storage:', error);
      this.data = {
        sessions: [],
        laps: [],
        nextId: 1
      };
    }
  }

  private saveData() {
    try {
      // On Vercel, we can't persist to disk, so just keep in memory
      if (!process.env.VERCEL) {
        fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
      }
    } catch (error) {
      console.warn('Failed to save database:', error);
    }
  }

  private getNextId(): number {
    return this.data.nextId++;
  }

  // Session methods
  createSession(session: Omit<SessionData, 'id' | 'createdAt'>): number {
    const id = this.getNextId();
    const newSession: SessionData = {
      ...session,
      id,
      createdAt: new Date().toISOString()
    };
    
    this.data.sessions.push(newSession);
    this.saveData();
    return id;
  }

  getSession(id: number): SessionData | null {
    return this.data.sessions.find(session => session.id === id) || null;
  }

  getAllSessions(): SessionData[] {
    return [...this.data.sessions].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date).getTime();
      const dateB = new Date(b.createdAt || b.date).getTime();
      return dateB - dateA; // Most recent first
    });
  }

  getSessionsByCircuit(circuit: string): SessionData[] {
    return this.data.sessions
      .filter(session => session.circuit === circuit)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date).getTime();
        const dateB = new Date(b.createdAt || b.date).getTime();
        return dateB - dateA;
      });
  }

  deleteSession(id: number): boolean {
    const initialLength = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter(session => session.id !== id);
    
    // Also delete associated laps
    this.data.laps = this.data.laps.filter(lap => lap.sessionId !== id);
    
    if (this.data.sessions.length < initialLength) {
      this.saveData();
      return true;
    }
    return false;
  }

  // Lap methods
  createLap(lap: Omit<LapRecord, 'id'>): number {
    const id = this.getNextId();
    const newLap: LapRecord = {
      ...lap,
      id
    };
    
    this.data.laps.push(newLap);
    this.saveData();
    return id;
  }

  getLapsBySession(sessionId: number): LapRecord[] {
    return this.data.laps
      .filter(lap => lap.sessionId === sessionId)
      .sort((a, b) => a.lapNumber - b.lapNumber);
  }

  getBestLapByCircuit(circuit: string): LapRecord | null {
    const sessions = this.getSessionsByCircuit(circuit);
    const sessionIds = sessions.map(s => s.id!);
    
    const laps = this.data.laps.filter(lap => sessionIds.includes(lap.sessionId));
    
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
        avg_speed_overall: null
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
      avg_speed_overall: avgSpeeds.reduce((a, b) => a + b, 0) / avgSpeeds.length
    };
  }

  getCircuitStats(circuit: string) {
    const sessions = this.getSessionsByCircuit(circuit);
    const sessionIds = sessions.map(s => s.id!);
    const laps = this.data.laps.filter(lap => sessionIds.includes(lap.sessionId));

    if (laps.length === 0) {
      return {
        total_sessions: sessions.length,
        total_laps: 0,
        best_lap_time: null,
        avg_lap_time: null,
        max_speed_overall: null
      };
    }

    const lapTimes = laps.map(l => l.lapTime);
    const maxSpeeds = laps.map(l => l.maxSpeed);

    return {
      total_sessions: sessions.length,
      total_laps: laps.length,
      best_lap_time: Math.min(...lapTimes),
      avg_lap_time: lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length,
      max_speed_overall: Math.max(...maxSpeeds)
    };
  }

  close() {
    // No need to close anything in JSON-based storage
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
