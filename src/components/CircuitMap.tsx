'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { detectCircuit, detectLaps, KNOWN_CIRCUITS } from '../utils/raceAnalysis';

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
  selectedLap: number | null; // Keep for backward compatibility
  selectedLaps?: number[]; // New prop for multiple lap selection
  onLapSelect: (lap: number | null) => void; // Keep for backward compatibility  
  onLapsSelect?: (laps: number[]) => void; // New callback for multiple lap selection
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
  width: number;
  throttleValue: number;
  brakeValue: number;
  segmentIndex: number;
  lapNumber?: number; // Track which lap this segment belongs to
  lapColor?: string; // Store the original lap color
}


export default function CircuitMap({ 
  data, 
  selectedLaps = [], 
  onLapSelect, 
  onLapsSelect 
}: CircuitMapProps) {
  const [mapRef, setMapRef] = useState<any>(null);
  const [detectedCircuit, setDetectedCircuit] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [throttleChannel, setThrottleChannel] = useState<string>('');
  const [brakeChannel, setBrakeChannel] = useState<string>('');
  const [throttleOverlay, setThrottleOverlay] = useState<boolean>(false);
  const [brakeOverlay, setBrakeOverlay] = useState<boolean>(false);
  const [widthMultiplier, setWidthMultiplier] = useState<number>(1.0);
  const [frontLap, setFrontLap] = useState<number | null>(null); // Which lap to show on top
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
  
  // Internal state for multiple lap selection
  const [internalSelectedLaps, setInternalSelectedLaps] = useState<number[]>([]);
  
  // Use either provided selectedLaps or internal state
  const activeLaps = selectedLaps.length > 0 ? selectedLaps : internalSelectedLaps;
  
  // Handle multi-lap selection (allows up to 2 laps)
  const handleLapToggle = (lapNumber: number) => {
    const newSelectedLaps = [...activeLaps];
    const lapIndex = newSelectedLaps.indexOf(lapNumber);
    
    if (lapIndex >= 0) {
      // Lap is already selected, remove it
      newSelectedLaps.splice(lapIndex, 1);
      // Reset front lap if the removed lap was on front
      if (frontLap === lapNumber) {
        setFrontLap(null);
      }
    } else {
      // Lap is not selected, add it (max 2 laps)
      if (newSelectedLaps.length < 2) {
        newSelectedLaps.push(lapNumber);
      } else {
        // Replace the first selected lap with the new one
        const removedLap = newSelectedLaps.shift();
        newSelectedLaps.push(lapNumber);
        // Reset front lap if the replaced lap was on front
        if (frontLap === removedLap) {
          setFrontLap(null);
        }
      }
    }
    
    // Reset front lap if it's not in the new selection
    if (frontLap && !newSelectedLaps.includes(frontLap)) {
      setFrontLap(null);
    }
    
    // Update internal state
    setInternalSelectedLaps(newSelectedLaps);
    
    // Call callbacks for backward compatibility
    if (onLapsSelect) {
      onLapsSelect(newSelectedLaps);
    }
    
    // For backward compatibility with single lap selection
    if (onLapSelect) {
      onLapSelect(newSelectedLaps.length > 0 ? newSelectedLaps[0] : null);
    }
  };
  
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

    // Use proper lap detection from raceAnalysis
    let detectedLaps: Array<{lapNumber: number, startIndex: number, endIndex: number, data: any[]}> = [];
    
    // Try to extract GPS keys (reuse existing latKey and lonKey)
    const timeKey = Object.keys(data[0]).find(key => key.toLowerCase().includes('time'));

    if (latKey && lonKey) {
      // Detect circuit
      const gpsData = data.map(row => ({ lat: row[latKey], lon: row[lonKey] }));
      const detectedCircuitName = detectCircuit(gpsData);
      
      // Get circuit object if found
      const circuitObj = detectedCircuitName ? KNOWN_CIRCUITS[detectedCircuitName] : null;
      
      // Detect laps using start/finish line
      detectedLaps = detectLaps(data, circuitObj || null, latKey, lonKey, timeKey);
    }
    
    // Fallback: chunking if no GPS/circuit detected
    if (detectedLaps.length === 0) {
      const lapSize = Math.floor(data.length / 3);
      for (let i = 0; i < 3; i++) {
        const startIndex = i * lapSize;
        const endIndex = Math.min((i + 1) * lapSize, data.length - 1);
        const lapData = data.slice(startIndex, endIndex);
        if (lapData.length > 0) {
          detectedLaps.push({
            lapNumber: i + 1,
            startIndex,
            endIndex,
            data: lapData
          });
        }
      }
    }

    // Create lap paths from detected laps
    const paths: LapPath[] = [];
    // Unique colors for each lap (avoiding green and red)
    const colors = [
      '#3B82F6', // Blue
      '#8B5CF6', // Purple  
      '#F59E0B', // Amber/Orange
      '#06B6D4', // Cyan
      '#EC4899', // Pink
      '#6366F1', // Indigo
      '#F97316', // Orange
      '#A855F7', // Violet
      '#0EA5E9', // Sky Blue
      '#F472B6'  // Light Pink
    ];

    detectedLaps.forEach((lap, i) => {
      const lapCoords: [number, number][] = [];
      
      // Extract coordinates for this lap
      lap.data.forEach(row => {
        if (row[latKey] && row[lonKey]) {
          lapCoords.push([row[latKey], row[lonKey]]);
        }
      });
      
      if (lapCoords.length > 0) {
        paths.push({
          lapNumber: lap.lapNumber,
          coordinates: lapCoords,
          color: colors[i % colors.length],
        });
      }
    });

    // Create colored segments based on selected channels and overlay settings
    const segments: ColoredSegment[] = [];
    
    if ((throttleOverlay || brakeOverlay) && (throttleChannel || brakeChannel)) {
      // Process each selected lap separately to maintain lap colors
      const lapsToProcess = activeLaps.length > 0 ? activeLaps : detectedLaps.map(lap => lap.lapNumber);
      
      lapsToProcess.forEach(lapNumber => {
        const lapData = detectedLaps.find(lap => lap.lapNumber === lapNumber);
        if (!lapData) return;
        
        const lapPath = paths.find(path => path.lapNumber === lapNumber);
        const lapColor = lapPath?.color || '#6b7280';
        
        const filteredData = lapData.data.filter(row => row[latKey] && row[lonKey]);
        if (filteredData.length === 0) return;
        
        // Calculate min/max values for this lap
        let throttleMin = Infinity, throttleMax = -Infinity;
        let brakeMin = Infinity, brakeMax = -Infinity;
        
        if (throttleChannel && throttleOverlay) {
          const throttleValues = filteredData.map(row => parseFloat(row[throttleChannel]) || 0);
          throttleMin = Math.min(...throttleValues);
          throttleMax = Math.max(...throttleValues);
        }
        
        if (brakeChannel && brakeOverlay) {
          const brakeValues = filteredData.map(row => parseFloat(row[brakeChannel]) || 0);
          brakeMin = Math.min(...brakeValues);
          brakeMax = Math.max(...brakeValues);
        }
        
        // Group consecutive points into segments with similar colors
        const segmentSize = Math.max(1, Math.floor(filteredData.length / 150));
        
        for (let i = 0; i < filteredData.length - segmentSize; i += Math.floor(segmentSize / 2)) {
          const segmentData = filteredData.slice(i, i + segmentSize + 1);
          const segmentCoords: [number, number][] = segmentData.map(row => [row[latKey], row[lonKey]]);
          
          if (segmentCoords.length < 2) continue;
          
          // Calculate average values for this segment
          let throttleValue = 0;
          let brakeValue = 0;
          
          if (throttleChannel && throttleOverlay) {
            const throttleSum = segmentData.reduce((sum, row) => {
              const val = parseFloat(row[throttleChannel]) || 0;
              return sum + val;
            }, 0);
            throttleValue = throttleSum / segmentData.length;
          }
          
          if (brakeChannel && brakeOverlay) {
            const brakeSum = segmentData.reduce((sum, row) => {
              const val = parseFloat(row[brakeChannel]) || 0;
              return sum + val;
            }, 0);
            brakeValue = brakeSum / segmentData.length;
          }
          
          // Determine color and opacity based on mode
          let segmentColor = '#6b7280'; // Gray default
          let opacity = 0.1; // Very low base opacity for neutral

          // Convert value to width using actual data range (1px to 15px for dramatic effect)
          const getWidthFromValue = (value: number, min: number, max: number) => {
            if (isNaN(value) || min === max) return 2; // Base width
            
            // Normalize value to 0-1 range based on actual min/max
            const normalizedValue = (value - min) / (max - min);
            
            // Scale width from 1px to 15px based on the normalized value for dramatic visual difference
            const baseWidth = Math.max(1, Math.min(15, 1 + (normalizedValue * 14)));
            
            // Apply width multiplier
            return Math.max(1, baseWidth * widthMultiplier);
          };

          let width = 2; // Default width
          
          // Width mode with multiple laps selected, use original lap colors
          if (activeLaps.length > 1) {
            segmentColor = lapColor; // Use the lap's original color
            opacity = 0.8; // High opacity for visibility
            
            if (throttleOverlay && !brakeOverlay) {
              width = getWidthFromValue(throttleValue, throttleMin, throttleMax);
            } else if (brakeOverlay && !throttleOverlay) {
              width = getWidthFromValue(brakeValue, brakeMin, brakeMax);
            } else if (throttleOverlay && brakeOverlay) {
              const throttleWidth = getWidthFromValue(throttleValue, throttleMin, throttleMax);
              const brakeWidth = getWidthFromValue(brakeValue, brakeMin, brakeMax);
              // Use the larger width
              width = Math.max(throttleWidth, brakeWidth);
            }
          } else {
            // Single lap or no laps selected - use throttle/brake colors
            if (throttleOverlay && !brakeOverlay) {
              width = getWidthFromValue(throttleValue, throttleMin, throttleMax);
              segmentColor = '#3B82F6'; // Blue for throttle
              opacity = 0.8;
            } else if (brakeOverlay && !throttleOverlay) {
              width = getWidthFromValue(brakeValue, brakeMin, brakeMax);
              segmentColor = '#F59E0B'; // Orange for brake
              opacity = 0.8;
            } else if (throttleOverlay && brakeOverlay) {
              const throttleWidth = getWidthFromValue(throttleValue, throttleMin, throttleMax);
              const brakeWidth = getWidthFromValue(brakeValue, brakeMin, brakeMax);
              
              if (brakeValue >= throttleValue) {
                width = brakeWidth;
                segmentColor = '#F59E0B'; // Orange for brake
              } else {
                width = throttleWidth;
                segmentColor = '#3B82F6'; // Blue for throttle
              }
              opacity = 0.8;
            }
          }
          
          segments.push({
            coordinates: segmentCoords,
            color: segmentColor,
            opacity: opacity,
            width: width,
            throttleValue: throttleValue,
            brakeValue: brakeValue,
            segmentIndex: segments.length,
            lapNumber: lapNumber,
            lapColor: lapColor,
          });
        }
      });
    }

    return {
      coordinates: validCoords,
      center: detected ? KNOWN_CIRCUITS[detected].center : calculatedCenter,
      lapPaths: paths,
      coloredSegments: segments,
    };
  }, [data, throttleChannel, brakeChannel, throttleOverlay, brakeOverlay, widthMultiplier, activeLaps]);

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

  const handleReset = useCallback(() => {
    if (mapRef && coordinates.length > 0) {
      // Calculate bounds for all coordinates
      const lats = coordinates.map(coord => coord[0]);
      const lngs = coordinates.map(coord => coord[1]);
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      // Add padding around the track
      const latPadding = (maxLat - minLat) * 0.1; // 10% padding
      const lngPadding = (maxLng - minLng) * 0.1; // 10% padding
      
      const bounds = [
        [minLat - latPadding, minLng - lngPadding],
        [maxLat + latPadding, maxLng + lngPadding]
      ];
      
      // Fit the map to these bounds
      mapRef.fitBounds(bounds, { padding: [20, 20] });
    } else if (mapRef && center) {
      // Fallback to center view
      mapRef.setView(center, detectedCircuit ? KNOWN_CIRCUITS[detectedCircuit].zoom : 15);
    }
  }, [mapRef, coordinates, center, detectedCircuit]);

  // Auto-fit map when data changes
  useEffect(() => {
    if (mapRef && coordinates.length > 0) {
      // Delay to ensure map is fully rendered
      setTimeout(() => {
        handleReset();
      }, 500);
    }
  }, [mapRef, coordinates, handleReset]);

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
        <div className="bg-white/5 rounded-lg p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-lg">Map Settings</h3>
            <button
              onClick={() => setShowChannelSelector(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Data Visualization Section */}
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-white font-medium mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Data Visualization
            </h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Data Overlays */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Channel Overlays
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span className="text-sm text-gray-300">Throttle</span>
                      </div>
                      <button
                        onClick={() => setThrottleOverlay(!throttleOverlay)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          throttleOverlay
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                        disabled={!throttleChannel}
                      >
                        {throttleOverlay ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-orange-500 rounded"></div>
                        <span className="text-sm text-gray-300">Brake</span>
                      </div>
                      <button
                        onClick={() => setBrakeOverlay(!brakeOverlay)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          brakeOverlay
                            ? 'bg-orange-500 text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                        disabled={!brakeChannel}
                      >
                        {brakeOverlay ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Line Width */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Line Width: {widthMultiplier.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={widthMultiplier}
                    onChange={(e) => setWidthMultiplier(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Thin</span>
                    <span>Thick</span>
                  </div>
                </div>
              </div>

              {/* Channel Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Data Channels
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Throttle Channel</label>
                    <select
                      value={throttleChannel}
                      onChange={(e) => setThrottleChannel(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
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
                    <label className="block text-xs text-gray-400 mb-1">Brake Channel</label>
                    <select
                      value={brakeChannel}
                      onChange={(e) => setBrakeChannel(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
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
              </div>
            </div>
          </div>

          {/* Lap Display Order Controls (only show when multiple laps are selected) */}
          {activeLaps.length > 1 && (
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                Lap Display Order
              </h4>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => setFrontLap(null)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    frontLap === null
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  Default Order
                </button>
                {activeLaps.map(lapNumber => {
                  const lapPath = lapPaths.find(lap => lap.lapNumber === lapNumber);
                  return (
                    <button
                      key={lapNumber}
                      onClick={() => setFrontLap(lapNumber)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        frontLap === lapNumber
                          ? 'bg-yellow-500 text-black'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                      style={{ borderLeft: `3px solid ${lapPath?.color || '#6b7280'}` }}
                    >
                      Lap {lapNumber}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400">
                Select which lap trace appears on top when comparing multiple laps
              </p>
            </div>
          )}
          
          {/* Map Settings Section */}
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-white font-medium mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Map Configuration
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Map View */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Map Type
                </label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setTileLayer('satellite')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      tileLayer === 'satellite'
                        ? 'bg-green-500 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    🛰️ Satellite
                  </button>
                  <button
                    onClick={() => setTileLayer('street')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      tileLayer === 'street'
                        ? 'bg-green-500 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    🗺️ Street
                  </button>
                </div>
              </div>
              
              {/* Map Height */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Height: {mapHeight}px
                </label>
                <input
                  type="range"
                  min="300"
                  max="800"
                  value={mapHeight}
                  onChange={(e) => setMapHeight(parseInt(e.target.value))}
                  className="w-full accent-green-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>300px</span>
                  <span>800px</span>
                </div>
              </div>

              {/* Start/Finish Line */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start/Finish Line
                </label>
                <div className="space-y-1">
                  <button
                    onClick={() => setIsSettingStartFinish(!isSettingStartFinish)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isSettingStartFinish
                        ? 'bg-yellow-500 text-black'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {isSettingStartFinish ? '📍 Click Map' : '📍 Move S/F'}
                  </button>
                  {customStartFinish && (
                    <button
                      onClick={() => setCustomStartFinish(null)}
                      className="w-full px-3 py-1 rounded-lg text-xs font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                    >
                      Reset to Auto
                    </button>
                  )}
                </div>
                {isSettingStartFinish && (
                  <p className="text-xs text-yellow-400 mt-2">
                    Click anywhere on the map to set position
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lap Selection */}
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3">Lap Comparison (Select up to 2 laps)</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setInternalSelectedLaps([]);
              setFrontLap(null); // Reset front lap when showing all laps
              if (onLapsSelect) onLapsSelect([]);
              if (onLapSelect) onLapSelect(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeLaps.length === 0
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            All Laps
          </button>
          {lapPaths.map((lap) => {
            const isSelected = activeLaps.includes(lap.lapNumber);
            const selectionIndex = activeLaps.indexOf(lap.lapNumber);
            
            return (
              <button
                key={lap.lapNumber}
                onClick={() => handleLapToggle(lap.lapNumber)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                  isSelected
                    ? 'bg-red-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
                style={{
                  borderLeft: `4px solid ${lap.color}`,
                }}
              >
                Lap {lap.lapNumber}
                {isSelected && (
                  <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {selectionIndex + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {activeLaps.length > 0 && (
          <div className="mt-3 text-sm text-gray-400">
            Selected: {activeLaps.map(lap => `Lap ${lap}`).join(' & ')}
            {activeLaps.length === 2 && (
              <span className="text-yellow-400 ml-2">• Click any lap to replace first selection</span>
            )}
          </div>
        )}
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
              zoom={detectedCircuit ? KNOWN_CIRCUITS[detectedCircuit].zoom : 13} // Slightly zoomed out for better initial view
              style={{ height: '100%', width: '100%' }}
              ref={setMapRef}
              whenReady={() => {
                // Auto-fit will be handled by the useEffect
              }}
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
              
              {/* Show colored segments if overlays are active */}
              {(throttleOverlay || brakeOverlay) && coloredSegments.length > 0 ? (
                (() => {
                  // Apply front lap ordering to colored segments too
                  const backgroundSegments = coloredSegments.filter(segment => 
                    frontLap ? segment.lapNumber !== frontLap : true
                  );
                  const frontSegments = frontLap ? coloredSegments.filter(segment => 
                    segment.lapNumber === frontLap
                  ) : [];

                  return (
                    <>
                      {/* Render background segments first */}
                      {backgroundSegments.map((segment, index) => (
                        <Polyline
                          key={`bg-segment-${index}`}
                          positions={segment.coordinates}
                          pathOptions={{
                            color: segment.color,
                            weight: segment.width,
                            opacity: segment.opacity * 0.7, // Reduce opacity for background
                            fillOpacity: segment.opacity * 0.7,
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
                      ))}
                      
                      {/* Render front lap segments last (on top) */}
                      {frontSegments.map((segment, index) => (
                        <Polyline
                          key={`front-segment-${index}`}
                          positions={segment.coordinates}
                          pathOptions={{
                            color: segment.color,
                            weight: segment.width * 1.2, // Make front segments slightly thicker
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
                      ))}
                    </>
                  );
                })()
              ) : (
                /* Show regular lap paths when no overlays */
                (() => {
                  // Filter laps based on selection
                  const lapsToRender = lapPaths.filter(lap => {
                    if (activeLaps.length > 0 && !activeLaps.includes(lap.lapNumber)) {
                      return false;
                    }
                    return true;
                  });

                  // Split into background and front lap arrays
                  const backgroundLaps = lapsToRender.filter(lap => frontLap !== lap.lapNumber);
                  const frontLapData = frontLap ? lapsToRender.find(lap => lap.lapNumber === frontLap) : null;

                  return (
                    <>
                      {/* Render background laps first (underneath) */}
                      {backgroundLaps.map((lap) => (
                        <Polyline
                          key={`bg-lap-${lap.lapNumber}`}
                          positions={lap.coordinates}
                          pathOptions={{
                            color: lap.color,
                            weight: 4,
                            opacity: 0.7,
                          }}
                        />
                      ))}
                      
                      {/* Render front lap last (on top) if one is selected */}
                      {frontLapData && (
                        <Polyline
                          key={`front-lap-${frontLapData.lapNumber}`}
                          positions={frontLapData.coordinates}
                          pathOptions={{
                            color: frontLapData.color,
                            weight: 6,
                            opacity: 0.9,
                          }}
                        />
                      )}
                    </>
                  );
                })()
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
          {(!throttleOverlay && !brakeOverlay) ? (
            /* Show lap colors when no overlays */
            lapPaths
              .filter(lap => activeLaps.length === 0 || activeLaps.includes(lap.lapNumber))
              .map((lap) => {
                const isSelected = activeLaps.includes(lap.lapNumber);
                const selectionIndex = activeLaps.indexOf(lap.lapNumber);
                const isOnTop = frontLap === lap.lapNumber;
                
                return (
                  <div key={lap.lapNumber} className="flex items-center space-x-2">
                    <div
                      className={`w-4 h-4 rounded relative border-2 ${isOnTop ? 'border-yellow-400' : 'border-transparent'}`}
                      style={{ backgroundColor: lap.color }}
                    >
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">
                          {selectionIndex + 1}
                        </span>
                      )}
                      {isOnTop && (
                        <span className="absolute -bottom-1 -left-1 bg-yellow-400 text-black text-xs rounded-full w-3 h-3 flex items-center justify-center font-bold text-[8px]">
                          ↑
                        </span>
                      )}
                    </div>
                    <span className={`text-sm ${
                      isOnTop ? 'text-yellow-400 font-bold' : 
                      isSelected ? 'text-yellow-400 font-semibold' : 'text-white'
                    }`}>
                      Lap {lap.lapNumber} {isOnTop ? '(Front)' : ''}
                    </span>
                  </div>
                );
              })
          ) : (
            /* Show overlay legend */
            <>
              {throttleOverlay && throttleChannel && (
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
              {brakeOverlay && brakeChannel && (
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
        
        {(throttleOverlay || brakeOverlay) && (
          <div className="mt-3 text-xs text-gray-400">
            <p>Line width visualization (${widthMultiplier}x multiplier)${
                activeLaps.length > 1 ? ' - Using original lap colors' : ''
              }</p>
            {throttleOverlay && brakeOverlay && (
              <p>{activeLaps.length > 1 ? 'Line width shows combined throttle/brake intensity per lap' :
                'Brake input takes priority when both throttle and brake are applied'
              }</p>
            )}
            {coloredSegments.length > 0 && (
              <p>Showing {coloredSegments.length} colored segments{activeLaps.length > 1 ? ` across ${activeLaps.length} laps` : ''}</p>
            )}
            {throttleChannel && brakeChannel && (
              <div className="mt-2 p-2 bg-black/20 rounded text-xs">
                <p>🔍 Debug Info:</p>
                <p>Throttle Channel: &quot;{throttleChannel}&quot; {throttleOverlay ? '(ON)' : '(OFF)'}</p>
                <p>Brake Channel: &quot;{brakeChannel}&quot; {brakeOverlay ? '(ON)' : '(OFF)'}</p>
                {(throttleOverlay || brakeOverlay) && coloredSegments.length > 0 && (
                  <p>Width Mode Active | Segments: {coloredSegments.length} | Width Multiplier: {widthMultiplier}x | 
                    {activeLaps.length > 1 ? ` Multi-lap colors: ON` : ' Single lap mode'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
