'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

import { Map as MapIcon, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

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

  // Extract GPS coordinates and detect circuit
  const { coordinates, center, lapPaths } = useMemo(() => {
    if (!data || data.length === 0) return { coordinates: [], center: [0, 0] as [number, number], lapPaths: [] };

    // Find latitude and longitude columns
    const latKey = Object.keys(data[0]).find(key => 
      key.toLowerCase().includes('lat') && typeof data[0][key] === 'number'
    );
    const lonKey = Object.keys(data[0]).find(key => 
      (key.toLowerCase().includes('lon') || key.toLowerCase().includes('lng')) && 
      typeof data[0][key] === 'number'
    );

    if (!latKey || !lonKey) {
      return { coordinates: [], center: [0, 0] as [number, number], lapPaths: [] };
    }

    const coords: [number, number][] = data
      .filter(row => row[latKey] && row[lonKey])
      .map(row => [row[latKey], row[lonKey]]);

    if (coords.length === 0) {
      return { coordinates: [], center: [0, 0] as [number, number], lapPaths: [] };
    }

    // Calculate center
    const avgLat = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
    const avgLon = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;
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
    const lapSize = Math.floor(coords.length / 3);
    const paths: LapPath[] = [];
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

    for (let i = 0; i < 3; i++) {
      const startIndex = i * lapSize;
      const endIndex = Math.min((i + 1) * lapSize, coords.length - 1);
      const lapCoords = coords.slice(startIndex, endIndex);
      
      if (lapCoords.length > 0) {
        paths.push({
          lapNumber: i + 1,
          coordinates: lapCoords,
          color: colors[i % colors.length],
        });
      }
    }

    return {
      coordinates: coords,
      center: detected ? KNOWN_CIRCUITS[detected].center : calculatedCenter,
      lapPaths: paths,
    };
  }, [data]);

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
        <div className="h-96 rounded-lg overflow-hidden">
          {isMounted && (
            <MapContainer
              center={center}
              zoom={detectedCircuit ? KNOWN_CIRCUITS[detectedCircuit].zoom : 15}
              style={{ height: '100%', width: '100%' }}
              ref={setMapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Show all laps or selected lap */}
              {lapPaths.map((lap) => {
                if (selectedLap !== null && selectedLap !== lap.lapNumber) {
                  return null;
                }
                
                return (
                  <Polyline
                    key={lap.lapNumber}
                    positions={lap.coordinates}
                    color={lap.color}
                    weight={3}
                    opacity={selectedLap === null ? 0.7 : 1}
                  />
                );
              })}

              {/* Start/Finish line if circuit is detected */}
              {detectedCircuit && KNOWN_CIRCUITS[detectedCircuit].startFinish && (
                <>
                  <Polyline
                    positions={KNOWN_CIRCUITS[detectedCircuit].startFinish}
                    color="#ffffff"
                    weight={4}
                    opacity={0.8}
                  />
                  <Marker position={KNOWN_CIRCUITS[detectedCircuit].startFinish[0]}>
                    <Popup>
                      Start/Finish Line<br />
                      {detectedCircuit}
                    </Popup>
                  </Marker>
                </>
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
        <h3 className="text-white font-medium mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {lapPaths.map((lap) => (
            <div key={lap.lapNumber} className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: lap.color }}
              ></div>
              <span className="text-white text-sm">Lap {lap.lapNumber}</span>
            </div>
          ))}
          {detectedCircuit && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-white rounded"></div>
              <span className="text-white text-sm">Start/Finish</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
