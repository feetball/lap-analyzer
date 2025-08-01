'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import DataAnalysis from '@/components/DataAnalysis';
import CircuitMap from '@/components/CircuitMap';
import LapComparison from '@/components/LapComparison';
import SessionManager from '@/components/SessionManager';

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [selectedLap, setSelectedLap] = useState<number | null>(null);
  const [selectedLaps, setSelectedLaps] = useState<number[]>([]); // For multi-lap selection
  const [activeTab, setActiveTab] = useState<'analysis' | 'map' | 'comparison' | 'sessions'>('analysis');

  const tabs = [
    { id: 'analysis', label: 'Data Analysis', icon: '📊' },
    { id: 'map', label: 'Circuit Map', icon: '🗺️' },
    { id: 'comparison', label: 'Lap Comparison', icon: '🔄' },
    { id: 'sessions', label: 'Sessions', icon: '💾' },
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-white">
            🏁 Race Car Data Analyzer
          </h1>
          <p className="text-gray-300 mt-1">
            Professional telemetry analysis and circuit visualization
          </p>
        </div>
      </header>

      {/* Main Container */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* File Upload Section */}
        {data.length === 0 && (
          <div className="mb-8">
            <FileUpload onDataLoad={setData} />
          </div>
        )}

        {/* Tab Navigation */}
        {data.length > 0 && (
          <>
            <div className="mb-6">
              <div className="flex flex-wrap gap-2 bg-white/5 rounded-lg p-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'bg-red-500 text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="w-full">
              {activeTab === 'analysis' && (
                <DataAnalysis 
                  data={data} 
                  selectedLap={selectedLap} 
                  onLapSelect={setSelectedLap} 
                />
              )}
              
              {activeTab === 'map' && (
                <CircuitMap 
                  data={data} 
                  selectedLap={selectedLap} 
                  selectedLaps={selectedLaps}
                  onLapSelect={setSelectedLap}
                  onLapsSelect={setSelectedLaps}
                />
              )}
              
              {activeTab === 'comparison' && (
                <LapComparison 
                  data={data} 
                />
              )}
              
              {activeTab === 'sessions' && (
                <SessionManager 
                  onLoadSession={setData}
                />
              )}
            </div>

            {/* Data Status Bar */}
            <div className="mt-6 bg-white/5 rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-green-400 font-medium">
                    📈 {data.length.toLocaleString()} data points loaded
                  </span>
                  {selectedLaps.length > 0 ? (
                    <span className="text-blue-400">
                      🏁 {selectedLaps.length === 1 
                        ? `Lap ${selectedLaps[0]} selected` 
                        : `Laps ${selectedLaps.join(' & ')} selected for comparison`
                      }
                    </span>
                  ) : selectedLap && (
                    <span className="text-blue-400">
                      🏁 Lap {selectedLap} selected
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setData([]);
                    setSelectedLap(null);
                    setSelectedLaps([]);
                    setActiveTab('analysis');
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                >
                  Load New Data
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
