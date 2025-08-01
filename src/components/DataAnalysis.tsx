
'use client';
import { detectCircuit, detectLaps, LapData, KNOWN_CIRCUITS } from '../utils/raceAnalysis';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Timer, TrendingUp, Settings, Play } from 'lucide-react';

// Dynamically import Chart component to avoid SSR issues
const Line = dynamic(
  () => import('react-chartjs-2').then((mod) => mod.Line),
  { ssr: false }
);

// Type for Chart.js options (fallback for SSR)
type ChartOptionsType = any;

// Dynamically register Chart.js only on client side
import { useRef } from 'react';
const useChartJS = () => {
  const chartRef = useRef<any>(null);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (typeof window !== 'undefined') {
        const chartModule = await import('chart.js');
        chartModule.Chart.register(
          chartModule.CategoryScale,
          chartModule.LinearScale,
          chartModule.PointElement,
          chartModule.LineElement,
          chartModule.Title,
          chartModule.Tooltip,
          chartModule.Legend
        );
        if (isMounted) chartRef.current = chartModule;
      }
    })();
    return () => { isMounted = false; };
  }, []);
  return chartRef.current;
};

interface DataAnalysisProps {
  data: any[];
  selectedLap: number | null;
  onLapSelect: (lap: number | null) => void;
}




export default function DataAnalysis({ data, selectedLap, onLapSelect }: DataAnalysisProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [laps, setLaps] = useState<LapData[]>([]);
  const [bestTheoreticalLap, setBestTheoreticalLap] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const chartJS = useChartJS();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get available columns from the data
  const availableColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter(key => {
      const lowerKey = key.toLowerCase();
      // Only exclude exact GPS coordinate columns, not named GPS channels
      const isExactGPSCoord = lowerKey === 'lat' || lowerKey === 'latitude' || 
                             lowerKey === 'lon' || lowerKey === 'longitude' || 
                             lowerKey === 'lng';
      
      return typeof data[0][key] === 'number' && !isExactGPSCoord;
    }).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [data]);

  // Detect laps based on GPS coordinates
  useEffect(() => {
    if (!data || data.length === 0) return;

    let detectedLaps: LapData[] = [];
    let detectedCircuit: string | null = null;

    // Try to extract GPS keys
    const latKey = Object.keys(data[0]).find(key => key.toLowerCase().includes('lat'));
    const lonKey = Object.keys(data[0]).find(key => key.toLowerCase().includes('lon') || key.toLowerCase().includes('lng'));
    const timeKey = Object.keys(data[0]).find(key => key.toLowerCase().includes('time'));

      if (latKey && lonKey) {
        // Detect circuit
        const gpsData = data.map(row => ({ lat: row[latKey], lon: row[lonKey] }));
        detectedCircuit = detectCircuit(gpsData);

        // Get circuit object if found
        const circuitObj = detectedCircuit ? KNOWN_CIRCUITS[detectedCircuit] : null;

        // Detect laps using start/finish line
        detectedLaps = detectLaps(data, circuitObj || null, latKey, lonKey, timeKey);
      }

      // Fallback: chunking if no GPS/circuit
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
              lapTime: 0,
              maxSpeed: 0,
              avgSpeed: 0,
              data: lapData
            });
          }
        }
      }

      setLaps(detectedLaps);

      // Calculate best theoretical lap
      if (detectedLaps.length > 0) {
        const bestTime = Math.min(...detectedLaps.map(lap => lap.lapTime));
        setBestTheoreticalLap(bestTime);
      }

      // Auto-select default telemetry columns
      if (selectedColumns.length === 0) {
        const defaultChannels = [];
        // ...existing code for channel selection...
        const tpsChannel = availableColumns.find(col => 
          col.toLowerCase().includes('tps') || 
          col.includes('TPS (%)') ||
          col.toLowerCase().includes('throttle')
        );
        if (tpsChannel) defaultChannels.push(tpsChannel);
        const brakeChannel = availableColumns.find(col => 
          col.toLowerCase().includes('brake') && col.toLowerCase().includes('pressure') ||
          col.includes('Brake Pressure (%)')
        );
        if (brakeChannel) defaultChannels.push(brakeChannel);
        const speedChannel = availableColumns.find(col => 
          col.toLowerCase().includes('speed') ||
          col.toLowerCase() === 'spd' ||
          col.toLowerCase().includes('velocity')
        );
        if (speedChannel) defaultChannels.push(speedChannel);
        if (defaultChannels.length === 0) {
          defaultChannels.push(...availableColumns.slice(0, 3));
        }
        setSelectedColumns(defaultChannels);
      }
  }, [data, availableColumns, selectedColumns.length]);

  const chartData = useMemo(() => {
    if (!data || selectedColumns.length === 0) return null;

    let dataToShow = data;
    if (selectedLap !== null) {
      const lap = laps.find(l => l.lapNumber === selectedLap);
      if (lap) {
        dataToShow = lap.data;
      }
    }

    return {
      labels: dataToShow.map((_, index) => index),
      datasets: selectedColumns.map((column, index) => ({
        label: column,
        data: dataToShow.map(row => row[column] || 0),
        borderColor: `hsl(${index * 60}, 70%, 50%)`,
        backgroundColor: `hsla(${index * 60}, 70%, 50%, 0.1)`,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      })),
    };
  }, [data, selectedColumns, selectedLap, laps]);

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
        text: selectedLap ? `Lap ${selectedLap} Data` : 'Session Data',
        color: 'white',
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
        },
      },
    },
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Data Analysis</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Timer className="h-4 w-4" />
            <span>{laps.length} laps detected</span>
          </div>
          {bestTheoreticalLap && (
            <div className="flex items-center space-x-2 text-sm text-green-400">
              <TrendingUp className="h-4 w-4" />
              <span>Best theoretical: {bestTheoreticalLap.toFixed(3)}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Lap Selection */}
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3 flex items-center">
          <Play className="h-4 w-4 mr-2" />
          Lap Selection
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onLapSelect(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedLap === null
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            All Session
          </button>
          {laps.map((lap) => (
            <button
              key={lap.lapNumber}
              onClick={() => onLapSelect(lap.lapNumber)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedLap === lap.lapNumber
                  ? 'bg-red-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Lap {lap.lapNumber}
              <span className="block text-xs opacity-75">
                {lap.lapTime.toFixed(2)}s
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Column Selection */}
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3 flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          Data Channels
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {availableColumns.map((column) => (
            <label
              key={column}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedColumns.includes(column)}
                onChange={() => handleColumnToggle(column)}
                className="rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-500 focus:ring-offset-gray-800"
              />
              <span className="text-white text-sm">{column}</span>
            </label>
          ))}
        </div>
      </div>


      {/* Chart */}
      {chartData && isMounted && chartJS && (
        <div className="bg-white/5 rounded-lg p-4">
          <div className="h-96">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Lap Times Table */}
      {laps.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">Lap Times</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-gray-300">Lap</th>
                  <th className="text-left py-2 text-gray-300">Time</th>
                  <th className="text-left py-2 text-gray-300">Max Speed</th>
                  <th className="text-left py-2 text-gray-300">Avg Speed</th>
                  <th className="text-left py-2 text-gray-300">Delta</th>
                </tr>
              </thead>
              <tbody>
                {laps.map((lap) => {
                  const delta = bestTheoreticalLap ? lap.lapTime - bestTheoreticalLap : 0;
                  return (
                    <tr
                      key={lap.lapNumber}
                      className={`border-b border-white/5 hover:bg-white/5 cursor-pointer ${
                        selectedLap === lap.lapNumber ? 'bg-red-500/20' : ''
                      }`}
                      onClick={() => onLapSelect(lap.lapNumber)}
                    >
                      <td className="py-2 text-white">{lap.lapNumber}</td>
                      <td className="py-2 text-white">{lap.lapTime.toFixed(3)}s</td>
                      <td className="py-2 text-white">{lap.maxSpeed.toFixed(1)}</td>
                      <td className="py-2 text-white">{lap.avgSpeed.toFixed(1)}</td>
                      <td className={`py-2 ${delta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(3)}s
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
