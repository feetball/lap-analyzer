'use client';

import { useState, useEffect } from 'react';
import { Calendar, Database, Trash2, Eye } from 'lucide-react';

interface Session {
  id: number;
  name: string;
  date: string;
  circuit: string | null;
  createdAt: string;
}

interface SessionManagerProps {
  onLoadSession: (sessionData: any[]) => void;
}

export default function SessionManager({ onLoadSession }: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sessions');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSession = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Failed to load session');
      
      const session = await response.json();
      onLoadSession(session.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    }
  };

  const deleteSession = async (sessionId: number) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete session');
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin mx-auto h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
        <p className="text-white mt-2">Loading sessions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="h-6 w-6 text-red-500" />
          <h2 className="text-2xl font-bold text-white">Session History</h2>
        </div>
        <button
          onClick={fetchSessions}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <Database className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl text-white mb-2">No Sessions Found</h3>
          <p className="text-gray-400">
            Upload and save some race data to see your session history here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-medium text-lg">{session.name}</h3>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(session.createdAt)}</span>
                    </div>
                    {session.circuit && (
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>{session.circuit}</span>
                      </div>
                    )}
                    {!session.circuit && (
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                        <span>Unknown Circuit</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => loadSession(session.id)}
                    className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    title="Load Session"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteSession(session.id)}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    title="Delete Session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
