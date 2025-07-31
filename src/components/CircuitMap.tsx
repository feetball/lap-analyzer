'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

import { Map as MapIcon, ZoomIn, ZoomOut, RotateCcw, Settings } from 'lucide-react';

// Use state to hold Leaflet module
import { useRef } from 'react';

// Dynamically import Leaflet and CSS only on client side
const useLeaflet = () => {
  const leafletRef = useRef<any>(null);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (typeof window !== 'undefined') {
        // Load CSS by creating a link element instead of importing
        const cssLoaded = document.querySelector('link[href*="leaflet.css"]');
        if (!cssLoaded) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        
        const leafletModule = await import('leaflet');
        if (isMounted) {
          leafletRef.current = leafletModule;
          // Fix Leaflet default markers only on client side
          delete (leafletModule.Icon.Default.prototype as any)._getIconUrl;
          leafletModule.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          });
        }
      }
    })();
    return () => { isMounted = false; };
  }, []);
  return leafletRef.current;
};

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('react-leaflet').then((mod) => mod.Tooltip),
  { ssr: false }
);

// Fix Leaflet default markers only on client side
if (typeof window !== 'undefined') {
  // This will be handled in the useLeaflet hook instead
}

interface CircuitMapProps {
  data: any[];
  selectedLap: number | null;
  onLapSelect: (lap: number | null) => void;
}

interface LapPath {
  lapNumber: number;
  coordinates: [number, number][];
  color: string;
}

interface ColoredSegment {
  coordinates: [number, number][];
  color: string;
  opacity: number;
  throttleValue: number;
  brakeValue: number;
  segmentIndex: number;
}

// Known US racing circuits with start/finish line coordinates
const KNOWN_CIRCUITS: Record<string, {
  center: [number, number];
  startFinish: [[number, number], [number, number]];
  zoom: number;
}> = {
  'Road America': {
    center: [43.8002, -87.9897] as [number, number],
    startFinish: [[43.8002, -87.9897], [43.8005, -87.9900]] as [[number, number], [number, number]],
    zoom: 15,
  },
  'Laguna Seca': {
    center: [36.5844, -121.7536] as [number, number],
    startFinish: [[36.5844, -121.7536], [36.5847, -121.7539]] as [[number, number], [number, number]],
    zoom: 15,
  },
  'Circuit of the Americas': {
    center: [30.1328, -97.6411] as [number, number],
    startFinish: [[30.1328, -97.6411], [30.1331, -97.6414]] as [[number, number], [number, number]],
    zoom: 15,
  },
  'Watkins Glen': {
    center: [42.3369, -76.9270] as [number, number],
    startFinish: [[42.3369, -76.9270], [42.3372, -76.9273]] as [[number, number], [number, number]],
    zoom: 15,
  },
};


export default function CircuitMap({ data, selectedLap, onLapSelect }: CircuitMapProps) {
  const [mapRef, setMapRef] = useState<any>(null);
  const [detectedCircuit, setDetectedCircuit] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [throttleChannel, setThrottleChannel] = useState<string>('');
  const [brakeChannel, setBrakeChannel] = useState<string>('');
  const [colorMode, setColorMode] = useState<'throttle' | 'brake' | 'both' | 'none'>('none');
  const [showChannelSelector, setShowChannelSelector] = useState(false);
  const [mapHeight, setMapHeight] = useState(800); // Default to 800px
  const [tileLayer, setTileLayer] = useState<'satellite' | 'street'>('satellite');
  const [customStartFinish, setCustomStartFinish] = useState<[number, number] | null>(null);
  const [isSettingStartFinish, setIsSettingStartFinish] = useState(false);
  const [hoverData, setHoverData] = useState<{
    throttle: number;
    brake: number;
    position: [number, number];
    visible: boolean;
  } | null>(null);
  const leaflet = useLeaflet();

  useEffect(() => {
    setIsMounted(true);
    // Setup marker icons only after Leaflet is loaded
    if (leaflet) {
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    }
  }, [leaflet]);

  // Get available data channels
  const availableChannels = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return Object.keys(data[0]).filter(key => 
      typeof data[0][key] === 'number' && 
      !key.toLowerCase().includes('lat') && 
      !key.toLowerCase().includes('lon') &&
      !key.toLowerCase().includes('lng')
    );
  }, [data]);

  // Auto-detect throttle and brake channels with specific defaults
  useEffect(() => {
    if (availableChannels.length > 0) {
      // First try exact matches for default names
      let throttleKey: string | undefined = availableChannels.find(key => key === 'TPS (%)');
      let brakeKey: string | undefined = availableChannels.find(key => key === 'Brake Pressure (%)');
      
      // If exact matches not found, try broader search
      if (!throttleKey) {
        throttleKey = availableChannels.find(key => 
          key.toLowerCase().includes('tps') ||
          key.toLowerCase().includes('throttle') || 
          key.toLowerCase().includes('accel')
        );
      }
      
      if (!brakeKey) {
        brakeKey = availableChannels.find(key => 
          key.toLowerCase().includes('brake') || 
          key.toLowerCase().includes('bps')
        );
      }
      
      if (throttleKey && !throttleChannel) setThrottleChannel(throttleKey);
      if (brakeKey && !brakeChannel) setBrakeChannel(brakeKey);
    }
  }, [availableChannels, throttleChannel, brakeChannel]);

  // Extract GPS coordinates and create colored segments
  const { coordinates, center, lapPaths, coloredSegments } = useMemo(() => {
    if (!data || data.length === 0) return { 
      coordinates: [], 
      center: [0, 0] as [number, number], 
      lapPaths: [],
      coloredSegments: []
    };

    // Find latitude and longitude columns
    const latKey = Object.keys(data[0]).find(key => 
      key.toLowerCase().includes('lat') && typeof data[0][key] === 'number'
    );
    const lonKey = Object.keys(data[0]).find(key => 
      (key.toLowerCase().includes('lon') || key.toLowerCase().includes('lng')) && 
      typeof data[0][key] === 'number'
    );

    if (!latKey || !lonKey) {
      return { 
        coordinates: [], 
        center: [0, 0] as [number, number], 
        lapPaths: [],
        coloredSegments: []
      };
    }

    const coords: [number, number][] = data
      .filter(row => row[latKey] && row[lonKey])
      .map(row => [row[latKey], row[lonKey]]);

    // Validate GPS coordinate ranges
    const validCoords = coords.filter(([lat, lon]) => {
      const isValidLat = lat >= -90 && lat <= 90;
      const isValidLon = lon >= -180 && lon <= 180;
      return isValidLat && isValidLon;
    });

    if (validCoords.length === 0) {
      return { 
        coordinates: [], 
        center: [0, 0] as [number, number], 
        lapPaths: [],
        coloredSegments: []
      };
    }

    // Calculate center using valid coordinates
    const avgLat = validCoords.reduce((sum, coord) => sum + coord[0], 0) / validCoords.length;
    const avgLon = validCoords.reduce((sum, coord) => sum + coord[1], 0) / validCoords.length;
    const calculatedCenter: [number, number] = [avgLat, avgLon];

    // Detect which circuit this might be
    let detected = null;
    let minDistance = Infinity;
    
    Object.entries(KNOWN_CIRCUITS).forEach(([name, circuit]) => {
      const distance = Math.sqrt(
        Math.pow(calculatedCenter[0] - circuit.center[0], 2) +
        Math.pow(calculatedCenter[1] - circuit.center[1], 2)
      );
      if (distance < minDistance && distance < 0.01) { // Within reasonable distance
        minDistance = distance;
        detected = name;
      }
    });

    // Create lap paths (simplified - in reality you'd use start/finish line detection)
    const lapSize = Math.floor(validCoords.length / 3);
    const paths: LapPath[] = [];
    const colors = ['#000000', '#000000', '#000000', '#000000', '#000000']; // All black

    for (let i = 0; i < 3; i++) {
      const startIndex = i * lapSize;
      const endIndex = Math.min((i + 1) * lapSize, validCoords.length - 1);
      const lapCoords = validCoords.slice(startIndex, endIndex);
      
      if (lapCoords.length > 0) {
        paths.push({
          lapNumber: i + 1,
          coordinates: lapCoords,
          color: colors[i % colors.length],
        });
      }
    }

    // Create colored segments based on selected channels and color mode
    const segments: ColoredSegment[] = [];
    
    if (colorMode !== 'none' && (throttleChannel || brakeChannel)) {
      const filteredData = data.filter(row => row[latKey] && row[lonKey]);
      
      console.log('Creating segments:', { 
        colorMode, 
        throttleChannel, 
        brakeChannel, 
        dataLength: filteredData.length,
        throttleStats: {
          min: Math.min(...filteredData.map(row => parseFloat(row[throttleChannel]) || 0)),
          max: Math.max(...filteredData.map(row => parseFloat(row[throttleChannel]) || 0)),
          avg: (filteredData.reduce((sum, row) => sum + (parseFloat(row[throttleChannel]) || 0), 0) / filteredData.length).toFixed(2)
        }
      });
      
      // Group consecutive points into segments with similar colors
      const segmentSize = Math.max(1, Math.floor(filteredData.length / 150)); // Fewer segments for better visibility
      
      for (let i = 0; i < filteredData.length - segmentSize; i += Math.floor(segmentSize / 2)) {
        const segmentData = filteredData.slice(i, i + segmentSize + 1);
        const segmentCoords: [number, number][] = segmentData.map(row => [row[latKey], row[lonKey]]);
        
        if (segmentCoords.length < 2) continue;
        
        // Calculate average values for this segment
        let throttleValue = 0;
        let brakeValue = 0;
        
        if (throttleChannel && (colorMode === 'throttle' || colorMode === 'both')) {
          const throttleSum = segmentData.reduce((sum, row) => {
            const val = parseFloat(row[throttleChannel]) || 0;
            return sum + val;
          }, 0);
          throttleValue = throttleSum / segmentData.length;
        }
        
        if (brakeChannel && (colorMode === 'brake' || colorMode === 'both')) {
          const brakeSum = segmentData.reduce((sum, row) => {
            const val = parseFloat(row[brakeChannel]) || 0;
            return sum + val;
          }, 0);
          brakeValue = brakeSum / segmentData.length;
        }
        
        // Determine color and opacity based on mode
        let segmentColor = '#6b7280'; // Gray default
        let opacity = 0.1; // Very low base opacity for neutral
        
        // Convert percentage to opacity and detect scale
        const getOpacityFromValue = (value: number) => {
          // Handle both 0-1 and 0-100 scales
          const percentage = value <= 1 ? value * 100 : value;
          
          // Only show color if >= 1%
          if (percentage < 1) return null;
          
          // TRUE 1:1 mapping: 1% = 0.01 opacity, 50% = 0.5 opacity, 100% = 1.0 opacity
          return Math.max(0.01, Math.min(1, percentage / 100));
        };
        
        if (colorMode === 'throttle') {
          const throttleOpacity = getOpacityFromValue(throttleValue);
          if (throttleOpacity !== null) {
            segmentColor = '#22c55e'; // Green
            opacity = throttleOpacity;
          }
        } else if (colorMode === 'brake') {
          const brakeOpacity = getOpacityFromValue(brakeValue);
          if (brakeOpacity !== null) {
            segmentColor = '#ef4444'; // Red
            opacity = brakeOpacity;
          }
        } else if (colorMode === 'both') {
          const throttleOpacity = getOpacityFromValue(throttleValue);
          const brakeOpacity = getOpacityFromValue(brakeValue);
          
          // In both mode, brake takes priority when both are >= 10%
          if (brakeOpacity !== null && (throttleOpacity === null || brakeValue >= throttleValue)) {
            segmentColor = '#ef4444'; // Red for brake
            opacity = brakeOpacity;
          } else if (throttleOpacity !== null) {
            segmentColor = '#22c55e'; // Green for throttle
            opacity = throttleOpacity;
          }
        }
        
        // Add debugging for first few segments
        if (segments.length < 5) {
          const throttlePercentage = throttleValue <= 1 ? throttleValue * 100 : throttleValue;
          const brakePercentage = brakeValue <= 1 ? brakeValue * 100 : brakeValue;
          
          console.log(`Segment ${segments.length}:`, {
            throttlePercentage: throttlePercentage.toFixed(1) + '%',
            brakePercentage: brakePercentage.toFixed(1) + '%',
            opacity: opacity.toFixed(3),
            mode: colorMode
          });
        }
        
        // Also log some high throttle segments for comparison
        if (throttleValue > 10 && segments.length % 50 === 0) {
          const throttlePercentage = throttleValue <= 1 ? throttleValue * 100 : throttleValue;
          console.log(`HIGH THROTTLE Segment ${segments.length}:`, {
            throttlePercentage: throttlePercentage.toFixed(1) + '%',
            opacity: opacity.toFixed(3)
          });
        }
        
        segments.push({
          coordinates: segmentCoords,
          color: segmentColor,
          opacity: opacity,
          throttleValue: throttleValue,
          brakeValue: brakeValue,
          segmentIndex: segments.length,
        });
      }
      
      console.log('Created segments:', segments.length);
    }

    return {
      coordinates: validCoords,
      center: detected ? KNOWN_CIRCUITS[detected].center : calculatedCenter,
      lapPaths: paths,
      coloredSegments: segments,
    };
  }, [data, throttleChannel, brakeChannel, colorMode]);

  // Auto-detect circuit
  useEffect(() => {
    if (coordinates.length > 0 && center) {
      let detected = null;
      let minDistance = Infinity;
      
      Object.entries(KNOWN_CIRCUITS).forEach(([name, circuit]) => {
        const distance = Math.sqrt(
          Math.pow(center[0] - circuit.center[0], 2) +
          Math.pow(center[1] - circuit.center[1], 2)
        );
        if (distance < minDistance && distance < 0.01) {
          minDistance = distance;
          detected = name;
        }
      });
      
      setDetectedCircuit(detected);
    }
  }, [coordinates, center]);

  const handleZoomIn = () => {
    if (mapRef) {
      mapRef.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef) {
      mapRef.zoomOut();
    }
  };

  const handleReset = () => {
    if (mapRef && center) {
      mapRef.setView(center, detectedCircuit ? KNOWN_CIRCUITS[detectedCircuit].zoom : 15);
    }
  };

  const getStartFinishPosition = (): [number, number] | null => {
    if (customStartFinish) return customStartFinish;
    if (detectedCircuit && KNOWN_CIRCUITS[detectedCircuit].startFinish) {
      return KNOWN_CIRCUITS[detectedCircuit].startFinish[0];
    }
    return null;
  };

  // Add map click event listener for start/finish line setting
  useEffect(() => {
    if (mapRef && isSettingStartFinish) {
      const handleClick = (e: any) => {
        setCustomStartFinish([e.latlng.lat, e.latlng.lng]);
        setIsSettingStartFinish(false);
      };
      
      mapRef.on('click', handleClick);
      
      return () => {
        mapRef.off('click', handleClick);
      };
    }
  }, [mapRef, isSettingStartFinish]);

  if (coordinates.length === 0) {
    return (
      <div className="text-center py-12">
        <MapIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl text-white mb-2">No GPS Data Found</h3>
        <p className="text-gray-400">Upload a CSV file with latitude and longitude data to view the circuit map.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Circuit Map</h2>
          {detectedCircuit && (
            <p className="text-green-400 text-sm mt-1">
              Detected circuit: {detectedCircuit}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowChannelSelector(!showChannelSelector)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            title="Channel Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            title="Reset View"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Channel Selector */}
      {showChannelSelector && (
        <div className="bg-white/5 rounded-lg p-4 space-y-4">
          <h3 className="text-white font-medium">Data Channel Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Throttle Channel
              </label>
              <select
                value={throttleChannel}
                onChange={(e) => setThrottleChannel(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Select throttle channel</option>
                {availableChannels.map(channel => (
                  <option key={channel} value={channel} className="bg-gray-800">
                    {channel}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Brake Channel
              </label>
              <select
                value={brakeChannel}
                onChange={(e) => setBrakeChannel(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Select brake channel</option>
                {availableChannels.map(channel => (
                  <option key={channel} value={channel} className="bg-gray-800">
                    {channel}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Color Mode
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'none', label: 'No Color Coding' },
                { value: 'throttle', label: 'Throttle (Green)' },
                { value: 'brake', label: 'Brake (Red)' },
                { value: 'both', label: 'Both (Green/Red)' },
              ].map(mode => (
                <button
                  key={mode.value}
                  onClick={() => setColorMode(mode.value as any)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    colorMode === mode.value
                      ? 'bg-red-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Map View
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTileLayer('satellite')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tileLayer === 'satellite'
                      ? 'bg-red-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  Satellite
                </button>
                <button
                  onClick={() => setTileLayer('street')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tileLayer === 'street'
                      ? 'bg-red-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  Street
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Map Height: {mapHeight}px
              </label>
              <input
                type="range"
                min="300"
                max="800"
                value={mapHeight}
                onChange={(e) => setMapHeight(parseInt(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start/Finish Line
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsSettingStartFinish(!isSettingStartFinish)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSettingStartFinish
                    ? 'bg-yellow-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {isSettingStartFinish ? 'Click Map to Set' : 'Move Start/Finish'}
              </button>
              {customStartFinish && (
                <button
                  onClick={() => setCustomStartFinish(null)}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                >
                  Reset to Default
                </button>
              )}
            </div>
            {isSettingStartFinish && (
              <p className="text-xs text-yellow-400 mt-1">
                Click anywhere on the map to set the start/finish line position
              </p>
            )}
          </div>
        </div>
      )}

      {/* Lap Selection */}
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3">Lap Visualization</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onLapSelect(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedLap === null
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            All Laps
          </button>
          {lapPaths.map((lap) => (
            <button
              key={lap.lapNumber}
              onClick={() => onLapSelect(lap.lapNumber)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedLap === lap.lapNumber
                  ? 'bg-red-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
              style={{
                borderLeft: `4px solid ${lap.color}`,
              }}
            >
              Lap {lap.lapNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="bg-white/5 rounded-lg p-4">
        <div 
          className="rounded-lg overflow-hidden"
          style={{ height: `${mapHeight}px` }}
        >
          {isMounted && (
            <MapContainer
              center={center}
              zoom={detectedCircuit ? KNOWN_CIRCUITS[detectedCircuit].zoom : 15}
              style={{ height: '100%', width: '100%' }}
              ref={setMapRef}
            >
              {tileLayer === 'satellite' ? (
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              ) : (
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              )}
              
              {/* Show colored segments if color mode is active */}
              {colorMode !== 'none' && coloredSegments.length > 0 ? (
                coloredSegments.map((segment, index) => (
                  <Polyline
                    key={`segment-${index}`}
                    positions={segment.coordinates}
                    pathOptions={{
                      color: segment.color,
                      weight: 5,
                      opacity: segment.opacity,
                      fillOpacity: segment.opacity,
                      stroke: true,
                      fillColor: segment.color,
                    }}
                    eventHandlers={{
                      mouseover: (e) => {
                        const latlng = e.latlng || (e.target.getLatLngs()[0] && e.target.getLatLngs()[0][0]);
                        if (latlng) {
                          setHoverData({
                            throttle: segment.throttleValue,
                            brake: segment.brakeValue,
                            position: [latlng.lat, latlng.lng],
                            visible: true,
                          });
                        }
                      },
                      mouseout: () => {
                        setHoverData(null);
                      },
                    }}
                  />
                ))
              ) : (
                /* Show regular lap paths when no color coding */
                lapPaths.map((lap) => {
                  if (selectedLap !== null && selectedLap !== lap.lapNumber) {
                    return null;
                  }
                  
                  return (
                    <Polyline
                      key={lap.lapNumber}
                      positions={lap.coordinates}
                      color={lap.color}
                      weight={4}
                      opacity={selectedLap === null ? 0.7 : 1}
                    />
                  );
                })
              )}

              {/* Start/Finish line - custom or detected circuit */}
              {(() => {
                const startFinishPos = getStartFinishPosition();
                if (startFinishPos) {
                  return (
                    <Marker position={startFinishPos}>
                      <Popup>
                        Start/Finish Line<br />
                        {customStartFinish ? 'Custom Position' : detectedCircuit}
                        <br />
                        <small>Lat: {startFinishPos[0].toFixed(6)}, Lng: {startFinishPos[1].toFixed(6)}</small>
                      </Popup>
                    </Marker>
                  );
                }
                return null;
              })()}
              
              {/* Hover tooltip */}
              {hoverData && hoverData.visible && (
                <Marker position={hoverData.position} opacity={0}>
                  <Tooltip permanent direction="top" offset={[0, -10]}>
                    <div className="text-xs">
                      <div><strong>Throttle:</strong> {hoverData.throttle.toFixed(1)}%</div>
                      <div><strong>Brake:</strong> {hoverData.brake.toFixed(1)}%</div>
                    </div>
                  </Tooltip>
                </Marker>
              )}
              
              {/* Show default circuit start/finish line if available and no custom position */}
              {!customStartFinish && detectedCircuit && KNOWN_CIRCUITS[detectedCircuit].startFinish && (
                <Polyline
                  positions={KNOWN_CIRCUITS[detectedCircuit].startFinish}
                  color="#ffffff"
                  weight={4}
                  opacity={0.8}
                />
              )}
            </MapContainer>
          )}
          {!isMounted && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white/5 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-medium">Legend</h3>
          <div className="text-sm text-gray-400">
            <span>{tileLayer === 'satellite' ? '🛰️ Satellite View' : '🗺️ Street View'} • Height: {mapHeight}px</span>
            {hoverData && (
              <div className="mt-1 text-yellow-400 text-xs">
                🔍 Hover: Throttle {hoverData.throttle.toFixed(1)}% | Brake {hoverData.brake.toFixed(1)}%
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {colorMode === 'none' ? (
            /* Show lap colors when no color coding */
            lapPaths.map((lap) => (
              <div key={lap.lapNumber} className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: lap.color }}
                ></div>
                <span className="text-white text-sm">Lap {lap.lapNumber}</span>
              </div>
            ))
          ) : (
            /* Show color coding legend */
            <>
              {(colorMode === 'throttle' || colorMode === 'both') && throttleChannel && (
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-4 bg-green-500 opacity-40 rounded"></div>
                    <div className="w-2 h-4 bg-green-500 opacity-70 rounded"></div>
                    <div className="w-2 h-4 bg-green-500 opacity-100 rounded"></div>
                  </div>
                  <span className="text-white text-sm">
                    Throttle ({throttleChannel})
                  </span>
                </div>
              )}
              {(colorMode === 'brake' || colorMode === 'both') && brakeChannel && (
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-4 bg-red-500 opacity-40 rounded"></div>
                    <div className="w-2 h-4 bg-red-500 opacity-70 rounded"></div>
                    <div className="w-2 h-4 bg-red-500 opacity-100 rounded"></div>
                  </div>
                  <span className="text-white text-sm">
                    Brake ({brakeChannel})
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-500 opacity-40 rounded"></div>
                <span className="text-white text-sm">No Input</span>
              </div>
            </>
          )}
          {getStartFinishPosition() && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-white rounded"></div>
              <span className="text-white text-sm">
                {customStartFinish ? 'Custom Start/Finish' : 'Start/Finish'}
              </span>
            </div>
          )}
        </div>
        
        {colorMode !== 'none' && (
          <div className="mt-3 text-xs text-gray-400">
            <p>TRUE 1:1 opacity mapping: 1.5% input = 0.015 opacity, 50% input = 0.5 opacity, 100% input = 1.0 opacity</p>
            <p>Minimum threshold: 1% (below this shows as gray trace)</p>
            {colorMode === 'both' && (
              <p>Brake input takes priority when both throttle and brake are applied</p>
            )}
            {coloredSegments.length > 0 && (
              <p>Showing {coloredSegments.length} colored segments</p>
            )}
            {throttleChannel && brakeChannel && (
              <div className="mt-2 p-2 bg-black/20 rounded text-xs">
                <p>🔍 Debug Info:</p>
                <p>Throttle Channel: &quot;{throttleChannel}&quot;</p>
                <p>Brake Channel: &quot;{brakeChannel}&quot;</p>
                {(colorMode === 'throttle' || colorMode === 'brake' || colorMode === 'both') && coloredSegments.length > 0 && (
                  <p>Color Mode: {colorMode} | Segments: {coloredSegments.length}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
