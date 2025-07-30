'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Upload, Activity, Map, BarChart3, Clock, Trophy, Database, Save } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import SaveSessionDialog from '@/components/SaveSessionDialog';
import { detectCircuit, extractGPSCoordinates } from '@/utils/raceAnalysis';

// Dynamic imports to prevent SSR issues
const DataAnalysis = dynamic(() => import('@/components/DataAnalysis'), { ssr: false });
const CircuitMap = dynamic(() => import('@/components/CircuitMap'), { ssr: false });
const LapComparison = dynamic(() => import('@/components/LapComparison'), { ssr: false });
const SessionManager = dynamic(() => import('@/components/SessionManager'), { ssr: false });

export default function Home() {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [selectedLap, setSelectedLap] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'analysis' | 'map' | 'compare' | 'sessions'>('upload');
  const [detectedCircuit, setDetectedCircuit] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleDataLoad = (data: any[]) => {
    setCsvData(data);
    
    // Detect circuit from GPS data
    const gpsCoords = extractGPSCoordinates(data);
    const circuit = detectCircuit(gpsCoords);
    setDetectedCircuit(circuit);
    
    setActiveTab('analysis');
  };

  const saveSession = async (sessionName: string) => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: sessionName,
          date: new Date().toISOString(),
          circuit: detectedCircuit,
          data: csvData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save session');
      }

      const result = await response.json();
      console.log('Session saved:', result);
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  };

  const tabs = [
    { id: 'upload', label: 'Data Upload', icon: Upload },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
    { id: 'map', label: 'Circuit Map', icon: Map },
    { id: 'compare', label: 'Lap Compare', icon: Clock },
    { id: 'sessions', label: 'Sessions', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-white">Lap Analyzer Pro</h1>
            </div>
            <div className="flex items-center space-x-4">
              {csvData.length > 0 && (
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Session</span>
                </button>
              )}
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <Trophy className="h-4 w-4" />
                <span>Race Car Data Analysis</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-black/10 backdrop-blur-lg border-b border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isDisabled = tab.id !== 'upload' && tab.id !== 'sessions' && csvData.length === 0;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  disabled={isDisabled}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-t-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-white/10 text-white border-b-2 border-red-500'
                      : isDisabled
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
          {activeTab === 'upload' && (
            <FileUpload onDataLoad={handleDataLoad} />
          )}
          {activeTab === 'analysis' && csvData.length > 0 && (
            <DataAnalysis 
              data={csvData} 
              selectedLap={selectedLap}
              onLapSelect={setSelectedLap}
            />
          )}
          {activeTab === 'map' && csvData.length > 0 && (
            <CircuitMap 
              data={csvData}
              selectedLap={selectedLap}
              onLapSelect={setSelectedLap}
            />
          )}
          {activeTab === 'compare' && csvData.length > 0 && (
            <LapComparison data={csvData} />
          )}
          {activeTab === 'sessions' && (
            <SessionManager onLoadSession={handleDataLoad} />
          )}
        </div>
      </main>

      {/* Save Session Dialog */}
      <SaveSessionDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={saveSession}
        detectedCircuit={detectedCircuit}
      />
    </div>
  );
}
