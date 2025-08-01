'use client';

import { useState, useEffect, useCallback } from 'react';
import FileUpload from '@/components/FileUpload';
import DataAnalysis from '@/components/DataAnalysis';
import CircuitMap from '@/components/CircuitMap';
import LapComparison from '@/components/LapComparison';
import SessionManager from '@/components/SessionManager';
import HelpDialog from '@/components/HelpDialog';
import QuickStartGuide from '@/components/QuickStartGuide';
import ContextualTips from '@/components/ContextualTips';
import Version from '@/components/Version';

// Cache keys for localStorage (moved outside component to avoid dependency issues)
const CACHE_KEYS = {
  DATA: 'lap-analyzer-cached-data',
  SELECTED_LAP: 'lap-analyzer-selected-lap',
  SELECTED_LAPS: 'lap-analyzer-selected-laps',
  ACTIVE_TAB: 'lap-analyzer-active-tab',
  FILE_NAME: 'lap-analyzer-file-name',
  TIMESTAMP: 'lap-analyzer-cache-timestamp'
};

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [selectedLap, setSelectedLap] = useState<number | null>(null);
  const [selectedLaps, setSelectedLaps] = useState<number[]>([]); // For multi-lap selection
  const [activeTab, setActiveTab] = useState<'analysis' | 'map' | 'comparison' | 'sessions'>('comparison');
  const [isLoading, setIsLoading] = useState(true); // Track initial loading state
  const [cachedFileName, setCachedFileName] = useState<string>(''); // Track the cached file name
  const [showHelp, setShowHelp] = useState(false); // Help dialog state
  const [showQuickStart, setShowQuickStart] = useState(false); // Quick start guide state
  const [isMounted, setIsMounted] = useState(false); // Track if component is mounted on client

  // Debug initial state
  console.log('🏁 Lap Analyzer component mounted/re-rendered');
  console.log('📊 Current data length:', data.length);
  console.log('⏳ Is loading:', isLoading);
  console.log('📁 Cached filename:', cachedFileName);
  
  // Test localStorage access
  if (typeof window !== 'undefined') {
    console.log('🌐 Client-side rendering detected');
    console.log('💾 localStorage available:', typeof localStorage !== 'undefined');
    try {
      const testKey = 'lap-analyzer-test';
      localStorage.setItem(testKey, 'test');
      const testValue = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      console.log('✅ localStorage working:', testValue === 'test');
    } catch (e) {
      console.error('❌ localStorage test failed:', e);
    }
  } else {
    console.log('🖥️ Server-side rendering detected');
  }

  // Clear cache function
  const clearCache = useCallback(() => {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }, []);

  // Track client-side mounting
  useEffect(() => {
    console.log('🏗️ Component mounting on client...');
    console.log('🏗️ Window object available:', typeof window !== 'undefined');
    console.log('🏗️ LocalStorage available:', typeof localStorage !== 'undefined');
    setIsMounted(true);
  }, []);

  // Load cached data after component is mounted on client
  useEffect(() => {
    if (!isMounted) {
      console.log('⏳ Component not yet mounted, skipping cache load...');
      return;
    }

    console.log('🌐 Client-side: Loading cached data...');
    
    const loadCachedData = () => {
      try {
        console.log('🔍 Client-side: Checking for cached data...');
        const cachedData = localStorage.getItem(CACHE_KEYS.DATA);
        const cachedTimestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP);
        
        console.log('📦 Cached data exists:', !!cachedData);
        console.log('⏰ Cached timestamp exists:', !!cachedTimestamp);
        
        if (cachedData && cachedTimestamp) {
          // Check if cache is less than 24 hours old
          const cacheAge = Date.now() - parseInt(cachedTimestamp);
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
          
          console.log('📅 Cache age (hours):', Math.round(cacheAge / (1000 * 60 * 60)));
          console.log('✅ Cache valid:', cacheAge < maxAge);
          
          if (cacheAge < maxAge) {
            const parsedData = JSON.parse(cachedData);
            const cachedSelectedLap = localStorage.getItem(CACHE_KEYS.SELECTED_LAP);
            const cachedSelectedLaps = localStorage.getItem(CACHE_KEYS.SELECTED_LAPS);
            const cachedActiveTab = localStorage.getItem(CACHE_KEYS.ACTIVE_TAB);
            const cachedFileName = localStorage.getItem(CACHE_KEYS.FILE_NAME);
            
            console.log('📊 Parsed data length:', parsedData.length);
            console.log('📁 Cached filename:', cachedFileName);
            
            if (parsedData.length > 0) {
              console.log('🚀 Restoring cached data...');
              setData(parsedData);
              
              if (cachedSelectedLap && cachedSelectedLap !== 'null') {
                setSelectedLap(JSON.parse(cachedSelectedLap));
              }
              
              if (cachedSelectedLaps && cachedSelectedLaps !== '[]') {
                setSelectedLaps(JSON.parse(cachedSelectedLaps));
              }
              
              if (cachedActiveTab && cachedActiveTab !== 'null') {
                setActiveTab(JSON.parse(cachedActiveTab));
              }
              
              if (cachedFileName && cachedFileName !== 'null') {
                setCachedFileName(JSON.parse(cachedFileName));
              }
              
              console.log('✅ Cache restored successfully!');
            } else {
              console.log('⚠️ Cached data is empty');
            }
          } else {
            // Cache is too old, clear it
            console.log('🗑️ Cache expired, clearing...');
            Object.values(CACHE_KEYS).forEach(key => {
              localStorage.removeItem(key);
            });
          }
        } else {
          console.log('❌ No cached data found');
        }
      } catch (error) {
        console.error('💥 Error loading cached data:', error);
        // Clear corrupted cache
        Object.values(CACHE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
      } finally {
        console.log('🔄 Setting loading to false...');
        setIsLoading(false);
        
        // Show quick start guide for first-time users (only if no cached data)
        const hasSeenQuickStart = localStorage.getItem('lap-analyzer-seen-quickstart');
        if (!hasSeenQuickStart && data.length === 0) {
          setTimeout(() => setShowQuickStart(true), 1000);
        }
      }
    };

    // Load cache data
    loadCachedData();
  }, [isMounted]); // Run when component mounts on client

  // Save data to cache when it changes
  useEffect(() => {
    // Always save data when it exists, regardless of loading state
    if (data.length > 0) {
      try {
        console.log('💾 Saving data to cache...', data.length, 'records', 'isLoading:', isLoading);
        const dataString = JSON.stringify(data);
        const dataSize = new Blob([dataString]).size;
        const sizeInMB = (dataSize / 1024 / 1024).toFixed(2);
        
        console.log('📊 Data size:', sizeInMB, 'MB');
        
        // Check if data is too large (> 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (dataSize > maxSize) {
          console.warn('⚠️ Data too large to cache efficiently:', sizeInMB, 'MB');
          return;
        }
        
        localStorage.setItem(CACHE_KEYS.DATA, dataString);
        localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString());
        console.log('✅ Data cached successfully!');
      } catch (error) {
        console.error('❌ Error caching data:', error);
        // If localStorage is full, try to clear old cache and retry
        if (error instanceof DOMException && error.code === 22) {
          clearCache();
          try {
            localStorage.setItem(CACHE_KEYS.DATA, JSON.stringify(data));
            localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString());
            console.log('✅ Data cached after clearing old cache');
          } catch (retryError) {
            console.error('❌ Failed to cache data after clearing:', retryError);
          }
        }
      }
    }
  }, [data, clearCache]); // Removed isLoading dependency

  // Save other state to cache when it changes
  useEffect(() => {
    // Save selected lap state (but avoid saving null/undefined on initial load)
    if (selectedLap !== null) {
      console.log('💾 Saving selected lap:', selectedLap);
      localStorage.setItem(CACHE_KEYS.SELECTED_LAP, JSON.stringify(selectedLap));
    }
  }, [selectedLap]);

  useEffect(() => {
    // Save selected laps state
    if (selectedLaps.length > 0) {
      console.log('💾 Saving selected laps:', selectedLaps);
      localStorage.setItem(CACHE_KEYS.SELECTED_LAPS, JSON.stringify(selectedLaps));
    }
  }, [selectedLaps]);

  useEffect(() => {
    // Save active tab state  
    if (activeTab) {
      console.log('💾 Saving active tab:', activeTab);
      localStorage.setItem(CACHE_KEYS.ACTIVE_TAB, JSON.stringify(activeTab));
    }
  }, [activeTab]);

  // Get cache information
  const getCacheInfo = () => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEYS.DATA);
      const cachedTimestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP);
      
      if (cachedData && cachedTimestamp) {
        const dataSize = new Blob([cachedData]).size;
        const timestamp = new Date(parseInt(cachedTimestamp));
        const sizeInMB = (dataSize / 1024 / 1024).toFixed(2);
        
        return {
          size: `${sizeInMB} MB`,
          timestamp: timestamp.toLocaleString(),
          age: Math.round((Date.now() - parseInt(cachedTimestamp)) / (1000 * 60 * 60)) // hours
        };
      }
    } catch (error) {
      console.error('Error getting cache info:', error);
    }
    return null;
  };

  // Enhanced data loader that also caches file name
  const handleDataLoad = (newData: any[], fileName?: string) => {
    console.log('📁 Loading new data:', newData.length, 'records, filename:', fileName);
    setData(newData);
    
    if (fileName) {
      console.log('📝 Caching filename:', fileName);
      setCachedFileName(fileName);
      localStorage.setItem(CACHE_KEYS.FILE_NAME, JSON.stringify(fileName));
    }
    
    // Immediately cache the data as well
    try {
      console.log('💾 Immediately caching new data...');
      const dataString = JSON.stringify(newData);
      localStorage.setItem(CACHE_KEYS.DATA, dataString);
      localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString());
      console.log('✅ Data immediately cached!');
    } catch (error) {
      console.error('❌ Failed to immediately cache data:', error);
    }
  };

  // Enhanced clear function that also clears cache
  const handleClearData = () => {
    setData([]);
    setSelectedLap(null);
    setSelectedLaps([]);
    setCachedFileName('');
    setActiveTab('comparison');
    clearCache();
  };

  // Handle quick start guide close
  const handleQuickStartClose = () => {
    setShowQuickStart(false);
    localStorage.setItem('lap-analyzer-seen-quickstart', 'true');
  };

  // Handle quick start "open help" action
  const handleQuickStartHelp = () => {
    setShowQuickStart(false);
    setShowHelp(true);
    localStorage.setItem('lap-analyzer-seen-quickstart', 'true');
  };

  const tabs = [
    { id: 'comparison', label: 'Lap Comparison', icon: '�' },
    { id: 'map', label: 'Circuit Map', icon: '🗺️' },
    { id: 'analysis', label: 'Data Analysis', icon: '�' },
    { id: 'sessions', label: 'Sessions', icon: '💾' },
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                🏁 Race Car Data Analyzer
              </h1>
              <p className="text-gray-300 mt-1">
                Professional telemetry analysis and circuit visualization
              </p>
            </div>
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <span>❓</span>
              Help
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="mb-8 text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-300">
              {cachedFileName ? `Restoring ${cachedFileName}...` : 'Loading cached data...'}
            </p>
          </div>
        )}

        {/* No Data State - show upload when no data and not loading */}
        {data.length === 0 && !isLoading && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                {cachedFileName ? 'Cache Failed - Upload New File' : 'Getting Started'}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowQuickStart(true)}
                  className="px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded-lg text-sm transition-colors flex items-center gap-2"
                  title="Show quick start guide"
                >
                  <span>🚀</span>
                  Quick Start
                </button>
                <button
                  onClick={() => setShowHelp(true)}
                  className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-sm transition-colors flex items-center gap-2"
                  title="Get help with file upload"
                >
                  <span>❓</span>
                  Help
                </button>
              </div>
            </div>
            
            {/* Show cache info if available but failed to load */}
            {cachedFileName && (
              <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">⚠️</span>
                  <span className="text-yellow-300 text-sm">
                    Previous session <strong>{cachedFileName}</strong> couldn&apos;t be restored. Please upload a new file.
                  </span>
                </div>
              </div>
            )}
            
            {/* Contextual Tips */}
            <ContextualTips 
              currentTab="upload"
              hasData={false}
              selectedLap={selectedLap}
              selectedLaps={selectedLaps}
            />
            
            <FileUpload onDataLoad={handleDataLoad} />
          </div>
        )}

        {/* Cached Data Indicator */}
        {data.length > 0 && cachedFileName && (
          <div className="mb-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <span className="text-blue-400">💾</span>
                <div>
                  <span className="text-blue-300 text-sm">
                    Restored from cache: <strong>{cachedFileName}</strong>
                  </span>
                  {(() => {
                    const cacheInfo = getCacheInfo();
                    return cacheInfo && (
                      <div className="text-xs text-blue-400 mt-1">
                        {cacheInfo.size} • Cached {cacheInfo.age}h ago • {cacheInfo.timestamp}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <button
                onClick={handleClearData}
                className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-xs transition-colors"
              >
                Clear Cache
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        {data.length > 0 && (
          <>
            <div className="mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 rounded-lg p-2">
                <div className="flex flex-wrap gap-2">
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
                <button
                  onClick={() => setShowHelp(true)}
                  className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-sm transition-colors flex items-center gap-2"
                  title={`Get help with ${tabs.find(t => t.id === activeTab)?.label}`}
                >
                  <span>❓</span>
                  Help
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="w-full">
              {/* Contextual Tips */}
              <ContextualTips 
                currentTab={activeTab}
                hasData={data.length > 0}
                selectedLap={selectedLap}
                selectedLaps={selectedLaps}
              />
              
              {activeTab === 'comparison' && (
                <LapComparison 
                  data={data} 
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
              
              {activeTab === 'analysis' && (
                <DataAnalysis 
                  data={data} 
                  selectedLap={selectedLap} 
                  onLapSelect={setSelectedLap} 
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
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-green-400 font-medium">
                    📈 {data.length.toLocaleString()} data points loaded
                  </span>
                  {cachedFileName && (
                    <span className="text-blue-400 text-sm">
                      💾 Cached: {cachedFileName}
                    </span>
                  )}
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
                  {/* Additional status info */}
                  <span className="text-gray-400 text-sm">
                    📊 Tab: {tabs.find(t => t.id === activeTab)?.label}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowHelp(true)}
                    className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-sm transition-colors"
                    title={`Get help with ${tabs.find(t => t.id === activeTab)?.label}`}
                  >
                    ❓ Help
                  </button>
                  {cachedFileName && (
                    <button
                      onClick={handleClearData}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                      title="Clear cached data"
                    >
                      Clear Cache
                    </button>
                  )}
                  <button
                    onClick={handleClearData}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                    title="Upload new data file"
                  >
                    Load New Data
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Help Dialog */}
      <HelpDialog 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)} 
        currentTab={data.length === 0 ? 'upload' : activeTab}
      />

      {/* Quick Start Guide */}
      <QuickStartGuide
        isOpen={showQuickStart}
        onClose={handleQuickStartClose}
        onOpenHelp={handleQuickStartHelp}
      />

      {/* Version */}
      <Version />
    </div>
  );
}
