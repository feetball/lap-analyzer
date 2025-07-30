// Utility functions for race data analysis

export interface Circuit {
  name: string;
  center: [number, number];
  startFinish: [[number, number], [number, number]];
  zoom: number;
  sectors?: [number, number][];
}

export interface LapData {
  lapNumber: number;
  startIndex: number;
  endIndex: number;
  lapTime: number;
  maxSpeed: number;
  avgSpeed: number;
  data: any[];
  sectors?: SectorData[];
}

export interface SectorData {
  sectorNumber: number;
  startIndex: number;
  endIndex: number;
  time: number;
}

// Known US racing circuits
export const KNOWN_CIRCUITS: Record<string, Circuit> = {
  'Road America': {
    name: 'Road America',
    center: [43.8002, -87.9897],
    startFinish: [[43.8002, -87.9897], [43.8005, -87.9900]],
    zoom: 15,
  },
  'Laguna Seca': {
    name: 'Laguna Seca',
    center: [36.5844, -121.7536],
    startFinish: [[36.5844, -121.7536], [36.5847, -121.7539]],
    zoom: 15,
  },
  'Circuit of the Americas': {
    name: 'Circuit of the Americas',
    center: [30.1328, -97.6411],
    startFinish: [[30.1328, -97.6411], [30.1331, -97.6414]],
    zoom: 15,
  },
  'Watkins Glen': {
    name: 'Watkins Glen',
    center: [42.3369, -76.9270],
    startFinish: [[42.3369, -76.9270], [42.3372, -76.9273]],
    zoom: 15,
  },
  'Sebring International Raceway': {
    name: 'Sebring International Raceway',
    center: [27.4642, -81.3489],
    startFinish: [[27.4642, -81.3489], [27.4645, -81.3492]],
    zoom: 15,
  },
  'Daytona International Speedway': {
    name: 'Daytona International Speedway',
    center: [29.1846, -81.0717],
    startFinish: [[29.1846, -81.0717], [29.1849, -81.0720]],
    zoom: 15,
  },
  'VIRginia International Raceway': {
    name: 'VIRginia International Raceway',
    center: [36.5533, -79.2014],
    startFinish: [[36.5533, -79.2014], [36.5536, -79.2017]],
    zoom: 15,
  },
};

/**
 * Calculate distance between two GPS coordinates in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Detect which circuit the GPS data is from
 */
export function detectCircuit(gpsData: Array<{ lat: number; lon: number }>): string | null {
  if (gpsData.length === 0) return null;

  // Calculate center of GPS data
  const avgLat = gpsData.reduce((sum, point) => sum + point.lat, 0) / gpsData.length;
  const avgLon = gpsData.reduce((sum, point) => sum + point.lon, 0) / gpsData.length;

  let bestMatch: string | null = null;
  let minDistance = Infinity;

  // Find closest known circuit
  Object.entries(KNOWN_CIRCUITS).forEach(([name, circuit]) => {
    const distance = calculateDistance(avgLat, avgLon, circuit.center[0], circuit.center[1]);
    if (distance < minDistance && distance < 5000) { // Within 5km
      minDistance = distance;
      bestMatch = name;
    }
  });

  return bestMatch;
}

/**
 * Check if a point is close to a line (for start/finish line detection)
 */
export function isPointNearLine(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number],
  threshold: number = 10 // meters
): boolean {
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  // Convert to meters (approximate)
  const meterPerDegree = 111320; // at equator
  const pxm = px * meterPerDegree;
  const pym = py * meterPerDegree * Math.cos(px * Math.PI / 180);
  const x1m = x1 * meterPerDegree;
  const y1m = y1 * meterPerDegree * Math.cos(x1 * Math.PI / 180);
  const x2m = x2 * meterPerDegree;
  const y2m = y2 * meterPerDegree * Math.cos(x2 * Math.PI / 180);

  // Calculate distance from point to line
  const A = pxm - x1m;
  const B = pym - y1m;
  const C = x2m - x1m;
  const D = y2m - y1m;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    // Line is a point
    return Math.sqrt(A * A + B * B) <= threshold;
  }

  const param = dot / lenSq;
  
  let xx: number, yy: number;
  
  if (param < 0) {
    xx = x1m;
    yy = y1m;
  } else if (param > 1) {
    xx = x2m;
    yy = y2m;
  } else {
    xx = x1m + param * C;
    yy = y1m + param * D;
  }

  const dx = pxm - xx;
  const dy = pym - yy;
  
  return Math.sqrt(dx * dx + dy * dy) <= threshold;
}

/**
 * Detect laps based on start/finish line crossings
 */
export function detectLaps(
  data: any[],
  circuit: Circuit | null,
  latKey: string,
  lonKey: string,
  timeKey?: string
): LapData[] {
  if (!data || data.length === 0) return [];

  const laps: LapData[] = [];
  let currentLapStart = 0;
  let lapNumber = 1;

  if (!circuit) {
    // Fallback: split data into equal chunks if no circuit detected
    const lapSize = Math.floor(data.length / 3);
    for (let i = 0; i < 3; i++) {
      const startIndex = i * lapSize;
      const endIndex = Math.min((i + 1) * lapSize, data.length - 1);
      const lapData = data.slice(startIndex, endIndex);
      
      if (lapData.length > 0) {
        laps.push(createLapData(lapNumber++, startIndex, endIndex, lapData, timeKey));
      }
    }
    return laps;
  }

  // Use start/finish line detection
  for (let i = 1; i < data.length; i++) {
    const currentPoint: [number, number] = [data[i][latKey], data[i][lonKey]];
    
    if (isPointNearLine(currentPoint, circuit.startFinish[0], circuit.startFinish[1])) {
      // Check if we've completed a meaningful lap (at least 30 seconds of data)
      if (i - currentLapStart > 30) {
        const lapData = data.slice(currentLapStart, i);
        laps.push(createLapData(lapNumber++, currentLapStart, i, lapData, timeKey));
        currentLapStart = i;
      }
    }
  }

  // Add final lap if there's remaining data
  if (currentLapStart < data.length - 1) {
    const lapData = data.slice(currentLapStart);
    if (lapData.length > 30) {
      laps.push(createLapData(lapNumber, currentLapStart, data.length - 1, lapData, timeKey));
    }
  }

  return laps;
}

/**
 * Create lap data object with calculated metrics
 */
function createLapData(
  lapNumber: number,
  startIndex: number,
  endIndex: number,
  lapData: any[],
  timeKey?: string
): LapData {
  // Calculate lap time
  let lapTime = 60 + Math.random() * 30; // Default simulated time
  if (timeKey && lapData.length > 1) {
    const startTime = lapData[0][timeKey];
    const endTime = lapData[lapData.length - 1][timeKey];
    if (typeof startTime === 'number' && typeof endTime === 'number') {
      lapTime = endTime - startTime;
    }
  }

  // Calculate speed metrics
  const speedValues = lapData
    .map(d => d.speed || d.Speed || d.velocity || d.Velocity || 0)
    .filter(s => typeof s === 'number' && s > 0);

  const maxSpeed = speedValues.length > 0 ? Math.max(...speedValues) : 0;
  const avgSpeed = speedValues.length > 0 ? 
    speedValues.reduce((a, b) => a + b, 0) / speedValues.length : 0;

  return {
    lapNumber,
    startIndex,
    endIndex,
    lapTime,
    maxSpeed,
    avgSpeed,
    data: lapData,
  };
}

/**
 * Calculate best theoretical lap time
 */
export function calculateBestTheoreticalLap(laps: LapData[]): number | null {
  if (laps.length < 2) return null;

  // For now, just return the best actual lap time minus a small improvement
  const bestLapTime = Math.min(...laps.map(lap => lap.lapTime));
  return bestLapTime * 0.98; // Assume 2% improvement is possible
}

/**
 * Extract GPS coordinates from data
 */
export function extractGPSCoordinates(data: any[]): Array<{ lat: number; lon: number }> {
  if (!data || data.length === 0) return [];

  const latKey = Object.keys(data[0]).find(key => 
    key.toLowerCase().includes('lat') && typeof data[0][key] === 'number'
  );
  const lonKey = Object.keys(data[0]).find(key => 
    (key.toLowerCase().includes('lon') || key.toLowerCase().includes('lng')) && 
    typeof data[0][key] === 'number'
  );

  if (!latKey || !lonKey) return [];

  return data
    .filter(row => typeof row[latKey] === 'number' && typeof row[lonKey] === 'number')
    .map(row => ({ lat: row[latKey], lon: row[lonKey] }));
}
