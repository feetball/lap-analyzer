'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, X, FileUp, BarChart3, Map, GitCompare, Database } from 'lucide-react';

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
}

export default function HelpDialog({ isOpen, onClose, currentTab }: HelpDialogProps) {
  const [activeSection, setActiveSection] = useState(currentTab);

  // Handle escape key and prevent background scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Prevent background scroll
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const helpSections = {
    upload: {
      title: "File Upload",
      icon: FileUp,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-3">Getting Started with Data Upload</h3>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-blue-300 mb-2">📁 Supported File Format</h4>
              <p className="text-gray-300 text-sm">
                Upload CSV files from your data logger or telemetry system. The application supports files from popular systems like:
              </p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li>AiM data loggers</li>
                <li>RaceCapture systems</li>
                <li>Harry&apos;s LapTimer exports</li>
                <li>Custom GPS loggers</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">📍 Required Data Columns</h4>
              <p className="text-gray-300 text-sm">Your CSV must contain:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li><strong>Latitude:</strong> GPS latitude coordinates (lat, latitude)</li>
                <li><strong>Longitude:</strong> GPS longitude coordinates (lon, lng, longitude)</li>
                <li><strong>Time/Timestamp:</strong> Time data for synchronization (optional but recommended)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">🔧 Optional Telemetry Data</h4>
              <p className="text-gray-300 text-sm">Additional columns that enhance analysis:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li>Speed (mph, kph, m/s)</li>
                <li>Engine RPM</li>
                <li>Throttle position (%)</li>
                <li>Brake pressure</li>
                <li>G-forces (lateral, longitudinal)</li>
                <li>Steering angle</li>
                <li>Gear position</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">⚡ Upload Methods</h4>
              <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside ml-4">
                <li><strong>Drag & Drop:</strong> Simply drag your CSV file onto the upload area</li>
                <li><strong>Browse:</strong> Click &quot;browse&quot; to select a file from your computer</li>
                <li><strong>Large Files:</strong> Files up to 50MB are supported for comprehensive session data</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    analysis: {
      title: "Data Analysis",
      icon: BarChart3,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-3">Telemetry Data Analysis</h3>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-blue-300 mb-2">�️ Data Channel Selection</h4>
              <p className="text-gray-300 text-sm">
                Choose which telemetry channels to display and analyze:
              </p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li><strong>Multiple Channels:</strong> Select multiple data streams to compare simultaneously</li>
                <li><strong>Channel Types:</strong> Speed, RPM, throttle, brake, G-forces, steering angle</li>
                <li><strong>Real-time Updates:</strong> Charts update instantly when channels are selected/deselected</li>
                <li><strong>Smart Defaults:</strong> System suggests relevant channels based on available data</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">�🏁 Automatic Lap Detection</h4>
              <p className="text-gray-300 text-sm">
                The system automatically detects laps using GPS coordinates:
              </p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li>Identifies known racing circuits from GPS data</li>
                <li>Locates start/finish line positions</li>
                <li>Calculates individual lap times</li>
                <li>Provides lap-by-lap performance metrics</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">📊 Data Overlays & Interactive Charts</h4>
              <p className="text-gray-300 text-sm">Analyze your telemetry data with professional-grade charts:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li><strong>Multi-Channel Overlays:</strong> View multiple data streams on the same chart</li>
                <li><strong>Zoom & Pan:</strong> Use mouse wheel to zoom, click and drag to pan</li>
                <li><strong>Lap Selection:</strong> Click on lap buttons to focus on specific laps</li>
                <li><strong>Color Coding:</strong> Each channel gets a unique color for easy identification</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">🏆 Performance Metrics</h4>
              <p className="text-gray-300 text-sm">Key performance indicators displayed:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li><strong>Lap Times:</strong> Individual and best lap times</li>
                <li><strong>Sector Times:</strong> Track segment performance</li>
                <li><strong>Speed Analysis:</strong> Top speed, average speed per lap</li>
                <li><strong>Best Theoretical:</strong> Combines best sectors for optimal lap time</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">🎯 How to Use</h4>
              <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside ml-4">
                <li>Select telemetry channels from the dropdown menus</li>
                <li>Use the lap selector to focus on specific laps</li>
                <li>Hover over charts for detailed data points</li>
                <li>Compare different data channels to find improvement areas</li>
              </ol>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">⌨️ Chart Shortcuts</h4>
              <div className="text-gray-300 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Mouse Wheel</kbd>
                  <span>Zoom in/out on charts</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Click + Drag</kbd>
                  <span>Pan chart view</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Double Click</kbd>
                  <span>Reset chart zoom</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    map: {
      title: "Circuit Map",
      icon: Map,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-3">GPS Track Visualization</h3>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-blue-300 mb-2">🗺️ Interactive Track Map</h4>
              <p className="text-gray-300 text-sm">
                View your racing line overlaid on satellite imagery:
              </p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li>High-resolution satellite view of the race track</li>
                <li>GPS track path with color-coded speed visualization</li>
                <li>Start/finish line markers</li>
                <li>Sector boundaries and timing points</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">🎨 Speed Visualization</h4>
              <p className="text-gray-300 text-sm">Track lines are color-coded by speed:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li><span className="text-red-400">🔴 Red:</span> High speed sections (straights)</li>
                <li><span className="text-yellow-400">🟡 Yellow:</span> Medium speed (moderate corners)</li>
                <li><span className="text-green-400">🟢 Green:</span> Low speed (tight corners, braking zones)</li>
                <li><span className="text-blue-400">🔵 Blue:</span> Very low speed (hairpins, chicanes)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">🏁 Circuit Recognition</h4>
              <p className="text-gray-300 text-sm">Automatic identification of known race tracks:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li>Major US racing circuits (Road America, Laguna Seca, etc.)</li>
                <li>Proper start/finish line positioning</li>
                <li>Accurate sector divisions</li>
                <li>Track direction detection</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">🎮 Map Controls</h4>
              <p className="text-gray-300 text-sm">Navigate and explore the track:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li><strong>Zoom:</strong> Mouse wheel or +/- buttons</li>
                <li><strong>Pan:</strong> Click and drag to move around</li>
                <li><strong>Reset View:</strong> Button to return to full track view</li>
                <li><strong>Layer Toggle:</strong> Switch between satellite and map views</li>
                <li><strong>Opacity Control:</strong> Adjust transparency when multiple laps are selected</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">⌨️ Keyboard Shortcuts</h4>
              <div className="text-gray-300 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Space</kbd>
                  <span>Toggle full screen map</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">R</kbd>
                  <span>Reset map view</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">1-9</kbd>
                  <span>Quick lap selection</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">📍 Lap Comparison</h4>
              <p className="text-gray-300 text-sm">Compare different laps visually:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li>Select multiple laps to overlay racing lines</li>
                <li>Different colors for each lap</li>
                <li>Adjust opacity to see through overlapping lines</li>
                <li>Identify braking and acceleration differences</li>
                <li>Spot racing line variations between laps</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    comparison: {
      title: "Lap Comparison",
      icon: GitCompare,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-3">Advanced Lap Analysis</h3>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-blue-300 mb-2">⚖️ Side-by-Side Comparison</h4>
              <p className="text-gray-300 text-sm">
                Compare multiple laps to identify improvement opportunities:
              </p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li>Select any two laps for detailed comparison</li>
                <li>Overlay telemetry data on the same chart</li>
                <li>Highlight performance differences</li>
                <li>Time delta analysis throughout the lap</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">📈 Performance Metrics</h4>
              <p className="text-gray-300 text-sm">Key comparison metrics include:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li><strong>Lap Time Delta:</strong> Time difference between laps</li>
                <li><strong>Speed Comparison:</strong> Maximum and average speed differences</li>
                <li><strong>Sector Analysis:</strong> Performance in each track section</li>
                <li><strong>Consistency Metrics:</strong> Lap-to-lap variation analysis</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">🎯 Finding Improvements</h4>
              <p className="text-gray-300 text-sm">Use comparison tools to:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li>Identify slow corners compared to your best lap</li>
                <li>Find braking points that can be optimized</li>
                <li>Analyze throttle application differences</li>
                <li>Compare racing lines between fast and slow laps</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">📊 Data Channels</h4>
              <p className="text-gray-300 text-sm">Compare any telemetry channel:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li>Speed profiles throughout the lap</li>
                <li>Throttle and brake application timing</li>
                <li>RPM and gear selection strategies</li>
                <li>G-force analysis in corners</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">🏆 Best Theoretical Lap</h4>
              <p className="text-gray-300 text-sm">Calculate your maximum potential:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li>Combines best sector times from all laps</li>
                <li>Shows theoretical fastest possible lap time</li>
                <li>Identifies which sectors need most improvement</li>
                <li>Provides realistic performance targets</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    sessions: {
      title: "Session Management",
      icon: Database,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-3">Save & Manage Your Data</h3>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-blue-300 mb-2">💾 Session Storage</h4>
              <p className="text-gray-300 text-sm">
                Save your racing sessions for future analysis:
              </p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li>Persistent storage of telemetry data</li>
                <li>Automatic circuit detection and naming</li>
                <li>Session metadata (date, track, notes)</li>
                <li>Quick access to previous sessions</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">📂 Session Organization</h4>
              <p className="text-gray-300 text-sm">Keep your data organized:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li><strong>Custom Names:</strong> Add descriptive names to sessions</li>
                <li><strong>Date Tracking:</strong> Automatic timestamp recording</li>
                <li><strong>Circuit Tags:</strong> Automatic track identification</li>
                <li><strong>Search & Filter:</strong> Find sessions quickly</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">🔄 Data Management</h4>
              <p className="text-gray-300 text-sm">Manage your session library:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li><strong>Load Sessions:</strong> Instantly restore previous data</li>
                <li><strong>Delete Sessions:</strong> Remove unwanted sessions</li>
                <li><strong>Export Data:</strong> Download sessions for external analysis</li>
                <li><strong>Backup:</strong> Protect your valuable data</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">🔍 Session Comparison</h4>
              <p className="text-gray-300 text-sm">Compare across different track days:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li>Load multiple sessions from the same track</li>
                <li>Compare lap times across different events</li>
                <li>Track improvement over time</li>
                <li>Analyze setup changes between sessions</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-300 mb-2">⚡ Quick Actions</h4>
              <p className="text-gray-300 text-sm">Efficient session management:</p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside ml-4">
                <li><strong>Save Session:</strong> Store current analysis session</li>
                <li><strong>Load Session:</strong> Restore previous session data</li>
                <li><strong>View Details:</strong> See session summary information</li>
                <li><strong>Delete Session:</strong> Remove sessions with confirmation</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  };

  const sections = [
    { key: 'upload', label: 'File Upload', icon: FileUp },
    { key: 'analysis', label: 'Data Analysis', icon: BarChart3 },
    { key: 'map', label: 'Circuit Map', icon: Map },
    { key: 'comparison', label: 'Lap Comparison', icon: GitCompare },
    { key: 'sessions', label: 'Sessions', icon: Database },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
           style={{ zIndex: 10000 }}
           onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Race Car Data Analyzer - Help</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeSection === section.key
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {helpSections[activeSection as keyof typeof helpSections]?.content}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-800">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>
              Need more help? Check the documentation or contact support.
            </div>
            <div className="flex items-center gap-4">
              <span>Press ESC to close</span>
              <span>•</span>
              <span>Version 1.0</span>
              <span>•</span>
              <span>Professional Racing Telemetry Tool</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
