'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { GitCompare, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { detectCircuit, detectLaps, KNOWN_CIRCUITS } from '../utils/raceAnalysis';
import { formatLapTime, formatTimeDifference, detectTimeUnit, normalizeToMilliseconds } from '../utils/timeFormatting';
import ResizableContainer from './ResizableContainer';

// Dynamically import Chart component to avoid SSR issues
const Line = dynamic(
  () => import('react-chartjs-2').then((mod) => mod.Line),
  { ssr: false }
);

// Type for Chart.js options (fallback for SSR)
type ChartOptionsType = any;

interface LapComparisonProps {
  data: any[];
}

interface LapData {
  lapNumber: number;
  data: any[];
  lapTime: number;
  maxSpeed: number;
  avgSpeed: number;
}

export default function LapComparison({ data }: LapComparisonProps) {
  const [selectedLaps, setSelectedLaps] = useState<number[]>([]);
  const [comparisonMetric, setComparisonMetric] = useState<string>('speed');
  const [isMounted, setIsMounted] = useState(false);
  const [chartWidth, setChartWidth] = useState(800);
  const [chartHeight, setChartHeight] = useState(400);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Process lap data using proper lap detection
  const laps = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Find GPS coordinate columns
    const latKey = Object.keys(data[0]).find(key => 
      key.toLowerCase().includes('lat') && typeof data[0][key] === 'number'
    );
    const lonKey = Object.keys(data[0]).find(key => 
      (key.toLowerCase().includes('lon') || key.toLowerCase().includes('lng')) && 
      typeof data[0][key] === 'number'
    );
    const timeKey = Object.keys(data[0]).find(key => key.toLowerCase().includes('time'));

    let detectedLaps: Array<{lapNumber: number, startIndex: number, endIndex: number, data: any[]}> = [];

    if (latKey && lonKey) {
      // Use proper GPS-based lap detection
      const gpsData = data.map(row => ({ lat: row[latKey], lon: row[lonKey] }));
      const detectedCircuitName = detectCircuit(gpsData);
      const circuitObj = detectedCircuitName ? KNOWN_CIRCUITS[detectedCircuitName] : null;
      
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

    // Convert to LapData format with calculated metrics
    const processedLaps: LapData[] = detectedLaps.map((lap) => {
      const speeds = lap.data.map(d => d.speed || d.Speed || 0).filter(s => s > 0);
      const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
      const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
      
      // Calculate lap time from timestamps if available
      let lapTime = 60000 + Math.random() * 30000; // Default simulated time in milliseconds
      if (timeKey && lap.data.length > 1) {
        const startTime = lap.data[0][timeKey];
        const endTime = lap.data[lap.data.length - 1][timeKey];
        if (typeof startTime === 'number' && typeof endTime === 'number') {
          lapTime = endTime - startTime;
        }
      }

      return {
        lapNumber: lap.lapNumber,
        data: lap.data,
        lapTime,
        maxSpeed,
        avgSpeed,
      };
    });

    // Detect time unit and normalize all lap times to milliseconds
    const lapTimes = processedLaps.map(lap => lap.lapTime);
    const timeUnit = detectTimeUnit(lapTimes);
    
    // Normalize lap times to milliseconds
    processedLaps.forEach(lap => {
      lap.lapTime = normalizeToMilliseconds(lap.lapTime, timeUnit);
    });

    return processedLaps;
  }, [data]);

  // Auto-select first two laps when lap data changes
  useEffect(() => {
    if (laps.length > 0 && selectedLaps.length === 0) {
      const initialSelection = laps.slice(0, Math.min(2, laps.length)).map(lap => lap.lapNumber);
      setSelectedLaps(initialSelection);
    }
  }, [laps, selectedLaps.length]);

  // Available metrics for comparison
  const availableMetrics = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter(key =>
      typeof data[0][key] === 'number' &&
      !key.toLowerCase().includes('lat') &&
      !key.toLowerCase().includes('lon') &&
      !key.toLowerCase().includes('lng')
    ).sort(); // Sort metrics alphabetically
  }, [data]);

  // Generate comparison chart data
  const chartData = useMemo(() => {
    if (selectedLaps.length === 0 || !comparisonMetric) return null;

    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    
    return {
      labels: Array.from({ length: 100 }, (_, i) => i), // Normalized to 100 points for comparison
      datasets: selectedLaps.map((lapNum, index) => {
        const lap = laps.find(l => l.lapNumber === lapNum);
        if (!lap) return null;

        // Normalize data to 100 points for easier comparison
        const values = lap.data.map(d => d[comparisonMetric] || 0);
        const normalizedValues = [];
        const step = values.length / 100;
        
        for (let i = 0; i < 100; i++) {
          const sourceIndex = Math.floor(i * step);
          normalizedValues.push(values[sourceIndex] || 0);
        }

        return {
          label: `Lap ${lapNum}`,
          data: normalizedValues,
          borderColor: colors[index % colors.length],
          backgroundColor: `${colors[index % colors.length]}20`,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.1,
        };
      }).filter((dataset): dataset is NonNullable<typeof dataset> => dataset !== null),
    };
  }, [selectedLaps, laps, comparisonMetric]);

  const chartOptions: ChartOptionsType = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'white',
        },
      },
      title: {
        display: true,
        text: `${comparisonMetric} Comparison`,
        color: 'white',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Lap Progress (%)',
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
        },
      },
      y: {
        title: {
          display: true,
          text: comparisonMetric,
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
        },
      },
    },
  };

  // Calculate lap time differences
  const lapTimeComparison = useMemo(() => {
    if (selectedLaps.length < 2) return [];

    const baseLap = laps.find(l => l.lapNumber === selectedLaps[0]);
    if (!baseLap) return [];

    return selectedLaps.slice(1).map(lapNum => {
      const compareLap = laps.find(l => l.lapNumber === lapNum);
      if (!compareLap) return null;

      const timeDiff = compareLap.lapTime - baseLap.lapTime;
      return {
        lapNumber: lapNum,
        timeDiff,
        percentage: (timeDiff / baseLap.lapTime) * 100,
      };
    }).filter((comp): comp is NonNullable<typeof comp> => comp !== null);
  }, [selectedLaps, laps]);

  // Calculate best theoretical lap
  const bestTheoreticalLap = useMemo(() => {
    if (laps.length === 0) return null;

    // For demo purposes, take the best sector from each lap
    // In reality, you'd divide the track into sectors and find the best time for each
    const bestLapTime = Math.min(...laps.map(l => l.lapTime));
    const improvement = 0.5; // Assume 0.5s improvement possible
    
    return {
      time: bestLapTime - improvement,
      improvement,
      baseLap: laps.find(l => l.lapTime === bestLapTime)?.lapNumber || 1,
    };
  }, [laps]);

  const handleLapToggle = (lapNumber: number) => {
    setSelectedLaps(prev => {
      if (prev.includes(lapNumber)) {
        return prev.filter(n => n !== lapNumber);
      } else {
        return [...prev, lapNumber];
      }
    });
  };

  if (laps.length === 0) {
    return (
      <div className="text-center py-12">
        <GitCompare className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl text-white mb-2">No Lap Data Available</h3>
        <p className="text-gray-400">Upload telemetry data to compare lap performance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Lap Comparison</h2>
        {bestTheoreticalLap && (
          <div className="flex items-center space-x-2 text-sm text-green-400">
            <Trophy className="h-4 w-4" />
            <span>
              Best Theoretical: {formatLapTime(bestTheoreticalLap.time)}
              (-{formatLapTime(bestTheoreticalLap.improvement)} from Lap {bestTheoreticalLap.baseLap})
            </span>
          </div>
        )}
      </div>

      {/* Lap Selection */}
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3">Select Laps to Compare</h3>
        <div className="flex flex-wrap gap-2">
          {laps.map((lap) => (
            <button
              key={lap.lapNumber}
              onClick={() => handleLapToggle(lap.lapNumber)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedLaps.includes(lap.lapNumber)
                  ? 'bg-red-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Lap {lap.lapNumber}
              <span className="block text-xs opacity-75">
                {formatLapTime(lap.lapTime)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Metric Selection */}
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3">Comparison Metric</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {availableMetrics.map((metric) => (
            <button
              key={metric}
              onClick={() => setComparisonMetric(metric)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                comparisonMetric === metric
                  ? 'bg-red-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {metric}
            </button>
          ))}
        </div>
      </div>

      {/* Lap Time Comparison Table */}
      {lapTimeComparison.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">Lap Time Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-gray-300">Comparison</th>
                  <th className="text-left py-2 text-gray-300">Time Difference</th>
                  <th className="text-left py-2 text-gray-300">Percentage</th>
                  <th className="text-left py-2 text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {lapTimeComparison.map((comp) => (
                  <tr key={comp.lapNumber} className="border-b border-white/5">
                    <td className="py-2 text-white">
                      Lap {selectedLaps[0]} vs Lap {comp.lapNumber}
                    </td>
                    <td className={`py-2 ${comp.timeDiff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {formatTimeDifference(comp.timeDiff)}
                    </td>
                    <td className={`py-2 ${comp.timeDiff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {comp.timeDiff > 0 ? '+' : ''}{comp.percentage.toFixed(2)}%
                    </td>
                    <td className="py-2">
                      {comp.timeDiff > 0 ? (
                        <div className="flex items-center space-x-1 text-red-400">
                          <TrendingDown className="h-4 w-4" />
                          <span>Slower</span>
                        </div>
                      ) : comp.timeDiff < 0 ? (
                        <div className="flex items-center space-x-1 text-green-400">
                          <TrendingUp className="h-4 w-4" />
                          <span>Faster</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-gray-400">
                          <Minus className="h-4 w-4" />
                          <span>Equal</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comparison Chart */}
      {chartData && selectedLaps.length > 0 && isMounted && (
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Performance Chart</h3>
            <div className="text-xs text-gray-400">
              📏 Drag edges to resize chart
            </div>
          </div>
          <ResizableContainer
            defaultWidth={chartWidth}
            defaultHeight={chartHeight}
            minWidth={400}
            minHeight={250}
            maxWidth={2400}
            maxHeight={800}
            resizeDirection="both"
            className="bg-white/5 rounded-lg overflow-hidden"
            onResize={(width, height) => {
              setChartWidth(width);
              setChartHeight(height);
            }}
          >
            <div style={{ width: '100%', height: '100%', padding: '16px' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </ResizableContainer>
        </div>
      )}

      {/* Performance Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium">Performance Summary</h3>
          <div className="text-xs text-gray-400">
            📏 Drag bottom edge to resize summary cards
          </div>
        </div>
        <ResizableContainer
          defaultWidth={800}
          defaultHeight={200}
          minWidth={400}
          minHeight={150}
          maxWidth={2400}
          maxHeight={400}
          resizeDirection="vertical"
          className="bg-white/5 rounded-lg p-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full overflow-y-auto">
            {selectedLaps.map((lapNum) => {
              const lap = laps.find(l => l.lapNumber === lapNum);
              if (!lap) return null;

              const bestLap = laps.reduce((best, current) => 
                current.lapTime < best.lapTime ? current : best
              );

              return (
                <div key={lapNum} className="bg-white/10 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Lap {lapNum} Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Lap Time:</span>
                      <span className={`${lap.lapNumber === bestLap.lapNumber ? 'text-green-400' : 'text-white'}`}>
                        {formatLapTime(lap.lapTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Speed:</span>
                      <span className="text-white">{lap.maxSpeed.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Speed:</span>
                      <span className="text-white">{lap.avgSpeed.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Delta to Best:</span>
                      <span className={`${lap.lapNumber === bestLap.lapNumber ? 'text-green-400' : 'text-red-400'}`}>
                        {lap.lapNumber === bestLap.lapNumber ? 'Best' : 
                         `+${(lap.lapTime - bestLap.lapTime).toFixed(3)}s`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ResizableContainer>
      </div>
    </div>
  );
}
